// Characterization ("golden output") test for the recognition pipeline.
//
// Why this exists: Phase 18 extracts the orchestration out of useLiveLetter into
// a framework-free Recognizer so the Meet extension can reuse it. That refactor
// touches the recognition hot path, which has no tests, and this repo has
// already shipped one accuracy regression that had to be reverted (77f8384).
// This records exactly what the pipeline emits today so the refactor can be
// proven behaviour-preserving.
//
// ponytail: no vitest, no tsx, no dependency. Node 22 strips TS types natively,
// and the only non-type import in the recognition core is between its own
// modules — so `node tools/golden.ts` runs the REAL classifier/smoother/
// normalize, not a re-port that could drift from them.
//
// ✅ Step 2 (2026-09-24): this harness no longer transcribes the per-frame loop
// — it drives the extracted `Recognizer` directly. The previous transcription
// was the one thing here that could have been wrong, and swapping it for the
// real class re-recorded byte-identical output, which is what proves the
// extraction preserved behaviour. What remains below is only projection:
// Recognizer's update objects flattened into the recorded event shape.
//
// Usage:
//   node tools/golden.ts            # record  -> tools/golden.json
//   node tools/golden.ts --check    # compare -> exit 1 on any drift

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Recognizer, type LiveMode } from '../src/recognition/recognizer.ts';
import { normalize } from '../src/perception/normalize.ts';
import type { FeatureFrame } from '../src/input/InputSource.ts';

const ROOT = new URL('..', import.meta.url).pathname;
const GOLDEN = join(ROOT, 'tools/golden.json');

// Aspect ratio the browser divided by when it built the live vector. 4:3 is what
// the recordings were made on — at 4:3 the model scores p(HELLO)=1.00, at 16:9 it
// collapses to ~0. Same constant as ml/import_refclips.py DEFAULT_AR.
const ASPECT_RATIO = 4 / 3;

// Clips chosen for coverage, not size: 4 fingerspell letters (static holds) and
// 2 word signs (trajectories), so both arbitration branches are exercised.
const CLIPS = ['A', 'B', 'C', 'D', 'HELLO', 'BOOK'];

// --- Classifier.load() uses fetch(); map its URLs onto public/ -------------
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: string) => {
  const path = String(url);
  if (path.startsWith('/')) {
    const file = join(ROOT, 'public', path);
    if (!existsSync(file)) return { ok: false, status: 404 } as Response;
    const body = readFileSync(file, 'utf8');
    return { ok: true, status: 200, json: async () => JSON.parse(body) } as Response;
  }
  return realFetch(url as never);
}) as typeof fetch;

// --- clip -> frames --------------------------------------------------------
type RawClip = { fps: number; gloss: string; frames: { left?: unknown; right?: unknown }[] };

// Letter clips in public/reference-signs are single-frame stills (fps 1) — static
// poses for the skeleton renderer, not motion. Replayed as-is the classifier
// never reaches its 5-frame minimum and emits nothing, so fingerspell coverage
// would be silently empty. Repeat the still into a 2 s hold at 30 fps, which is
// what a signer actually does with a letter, and is the same correction a prior
// session had to make when measuring bogus commits against the 700 ms dwell.
const HOLD_MS = 2000;
const HOLD_FPS = 30;

function framesFor(clip: RawClip): FeatureFrame[] {
  if (clip.frames.length === 1) {
    const n = Math.round((HOLD_MS / 1000) * HOLD_FPS);
    clip = { ...clip, fps: HOLD_FPS, frames: Array.from({ length: n }, () => clip.frames[0]) };
  }
  const step = 1000 / (clip.fps || 30);
  return clip.frames.map((f, i) => {
    const left = f.left as never;
    const right = f.right as never;
    const handsDetected = (left ? 1 : 0) + (right ? 1 : 0);
    return {
      timestamp: Math.round(i * step),
      vector: normalize(left, right, ASPECT_RATIO),
      source: 'camera' as const,
      meta: { handsDetected },
    };
  });
}

// --- drive the real Recognizer, project its updates into events ------------
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

async function run(liveMode: LiveMode, frames: FeatureFrame[]) {
  const rec = new Recognizer({ mode: liveMode });
  await rec.load();

  const events: unknown[] = [];

  for (const frame of frames) {
    const u = rec.handleFrame(frame);
    // null = channels not loaded. Can't happen here (we awaited load), but the
    // web app can see it, so mirror the consumer contract rather than assume.
    if (!u) continue;
    if (!u.handsPresent) {
      events.push({ t: frame.timestamp, display: null });
      continue;
    }
    // Classifier hasn't filled its 5-frame minimum yet — the hook early-returns
    // here, so no event is recorded.
    if (u.pending || !u.display) continue;

    // Key order below is load-bearing: JSON.stringify preserves insertion
    // order, and this file is compared as bytes.
    const display = {
      top: u.display.top,
      channel: u.display.channel,
      confidence: r6(u.display.confidence),
      hold: r6(u.display.hold),
    };
    const commits = u.commits.map((c) =>
      'autoSpace' in c
        ? { channel: c.channel, autoSpace: true }
        : { channel: c.channel, appended: c.appended, confidence: r6(c.confidence) },
    );

    events.push({
      t: frame.timestamp,
      display,
      moving: u.moving,
      ...(commits.length ? { commits } : {}),
    });
  }
  return events;
}

// --- main ------------------------------------------------------------------
const out: Record<string, unknown> = {};
for (const gloss of CLIPS) {
  const file = join(ROOT, 'public/reference-signs', `${gloss}.json`);
  if (!existsSync(file)) {
    console.warn(`skip ${gloss}: no clip`);
    continue;
  }
  const clip = JSON.parse(readFileSync(file, 'utf8')) as RawClip;
  const frames = framesFor(clip);
  for (const mode of ['fingerspell', 'words', 'both'] as const) {
    out[`${gloss}/${mode}`] = await run(mode, frames);
  }
}

const json = JSON.stringify(out, null, 1);

if (process.argv.includes('--check')) {
  if (!existsSync(GOLDEN)) {
    console.error('no golden file — run `node tools/golden.ts` first');
    process.exit(1);
  }
  const prev = readFileSync(GOLDEN, 'utf8');
  if (prev === json) {
    const n = Object.values(out).reduce((a, e) => a + (e as unknown[]).length, 0);
    console.log(`golden OK — ${Object.keys(out).length} runs, ${n} frames, no drift`);
    process.exit(0);
  }
  // Report the first differing run so the failure names a place, not a byte.
  const before = JSON.parse(prev) as Record<string, unknown[]>;
  for (const k of Object.keys(out)) {
    const a = JSON.stringify(before[k]);
    const b = JSON.stringify(out[k]);
    if (a !== b) console.error(`DRIFT in ${k}`);
  }
  console.error('\ngolden MISMATCH — behaviour changed. Inspect, then re-record if intended.');
  process.exit(1);
}

writeFileSync(GOLDEN, json);
const n = Object.values(out).reduce((a, e) => a + (e as unknown[]).length, 0);
console.log(`recorded ${Object.keys(out).length} runs, ${n} frames -> tools/golden.json`);
