# SignSpeak — project context

ASL fingerspelling → editable transcript, in the browser. Full plan lives in [docs/](./docs); start with [docs/README.md](./docs/README.md).

## Current state (2026-07-28)

| Phase | Status | Notes |
|---|---|---|
| 0 · Scaffold | done | Vite + React 19 + TS + Tailwind v4 + oxlint |
| 1 · Perception | done | HandLandmarker overlay + FPS badge |
| 2 · Capture | done | In-app capture UI; feature spec v0.3 (hands-only, wrist-anchored, 126 dims) |
| 3 · Fingerspell | done | MLP classifier, hand-rolled TS forward pass. ASL 98.3% on Kaggle holdout |
| 4 · MVP UI | done | Transcript textarea, auto-space on 1.5 s idle, backspace/clear, Controls bar |
| 5 · Word-signs | done | ASL 33-class model, hands-only, `--n-chunks 5 --augment 16 --hidden 128 64`. **Accuracy restated 2026-08-06 — the old 0.965 / ≥0.727 figures were measurement error, not capability.** `ml/data/words_asl/` imports the same WLASL videos twice (v0.3 → `wlasl.jsonl`, v0.4 → `imported_v04.jsonl`); on the hands-only view those copies are bit-identical, so **42% of the corpus was duplicate and 96% of the held-out "signer" was also in training**. Measured on a deduped split: **0.935 leaky → 0.565 honest.** Only 309 unique clips exist (HELLO/MY/HELP/THANK-YOU have just 6 each). `train.py` now dedupes by default (`--keep-duplicates` reproduces the old numbers) and takes `--random-split`, since the `signer` field holds import-batch names, not people. Live model deliberately NOT retrained — the deduped model has 40% less data and showed no live gain. Real fix is Phase 14. Rollback backup at `public/models/words_asl.pre-handsonly.bak/` |
| 6 · Continuous segmentation | done | Smoother now accepts `handsPresent` to release commit lock on hands-out-of-frame; word-mode Smoother uses longer window/dwell/release; word commits append trailing space |
| 7 · LLM translation | mvp | Translate button in Transcript → `src/translate/translate.ts` → `/api/nvidia/v1/chat/completions` (dev: Vite proxy; prod: Vercel function `api/nvidia/v1/chat/completions.ts`, model pinned + max_tokens/n capped, 8 KB body cap, in-memory 20 req/10 min per IP — per instance, not global) → NVIDIA `nvidia/nemotron-3-ultra-550b-a55b` (thinking off; mini-4b hit EOL 2026-08-26 → 410). Key: `NVIDIA_API_KEY` (`.env` locally, Vercel env var in prod; old `VITE_NVIDIA_API_KEY` still read in dev). Deploy: Vercel, `vercel.json` SPA rewrite |
| 7.5 · Translation buffed | done | Gloss chips w/ confidence + delete (M1); few-shot prompt + N=3 alternates + editable output (M2); browser TTS auto-speak on translate (M3); PWA manifest + install button (M4); feedback link + research-preview framing (M5). Plan: `docs/PHASE_7_5_TRANSLATION.md` |
| 8 · Glove | not started | Interface already designed (`InputSource`) |
| 9 · Practice mode | done | M1–M4 shipped prior sessions. M5 (2026-07-28) — 23 word signs in `LESSONS` across 5 categories; `PASS_CONFIDENCE` split to mode-aware `Record` (fingerspell=0.6, words=0.4) to account for flatter softmax on dynamic-sign MLP. Plan: `docs/PHASE_9_PRACTICE.md` |
| 10 · Face + expression tracking | done | M1–M4 shipped. **M5 shelved as failed experiment (2026-07-28)** — face features overfit at N=226 (0.727 → 0.609). Model rolled back to hands-only via `--hands-only`. Face infra kept in place (perception, feature spec v0.4) — dormant until Phase 15 unlocks it with more data. Plan: `docs/PHASE_10_FACE_EXPRESSION.md` |
| 11 · Hand tracking tune-up | skipped | Confidence knobs speculative; hysteresis would create train/serve skew vs stateless Python importer. Revisit if flicker or false-positive detects become measurable |
| 12 · Body pose overlay | done | `src/perception/pose.ts` mirrors `face.ts` (10 Hz throttle). `CameraView` renders amber skeleton between face dots and hands. **Display only** — not wired into feature vector |
| 13 · Pose-gated practice | done | M1 torso-visibility gate (Aug 3). M2 reference stick figure (Aug 4) — `ReferenceSkeleton` fetches `public/reference-signs/<GLOSS>.json` and renders amber pose + pink/purple hands, mirrored. Clips extracted from WLASL source via `ml/extract_reference.py`; 25 glosses × ~350 KB avg = 8.9 MB total, served on-demand. Video-mp4 fallback path deleted (dead) |
| 13.5 · Conversational vocab + Sentence Builder | partial | 10 new WLASL glosses downloaded (MY/NAME/YOU/WHAT/WANT/NEED/MEET/NICE/GO/KNOW = 93 clips). Import + retrain + reference extraction + lesson trim + SentenceBuilder UI still pending. Templates: MY NAME [FS], YOU NAME WHAT, NICE MEET YOU, PLEASE HELP, I WANT [FS/word]. Enables "small conversation" flow |
| **13.6 · Judge-friendly demo mode** | planned | Hackathon judges don't sign — need a zero-knowledge onboarding. First-visit overlay walks a non-signer through 3 canonical signs (HELLO, THANK-YOU, YES) with the reference stick figure emphasized and a "copy the amber figure" hint. Auto-advances on pass, shows the transcript populating. Ends with a nudge into Sentence Builder ("Try MY NAME [your name]"). Reuses `PracticeSession` under a tutorial wrapper — no new perception, just guided flow |
| 14 · Data expansion push | planned | Own-recording UI ships. Target N≥500/class. Real bottleneck for accuracy gains — everything above ~0.727 real depends on this |
| 15 · Re-enable face+pose in classifier (v0.5) | planned | Blocked on Phase 14 |
| **16 · UI polish & design pass (Fable 5)** | done | Shipped 2026-08-04, all 3 waves: `src/ui/tokens.ts` design tokens, a11y sweep (arrow-key tabs, focus rings), `Spinner`/`Alert` components, empty states, motion-safe animation pass, typography scale, ReferenceSkeleton stage styling, code-split DemoTutorial + SentenceBuilder (first load −9 kB). Report: [`docs/PHASE_16_DONE.md`](./docs/PHASE_16_DONE.md) |
| **17 · Animated landing page** | done | Shipped 2026-08-05, all 4 waves. Landing at `/`, app at `/app` (both lazy). React Router 7 + Framer Motion. 6 sections: hero (letter stagger + dot-grid drift), what-it-does (SVG icons), live preview (reuses `ReferenceSkeleton`), tabbed feature explainer (auto-cycle 4.2s + CSS mocks), CTA, footer. Meta tags + OG. Landing chunk 142 kB / 45 kB gzip; app bundle unchanged. Report: [`docs/PHASE_17_DONE.md`](./docs/PHASE_17_DONE.md) |
| **19 · Landing redesign ("Gloss")** | done | 2026-09-30, branch `phase-19-landing-redesign`. 3-variant bake-off (Gloss / Instrument / Hands), Gloss shipped at `/`. Editorial gloss-notation look, graphite + one yellow highlighter accent that only marks "the sign being made now". Real landmark clips only (no generated hand imagery). Landing-only modules in `src/landing/`: `SignPlayer` (lazy canvas player, pauses off-screen, reduced-motion stills), `signClip.ts`, `content.ts` (**every landing claim lives here** — incl. honest 56.5% word accuracy and the Translate-sends-text privacy caveat), `motion.tsx` + `landing.css` (free transitions.dev recipes). `/app` untouched (golden OK). Rollback: `git checkout landing-v17-backup -- src/landing src/index.css index.html`; unchosen variants in `landing-backup/variants/` |
| **20 · App redesign (Gloss in /app)** | done | 2026-09-30. `/app`, login and tutorial moved onto the landing's Gloss system; violet Tailwind remap deleted. **Tokens** `--g-*` live at `:root` in `index.css`, exposed as Tailwind utilities (`text-ink`, `bg-plate`, `bg-mark`, `border-rule`…); component classes in `src/ui/gloss.css` (moved from landing, shared). **Yellow = the sign being made now**, nothing else. Signature: `Composer` replaces LiveLetter — the candidate's highlighter IS the hold timer (`--hold` @property), full = committed. Shell: `ModeTabs` (sliding rule), `ThemeSwitch` (shared). Transcribe = desk layout (camera 7fr / sticky rail 5fr: Now + transcript; reference row below). Practice = contents page + desk session (verdict `!`/`?` in the action zone, R / → keys). Sentence = numbered gloss examples + slot strip. Dev tools (capture, record reference, blendshapes) only with `?lab` (`src/ui/lab.ts`). Brief: [`docs/PHASE_20_APP_REDESIGN.md`](./docs/PHASE_20_APP_REDESIGN.md) |
| **21 · Explainer video (motion as code)** | done | 2026-10-06. `motion/` = the "Motion as Code" kit (pdoom-video engine, MIT), reskinned to Gloss. 57 s, 1080p60, 9 plates `motion/app/src/scenes/ss_*.ts` + toolkit `_gloss.ts`. Real landmark clips, real model output (`analysis/predict_signs.py`), numbers only from `content.ts`, burned-in captions (Deaf audience). VO = Kokoro-82M (Apache 2.0, local). Output `motion/out/signspeak_final.mp4` (gitignored). How-to: `motion/README.md` |

