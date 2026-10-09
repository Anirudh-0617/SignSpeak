# SignSpeak

ASL fingerspelling + word-signs → editable transcript, in the browser. Everything runs client-side: MediaPipe hand tracking, a small MLP classifier with a hand-rolled TypeScript forward pass, no server round-trip per frame.

See [`docs/`](./docs) for the full plan — start with [`docs/README.md`](./docs/README.md) then follow [`docs/ROADMAP.md`](./docs/ROADMAP.md).

> **Research preview.** Fingerspelling is solid (98.3% on the Kaggle holdout). Word signs are not: on a deduplicated split the 33-class word model scores **~0.57**, not the 0.93+ earlier figures, which counted duplicate clips twice. The corpus holds only 309 unique clips. More data is the fix (Phase 14), not more tuning.

## Dev

Requires Node 23.6+ (`npm run golden` runs `.ts` directly via native type-stripping) and [`uv`](https://docs.astral.sh/uv/) for the Python ML scripts.

```bash
npm install
npm run dev
```

<!-- AUTO-GENERATED: package.json scripts -->
| Command | Description |
|---|---|
| `npm run dev` | Vite dev server (also runs the `/api/nvidia` translation proxy) |
| `npm run build` | `tsc -b` type-check, then `vite build` → `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | oxlint |
| `npm run format` | Prettier, writes in place |
| `npm run golden` | Recognition characterization test. Replays recorded frames through the real `Recognizer` and exits 1 on any drift from `tools/golden.json` |
<!-- /AUTO-GENERATED -->

Run `npm run golden` before merging anything that touches `src/recognition/`, `src/perception/normalize.ts`, or the model files. To re-record after an intended change: `node tools/golden.ts`.

## Environment

Copy `.env.example` → `.env`.

<!-- AUTO-GENERATED: .env.example -->
| Variable | Required | Description |
|---|---|---|
| `VITE_NVIDIA_API_KEY` | Only for the Translate button | NVIDIA API key ([build.nvidia.com](https://build.nvidia.com), free tier). Read by the Vite **dev** proxy and injected server-side; it is never shipped to the browser |
<!-- /AUTO-GENERATED -->

## Routes

| Path | What |
|---|---|
| `/` | Animated landing page |
| `/login` | Placeholder sign-in (no backend; stores the email in `localStorage`) |
| `/app` | The app |

All three are lazy-loaded.

## Modes

Three tabs in the app header:

- **Transcribe**: sign freely into an editable transcript. Fingerspell mode for letters, Word mode for the 33-class word vocabulary, Both mode for either. **Translate** turns the gloss into English (N=3 alternates, editable, spoken aloud via browser TTS).
- **Practice**: pick a target sign and get scored against the reference stick figure. The full alphabet plus 21 conversational word signs across 5 categories (Greetings, Self & other, Actions, Questions, Things).
- **Sentence**: build full sentences from templates (e.g. `MY NAME [FINGERSPELL]`). Walks you through each slot: word signs are scored, fingerspell slots collect letters as you hold them.

On first visit a **3-sign tutorial** auto-opens (HELLO → THANK-YOU → YES) so non-signers can experience the pipeline. "Restart tutorial" in the header re-opens it anytime.

## Use (Transcribe)

1. Open the app, allow camera.
2. Sign a letter (fingerspell mode) or a word (word mode), hold it briefly (~0.5 s). It commits into the transcript.
3. Idle ~1.5 s (hand lowered) → auto-space.
4. Backspace / Clear / edit the transcript freely (Backspace + Space keys work too).

## Retrain

Models live in `public/models/{fingerspell,words}_asl/`. Datasets are pre-imported into `ml/data/{fingerspell,words}_asl/*.jsonl`; drop more JSONLs there (from the in-app Capture mode) and re-run:

```bash
uv run ml/train.py --data ml/data/fingerspell_asl --out public/models/fingerspell_asl

# Words: every flag here is load-bearing.
#   --n-chunks 5    without it each sign collapses to one mean+std, so signs that
#                   differ only in motion become identical
#   --random-split  the `signer` field holds import-batch names, not people
uv run ml/train.py --data ml/data/words_asl --out public/models/words_asl \
  --n-chunks 5 --augment 16 --hidden 128 64 --hands-only --random-split
```

`train.py` dedupes identical clips by default (`--keep-duplicates` reproduces the old inflated numbers). Use `--seed` and compare **at least 3 seeds** before believing a gain; a single seed has twice nearly shipped a regression. `--classes YES,NO,HELLO` trains on a vocabulary subset. Smoke-test the pipeline without touching the live model: `uv run ml/train.py --synth`.

## Add a new word sign

```bash
uv run ml/download_wlasl.py MY NAME YOU              # per-gloss WLASL clips → ml/data/wlasl_src/<GLOSS>/
uv run ml/import_media.py --src ml/data/wlasl_src --out ml/data/words_asl/imported_new.jsonl --signer wlasl
uv run ml/train.py --data ml/data/words_asl --out public/models/words_asl \
  --n-chunks 5 --augment 16 --hidden 128 64 --hands-only --random-split
uv run ml/extract_reference.py                       # extracts new reference stick figures (skips existing)
```

Then add the new glosses to `src/practice/lessons.ts` and/or a new `SentenceBuilder` template. Glosses must match `public/models/words_asl/labels.json` exactly.

Landmarks are x-scaled by aspect ratio, and the live camera is **4:3**. The same clip scores p(HELLO)=1.00 at 4:3 and ~0 at 16:9. `import_media.py` reads the ratio from each video, but in-app recordings (`ml/import_refclips.py`) store raw landmarks, so pass `--aspect-ratio` there if the recording camera wasn't 4:3.

## Recognition core (`src/core.ts`)

`src/core.ts` is the public surface of the recognizer: `Recognizer`, `Classifier`, `Smoother`, `normalize`, the hand landmarker, and the `CameraSource` / `VideoElementSource` inputs. It imports no React, Zustand, or DOM beyond a passed-in element, so non-React shells can reuse it. Those shells are the golden harness today, and an in-call (Google Meet) extension planned for a separate repo. Shells import from `src/core.ts` only, never from `src/` internals. Plan and status: [`docs/PHASE_18_MEET.md`](./docs/PHASE_18_MEET.md). `tools/call-probe.js` is a DevTools-console probe for checking whether a call client's self-view video is readable.

## Deploy

The app is a static build, so any static host works:

```bash
npm run build      # → dist/
npx vercel --prod  # or: netlify deploy --prod --dir dist
```

The model JSON files under `public/models/` ship with the build. First page load fetches the MediaPipe hand model (~8 MB) from Google's CDN.

**Translate does not work on a static deploy.** The NVIDIA proxy exists only in the Vite dev server, so production needs a real backend proxy that holds the key. Everything else (transcribe, practice, sentence builder) works fully static.
