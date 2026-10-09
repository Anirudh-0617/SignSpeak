# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scikit-learn"]
# ///
"""
Fingerspelling MLP trainer.

Reads JSONL from ml/data/fingerspell_asl/, aggregates each sample's frames to
[mean, std] per landmark, trains a sklearn MLP, evaluates on a held-out signer,
and exports plain JSON weights to public/models/fingerspell_asl/.

The TS runtime (src/recognition/classifier.ts) loads that JSON and does the
forward pass by hand — no tf.js dependency for a 128-neuron MLP.

Usage:
  uv run ml/train.py                # train from ml/data/fingerspell_asl/*.jsonl
  uv run ml/train.py --synth        # smoke test with fabricated data
  uv run ml/train.py --data <dir>   # custom input dir
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier

HAND_BLOCK = 63          # 21 landmarks × 3 coords per hand
HANDS_LEN = 2 * HAND_BLOCK  # 126 — left + right hand blocks
BLENDSHAPE_COUNT = 52       # v0.4: MediaPipe FaceLandmarker's 52 blendshapes
FEATURE_LEN = HANDS_LEN + BLENDSHAPE_COUNT  # 178; must match src/perception/normalize.ts
LETTERS = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
SPEC_VERSION = "0.4"


def mirror_frame(v: list[float]) -> list[float]:
    """Horizontal-flip a v0.4 frame: swap L/R hand blocks and negate x-coords
    (hands are wrist-anchored, so x is a delta from wrist — negation flips the
    hand pose without breaking normalization). Blendshapes (dims 126+) are
    passed through unchanged — L/R paired blendshapes (mouthSmileLeft/Right)
    would need name-based swapping, which we don't have here; leaving them
    untouched means the model just doesn't get face-flip augmentation."""
    left, right = list(v[:HAND_BLOCK]), list(v[HAND_BLOCK:HANDS_LEN])
    flipped_hands = right + left
    for i in range(0, HANDS_LEN, 3):
        flipped_hands[i] = -flipped_hands[i]
    return flipped_hands + list(v[HANDS_LEN:])


def aggregate(frames: list[list[float]], n_chunks: int = 1) -> np.ndarray:
    """Sample feature: mean + std per chunk, concatenated.
    n_chunks=1 → 2*FEATURE_LEN dims (static, good for fingerspell holds).
    n_chunks=3 → 6*FEATURE_LEN dims (start/mid/end shape — captures trajectory
    for word-signs where mean+std alone collapses HAPPY/SAD onto each other)."""
    arr = np.asarray(frames, dtype=np.float32)
    if n_chunks <= 1:
        return np.concatenate([arr.mean(axis=0), arr.std(axis=0)])
    # ponytail: np.array_split handles uneven splits (samples aren't fixed len).
    parts = np.array_split(arr, n_chunks, axis=0)
    return np.concatenate([np.concatenate([p.mean(0), p.std(0)]) for p in parts])


def _iter_samples(path: Path, accept_specs: set[str] | None = None):
    """Yield raw sample dicts, filtering out mismatched featureSpecVersion.
    accept_specs=None → strict {SPEC_VERSION} (default). Pass a set to widen —
    used by --hands-only where v0.3 and v0.4 share the same 126-dim hands block."""
    allowed = accept_specs or {SPEC_VERSION}
    files = [path] if path.is_file() else sorted(path.glob("*.jsonl"))
    skipped_versions: dict[str, int] = {}
    for fp in files:
        for line in fp.read_text().splitlines():
            if not line.strip():
                continue
            s = json.loads(line)
            v = s.get("featureSpecVersion", "?")
            if v not in allowed:
                skipped_versions[v] = skipped_versions.get(v, 0) + 1
                continue
            yield s
    if skipped_versions:
        print(f"⚠ skipped samples with mismatched spec: {skipped_versions} "
              f"(allowed: {sorted(allowed)})")


def load_jsonl(path: Path, n_chunks: int = 1) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Accept either a single .jsonl file or a directory containing *.jsonl files.
    Skips samples whose featureSpecVersion doesn't match SPEC_VERSION."""
    X, y, signers = [], [], []
    for s in _iter_samples(path):
        X.append(aggregate(s["frames"], n_chunks))
        y.append(s["label"])
        signers.append(s.get("signer", "anon"))
    return np.asarray(X), np.asarray(y), np.asarray(signers)


