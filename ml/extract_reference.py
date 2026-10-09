# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["mediapipe", "opencv-python"]
# ///
"""
Extract pose + hand landmarks from WLASL source videos into RefClip JSON
files that `src/ui/practice/ReferenceSkeleton.tsx` can play back.

One JSON per gloss, matching the RefClip TS type:
  { gloss: str, fps: float, frames: [{pose: [...], left: [...], right: [...]}] }

Landmarks are serialized as NormalizedLandmark-shaped dicts ({x, y, z, visibility?})
— same shape the browser records, so the same draw code works without conversion.

Usage:
  uv run ml/extract_reference.py                    # all glosses in ml/data/wlasl_src/
  uv run ml/extract_reference.py --gloss WATER      # just one
  uv run ml/extract_reference.py --overwrite        # replace existing JSONs
"""
from __future__ import annotations

import argparse
import json
import time
import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

from import_media import ensure_model, split_hands

POSE_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
)
POSE_MODEL_PATH = Path("ml/models/pose_landmarker_lite.task")

SRC_DIR = Path("ml/data/wlasl_src")
OUT_DIR = Path("public/reference-signs")
VID_EXTS = {".mp4", ".mov", ".m4v", ".avi", ".mkv"}


def ensure_pose_model() -> Path:
    if not POSE_MODEL_PATH.exists():
        POSE_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        print(f"Downloading {POSE_MODEL_URL}")
        urllib.request.urlretrieve(POSE_MODEL_URL, POSE_MODEL_PATH)
    return POSE_MODEL_PATH


def make_pose_landmarker():
    options = mp_vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(ensure_pose_model())),
        running_mode=mp_vision.RunningMode.VIDEO,
        num_poses=1,
    )
    return mp_vision.PoseLandmarker.create_from_options(options)


def make_hand_landmarker():
    options = mp_vision.HandLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(ensure_model())),
        running_mode=mp_vision.RunningMode.VIDEO,
        num_hands=2,
    )
    return mp_vision.HandLandmarker.create_from_options(options)


def _lm_dict(lm) -> dict:
    d = {"x": float(lm.x), "y": float(lm.y), "z": float(lm.z)}
    # pose landmarks have visibility; hand landmarks don't
    if getattr(lm, "visibility", None) is not None:
        d["visibility"] = float(lm.visibility)
    return d


def extract_clip(video: Path, hand_lm, pose_lm) -> dict | None:
    cap = cv2.VideoCapture(str(video))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frames: list[dict] = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        # ponytail: monotonic wall-clock — MediaPipe just needs strictly
        # increasing timestamps for its VIDEO-mode tracker.
        ts_ms = time.monotonic_ns() // 1_000_000
        hand_result = hand_lm.detect_for_video(mp_image, ts_ms)
        pose_result = pose_lm.detect_for_video(mp_image, ts_ms)
        left, right = split_hands(hand_result)
        pose_lms = pose_result.pose_landmarks[0] if pose_result.pose_landmarks else None
        # Skip empty frames (before hands enter scene) — keeps clip tight.
        if pose_lms is None and left is None and right is None:
            continue
        frames.append({
            "pose": [_lm_dict(l) for l in pose_lms] if pose_lms else None,
            "left": [_lm_dict(l) for l in left] if left else None,
            "right": [_lm_dict(l) for l in right] if right else None,
        })
    cap.release()
    if not frames:
        return None
    return {"fps": fps, "frames": frames}


def pick_video(gloss_dir: Path) -> Path | None:
    videos = [f for f in gloss_dir.iterdir() if f.suffix.lower() in VID_EXTS]
    if not videos:
        return None
    # Smallest file ≈ shortest clip = tighter reference, less looping dead time.
    return min(videos, key=lambda f: f.stat().st_size)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(SRC_DIR), help="Root dir of gloss/*.mp4")
    ap.add_argument("--out", default=str(OUT_DIR), help="Output JSON dir")
    ap.add_argument("--gloss", default=None, help="Only process one gloss (e.g. WATER)")
    ap.add_argument("--overwrite", action="store_true", help="Replace existing JSONs")
    args = ap.parse_args()

    src = Path(args.src)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    if not src.exists():
        raise SystemExit(f"{src} not found")

    hand_lm = make_hand_landmarker()
    pose_lm = make_pose_landmarker()

    glosses = sorted(d for d in src.iterdir() if d.is_dir())
    if args.gloss:
        glosses = [d for d in glosses if d.name == args.gloss]
        if not glosses:
            raise SystemExit(f"No dir named {args.gloss} under {src}")

    for gloss_dir in glosses:
        gloss = gloss_dir.name
        out_path = out / f"{gloss}.json"
        if out_path.exists() and not args.overwrite:
            print(f"  {gloss}: skip (exists — pass --overwrite to replace)")
            continue
        video = pick_video(gloss_dir)
        if not video:
            print(f"  {gloss}: no videos, skip")
            continue
        clip = extract_clip(video, hand_lm, pose_lm)
        if not clip:
            print(f"  {gloss}: no usable frames from {video.name}, skip")
            continue
        clip["gloss"] = gloss
        out_path.write_text(json.dumps(clip))
        kb = out_path.stat().st_size // 1024
        print(f"  {gloss}: {len(clip['frames'])} frames @ {clip['fps']:.1f} fps → {out_path.name} ({kb} KB)")


if __name__ == "__main__":
    main()
