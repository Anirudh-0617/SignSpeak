# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["numpy", "mediapipe", "opencv-python"]
# ///
"""
Ingest labeled photos/videos into the same JSONL format as the browser capture
UI, using MediaPipe HandLandmarker + FaceLandmarker locally.

Layout:
  <src>/A/*.jpg|.png|.mp4|.mov
  <src>/B/...
  ...

Usage:
  # Ingest a Kaggle ASL Alphabet drop:
  uv run ml/import_media.py \
    --src ~/Downloads/asl_alphabet_train \
    --out ml/data/fingerspell_asl/imported.jsonl \
    --signer kaggle-asl \
    --limit 150
"""
from __future__ import annotations

import argparse
import json
import time
import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

# Keep in sync with src/perception/normalize.ts (spec v0.4).
HAND_COUNT = 21
HANDS_LEN = 2 * HAND_COUNT * 3  # 126
BLENDSHAPE_COUNT = 52
FEATURE_LEN = HANDS_LEN + BLENDSHAPE_COUNT  # 178
SPEC_VERSION = "0.4"
WRIST = 0
MIDDLE_MCP = 9

IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
VID_EXTS = {".mp4", ".mov", ".m4v", ".avi", ".mkv"}
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/latest/hand_landmarker.task"
)
MODEL_PATH = Path("ml/models/hand_landmarker.task")
FACE_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)
FACE_MODEL_PATH = Path("ml/models/face_landmarker.task")


def _ensure(url: str, path: Path) -> Path:
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        print(f"Downloading {url}")
        urllib.request.urlretrieve(url, path)
    return path


def ensure_model() -> Path:
    return _ensure(MODEL_URL, MODEL_PATH)


def ensure_face_model() -> Path:
    return _ensure(FACE_MODEL_URL, FACE_MODEL_PATH)


def make_landmarker(mode: str):
    running_mode = (
        mp_vision.RunningMode.IMAGE if mode == "image" else mp_vision.RunningMode.VIDEO
    )
    options = mp_vision.HandLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(ensure_model())),
        running_mode=running_mode,
        num_hands=2,
    )
    return mp_vision.HandLandmarker.create_from_options(options)


def make_face_landmarker(mode: str):
    running_mode = (
        mp_vision.RunningMode.IMAGE if mode == "image" else mp_vision.RunningMode.VIDEO
    )
    options = mp_vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(ensure_face_model())),
        running_mode=running_mode,
        num_faces=1,
        output_face_blendshapes=True,
    )
    return mp_vision.FaceLandmarker.create_from_options(options)


def _write_hand(out: np.ndarray, dst: int, lm, ar: float) -> None:
    if lm is None or len(lm) < HAND_COUNT:
        return
    wx = lm[WRIST].x * ar
    wy = lm[WRIST].y
    wz = lm[WRIST].z
    mx = lm[MIDDLE_MCP].x * ar
    my = lm[MIDDLE_MCP].y
    scale = max(float(np.hypot(mx - wx, my - wy)), 1e-6)
    for i in range(HAND_COUNT):
        out[dst + i * 3] = (lm[i].x * ar - wx) / scale
        out[dst + i * 3 + 1] = (lm[i].y - wy) / scale
        out[dst + i * 3 + 2] = (lm[i].z - wz) / scale


def normalize_frame(left, right, blendshapes, aspect_ratio: float) -> np.ndarray:
    """Mirror src/perception/normalize.ts (v0.4): hands + face blendshapes."""
    out = np.zeros(FEATURE_LEN, dtype=np.float32)
    _write_hand(out, 0, left, aspect_ratio)
    _write_hand(out, HAND_COUNT * 3, right, aspect_ratio)
    if blendshapes:
        # ponytail: sort by canonical index — same ordering as browser normalize.ts.
        sorted_bs = sorted(blendshapes, key=lambda c: c.index)
        for i, cat in enumerate(sorted_bs[:BLENDSHAPE_COUNT]):
            out[HANDS_LEN + i] = cat.score
    return out


def split_hands(result):
    """MediaPipe returns hand_landmarks + handedness in parallel lists."""
    left, right = None, None
    for lms, hands in zip(result.hand_landmarks, result.handedness):
        label = hands[0].category_name  # 'Left' or 'Right'
        if label == "Left":
            left = lms
        else:
            right = lms
    return left, right


def synthesize_frames(vector: np.ndarray, n: int, jitter: float) -> list[list[float]]:
    """Turn a single-frame vector into n frames with small Gaussian jitter.
    Mimics real-webcam jitter so the mean+std features aren't identically zero."""
    rng = np.random.default_rng(0)
    return [
        (vector + rng.normal(scale=jitter, size=vector.shape).astype(np.float32)).tolist()
        for _ in range(n)
    ]