def augment_frames(frames: list[list[float]], rng, keep_range=(0.7, 0.95)) -> list[list[float]]:
    """Drop a random 5-30% of frames to simulate signing-pace variation.
    Order preserved. Well-known augmentation for isolated-sign recognition —
    trains the temporal-descriptor model to tolerate different clip lengths."""
    n = len(frames)
    keep_frac = rng.uniform(*keep_range)
    n_keep = max(6, int(round(n * keep_frac)))
    if n_keep >= n:
        return frames
    idx = sorted(rng.choice(n, size=n_keep, replace=False))
    return [frames[i] for i in idx]


def synth_data(n_per_letter: int = 25, n_signers: int = 3, noise: float = 0.05, n_chunks: int = 1):
    """Fabricate an easily-separable dataset — proves the training pipeline plumbing."""
    rng = np.random.default_rng(42)
    prototypes = rng.normal(size=(len(LETTERS), FEATURE_LEN)).astype(np.float32)
    X, y, signers = [], [], []
    for li, letter in enumerate(LETTERS):
        for si in range(n_signers):
            for _ in range(n_per_letter):
                frames = [
                    prototypes[li] + rng.normal(scale=noise, size=FEATURE_LEN)
                    for _ in range(30)
                ]
                X.append(aggregate(frames, n_chunks))
                y.append(letter)
                signers.append(f"sig{si}")
    return np.asarray(X), np.asarray(y), np.asarray(signers)


def dedupe(samples: list[dict]) -> list[dict]:
    """Drop clips whose frames are identical to one already kept.

    ml/data/words_asl/ holds the same WLASL source videos imported twice — once
    by the v0.3 pipeline (wlasl.jsonl, signer='wlasl') and once by v0.4
    (imported_v04.jsonl, signer='wlasl-v04'). On the hands-only view those are
    bit-identical, so 42% of the corpus was redundant AND signer-holdout put
    96% of the test set into the training set as well. That's what made test
    accuracy read 0.965 while live recognition stayed poor: the metric was
    grading the model on clips it had memorised.

    Runs after --hands-only truncation so v0.3/v0.4 pairs actually collide."""
    seen: set[str] = set()
    out, dropped = [], 0
    for s in samples:
        h = hashlib.md5(
            np.asarray(s["frames"], dtype=np.float32).round(6).tobytes()
        ).hexdigest()
        if h in seen:
            dropped += 1
            continue
        seen.add(h)
        out.append(s)
    if dropped:
        print(f"[dedupe] dropped {dropped} duplicate clips ({len(samples)} → {len(out)})")
    return out


def split_indices(y: np.ndarray, signers: np.ndarray, seed: int = 0):
    """Return (train_idx, test_idx, holdout_name). Mirrors signer_split logic
    but returns indices so callers can augment/materialize samples differently
    for train vs test."""
    n = len(y)
    idx = np.arange(n)
    unique = sorted(set(signers.tolist()))
    if len(unique) < 2:
        print(f"⚠ only one signer ('{unique[0]}') — random 80/20 split, "
              "not signer-holdout. Add more signers before trusting accuracy.")
        try:
            tr, te = train_test_split(idx, test_size=0.2, random_state=seed, stratify=y)
        except ValueError as e:
            print(f"⚠ stratified split failed ({e}); unstratified fallback.")
            tr, te = train_test_split(idx, test_size=0.2, random_state=seed)
        return tr, te, f"random-split ({unique[0]} only)"
    holdout = unique[-1]
    mask = signers != holdout
    return idx[mask], idx[~mask], holdout


def signer_split(X, y, signers):
    """Hold out one signer for test. Falls back to random split if only one signer.
    Stratify falls back to unstratified when any class has too few samples."""
    unique = sorted(set(signers))
    if len(unique) < 2:
        # ponytail: single-signer datasets are the common solo-dev case; a random
        # 80/20 split beats a hard crash. Warn so it's obvious in the log.
        print(f"⚠ only one signer ('{unique[0]}') — using random 80/20 split, "
              "not signer-holdout. Add more signers before trusting the accuracy.")
        stratify = y
        try:
            X_tr, X_te, y_tr, y_te = train_test_split(
                X, y, test_size=0.2, random_state=0, stratify=stratify
            )
        except ValueError as e:
            # stratify fails when any class has <2 samples — try unstratified.
            print(f"⚠ stratified split failed ({e}); falling back to unstratified. "
                  "Record more samples per letter for a meaningful test set.")
            X_tr, X_te, y_tr, y_te = train_test_split(
                X, y, test_size=0.2, random_state=0
            )
        return X_tr, y_tr, X_te, y_te, f"random-split ({unique[0]} only)"
    holdout = unique[-1]
    mask = signers != holdout
    return X[mask], y[mask], X[~mask], y[~mask], holdout


