# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy"]
# ///
"""Convert reference-clip recordings into trainable samples.

The app records clips as RefClip JSON — {gloss, fps, frames:[{pose,left,right}]}
holding *raw* MediaPipe landmarks. The trainer wants feature vectors. This
bridges the two using the same normalization as src/perception/normalize.ts and
ml/import_media.py, so a clip you record in the browser lands in the same
feature space as the WLASL corpus.

Why this matters: clips recorded in the app are the only in-domain data there
is — your camera, your lighting, your signing, and the exact perception
pipeline that runs at inference. WLASL is none of those.

Emits v0.3 (126-dim, hands only). RefClip carries no face blendshapes, so
claiming v0.4 and padding 52 zeros would be a lie the trainer can't detect —
and --hands-only accepts v0.3 anyway.

Usage:
  uv run ml/import_refclips.py --src ml/data/user_clips \\
      --out ml/data/words_asl/user.jsonl --signer anirudh-cam
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

HAND_COUNT = 21
HANDS_LEN = 2 * HAND_COUNT * 3  # 126
WRIST, MIDDLE_MCP = 0, 9

# Aspect ratio the browser divided by when it built the live feature vector
# (videoWidth / videoHeight). RefClip stores raw landmarks, so it has to be
# reapplied here or the features land in a different space than training.
# 4:3 is the default because it's what the recordings were made on: at 4:3 the
# existing model scores p(HELLO)=1.00 on these clips, at 16:9 it collapses to
# ~0. That's a sharp enough split to treat as measurement, not preference.
DEFAULT_AR = 4 / 3

# A hand MediaPipe reports in only a frame or two of a clip is a false positive,
# not a hand. Same noise floor the reference-skeleton renderer uses — without
# it a single spurious detection writes garbage into that hand's 63 dims for
# the whole sample.
MIN_HAND_PRESENCE = 0.15


def write_hand(out: np.ndarray, dst: int, lm, ar: float) -> None:
    """Mirror of writeHand() in src/perception/normalize.ts."""
    if not lm or len(lm) < HAND_COUNT:
        return
    wx, wy, wz = lm[WRIST]["x"] * ar, lm[WRIST]["y"], lm[WRIST]["z"]
    mx, my = lm[MIDDLE_MCP]["x"] * ar, lm[MIDDLE_MCP]["y"]
    scale = max(float(np.hypot(mx - wx, my - wy)), 1e-6)
    for i in range(HAND_COUNT):
        p = lm[i]
        out[dst + i * 3] = (p["x"] * ar - wx) / scale
        out[dst + i * 3 + 1] = (p["y"] - wy) / scale
        out[dst + i * 3 + 2] = (p["z"] - wz) / scale


def convert(clip: dict, ar: float) -> tuple[list[list[float]], dict]:
    """RefClip -> (frames, stats). Keeps only frames where a hand was seen.

    Frames with no hands are dropped rather than written as zeros, because
    useLiveLetter skips the classifier entirely when no hand is present — so
    an all-zero frame is something the model never sees at inference.
    """
    raw = [f for f in clip["frames"] if f.get("left") or f.get("right")]
    n = len(raw)
    if n == 0:
        return [], {"kept": 0, "dropped_left": False, "dropped_right": False}

    left_n = sum(1 for f in raw if f.get("left"))
    right_n = sum(1 for f in raw if f.get("right"))
    use_left = left_n / n >= MIN_HAND_PRESENCE
    use_right = right_n / n >= MIN_HAND_PRESENCE

    frames = []
    for f in raw:
        vec = np.zeros(HANDS_LEN, dtype=np.float32)
        if use_left:
            write_hand(vec, 0, f.get("left"), ar)
        if use_right:
            write_hand(vec, HAND_COUNT * 3, f.get("right"), ar)
        frames.append([round(float(x), 6) for x in vec])
    return frames, {
        "kept": n,
        "total": len(clip["frames"]),
        "dropped_left": left_n > 0 and not use_left,
        "dropped_right": right_n > 0 and not use_right,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="dir of RefClip .json files")
    ap.add_argument("--out", required=True)
    ap.add_argument("--signer", default="user")
    ap.add_argument("--aspect-ratio", type=float, default=DEFAULT_AR)
    ap.add_argument("--min-frames", type=int, default=6,
                    help="skip clips with fewer hand frames than this; the "
                         "trainer's augmenter can't subsample below 6 either")
    args = ap.parse_args()

    files = sorted(Path(args.src).glob("*.json"))
    if not files:
        raise SystemExit(f"No .json files in {args.src}")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    written = skipped = 0
    with out_path.open("w") as fh:
        for fp in files:
            clip = json.loads(fp.read_text())
            gloss = clip.get("gloss")
            if not gloss:
                print(f"⚠ {fp.name}: no gloss field, skipped")
                skipped += 1
                continue
            frames, st = convert(clip, args.aspect_ratio)
            if len(frames) < args.min_frames:
                print(f"⚠ {fp.name}: only {len(frames)} hand frames "
                      f"(of {st.get('total', 0)}) — skipped, too short to train on")
                skipped += 1
                continue
            note = ""
            if st["dropped_left"]:
                note += " [dropped flickering left hand]"
            if st["dropped_right"]:
                note += " [dropped flickering right hand]"
            fh.write(json.dumps({
                "label": gloss.upper(),
                "signer": args.signer,
                "featureSpecVersion": "0.3",
                "frames": frames,
            }) + "\n")
            written += 1
            print(f"  {fp.name}: {st['kept']}/{st['total']} frames kept{note}")

    print(f"\nwrote {written} samples to {out_path} ({skipped} skipped)")


if __name__ == "__main__":
    main()
