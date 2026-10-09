# Graph Report - 101  (2026-10-06)

## Corpus Check
- 265 files · ~1,985,422 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1598 nodes · 4055 edges · 106 communities (90 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 70 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bc5cdd63`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- compilerOptions
- devDependencies
- package.json
- compilerOptions
- CameraSource.ts
- App.tsx
- plugins
- CameraSource
- tsconfig.json
- vite.config.ts
- What You Must Do When Invoked
- ROADMAP — SignSpeak
- PRD — SignSpeak
- main
- graphify reference: extra exports and benchmark
- graphify reference: query, path, explain
- graphify reference: add a URL and watch a folder
- graphify reference: incremental update and cluster-only
- Capture
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- CLAUDE.md
- CLAUDE.md
- extraction-spec.md
- AGENTS.md — Build rules for SignSpeak
- Smoother
- AGENTS.md — Build rules for SignSpeak
- graphify reference: extra exports and benchmark
- ARCHITECTURE — SignSpeak
- Help record training data for SignSpeak
- extract_reference_poses.py
- ML_PIPELINE — SignSpeak
- graphify reference: query, path, explain
- SignSpeak — project context
- In-domain clips recorded in the app
- 2. Stage models (built in roadmap order)
- SignSpeak — Continuous Sign Language → Text Translation
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- Fabricate an easily-separable dataset — proves the training pipeline plumbing.
- graphify reference: GitHub clone and cross-repo merge
- Drop a random 5-30% of frames to simulate signing-pace variation.     Order pres
- Fabricate an easily-separable dataset — proves the training pipeline plumbing.
- graphify reference: transcribe video and audio
- Hold out one signer for test. Falls back to random split if only one signer.
- lerp
- tsconfig.json
- Fabricate an easily-separable dataset — proves the training pipeline plumbing.
- Return (train_idx, test_idx, holdout_name). Mirrors signer_split logic     but r
- rgba
- Horizontal-flip a single 126-dim frame: swap L/R hand blocks and negate     ever
- Sample feature: mean + std per chunk, concatenated.     n_chunks=1 → 2*FEATURE_L
- Yield raw sample dicts, filtering out mismatched featureSpecVersion.
- Accept either a single .jsonl file or a directory containing *.jsonl files.
- Return (train_idx, test_idx, holdout_name). Mirrors signer_split logic     but r
- Mirror src/perception/normalize.ts (v0.3): per-hand wrist-anchored.
- stroke.ts
- graphify
- MediaPipe returns hand_landmarks + handedness in parallel lists.
- Turn a single-frame vector into n frames with small Gaussian jitter.     Mimics
- Sample feature: mean + std over frames per component (2 * FEATURE_LEN dims).
- sfx_mix.py
- Drop a random 5-30% of frames to simulate signing-pace variation.     Order pres
- graphify reference: extraction subagent prompt
- Fabricate an easily-separable dataset — proves the training pipeline plumbing.
- 12 · B-spike results — Google Meet, 2026-09-24
- compilerOptions
- Turn a single-frame vector into n frames with small Gaussian jitter.     Mimics
- plugins
- README.md
- Lyrics
- type.ts
- core.ts
- render.ts
- Engine
- align_vo.py
- compilerOptions
- AudioData
- main.ts
- compilerOptions
- timeline.ts
- Motion as Code — voiceover video (original kit)
- tsconfig.scripts.json
- Compositor
- prompt-data.ts
- predict_signs.py
- vite.config.ts

## God Nodes (most connected - your core abstractions)
1. `prog()` - 81 edges
2. `lerp()` - 77 edges
3. `rgba()` - 73 edges
4. `clamp()` - 73 edges
5. `F` - 56 edges
6. `font()` - 54 edges
7. `setWorld()` - 54 edges
8. `Cam` - 49 edges
9. `Word` - 43 edges
10. `PostOverrides` - 43 edges

## Surprising Connections (you probably didn't know these)
- `CameraViewImpl()` --indirect_call--> `video()`  [INFERRED]
  src/ui/CameraView.tsx → motion/app/scripts/render.ts
- `Hero()` --references--> `HERO_SEQUENCE`  [EXTRACTED]
  landing-backup/variants/Gloss.tsx → src/landing/content.ts
- `How()` --references--> `HERO_SEQUENCE`  [EXTRACTED]
  landing-backup/variants/Hands.tsx → src/landing/content.ts
- `Hero()` --references--> `HERO_SEQUENCE`  [EXTRACTED]
  landing-backup/variants/Instrument.tsx → src/landing/content.ts
- `framesFor()` --calls--> `normalize()`  [EXTRACTED]
  tools/golden.ts → src/perception/normalize.ts

## Import Cycles
- None detected.

## Communities (106 total, 16 thin omitted)

### Community 0 - "compilerOptions"
Cohesion: 0.10
Nodes (28): react, LiveMode, LiveLetterState, GlossToken, Sample, State, useStore, speak() (+20 more)

### Community 1 - "devDependencies"
Cohesion: 0.05
Nodes (37): 1.1 Install router + animation lib, 1.2 Route setup, 1.3 Redirect legacy, 1. Hero, 2. What it does (visual explainer), 3. Live preview strip, 4. Three-tab feature explainer, 5. CTA (repeat + final push) (+29 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (33): 1.1 · Design tokens file, 1.2 · Accessibility sweep, 1.3 · Loading states, 1.4 · Error states, 1.5 · Empty states, 1.6 · Header restyle, 1.7 · Spacing rhythm normalization, 2.1 · Motion pass (+25 more)

### Community 3 - "compilerOptions"
Cohesion: 0.13
Nodes (27): run_fingerspell(), run_words(), main(), score(), aggregate(), augment_frames(), dedupe(), export_model() (+19 more)

### Community 4 - "CameraSource.ts"
Cohesion: 0.21
Nodes (8): Box, HAND_EDGES, loadClip(), loadGlossFonts(), loadPredictions(), Landmarks, lineOf(), wordOf()

### Community 5 - "App.tsx"
Cohesion: 0.07
Nodes (28): 1 · What's already true, 2 · The constraint that shapes everything, 3 · The blocker nobody has mentioned, 4 · Skills — what's needed, what already exists, 5 · Proposed panel, 6 · Mapping onto the work that's actually left, 7 · The steps, in order, 8 · Quota-exhaustion fallback — runbook (+20 more)

### Community 6 - "plugins"
Cohesion: 0.15
Nodes (27): ensure_pose_model(), extract_clip(), _lm_dict(), main(), make_hand_landmarker(), make_pose_landmarker(), pick_video(), Path (+19 more)

### Community 7 - "CameraSource"
Cohesion: 0.07
Nodes (28): Browser TTS (new file, ~15 lines), Correction log (persisted), Data model, Gloss stream (new state slice), Goals, LLM changes, M1 — Gloss chips + editable stream (~90 min), M2 — Better prompt + N=3 alternates + editable translation (~60 min) (+20 more)

### Community 8 - "tsconfig.json"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 9 - "vite.config.ts"
Cohesion: 0.18
Nodes (11): 10 · Multi-platform: three mechanisms, not one, 11 · Next gate: run the probe (needs a human), 2 · Architecture — one core, many shells, 3 · The refactor is only safe with a characterization test, 4 · Extension payload — fixed, not growing, 5 · Open risks to test early, 6 · Order of work, Hard requirement: bundle the WASM (+3 more)

### Community 10 - "What You Must Do When Invoked"
Cohesion: 0.15
Nodes (13): Cross-cutting (every phase), Phase 0 — Scaffold, Phase 1 — Perception (landmarks on screen), Phase 2 — Data capture tool, Phase 3 — Fingerspelling model (MVP core), Phase 4 — Text output UI (MVP ship), Phase 5 — Word-signs (v0.2), Phase 6 — Continuous segmentation (v0.3) (+5 more)

### Community 11 - "ROADMAP — SignSpeak"
Cohesion: 0.13
Nodes (18): HEX, absorb(), at1(), bridge(), FACES, FigureOpts, lerpPts(), mapPt() (+10 more)

### Community 13 - "PRD — SignSpeak"
Cohesion: 0.09
Nodes (21): Component structure, Data model, Goals, M1 — Skeleton + progress store (day 1, ~90 min), M2 — Live classification wired into practice (day 1, ~60 min), M3 — Pass detection + progress persistence (day 2, ~90 min), M4 — Reference videos + descriptions (day 2, ~60 min), M5 — Words expansion (day 3, ~45 min) (+13 more)

### Community 14 - "main"
Cohesion: 0.10
Nodes (26): PASS_CONFIDENCE, ALPHABET, LESSONS, Sign, WORDS_BY_CATEGORY, Attempt, PracticeState, ProgressEntry (+18 more)

### Community 15 - "graphify reference: extra exports and benchmark"
Cohesion: 0.38
Nodes (6): convert(), main(), ndarray, Mirror of writeHand() in src/perception/normalize.ts., RefClip -> (frames, stats). Keeps only frames where a hand was seen.      Frames, write_hand()

### Community 16 - "graphify reference: query, path, explain"
Cohesion: 0.43
Nodes (6): canonical_hands(), main(), ndarray, Mean left/right hand blocks across frames. None if a hand is all-zero     (absen, Invert the wrist-anchored normalization and fit to the draw canvas., to_landmarks()

### Community 17 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.09
Nodes (21): 0. ✅ Design skills made personal — done 2026-08-15, 1. 🟡 Browser-verify the six unverified commits — **the real work, still open**, §1 · The HELLO finding (this session) — read before touching recognition, §2 · Panel skill + OmniRoute — added 2026-08-14, 2. Tune `MOTION_IS_WORD` from live use — ~2 min after step 1, 3. Record clips that capture whole signs — the only real accuracy lever, 4. ✅ Ponytail cuts applied 2026-08-15 — partially, on purpose, 4b. 🆕 Blank first paint on every route — fixed 2026-08-15 (+13 more)

### Community 19 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.11
Nodes (18): 1. 🌟 Executive Creative Vision: "Bridging Worlds at the Speed of Light", 2. 🎭 Interactive 3D Page Sections & Animation Choreography, 3. 🎬 Google Flow & AI Generation Prompts (Cinematic Video & 3D Assets), 4. 🎨 Design System: Color Palette, Typography & Aesthetics, 5. 🛠️ Technical Architecture & Implementation Stack, 6. 🚀 Next Steps & Execution Plan, Color Palette (Futuristic Dark Minimalist), Prompt 1: Hero Background & Holographic Gesture Loop (Google Flow / Veo) (+10 more)

### Community 21 - "graphify reference: GitHub clone and cross-repo merge"
Cohesion: 0.11
Nodes (17): 1. Executive summary, 2. Repo map, 3.1 Signed → spoken, 3.2 Spoken → signed, 3. Bidirectional pipeline, 4. Learn-to-sign features (if any), 5. Tech stack, 6. SignWriting integration (+9 more)

### Community 22 - "graphify reference: transcribe video and audio"
Cohesion: 0.50
Nodes (3): Capture, Coverage bar (rough), Sample format (one JSON per line)

### Community 23 - "CLAUDE.md"
Cohesion: 0.10
Nodes (19): CameraSource, FaceCb, FrameCb, PoseCb, RawCb, InputSource, FrameCb, RawCb (+11 more)

### Community 24 - "CLAUDE.md"
Cohesion: 0.15
Nodes (13): 10. Open questions, 1. Problem, 2. Vision, 3. Goals & non-goals, 4. Users & use cases, 5. Scope by version, 6. Functional requirements, 7. Non-functional requirements (+5 more)

### Community 25 - "extraction-spec.md"
Cohesion: 0.17
Nodes (11): 1. Path Traversal via Unsanitized Signer Handles, 2. Lack of Subresource Integrity (SRI) on CDN-Loaded Binaries, 3. Absence of Content Security Policy (CSP), 4. Path Traversal and Symlink Exposure in Python Training Scripts, 5. Unvalidated JSON Schema Deserialization, Details, Details, Details (+3 more)

### Community 26 - "AGENTS.md — Build rules for SignSpeak"
Cohesion: 0.18
Nodes (10): Files touched, M1 · FaceLandmarker overlay (~90 min, visual only), M2 · Hand skeleton overlay (~30 min, visual only), M3 · Blendshapes exposed (~45 min), M4 · Extend feature vector to include face (~2h), M5 · Retrain + evaluate word-sign model (~1h), Milestones, Non-goals (+2 more)

### Community 28 - "Smoother"
Cohesion: 0.13
Nodes (10): clean(), ClipStats, fmt(), Hero(), Instrument(), NAMED_POINTS, SignPlayer, Speller() (+2 more)

### Community 29 - "AGENTS.md — Build rules for SignSpeak"
Cohesion: 0.20
Nodes (10): AGENTS.md — Build rules for SignSpeak, Conventions, Definition of done (per task), Ethics, Golden rules, Project in one line, Stack quick reference, Testing / verification (+2 more)

### Community 30 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 31 - "ARCHITECTURE — SignSpeak"
Cohesion: 0.22
Nodes (9): 1. High-level pipeline, 2. Tech stack, 3. Module layout (target repo structure), 4. The input-abstraction layer (hybrid design), 5. Data contracts, 6. Real-time loop, 7. Robustness & privacy notes, 8. Extensibility checklist (+1 more)

### Community 32 - "Help record training data for SignSpeak"
Cohesion: 0.25
Nodes (7): Help record training data for SignSpeak, Privacy, Record, Send it back, Setup, What happens next, What we need

### Community 33 - "extract_reference_poses.py"
Cohesion: 0.46
Nodes (7): ensure_pose_model(), extract(), _frame_at(), main(), make_pose_landmarker(), Path, VideoCapture

### Community 34 - "ML_PIPELINE — SignSpeak"
Cohesion: 0.25
Nodes (8): 1. Perception: landmarks (shared by all stages), 3. Datasets, 4. Training & export, 5. Evaluation, 6. Handling the hybrid (glove) profile, 7. Implementation order (matches ROADMAP), ML_PIPELINE — SignSpeak, Normalization (critical for accuracy)

### Community 35 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 36 - "SignSpeak — project context"
Cohesion: 0.05
Nodes (34): Architecture snapshot, Common commands, Current state (2026-07-28), Datasets already imported (v0.3), Decisions worth remembering, graphify, SignSpeak — project context, Deviations from plan (+26 more)

### Community 37 - "In-domain clips recorded in the app"
Cohesion: 0.40
Nodes (4): In-domain clips recorded in the app, Recording clips that would actually help, What these clips proved, Why imported.jsonl is NOT in ml/data/words_asl/

### Community 39 - "2. Stage models (built in roadmap order)"
Cohesion: 0.40
Nodes (5): 2. Stage models (built in roadmap order), Stage A — Fingerspelling A–Z (MVP), Stage B — Isolated word-signs (v0.2), Stage C — Continuous segmentation → gloss stream (v0.3), Stage D — Gloss → sentence (v1.0, the LLM stage)

### Community 40 - "SignSpeak — Continuous Sign Language → Text Translation"
Cohesion: 0.40
Nodes (5): Document index, Ethics note (do not skip), Quick facts for the builder, SignSpeak — Continuous Sign Language → Text Translation, The proposed improvement (what this project delivers)

### Community 41 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 42 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 43 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 44 - "Fabricate an easily-separable dataset — proves the training pipeline plumbing."
Cohesion: 0.15
Nodes (10): ALPHABET, clipModule(), FeatureReadout(), Hands(), MOTION_LETTERS, NameSpeller(), PlayState, readReturning() (+2 more)

### Community 46 - "Drop a random 5-30% of frames to simulate signing-pace variation.     Order pres"
Cohesion: 0.14
Nodes (7): clean(), FeatureReadout(), fmt(), Gloss(), NameSpeller(), readReturning(), SignPlayer

### Community 47 - "Fabricate an easily-separable dataset — proves the training pipeline plumbing."
Cohesion: 0.16
Nodes (37): AudioSample, Word, Frame, PostOverrides, Scene, Slam, Captions, Clip (+29 more)

### Community 49 - "Hold out one signer for test. Falls back to random split if only one signer."
Cohesion: 0.09
Nodes (50): BlendMode, FSPass, fullscreenGeometry(), Layer2D, RT_SCALE, rtScale(), scaleContext2D(), HudState (+42 more)

### Community 50 - "lerp"
Cohesion: 0.11
Nodes (22): fade(), fbm1(), fbm2(), hexToLinear(), invLerp(), Key, keys(), lerp() (+14 more)

### Community 52 - "Fabricate an easily-separable dataset — proves the training pipeline plumbing."
Cohesion: 0.10
Nodes (17): StrokeFontName, ARCH(), Crazy, ARCH(), Hook, ARCH(), Model, arc() (+9 more)

### Community 53 - "Return (train_idx, test_idx, holdout_name). Mirrors signer_split logic     but r"
Cohesion: 0.06
Nodes (45): Hero(), How(), App(), AppMode, DemoTutorial, SentenceBuilder, TABS, Login() (+37 more)

### Community 54 - "rgba"
Cohesion: 0.06
Nodes (49): drawReadout(), formatPDoom(), Hud, mix(), PDoom, rgba(), F, font() (+41 more)

### Community 56 - "Sample feature: mean + std per chunk, concatenated.     n_chunks=1 → 2*FEATURE_L"
Cohesion: 0.09
Nodes (18): useLiveLetter(), CameraView, ConfidenceBar, EMPTY, TopK, RouteFallback(), FingerspellSlot(), SentenceBuilder (+10 more)

### Community 61 - "Return (train_idx, test_idx, holdout_name). Mirrors signer_split logic     but r"
Cohesion: 0.20
Nodes (10): Add a new word sign, Deploy, Dev, Environment, Modes, Recognition core (`src/core.ts`), Retrain, Routes (+2 more)

### Community 65 - "stroke.ts"
Cohesion: 0.13
Nodes (23): addTypographic(), approach(), fonts, inkBox(), isLetter(), isLower(), loadStrokeFonts(), moved() (+15 more)

### Community 67 - "MediaPipe returns hand_landmarks + handedness in parallel lists."
Cohesion: 0.17
Nodes (7): Loaded, makeRT(), SS_TAP, Caption, DEFAULT_POST, Post, SCALE

### Community 68 - "Turn a single-frame vector into n frames with small Gaussian jitter.     Mimics"
Cohesion: 0.40
Nodes (5): 8 · Steps 2–4 done (2026-09-24), `src/core.ts` — the boundary, Step 2 — `Recognizer` extracted, Step 3 — P1 fixed, measured, Step 4 — `VideoElementSource` + `assetBase`

### Community 71 - "sfx_mix.py"
Cohesion: 0.13
Nodes (19): norm(), data/audio.json for the voiceover: the engine's audio API (envelopes, onsets, a, cue(), cut(), decode(), jitter(), line(), main() (+11 more)

### Community 72 - "Drop a random 5-30% of frames to simulate signing-pace variation.     Order pres"
Cohesion: 0.18
Nodes (19): cache, ClipRenderer, HandColors, LETTERS, loadClip(), makeRenderer(), Loaded, SignPlayer (+11 more)

### Community 75 - "Fabricate an easily-separable dataset — proves the training pipeline plumbing."
Cohesion: 0.50
Nodes (4): 7 · Step 1 done — golden test (2026-09-08), Also recorded, not a bug, Next, Two findings from recording it

### Community 78 - "12 · B-spike results — Google Meet, 2026-09-24"
Cohesion: 0.67
Nodes (3): 12 · B-spike results — Google Meet, 2026-09-24, Still to probe, The aspect-ratio scare, resolved by measurement

### Community 79 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, lib, module, moduleDetection, moduleResolution, noEmit, noFallthroughCasesInSwitch (+12 more)

### Community 80 - "Turn a single-frame vector into n frames with small Gaussian jitter.     Mimics"
Cohesion: 0.67
Nodes (3): 1 · Decisions taken, Consequence A — separate repo needs a dev loop, or it will hurt, Consequence B — choosing `both` mode promotes a known bug to blocking

### Community 82 - "plugins"
Cohesion: 0.22
Nodes (8): oxc, typescript, warn, plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 98 - "type.ts"
Cohesion: 0.15
Nodes (12): ARCHIVO_WEIGHTS, ARCHIVO_WIDTHS, bufCache, DEFS, fitSize(), FontDef, Glyph, ot() (+4 more)

### Community 99 - "core.ts"
Cohesion: 0.08
Nodes (30): FeatureFrame, normalize(), writeHand(), Classifier, forward(), Layer, meanStd(), Model (+22 more)

### Community 100 - "render.ts"
Cohesion: 0.24
Nodes (14): APP, argv, ensureDir(), ensureServer(), flag(), hist(), openPage(), opt() (+6 more)

### Community 101 - "Engine"
Cohesion: 0.16
Nodes (5): Engine, ternaryOffsets(), clearRT(), PostParams, loadFonts()

### Community 102 - "align_vo.py"
Cohesion: 0.21
Nodes (12): emissions(), envelope_db(), load_audio(), main(), Word timings for the voiceover: CTC forced alignment of the script against the a, CTC forced alignment. E: [T, V] log-probs, tgt: token ids (no blanks). Returns t, spoken(), viterbi() (+4 more)

### Community 103 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, ES2023, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly (+15 more)

### Community 105 - "main.ts"
Cohesion: 0.23
Nodes (11): AdaptiveSampling, boot(), canvas, engine, EXPORT, ONLY, params, setupExport() (+3 more)

### Community 107 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, ES2023, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module (+11 more)

### Community 108 - "timeline.ts"
Cohesion: 0.28
Nodes (7): AudioJSON, FEATURES, TimelineEntry, SceneClass, makeTimeline(), modules, scene()

### Community 110 - "Motion as Code — voiceover video (original kit)"
Cohesion: 0.22
Nodes (8): Layout, Motion as Code — voiceover video (original kit), Preview, Render, Requirements, SignSpeak explainer (motion as code), Sound effects, Swapping the voiceover

### Community 111 - "tsconfig.scripts.json"
Cohesion: 0.25
Nodes (7): compilerOptions, types, extends, include, bun, scripts, ./tsconfig.json

### Community 113 - "prompt-data.ts"
Cohesion: 0.40
Nodes (4): Cand, PieceSpec, SPECS, Tok

### Community 114 - "predict_signs.py"
Cohesion: 0.67
Nodes (3): hand_block(), main(), Real model output for the plates: run the live fingerspell model on the referenc

## Knowledge Gaps
- **535 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+530 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `P` connect `Fabricate an easily-separable dataset — proves the training pipeline plumbing.` to `Hold out one signer for test. Falls back to random split if only one signer.`, `render.ts`, `rgba`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **Why does `sheet()` connect `render.ts` to `Fabricate an easily-separable dataset — proves the training pipeline plumbing.`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **Why does `CameraViewImpl()` connect `CLAUDE.md` to `Drop a random 5-30% of frames to simulate signing-pace variation.     Order pres`, `render.ts`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _535 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.10121951219512196 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._