def export_model(clf: MLPClassifier, out_dir: Path, n_chunks: int = 1,
                 feature_len: int = FEATURE_LEN) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    layers = [
        {"weights": w.tolist(), "biases": b.tolist()}
        for w, b in zip(clf.coefs_, clf.intercepts_)
    ]
    model = {
        "featureSpecVersion": SPEC_VERSION,
        "aggregation": "mean+std",
        "nChunks": n_chunks,
        "featureLen": 2 * n_chunks * feature_len,
        "hiddenActivation": "relu",
        "outputActivation": "softmax",
        "layers": layers,
    }
    (out_dir / "model.json").write_text(json.dumps(model))
    (out_dir / "labels.json").write_text(json.dumps(clf.classes_.tolist()))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="ml/data/fingerspell_asl")
    ap.add_argument("--synth", action="store_true")
    # Resolved after parsing: --synth must NOT default to the live model dir.
    # It used to, so a bare `uv run ml/train.py --synth` silently overwrote the
    # real fingerspell weights with fabricated ones.
    ap.add_argument("--out", default=None)
    ap.add_argument("--n-chunks", type=int, default=1,
                    help="Split each sample into N time-chunks and compute mean+std "
                         "per chunk. 1 for static signs (fingerspell), 3 for word-signs "
                         "where trajectory matters.")
    ap.add_argument("--augment", type=int, default=0,
                    help="Add N random frame-subsampled copies of each training "
                         "sample. Useful for word-signs when per-class N < 20.")
    ap.add_argument("--mirror", action="store_true",
                    help="Double training set by horizontal-flipping every "
                         "sample (swap L/R hand blocks, negate x-coords). "
                         "Bilateral signs only — measured -14pp on ASL 20-word "
                         "(hand-specific signs pollute), likely fine for "
                         "fingerspell where handedness varies by signer.")
    ap.add_argument("--hidden", type=int, nargs="+", default=[128],
                    help="Hidden layer sizes, e.g. `--hidden 256` or `--hidden 128 64`.")
    ap.add_argument("--random-split", action="store_true",
                    help="Force a stratified random 80/20 split. Use when the "
                         "`signer` field holds import-batch names rather than "
                         "actual people (true of ml/data/words_asl — every clip "
                         "is WLASL footage), where signer-holdout just splits "
                         "by pipeline version and tests on unseen classes.")
    ap.add_argument("--keep-duplicates", action="store_true",
                    help="Skip dedupe. Only for reproducing the old (leaky) "
                         "numbers — duplicate clips land in train AND test.")
    ap.add_argument("--hands-only", action="store_true",
                    help="Truncate v0.4 frames to the 126-dim hands block "
                         "(drop blendshapes). Ablation / rollback path when "
                         "face features overfit on small datasets.")
    ap.add_argument("--seed", type=int, default=0,
                    help="Seed for the train/test split, augmentation and MLP "
                         "init. The noise floor on this corpus is +-0.10, so a "
                         "single seed has twice nearly shipped a false "
                         "conclusion here. Always compare >=3 seeds.")
    ap.add_argument("--classes", default=None,
                    help="Comma-separated allowlist of labels to train on, e.g. "
                         "'YES,NO,HELLO'. Shrinking the label space is the main "
                         "accuracy lever available without recording more data "
                         "(Phase 14) — but it cannot fix a sign that fails to "
                         "COMMIT, which is a dwell/duration problem. Always "
                         "compare over >=3 seeds; the noise floor here is +-0.10.")
    args = ap.parse_args()
    if args.out is None:
        args.out = "ml/.synth_out" if args.synth else "public/models/fingerspell_asl"
    feature_len = HANDS_LEN if args.hands_only else FEATURE_LEN

    if args.synth:
        X, y, signers = synth_data(n_chunks=args.n_chunks)
        print(f"[synth] {len(X)} samples across {len(set(signers))} signers")
        X_tr, y_tr, X_te, y_te, holdout = signer_split(X, y, signers)
    else:
        # ponytail: --hands-only accepts v0.3 too because the 126-dim hands block
        # is bit-identical across specs (v0.4 = v0.3 hands + 52 blendshapes).
        # Merges the two corpora and unlocks a real 2-signer holdout split.
        accept_specs = {"0.3", SPEC_VERSION} if args.hands_only else None
        samples = list(_iter_samples(Path(args.data), accept_specs=accept_specs))
        if not samples:
            raise SystemExit(
                f"No samples found in {args.data}. Capture in the app or pass --synth."
            )
        if args.hands_only:
            samples = [{**s, "frames": [f[:HANDS_LEN] for f in s["frames"]]}
                       for s in samples]
            print(f"[hands-only] truncated frames to {HANDS_LEN} dims")
        if args.classes:
            keep = {c.strip().upper() for c in args.classes.split(",") if c.strip()}
            missing = keep - {s["label"] for s in samples}
            if missing:
                raise SystemExit(f"--classes names labels not in the corpus: {sorted(missing)}")
            before = len(samples)
            samples = [s for s in samples if s["label"] in keep]
            print(f"[classes] kept {len(keep)} of the corpus' labels: {before} → {len(samples)} samples")
        if not args.keep_duplicates:
            samples = dedupe(samples)
        y_all = np.array([s["label"] for s in samples])
        signers_all = np.array([s.get("signer", "anon") for s in samples])
        print(f"[real] {len(samples)} samples across {len(set(signers_all))} signers")
        if args.random_split:
            signers_all = np.full(len(samples), "all")
        tr_idx, te_idx, holdout = split_indices(y_all, signers_all, seed=args.seed)
        train_samples = [samples[i] for i in tr_idx]
        if args.mirror:
            mirrored = [
                {**s, "frames": [mirror_frame(f) for f in s["frames"]]}
                for s in train_samples
            ]
            train_samples = train_samples + mirrored
            print(f"[mirror] +{len(mirrored)} flipped copies (train → {len(train_samples)})")
        if args.augment > 0:
            rng = np.random.default_rng(args.seed)
            extras = []
            for s in train_samples:
                for _ in range(args.augment):
                    extras.append({**s, "frames": augment_frames(s["frames"], rng)})
            print(f"[augment] +{len(extras)} copies (train {len(train_samples)} → "
                  f"{len(train_samples) + len(extras)})")
            train_samples = train_samples + extras
        X_tr = np.array([aggregate(s["frames"], args.n_chunks) for s in train_samples])
        y_tr = np.array([s["label"] for s in train_samples])
        X_te = np.array([aggregate(samples[i]["frames"], args.n_chunks) for i in te_idx])
        y_te = np.array([samples[i]["label"] for i in te_idx])
    print(f"train: {len(X_tr)}   test (holdout signer='{holdout}'): {len(X_te)}")

    clf = MLPClassifier(
        hidden_layer_sizes=tuple(args.hidden),
        max_iter=2000,
        random_state=args.seed,
        # ponytail: lbfgs is deterministic and stable on tiny per-class N;
        # adam's minibatch noise made accuracy swing 70pts on this 84-sample set.
        solver="lbfgs",
    )
    clf.fit(X_tr, y_tr)
    y_pred = clf.predict(X_te)

    print("\nClassification report:")
    print(classification_report(y_te, y_pred, digits=3))

    # ponytail: use labels actually present in y_te ∪ y_pred so sparse test sets
    # (single-signer, few-shot) still print a matrix instead of crashing.
    present = sorted(set(list(y_te) + list(y_pred)))
    print("Confusion matrix (rows=true, cols=pred):")
    print("     " + " ".join(f"{l:>3}" for l in present))
    for tl, row in zip(present, confusion_matrix(y_te, y_pred, labels=present)):
        print(f" {tl:>3} " + " ".join(f"{v:>3}" for v in row))

    export_model(clf, Path(args.out), n_chunks=args.n_chunks, feature_len=feature_len)
    acc = float((y_pred == y_te).mean())
    print(f"\nTest accuracy: {acc:.3f}  → exported to {args.out}/")

    if args.synth:
        # ponytail: single runnable check — synthetic data is trivially separable.
        assert acc > 0.9, f"smoke test failed: synthetic acc={acc:.3f}"


if __name__ == "__main__":
    main()