## Architecture snapshot

- **Perception**: MediaPipe `HandLandmarker` in the browser AND in the Python importer — same model, same landmarks. This match was the key accuracy fix.
- **Feature spec v0.4**: 178-dim = hands (126, unchanged v0.3 block: per-hand wrist-anchored, x×AR) + 52 face blendshapes (raw scores, canonical index order). Absent hand/face → zeros. Canonical source: `src/perception/normalize.ts`; JSON: `ml/feature_spec.json`. **Classifier back-compat:** runtime slices input to `model.featureLen`, so 126-dim ASL models keep working during the v0.3 → v0.4 rollout.
- **Classifier**: sklearn `MLPClassifier(128,)` trained in Python → exported as plain JSON weights → hand-rolled forward pass in `src/recognition/classifier.ts`. No tf.js dependency yet.
- **State**: Zustand (`src/state/store.ts`) — transcript, capture buffer, samples, mode/language.
- **Runtime models**: `public/models/{fingerspell,words}_asl/{model,labels}.json`. `useLiveLetter(mode)` fetches `/models/${mode}_asl/`.
- **Data**: `ml/data/{fingerspell,words}_asl/` — trainer globs all `*.jsonl` in a dir and filters by `featureSpecVersion`.

## Decisions worth remembering

- **Dropped Holistic in the browser.** Holistic's hand submodel produced slightly different landmarks than the standalone HandLandmarker used by the Python importer → poor live accuracy despite 98% Kaggle holdout. Face/pose overlay parked for Phase 5+.
- **No tf.js yet.** 128-neuron MLP forward is 30 lines of TS; a 2 MB runtime isn't worth it until Phase 5's trajectory model earns it.
- **Ponytail comments** (`// ponytail: …`) mark deliberate shortcuts and their ceilings.
- **Feature spec version bumps** (0.1 → 0.2 → 0.3) — trainer auto-skips samples with mismatched `featureSpecVersion`.
- **Single-signer fallback** in `signer_split()` — random 80/20 stratified split with unstratified fallback for tiny classes.
- **Auto-space** fires 1500 ms after last stable commit (once per idle gap).
- **Smoother** releases `lastCommitted` after 300 ms of low-confidence — this is what makes "OO" in COOL work.

