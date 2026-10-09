# In-domain clips recorded in the app

Seven HELLO recordings from Anirudh's own camera, 2026-08-08. Raw RefClip JSON
(`{gloss, fps, frames:[{pose,left,right}]}`) plus `imported.jsonl`, the same
clips converted to trainable 126-dim samples by `ml/import_refclips.py`.

## Why imported.jsonl is NOT in ml/data/words_asl/

`train.py` globs every `*.jsonl` in its `--data` dir, so dropping it there
would silently fold it into the next retrain. Measured across 4 split seeds,
that makes the model **worse**:

| seed | baseline | + these clips |
|---|---|---|
| 0 | 0.565 | 0.578 |
| 1 | 0.516 | 0.562 |
| 2 | 0.613 | 0.406 |
| 3 | 0.613 | 0.500 |
| **mean** | **0.577** | **0.512** |

Seven clips of one class nearly doubles HELLO's share of a 33-class corpus
(6 unique → 13) and skews the model toward predicting it. HELLO recall goes up
(held-out frames 40/42 → 42/42), everything else goes down.

To train with them anyway: `--data` a directory containing both, or copy this
file in deliberately.

## What these clips proved

Recognition was never the problem. On held-out clips the current model already
calls HELLO correctly in **40 of 42** frames at p≈1.00. HELLO still never
commits, because each recording only has 7–24 frames with a hand in them —
against a 700 ms dwell plus a 700 ms vote window. Lowering the dwell doesn't
rescue it (0/7 at every setting tried), and neither does holding the pose after
the sign: a frozen hand is out-of-distribution for a motion model and drifts to
YES/DRINK.

## Recording clips that would actually help

Capture the **whole** sign with the hand in frame throughout — rest → sign →
rest — so the clip looks like the WLASL samples (29–94 frames of continuous
hand presence). These stop ~0.3 s after the hand arrives, so they hold the tail
of the motion and little else. And spread new clips across several glosses
rather than stacking one, or the class balance shifts again.