def _blendshapes(face_result):
    """Return the 52-category list, or None if no face was detected."""
    if not face_result or not face_result.face_blendshapes:
        return None
    return face_result.face_blendshapes[0]


def import_photo(landmarker, face_landmarker, path: Path, label: str, signer: str,
                 frames_per_photo: int, jitter: float) -> dict | None:
    img = cv2.imread(str(path))
    if img is None:
        return None
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = landmarker.detect(mp_image)
    if not result.hand_landmarks:
        return None
    face_result = face_landmarker.detect(mp_image)
    left, right = split_hands(result)
    aspect = img.shape[1] / img.shape[0]
    vec = normalize_frame(left, right, _blendshapes(face_result), aspect)
    return {
        "label": label,
        "signer": signer,
        "createdAt": int(path.stat().st_mtime * 1000),
        "featureSpecVersion": SPEC_VERSION,
        "source": "camera",
        "frames": synthesize_frames(vec, frames_per_photo, jitter),
    }


def import_video(landmarker, face_landmarker, path: Path, label: str, signer: str) -> dict | None:
    cap = cv2.VideoCapture(str(path))
    frames: list[list[float]] = []
    aspect: float | None = None
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if aspect is None:
            aspect = frame.shape[1] / frame.shape[0]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        # ponytail: wall-clock ms — MediaPipe just needs monotonic-increasing
        # across the whole landmarker session, not per-video.
        ts_ms = time.monotonic_ns() // 1_000_000
        result = landmarker.detect_for_video(mp_image, ts_ms)
        if result.hand_landmarks:
            face_result = face_landmarker.detect_for_video(mp_image, ts_ms)
            left, right = split_hands(result)
            frames.append(normalize_frame(left, right, _blendshapes(face_result), aspect).tolist())
    cap.release()
    if not frames:
        return None
    return {
        "label": label,
        "signer": signer,
        "createdAt": int(path.stat().st_mtime * 1000),
        "featureSpecVersion": SPEC_VERSION,
        "source": "camera",
        "frames": frames,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True,
                    help="Root dir with per-label subdirs (A/, B/... for fingerspell; "
                         "HELLO/, THANK-YOU/... for words)")
    ap.add_argument("--out", required=True, help="Output JSONL path")
    ap.add_argument("--signer", default="imported")
    ap.add_argument("--frames-per-photo", type=int, default=15)
    ap.add_argument("--jitter", type=float, default=0.005)
    ap.add_argument("--limit", type=int, default=None,
                    help="Cap samples per label (kaggle-scale datasets are 3000/letter)")
    args = ap.parse_args()

    src = Path(args.src).expanduser()
    if not src.exists():
        raise SystemExit(f"{src} not found. Extract your dataset first.")

    photo_lm = make_landmarker("image")
    video_lm = make_landmarker("video")
    photo_face_lm = make_face_landmarker("image")
    video_face_lm = make_face_landmarker("video")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    totals: dict[str, int] = {}
    skipped: dict[str, int] = {}
    with out_path.open("w") as out_f:
        for label_dir in sorted(src.iterdir()):
            if not label_dir.is_dir():
                continue
            name = label_dir.name.strip()
            # ponytail: skip hidden/meta dirs; anything else is a valid label
            # (single letters for fingerspell, HELLO / THANK-YOU for words).
            if not name or name.startswith((".", "_")):
                skipped[label_dir.name] = -1
                continue
            label = name.upper().replace(" ", "-")
            files = [
                f for f in sorted(label_dir.iterdir())
                if f.suffix.lower() in IMG_EXTS | VID_EXTS
            ]
            if args.limit:
                files = files[: args.limit]
            count = 0
            no_hands = 0
            for f in files:
                ext = f.suffix.lower()
                if ext in IMG_EXTS:
                    sample = import_photo(
                        photo_lm, photo_face_lm, f, label, args.signer,
                        args.frames_per_photo, args.jitter,
                    )
                else:
                    sample = import_video(video_lm, video_face_lm, f, label, args.signer)
                if sample is None:
                    no_hands += 1
                    continue
                out_f.write(json.dumps(sample) + "\n")
                count += 1
            totals[label] = count
            skipped[label] = no_hands
            print(f"  {label}: {count} samples ({no_hands} skipped, no hands detected)")

    kept = sum(totals.values())
    print(f"\nWrote {kept} samples → {out_path}")
    if any(v > 0 for k, v in skipped.items() if k in totals):
        print("⚠ some frames had no detectable hands — usually fine if the letter still has ≥ ~10 samples.")


if __name__ == "__main__":
    main()
