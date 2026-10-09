# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scikit-learn"]
# ///
"""
Grid sweep for words_asl model. Reuses train.py's loaders/augmentation
directly (no subprocess parsing brittleness) and reports a sorted table.

The prior sweep (obs 32) parsed subprocess stdout and choked on multi-layer
runs — this version calls the training pipeline in-process so every config
is scored uniformly.
"""
from __future__ import annotations

import argparse
import itertools
import sys
from pathlib import Path

import numpy as np
from sklearn.neural_network import MLPClassifier

sys.path.insert(0, str(Path(__file__).parent))
from train import _iter_samples, aggregate, augment_frames, split_indices

# Grid: architecture × augment × n_chunks
ARCHES = [(128,), (256,), (128, 64), (256, 128), (256, 64)]
AUGS = [8, 16, 24, 32]
CHUNKS = [3, 4, 5]


def score(samples, n_chunks: int, augment: int, hidden: tuple[int, ...]) -> float:
    y_all = np.array([s["label"] for s in samples])
    signers_all = np.array([s.get("signer", "anon") for s in samples])
    tr_idx, te_idx, _ = split_indices(y_all, signers_all)
    train_samples = [samples[i] for i in tr_idx]
    rng = np.random.default_rng(0)
    extras = []
    for s in train_samples:
        for _ in range(augment):
            extras.append({**s, "frames": augment_frames(s["frames"], rng)})
    train_samples = train_samples + extras
    X_tr = np.array([aggregate(s["frames"], n_chunks) for s in train_samples])
    y_tr = np.array([s["label"] for s in train_samples])
    X_te = np.array([aggregate(samples[i]["frames"], n_chunks) for i in te_idx])
    y_te = np.array([samples[i]["label"] for i in te_idx])
    clf = MLPClassifier(
        hidden_layer_sizes=hidden, max_iter=2000, random_state=0, solver="lbfgs"
    )
    clf.fit(X_tr, y_tr)
    return float((clf.predict(X_te) == y_te).mean())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="ml/data/words_asl",
                    help="Dataset dir (any words_* dir with *.jsonl files)")
    args = ap.parse_args()
    samples = list(_iter_samples(Path(args.data)))
    print(f"[data] {len(samples)} samples")
    results = []
    total = len(ARCHES) * len(AUGS) * len(CHUNKS)
    i = 0
    for arch, aug, nc in itertools.product(ARCHES, AUGS, CHUNKS):
        i += 1
        try:
            acc = score(samples, nc, aug, arch)
        except Exception as e:
            acc = float("nan")
            print(f"[{i}/{total}] arch={arch} aug={aug} nc={nc} FAILED: {e}")
            continue
        print(f"[{i}/{total}] arch={arch} aug={aug} nc={nc} → {acc:.3f}")
        results.append((acc, arch, aug, nc))
    results.sort(reverse=True)
    print("\n=== TOP 10 ===")
    print(f"{'acc':>6}  {'arch':<14} {'aug':>4} {'nc':>3}")
    for acc, arch, aug, nc in results[:10]:
        print(f"{acc:>6.3f}  {str(arch):<14} {aug:>4} {nc:>3}")


if __name__ == "__main__":
    main()
