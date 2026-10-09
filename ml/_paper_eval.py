# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scikit-learn"]
# ///
"""Paper eval helper: reproduce train.py runs deterministically and dump
structured JSON (confusion matrix + classification report) for figures.
Not part of the app; safe to delete after use."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import train as T
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.neural_network import MLPClassifier


def run_fingerspell():
    accept_specs = {"0.3", T.SPEC_VERSION}
    samples = list(T._iter_samples(Path("ml/data/fingerspell_asl"), accept_specs=accept_specs))
    samples = [{**s, "frames": [f[:T.HANDS_LEN] for f in s["frames"]]} for s in samples]
    samples = T.dedupe(samples)
    y_all = np.array([s["label"] for s in samples])
    signers_all = np.array([s.get("signer", "anon") for s in samples])
    tr_idx, te_idx, holdout = T.split_indices(y_all, signers_all)
    train_samples = [samples[i] for i in tr_idx]
    X_tr = np.array([T.aggregate(s["frames"], 1) for s in train_samples])
    y_tr = np.array([s["label"] for s in train_samples])
    X_te = np.array([T.aggregate(samples[i]["frames"], 1) for i in te_idx])
    y_te = np.array([samples[i]["label"] for i in te_idx])
    clf = MLPClassifier(hidden_layer_sizes=(128,), max_iter=2000, random_state=0, solver="lbfgs")
    clf.fit(X_tr, y_tr)
    y_pred = clf.predict(X_te)
    labels = sorted(set(list(y_te) + list(y_pred)))
    cm = confusion_matrix(y_te, y_pred, labels=labels).tolist()
    report = classification_report(y_te, y_pred, output_dict=True, zero_division=0)
    acc = float((y_pred == y_te).mean())
    return {"labels": labels, "confusion_matrix": cm, "report": report, "accuracy": acc,
            "n_train": len(X_tr), "n_test": len(X_te), "holdout": str(holdout)}


def run_words():
    accept_specs = {"0.3", T.SPEC_VERSION}
    samples = list(T._iter_samples(Path("ml/data/words_asl"), accept_specs=accept_specs))
    samples = [{**s, "frames": [f[:T.HANDS_LEN] for f in s["frames"]]} for s in samples]
    samples = T.dedupe(samples)
    y_all = np.array([s["label"] for s in samples])
    signers_all = np.full(len(samples), "all")
    tr_idx, te_idx, holdout = T.split_indices(y_all, signers_all)
    train_samples = [samples[i] for i in tr_idx]
    rng = np.random.default_rng(0)
    extras = []
    for s in train_samples:
        for _ in range(16):
            extras.append({**s, "frames": T.augment_frames(s["frames"], rng)})
    train_samples_aug = train_samples + extras
    X_tr = np.array([T.aggregate(s["frames"], 5) for s in train_samples_aug])
    y_tr = np.array([s["label"] for s in train_samples_aug])
    X_te = np.array([T.aggregate(samples[i]["frames"], 5) for i in te_idx])
    y_te = np.array([samples[i]["label"] for i in te_idx])
    clf = MLPClassifier(hidden_layer_sizes=(128, 64), max_iter=2000, random_state=0, solver="lbfgs")
    clf.fit(X_tr, y_tr)
    y_pred = clf.predict(X_te)
    labels = sorted(set(list(y_te) + list(y_pred)))
    cm = confusion_matrix(y_te, y_pred, labels=labels).tolist()
    report = classification_report(y_te, y_pred, output_dict=True, zero_division=0)
    acc = float((y_pred == y_te).mean())
    return {"labels": labels, "confusion_matrix": cm, "report": report, "accuracy": acc,
            "n_train": len(X_tr), "n_test": len(X_te), "holdout": str(holdout)}


if __name__ == "__main__":
    fs = run_fingerspell()
    Path("ml/.eval_out_fingerspell").mkdir(parents=True, exist_ok=True)
    Path("ml/.eval_out_fingerspell/report.json").write_text(json.dumps(fs))
    print("fingerspell accuracy:", fs["accuracy"], "n_test:", fs["n_test"])

    w = run_words()
    Path("ml/.eval_out_words").mkdir(parents=True, exist_ok=True)
    Path("ml/.eval_out_words/report.json").write_text(json.dumps(w))
    print("words accuracy:", w["accuracy"], "n_test:", w["n_test"])
