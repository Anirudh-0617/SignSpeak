# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy"]
# ///
"""
Build reference stick-figure clips for fingerspell letters (A-Z).

WLASL has no per-letter glosses, so extract_reference.py can't produce these.
But the fingerspell training corpus already contains every letter shape —
just in normalized form. src/perception/normalize.ts stores each hand as

    out[i*3 + 0] = (lm[i].x * ar - wrist.x * ar) / scale
    out[i*3 + 1] = (lm[i].y - wrist.y) / scale
    out[i*3 + 2] = (lm[i].z - wrist.z) / scale

    scale = |middle_mcp - wrist| in (x*ar, y) space

Absolute position and size are gone, but the SHAPE is intact and every sample
shares the same frame of reference — so averaging across samples of a letter
yields a canonical shape. Re-anchor at a fixed point with a fixed scale and it
becomes drawable, which is all a reference diagram needs.

Letters are static holds, so each clip is a single frame (ReferenceSkeleton
loops it — a 1-frame loop renders as a still).

Usage:
  uv run ml/extract_letter_reference.py
  uv run ml/extract_letter_reference.py --letters A B C
"""
from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

import numpy as np

HAND_COUNT = 21
HAND_DIMS = HAND_COUNT * 3  # 63 per hand
SRC = Path("ml/data/fingerspell_asl")
OUT = Path("public/reference-signs")

# ponytail: fit each letter to its own bounding box rather than a shared
# scale. Letters extend in different directions (B/L point up, G/H point
# sideways), so one global scale that clears every extent leaves most letters
# tiny. Per-letter fit renders them all at comparable visual size.
# The reference canvas is 640x480 and ReferenceSkeleton mirrors it in CSS to
# match the live camera, so a right hand here reads as the user's right hand.
FILL = 0.62  # fraction of the canvas the hand's longest axis should span
ASPECT = 4 / 3  # canvas aspect the browser renders at


def canonical_hands(frames: list[list[float]]) -> tuple[np.ndarray | None, np.ndarray | None]:
    """Mean left/right hand blocks across frames. None if a hand is all-zero
    (absent hands are written as zeros by normalize)."""
    arr = np.asarray(frames, dtype=np.float64)
    if arr.ndim != 2 or arr.shape[1] < 2 * HAND_DIMS:
        return None, None
    out: list[np.ndarray | None] = []
    for off in (0, HAND_DIMS):
        block = arr[:, off : off + HAND_DIMS]
        # Keep only frames where this hand was actually present.
        present = block[np.abs(block).sum(axis=1) > 1e-6]
        out.append(present.mean(axis=0) if len(present) else None)
    return out[0], out[1]


def to_landmarks(block: np.ndarray) -> list[dict]:
    """Invert the wrist-anchored normalization and fit to the draw canvas."""
    pts = block.reshape(HAND_COUNT, 3).astype(float)
    # x carries an ASPECT factor from normalize — undo it so the shape isn't
    # horizontally stretched on a 4:3 canvas.
    xs = pts[:, 0] / ASPECT
    ys = pts[:, 1]

    span_x, span_y = np.ptp(xs), np.ptp(ys)
    # Compare spans in canvas-fraction terms: x is measured against the wider
    # axis, so scale its allowance by ASPECT before picking the binding one.
    scale = FILL / max(span_x / ASPECT, span_y, 1e-6)

    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    return [
        {
            "x": float(0.5 + (x - cx) * scale),
            "y": float(0.5 + (y - cy) * scale),
            "z": float(z * scale),
        }
        for x, y, z in zip(xs, ys, pts[:, 2])
    ]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(SRC), help="Dir of fingerspell *.jsonl")
    ap.add_argument("--out", default=str(OUT), help="Output dir for RefClip JSON")
    ap.add_argument("--letters", nargs="*", default=None, help="Only these labels")
    ap.add_argument("--overwrite", action="store_true", help="Replace existing files")
    args = ap.parse_args()

    src, out = Path(args.src), Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    files = sorted(src.glob("*.jsonl"))
    if not files:
        raise SystemExit(f"no *.jsonl under {src}")

    # Accumulate per-hand blocks per label across every sample.
    acc: dict[str, list[np.ndarray]] = defaultdict(list)
    acc_side: dict[str, list[str]] = defaultdict(list)
    for f in files:
        with f.open() as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                s = json.loads(line)
                label = str(s.get("label", "")).upper()
                if not label or (args.letters and label not in args.letters):
                    continue
                left, right = canonical_hands(s.get("frames") or [])
                if left is not None:
                    acc[label].append(left)
                    acc_side[label].append("left")
                if right is not None:
                    acc[label].append(right)
                    acc_side[label].append("right")

    if not acc:
        raise SystemExit("no usable samples found")

    written = 0
    for label in sorted(acc):
        blocks = acc[label]
        sides = acc_side[label]
        # Dominant hand = whichever side appears more often in the corpus.
        dom = "right" if sides.count("right") >= sides.count("left") else "left"
        sel = [b for b, s in zip(blocks, sides) if s == dom]
        shape = np.mean(sel, axis=0)
        frame = {"pose": None, "left": None, "right": None}
        frame[dom] = to_landmarks(shape)
        clip = {"gloss": label, "fps": 1, "frames": [frame]}
        path = out / f"{label}.json"
        if path.exists() and not args.overwrite:
            print(f"  {label}: skip (exists)")
            continue
        path.write_text(json.dumps(clip))
        written += 1
        print(f"  {label}: {dom} hand from {len(sel)} samples → {path.name}")

    print(f"\nWrote {written} letter references → {out}")


if __name__ == "__main__":
    main()
