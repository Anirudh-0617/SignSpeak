# Capture

The capture UI lives in-app (`src/ui/CaptureControls.tsx`), not as a CLI. Run `npm run dev`, allow camera, then:

1. Enter a signer handle (required — used later to split train/test by signer, not by clip).
2. Click a letter (A–Z). The tile shows its current sample count.
3. Click **Record**, sign, click **Stop**. Aim for ~2 s per sample. Static letters need ~30 frames; **J** and **Z** need motion, so record longer.
4. Repeat across letters. Vary lighting, angle, distance, and (ideally) signers.
5. Click **Download JSONL** and save the file under `ml/data/fingerspell_asl/` (letter mode) or `ml/data/words_asl/` (word mode).

## Sample format (one JSON per line)

```json
{
  "label": "A",
  "signer": "anirudh",
  "createdAt": 1731600000000,
  "featureSpecVersion": "0.1",
  "source": "camera",
  "frames": [[/* 225 floats */], ...]
}
```

The vector layout + normalization is documented in [`../feature_spec.json`](../feature_spec.json). Both this UI and the Python trainer (Phase 3) must respect it — if `src/perception/normalize.ts` changes, bump the spec version.

## Coverage bar (rough)

- ≥ 30 samples per letter, from ≥ 3 signers, across varied lighting.
- Phase 3 trainer will hold out one signer for test.
