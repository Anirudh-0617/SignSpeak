# Graph Report - SignSpeak  (2026-10-09)

## Corpus Check
- 250 files · ~1,958,401 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1358 nodes · 3791 edges · 103 communities (80 shown, 23 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 70 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fad42d42`
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
- convert
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
- download_wlasl.py
- Path
- Return (train_idx, test_idx, holdout_name). Mirrors signer_split logic     but r
- ndarray
- Mirror src/perception/normalize.ts (v0.3): per-hand wrist-anchored.
- stroke.ts
- graphify
- MediaPipe returns hand_landmarks + handedness in parallel lists.
- Turn a single-frame vector into n frames with small Gaussian jitter.     Mimics
- Sample feature: mean + std over frames per component (2 * FEATURE_LEN dims).
- ndarray
- sfx_mix.py
- Drop a random 5-30% of frames to simulate signing-pace variation.     Order pres
- graphify reference: extraction subagent prompt
- Path
- compilerOptions
- plugins
- Lyrics
- type.ts
- core.ts
- render.ts
- Engine
- compilerOptions
- AudioData
- main.ts
- compilerOptions
- timeline.ts
- tsconfig.scripts.json
- Compositor
- prompt-data.ts
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

## Communities (103 total, 23 thin omitted)

### Community 0 - "compilerOptions"
Cohesion: 0.12
Nodes (26): LiveMode, LiveLetterState, useLiveLetter(), GlossToken, Sample, State, useStore, speak() (+18 more)

### Community 1 - "devDependencies"
Cohesion: 0.05
Nodes (43): @mediapipe/tasks-vision, oxlint, dependencies, @mediapipe/tasks-vision, react, react-dom, react-router-dom, zustand (+35 more)

### Community 2 - "package.json"
Cohesion: 0.12
Nodes (19): react, App(), AppMode, DemoTutorial, SentenceBuilder, TABS, Login(), router (+11 more)

### Community 3 - "compilerOptions"
Cohesion: 0.12
Nodes (25): MLPClassifier, run_fingerspell(), run_words(), main(), score(), aggregate(), augment_frames(), dedupe() (+17 more)

### Community 4 - "CameraSource.ts"
Cohesion: 0.24
Nodes (6): ARCH(), Crazy, loadClip(), loadGlossFonts(), lineOf(), wordOf()

### Community 5 - "App.tsx"
Cohesion: 0.07
Nodes (26): dependencies, opentype.js, three, devDependencies, playwright-core, @types/bun, @types/opentype.js, @types/three (+18 more)

### Community 6 - "plugins"
Cohesion: 0.15
Nodes (24): ensure_pose_model(), extract_clip(), _lm_dict(), main(), make_hand_landmarker(), make_pose_landmarker(), pick_video(), _blendshapes() (+16 more)

### Community 7 - "CameraSource"
Cohesion: 0.17
Nodes (17): Word, Scene, Slam, Captions, Clip, Predictions, Box, Pipeline (+9 more)

### Community 8 - "tsconfig.json"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 9 - "vite.config.ts"
Cohesion: 0.13
Nodes (19): norm(), data/audio.json for the voiceover: the engine's audio API (envelopes, onsets, a, cue(), cut(), decode(), jitter(), line(), main() (+11 more)

### Community 10 - "What You Must Do When Invoked"
Cohesion: 0.09
Nodes (21): 0. ✅ Design skills made personal — done 2026-08-15, 1. 🟡 Browser-verify the six unverified commits — **the real work, still open**, §1 · The HELLO finding (this session) — read before touching recognition, §2 · Panel skill + OmniRoute — added 2026-08-14, 2. Tune `MOTION_IS_WORD` from live use — ~2 min after step 1, 3. Record clips that capture whole signs — the only real accuracy lever, 4. ✅ Ponytail cuts applied 2026-08-15 — partially, on purpose, 4b. 🆕 Blank first paint on every route — fixed 2026-08-15 (+13 more)

### Community 11 - "ROADMAP — SignSpeak"
Cohesion: 0.10
Nodes (24): HEX, absorb(), at1(), Box, bridge(), FACES, FigureOpts, fitBox() (+16 more)

### Community 13 - "PRD — SignSpeak"
Cohesion: 0.11
Nodes (18): 1. 🌟 Executive Creative Vision: "Bridging Worlds at the Speed of Light", 2. 🎭 Interactive 3D Page Sections & Animation Choreography, 3. 🎬 Google Flow & AI Generation Prompts (Cinematic Video & 3D Assets), 4. 🎨 Design System: Color Palette, Typography & Aesthetics, 5. 🛠️ Technical Architecture & Implementation Stack, 6. 🚀 Next Steps & Execution Plan, Color Palette (Futuristic Dark Minimalist), Prompt 1: Hero Background & Holographic Gesture Loop (Google Flow / Veo) (+10 more)

### Community 14 - "main"
Cohesion: 0.11
Nodes (24): ALPHABET, LESSONS, Sign, WORDS_BY_CATEGORY, Attempt, PracticeState, ProgressEntry, usePracticeStore (+16 more)

### Community 15 - "graphify reference: extra exports and benchmark"
Cohesion: 0.29
Nodes (3): CameraSource, CameraViewImpl(), pickAlternate()

### Community 16 - "graphify reference: query, path, explain"
Cohesion: 0.18
Nodes (8): PASS_CONFIDENCE, FingerspellSlot(), SentenceBuilder, SentenceBuilderImpl(), Slot, Template, TEMPLATES, WordSlot()

### Community 17 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.18
Nodes (10): Add a new word sign, Deploy, Dev, Environment, Modes, Recognition core (`src/core.ts`), Retrain, Routes (+2 more)

### Community 19 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.29
Nodes (9): normalize(), writeHand(), json, CLIPS, framesFor(), GOLDEN, n, out (+1 more)

### Community 20 - "Capture"
Cohesion: 0.15
Nodes (7): InputSource, FrameCb, RawCb, VideoElementSource, createHandLandmarker(), HandResult, splitHands()

### Community 21 - "graphify reference: GitHub clone and cross-repo merge"
Cohesion: 0.24
Nodes (5): meanTravel(), Recognizer, smootherFor(), r6(), run()

### Community 22 - "graphify reference: transcribe video and audio"
Cohesion: 0.36
Nodes (8): emissions(), envelope_db(), load_audio(), main(), Word timings for the voiceover: CTC forced alignment of the script against the a, CTC forced alignment. E: [T, V] log-probs, tgt: token ids (no blanks). Returns t, spoken(), viterbi()

### Community 23 - "CLAUDE.md"
Cohesion: 0.22
Nodes (10): FaceCb, FrameCb, PoseCb, RawCb, configurePerceptionAssets(), perceptionAssets, createFaceLandmarker(), FaceResult (+2 more)

### Community 24 - "CLAUDE.md"
Cohesion: 0.22
Nodes (8): Layout, Motion as Code — voiceover video (original kit), Preview, Render, Requirements, SignSpeak explainer (motion as code), Sound effects, Swapping the voiceover

### Community 25 - "extraction-spec.md"
Cohesion: 0.17
Nodes (11): 1. Path Traversal via Unsanitized Signer Handles, 2. Lack of Subresource Integrity (SRI) on CDN-Loaded Binaries, 3. Absence of Content Security Policy (CSP), 4. Path Traversal and Symlink Exposure in Python Training Scripts, 5. Unvalidated JSON Schema Deserialization, Details, Details, Details (+3 more)

### Community 26 - "AGENTS.md — Build rules for SignSpeak"
Cohesion: 0.47
Nodes (5): canonical_hands(), main(), Mean left/right hand blocks across frames. None if a hand is all-zero     (absen, Invert the wrist-anchored normalization and fit to the draw canvas., to_landmarks()

### Community 27 - "convert"
Cohesion: 0.47
Nodes (5): convert(), main(), Mirror of writeHand() in src/perception/normalize.ts., RefClip -> (frames, stats). Keeps only frames where a hand was seen.      Frames, write_hand()

### Community 28 - "Smoother"
Cohesion: 0.13
Nodes (10): clean(), ClipStats, fmt(), Hero(), Instrument(), NAMED_POINTS, SignPlayer, Speller() (+2 more)

### Community 30 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 31 - "ARCHITECTURE — SignSpeak"
Cohesion: 0.40
Nodes (4): In-domain clips recorded in the app, Recording clips that would actually help, What these clips proved, Why imported.jsonl is NOT in ml/data/words_asl/

### Community 32 - "Help record training data for SignSpeak"
Cohesion: 0.50
Nodes (4): main(), Voiceover with Kokoro-82M (Apache 2.0, local): one clip per script line, joined, The line as Kokoro should read it: SPOKEN forms for numbers and names, plain pun, tts_text()

### Community 33 - "extract_reference_poses.py"
Cohesion: 0.52
Nodes (6): ensure_pose_model(), extract(), _frame_at(), main(), make_pose_landmarker(), VideoCapture

### Community 34 - "ML_PIPELINE — SignSpeak"
Cohesion: 0.50
Nodes (3): Capture, Coverage bar (rough), Sample format (one JSON per line)

### Community 35 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 36 - "SignSpeak — project context"
Cohesion: 0.25
Nodes (7): Architecture snapshot, Common commands, Current state (2026-07-28), Datasets already imported (v0.3), Decisions worth remembering, graphify, SignSpeak — project context

### Community 37 - "In-domain clips recorded in the app"
Cohesion: 0.67
Nodes (3): hand_block(), main(), Real model output for the plates: run the live fingerspell model on the referenc

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
Cohesion: 0.28
Nodes (20): AudioSample, Frame, PostOverrides, figure(), frameIdx(), frameRect(), GF, marked() (+12 more)

### Community 49 - "Hold out one signer for test. Falls back to random split if only one signer."
Cohesion: 0.07
Nodes (61): BlendMode, Layer2D, RT_SCALE, rtScale(), scaleContext2D(), LineBatch, LineBlend, Line (+53 more)

### Community 50 - "lerp"
Cohesion: 0.67
Nodes (4): fade(), fbm2(), noise2(), noise3()

### Community 53 - "Return (train_idx, test_idx, holdout_name). Mirrors signer_split logic     but r"
Cohesion: 0.09
Nodes (28): Hero(), How(), CTA, FACTS, HERO_SEQUENCE, LINKS, MODES, PIPELINE (+20 more)

### Community 54 - "rgba"
Cohesion: 0.05
Nodes (62): drawReadout(), formatPDoom(), Hud, HudState, mix(), rgba(), F, font() (+54 more)

### Community 56 - "Sample feature: mean + std per chunk, concatenated.     n_chunks=1 → 2*FEATURE_L"
Cohesion: 0.15
Nodes (7): ConfidenceBar, EMPTY, TopK, DemoTutorial, Props, STEPS, StepView()

### Community 65 - "stroke.ts"
Cohesion: 0.12
Nodes (22): addTypographic(), approach(), fonts, inkBox(), isLetter(), isLower(), loadStrokeFonts(), moved() (+14 more)

### Community 67 - "MediaPipe returns hand_landmarks + handedness in parallel lists."
Cohesion: 0.21
Nodes (8): Loaded, FSPass, fullscreenGeometry(), makeRT(), SS_TAP, Caption, DEFAULT_POST, Post

### Community 72 - "Drop a random 5-30% of frames to simulate signing-pace variation.     Order pres"
Cohesion: 0.11
Nodes (24): cache, ClipRenderer, HandColors, LETTERS, loadClip(), makeRenderer(), Loaded, SignPlayer (+16 more)

### Community 79 - "compilerOptions"
Cohesion: 0.10
Nodes (20): DOM, src, vite/client, DOM.Iterable, ESNext, compilerOptions, allowImportingTsExtensions, lib (+12 more)

### Community 82 - "plugins"
Cohesion: 0.22
Nodes (8): oxc, typescript, warn, plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 96 - "Lyrics"
Cohesion: 0.13
Nodes (3): PDoom, fold(), Lyrics

### Community 98 - "type.ts"
Cohesion: 0.15
Nodes (12): ARCHIVO_WEIGHTS, ARCHIVO_WIDTHS, bufCache, DEFS, fitSize(), FontDef, Glyph, ot() (+4 more)

### Community 99 - "core.ts"
Cohesion: 0.13
Nodes (16): FeatureFrame, Classifier, forward(), Layer, meanStd(), Model, Prediction, softmax() (+8 more)

### Community 100 - "render.ts"
Cohesion: 0.11
Nodes (19): APP, argv, ensureDir(), ensureServer(), flag(), hist(), openPage(), opt() (+11 more)

### Community 101 - "Engine"
Cohesion: 0.20
Nodes (4): Engine, ternaryOffsets(), PostParams, loadFonts()

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

### Community 111 - "tsconfig.scripts.json"
Cohesion: 0.25
Nodes (7): bun, scripts, ./tsconfig.json, compilerOptions, types, extends, include

### Community 112 - "Compositor"
Cohesion: 0.33
Nodes (3): clearRT(), Compositor, SceneCtx

### Community 113 - "prompt-data.ts"
Cohesion: 0.40
Nodes (4): Cand, PieceSpec, SPECS, Tok

## Knowledge Gaps
- **332 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+327 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `P` connect `render.ts` to `Hold out one signer for test. Falls back to random split if only one signer.`, `CameraSource.ts`, `rgba`?**
  _High betweenness centrality (0.189) - this node is a cross-community bridge._
- **Why does `CameraViewImpl()` connect `graphify reference: extra exports and benchmark` to `Drop a random 5-30% of frames to simulate signing-pace variation.     Order pres`, `render.ts`, `Capture`?**
  _High betweenness centrality (0.188) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _332 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.11746031746031746 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.12183908045977011 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.12169312169312169 - nodes in this community are weakly interconnected._