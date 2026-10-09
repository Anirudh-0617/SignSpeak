# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["mediapipe", "opencv-python"]
# ///
"""
Extract a single reference-pose snapshot from each practice-video .mp4 so the
practice UI can render the target skeleton next to the user's live pose.

Reads:  public/practice-videos/<GLOSS>.mp4
Writes: public/practice-videos/<GLOSS>.pose.json  (33 landmarks, MediaPipe order)

Usage:
  uv run ml/extract_reference_poses.py
  uv run ml/extract_reference_poses.py --force        # re-extract even if json exists
  uv run ml/extract_reference_poses.py --dir some/other/dir
"""
from __future__ import annotations

import argparse
import json
import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

POSE_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
)
POSE_MODEL_PATH = Path("ml/models/pose_landmarker_lite.task")
DEFAULT_DIR = Path("public/practice-videos")
# Frames to try in order — mid first, then quarters. First non-empty wins.
SAMPLE_FRACTIONS = (0.5, 0.33, 0.66, 0.2, 0.8)


def ensure_pose_model() -> Path:
    if not POSE_MODEL_PATH.exists():
        POSE_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        print(f"Downloading {POSE_MODEL_URL}")
        urllib.request.urlretrieve(POSE_MODEL_URL, POSE_MODEL_PATH)
    return POSE_MODEL_PATH


def make_pose_landmarker():
    options = mp_vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(ensure_pose_model())),
        running_mode=mp_vision.RunningMode.IMAGE,
        num_poses=1,
    )
    return mp_vision.PoseLandmarker.create_from_options(options)


def _frame_at(cap: cv2.VideoCapture, frac: float):
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total <= 0:
        return None
    cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, min(total - 1, int(total * frac))))
    ok, frame = cap.read()
    return frame if ok else None


def extract(video: Path, landmarker) -> list[dict] | None:
    cap = cv2.VideoCapture(str(video))
    try:
        for frac in SAMPLE_FRACTIONS:
            frame = _frame_at(cap, frac)
            if frame is None:
                continue
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = landmarker.detect(mp_image)
            if result.pose_landmarks:
                return [
                    {"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility}
                    for lm in result.pose_landmarks[0]
                ]
    finally:
        cap.release()
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", type=Path, default=DEFAULT_DIR)
    ap.add_argument("--force", action="store_true", help="Re-extract even if .pose.json exists")
    args = ap.parse_args()

    videos = sorted(args.dir.glob("*.mp4"))
    if not videos:
        print(f"No .mp4 files in {args.dir}")
        return

    landmarker = make_pose_landmarker()
    ok = skipped = failed = 0
    for video in videos:
        out = video.with_suffix(".pose.json")
        if out.exists() and not args.force:
            skipped += 1
            continue
        landmarks = extract(video, landmarker)
        if landmarks is None:
            print(f"FAIL {video.name}: no pose detected in any sampled frame")
            failed += 1
            continue
        out.write_text(json.dumps({"landmarks": landmarks}))
        print(f"OK   {video.name} -> {out.name}")
        ok += 1

    print(f"\n{ok} extracted, {skipped} skipped (already exist), {failed} failed")


if __name__ == "__main__":
    main()
