# Graph Report - 101  (2026-07-14)

## Corpus Check
- 48 files · ~93,157 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 342 nodes · 406 edges · 28 communities (22 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

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
- What You Must Do When Invoked
- ROADMAP — SignSpeak
- ML_PIPELINE — SignSpeak
- PRD — SignSpeak
- main
- graphify reference: extra exports and benchmark
- graphify reference: query, path, explain
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- Capture
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- CLAUDE.md
- CLAUDE.md
- extraction-spec.md
- AGENTS.md — Build rules for SignSpeak
- import_media.py

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `compilerOptions` - 15 edges
3. `What You Must Do When Invoked` - 12 edges
4. `PRD — SignSpeak` - 11 edges
5. `ROADMAP — SignSpeak` - 11 edges
6. `CameraSource` - 10 edges
7. `/graphify` - 10 edges
8. `AGENTS.md — Build rules for SignSpeak` - 10 edges
9. `ARCHITECTURE — SignSpeak` - 9 edges
10. `FeatureFrame` - 8 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `useLiveLetter()`  [EXTRACTED]
  src/App.tsx → src/recognition/useLiveLetter.ts
- `App()` --calls--> `useStore`  [EXTRACTED]
  src/App.tsx → src/state/store.ts
- `CameraSource` --implements--> `InputSource`  [EXTRACTED]
  src/input/CameraSource.ts → src/input/InputSource.ts
- `Smoother` --references--> `Prediction`  [EXTRACTED]
  src/recognition/smoothing.ts → src/recognition/classifier.ts
- `CaptureControlsImpl()` --calls--> `useStore`  [EXTRACTED]
  src/ui/CaptureControls.tsx → src/state/store.ts

## Import Cycles
- None detected.

## Communities (28 total, 6 thin omitted)

### Community 0 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+15 more)

### Community 1 - "devDependencies"
Cohesion: 0.10
Nodes (21): oxlint, devDependencies, oxlint, prettier, tailwindcss, @tailwindcss/vite, @types/node, @types/react (+13 more)

### Community 2 - "package.json"
Cohesion: 0.10
Nodes (19): @mediapipe/tasks-vision, dependencies, @mediapipe/tasks-vision, react, react-dom, zustand, name, private (+11 more)

### Community 3 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 4 - "CameraSource.ts"
Cohesion: 0.15
Nodes (10): CameraSource, FrameCb, RawCb, InputSource, createHandLandmarker(), HandResult, splitHands(), normalize() (+2 more)

### Community 5 - "App.tsx"
Cohesion: 0.09
Nodes (23): react, App(), FeatureFrame, Classifier, forward(), Layer, meanStd(), Model (+15 more)

### Community 6 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 7 - "CameraSource"
Cohesion: 0.17
Nodes (11): 1. Path Traversal via Unsanitized Signer Handles, 2. Lack of Subresource Integrity (SRI) on CDN-Loaded Binaries, 3. Absence of Content Security Policy (CSP), 4. Path Traversal and Symlink Exposure in Python Training Scripts, 5. Unvalidated JSON Schema Deserialization, Details, Details, Details (+3 more)

### Community 10 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 11 - "ROADMAP — SignSpeak"
Cohesion: 0.06
Nodes (27): 1. High-level pipeline, 2. Tech stack, 3. Module layout (target repo structure), 4. The input-abstraction layer (hybrid design), 5. Data contracts, 6. Real-time loop, 7. Robustness & privacy notes, 8. Extensibility checklist (+19 more)

### Community 12 - "ML_PIPELINE — SignSpeak"
Cohesion: 0.14
Nodes (13): 1. Perception: landmarks (shared by all stages), 2. Stage models (built in roadmap order), 3. Datasets, 4. Training & export, 5. Evaluation, 6. Handling the hybrid (glove) profile, 7. Implementation order (matches ROADMAP), ML_PIPELINE — SignSpeak (+5 more)

### Community 13 - "PRD — SignSpeak"
Cohesion: 0.15
Nodes (13): 10. Open questions, 1. Problem, 2. Vision, 3. Goals & non-goals, 4. Users & use cases, 5. Scope by version, 6. Functional requirements, 7. Non-functional requirements (+5 more)

### Community 14 - "main"
Cohesion: 0.25
Nodes (13): aggregate(), export_model(), load_jsonl(), main(), ndarray, Path, Sample feature: mean + std over frames per component (2 * FEATURE_LEN dims)., Accept either a single .jsonl file or a directory containing *.jsonl files. (+5 more)

### Community 15 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 16 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 17 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 18 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 19 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 20 - "Capture"
Cohesion: 0.50
Nodes (3): Capture, Coverage bar (rough), Sample format (one JSON per line)

### Community 26 - "AGENTS.md — Build rules for SignSpeak"
Cohesion: 0.20
Nodes (10): AGENTS.md — Build rules for SignSpeak, Conventions, Definition of done (per task), Ethics, Golden rules, Project in one line, Stack quick reference, Testing / verification (+2 more)

### Community 27 - "import_media.py"
Cohesion: 0.28
Nodes (14): ensure_model(), import_photo(), import_video(), main(), make_landmarker(), normalize_hands(), ndarray, Path (+6 more)

## Knowledge Gaps
- **174 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+169 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PRD — SignSpeak` connect `PRD — SignSpeak` to `ROADMAP — SignSpeak`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `react` connect `App.tsx` to `plugins`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _174 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._