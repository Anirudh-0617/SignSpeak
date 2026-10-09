"""Real model output for the plates: run the live fingerspell model on the reference letter stills.

Mirrors src/perception/normalize.ts (wrist-anchored, scaled by wrist->middle-MCP, absent hand = zeros)
and src/recognition/classifier.ts (mean+std over the window, ReLU MLP, softmax). A still is one frame,
so its std block is zeros. The letter stills are Kaggle 200x200 crops, so the aspect ratio is 1.
Writes data/signs/predictions.json: { LETTER: { vector: [126], top: [[label, p] x3] } }.

    python -m uv run --no-project --with numpy python analysis/predict_signs.py
"""
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parent
MODEL = REPO / "public" / "models" / "fingerspell_asl"
SIGNS = ROOT / "data" / "signs"


def hand_block(lm, ar=1.0):
    out = np.zeros(63, np.float32)
    if not lm:
        return out
    wx, wy, wz = lm[0]["x"] * ar, lm[0]["y"], lm[0]["z"]
    scale = float(np.hypot(lm[9]["x"] * ar - wx, lm[9]["y"] - wy)) or 1e-6
    for i, p in enumerate(lm[:21]):
        out[i * 3: i * 3 + 3] = [(p["x"] * ar - wx) / scale, (p["y"] - wy) / scale, (p["z"] - wz) / scale]
    return out


def main():
    m = json.loads((MODEL / "model.json").read_text())
    labels = json.loads((MODEL / "labels.json").read_text())
    out = {}
    for letter in "HELOANI":
        f = json.loads((SIGNS / f"{letter}.json").read_text())["frames"][0]
        v = np.concatenate([hand_block(f["left"]), hand_block(f["right"])])
        a = np.concatenate([v, np.zeros_like(v)])  # mean+std of a one-frame window
        for li, layer in enumerate(m["layers"]):
            a = a @ np.asarray(layer["weights"], np.float32) + np.asarray(layer["biases"], np.float32)
            if li < len(m["layers"]) - 1:
                a = np.maximum(a, 0)
        p = np.exp(a - a.max()); p /= p.sum()
        top = np.argsort(-p)[:3]
        out[letter] = {"vector": [round(float(x), 4) for x in v], "top": [[labels[i], round(float(p[i]), 4)] for i in top]}
        print(letter, out[letter]["top"])
    (SIGNS / "predictions.json").write_text(json.dumps(out))


if __name__ == "__main__":
    main()