## Common commands

```bash
npm run dev                # Vite dev server
npm run build              # tsc + vite build
npm run lint               # oxlint

uv run ml/train.py --data ml/data/fingerspell_asl --out public/models/fingerspell_asl
# Words: --hands-only and --n-chunks 5 are load-bearing. Dropping --n-chunks
# collapses each sign to a single mean+std, making motion-differentiated signs
# mathematically identical. --random-split because `signer` holds import-batch
# names, not people (signer-holdout tests on classes it never trained on).
uv run ml/train.py --data ml/data/words_asl --out public/models/words_asl \
  --n-chunks 5 --augment 16 --hidden 128 64 --hands-only --random-split

uv run ml/train.py --synth   # smoke-test pipeline; writes to ml/.synth_out/, never the live model
uv run ml/import_media.py --src <dir> --out ml/data/<mode>_asl/imported.jsonl --signer <name>
uv run ml/sweep.py --data ml/data/words_asl   # hyperparameter grid search

graphify update .          # refresh knowledge graph (AST-only, free)
```

## Datasets already imported (v0.3)

- **ASL fingerspell**: Kaggle `grassknoted/asl-alphabet` → `ml/data/fingerspell_asl/imported.jsonl` (3475 samples)
- **Words ASL**: WLASL 23-class subset → `ml/data/words_asl/{wlasl,affection}.jsonl` (218 samples). Classes: YES/NO/HELLO/HELP/THANK-YOU/PLEASE/HAPPY/SAD/SORRY/BOOK + MOTHER/SCHOOL/WATER/TIRED/READ/EAT/FRIEND/SLEEP/DRINK/DOG + FAMILY/KISS/LIKE. Download more via `uv run ml/download_wlasl.py <GLOSS> ...` then re-import + retrain.

_ISL removed 2026-07-26 — ASL-only project going forward._

## graphify

This project has a knowledge graph at `graphify-out/` with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
