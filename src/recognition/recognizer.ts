// ponytail: explicit .ts extensions, unlike the rest of src/. This is the first
// core module with *runtime* (non-type) imports, and tools/golden.ts runs it
// under bare Node, whose ESM resolver demands an extension. tsconfig already
// sets allowImportingTsExtensions + noEmit, so TS and Vite accept these as-is —
// two characters instead of a custom Node loader. Keep them if you add imports.
import { Classifier } from './classifier.ts';
import { Smoother } from './smoothing.ts';
import type { FeatureFrame } from '../input/InputSource.ts';

export type Mode = 'fingerspell' | 'words';
export type LiveMode = Mode | 'both';

// Auto-space: this many ms of no commit → insert a space (once per gap).
const SPACE_AFTER_MS = 1500;

// ponytail: hard cooldown between word commits. The Smoother's own release
// period gets cut short whenever hands drop out of frame (that behavior is
// intentional for fingerspelling "COOL" — same shape between letters). For
// words, back-to-back commits fire the moment you transition signs, which
// mis-attributes an intended sign to the tail of the previous one. This
// per-channel cooldown prevents any word commit for N ms after the last one.
// If it ever feels too slow, drop toward 1000. Fingerspell keeps its default
// (no cooldown) — letter cadence relies on hold + smoother release.
const WORD_COMMIT_COOLDOWN_MS = 1500;

// Word signs are trajectories, not holds — need a longer vote window, longer
// dwell, and a longer release than letters. Hands-out-of-frame overrides
// releaseAfterMs (see Smoother.push), so the long value is a fallback.
//
// Fingerspell settles before it commits. Reported symptom: signing A printed S
// first, then A — because the hand passes through an S-like fist on the way in
// and a plurality vote let the leader commit mid-transition. The 0.7 share
// requirement is what actually fixes that; the slightly longer window and dwell
// (was 400/500) just give the hand time to arrive. releaseAfterMs stays at 300
// — that's what lets a repeated letter fire twice, e.g. the OO in COOL.
const smootherFor = (mode: Mode) =>
  mode === 'words'
    ? new Smoother(700, 0.55, 700, 800)
    : new Smoother(550, 0.6, 650, 300, 0.7);

// 'both' mode arbitration — by MOTION, not confidence.
//
// The old gate compared the words model's raw confidence to 0.4. That could
// never work: neither model has a reject class, so each is saturated-confident
// on the other's input. Measured, the words model returns 1.00 on 100% of
// letter frames, so the gate suppressed *every* letter commit — which is
// exactly the reported bug (words appear, letters never do).
//
// Motion separates them, because the two are physically different things: a
// fingerspelled letter is a hold, a word sign is a trajectory. Mean per-frame
// landmark travel over the vote window, real captures vs real WLASL video.
//
// Threshold honesty: on whole clips the gap looks enormous (0.006 vs 0.077),
// but over a 16-frame rolling window — what actually runs here — it narrows to
// 0.007 vs 0.031 with real overlap. Worse, ml/data/fingerspell/round1.jsonl is
// only 26 clips of 12-37 frames, so once the approach frames are trimmed just
// 4 clean hold windows remain. That is not enough to calibrate against.
//
// 0.012 is therefore a starting point, not a derived optimum: it lets letters
// through in ~58% of their windows (they committed in 0% before, which was the
// bug) while ~76% of word windows still read as moving. Tune against live use.
// Raise it if words stop committing; lower it if stray letters appear mid-sign.
const MOTION_WINDOW = 16; // ~530 ms at 30 fps, matched to the letter vote window
const MOTION_IS_WORD = 0.012;
const HANDS_BLOCK = 126; // hands-only slice; face dims don't indicate signing motion

function meanTravel(buf: Float32Array[]): number {
  if (buf.length < 2) return 0;
  let sum = 0;
  let n = 0;
  for (let f = 1; f < buf.length; f++) {
    const a = buf[f - 1];
    const b = buf[f];
    const d = Math.min(HANDS_BLOCK, a.length, b.length);
    for (let i = 0; i < d; i++) sum += Math.abs(b[i] - a[i]);
    n += d;
  }
  return n === 0 ? 0 : sum / n;
}

const MODES_FOR: Record<LiveMode, Mode[]> = {
  fingerspell: ['fingerspell'],
  words: ['words'],
  both: ['fingerspell', 'words'],
};

type Channel = {
  mode: Mode;
  classifier: Classifier;
  smoother: Smoother;
  lastCommitAt: number;
  spaceInserted: boolean;
};

export type Display = {
  top: string | null;
  channel: Mode;
  confidence: number;
  hold: number;
};

/** A committed token, or the auto-space that fills an idle gap. */
export type RecognizerCommit =
  | { channel: Mode; label: string; appended: string; confidence: number }
  | { channel: Mode; autoSpace: true };

export type RecognizerUpdate = {
  handsPresent: boolean;
  /**
   * Hands are in frame but the classifier hasn't filled its minimum window yet
   * (the first ~4 frames of every sign). Consumers must sync `handsPresent` and
   * then do nothing else — in particular, leave the previous display standing
   * rather than clearing it, which is what the hook did by early-returning.
   */
  pending: boolean;
  display: Display | null;
  topK: { label: string; confidence: number }[];
  moving: boolean;
  commits: RecognizerCommit[];
};

export type RecognizerOptions = {
  mode?: LiveMode;
  /** Run classifier + topK but emit no commits. Practice/tutorial surfaces know
   *  the target already, and must not write to a transcript. */
  silent?: boolean;
  /** Prefix for model fetches. '' keeps the web app's absolute `/models/...`.
   *  A browser extension passes `chrome.runtime.getURL('.')` — without it the
   *  path resolves against the *page's* origin (meet.google.com) and 404s. */
  assetBase?: string;
};

/**
 * Framework-free orchestration for the recognition pipeline: owns the channels,
 * motion arbitration between them, and the commit rules. Knows nothing about
 * React, Zustand or the DOM, so the web app, the golden-output test and the
 * in-call extension all drive the same code rather than forking it.
 *
 * Extracted verbatim from useLiveLetter.handleFrame in Phase 18 step 2; the
 * golden test is what proves the extraction changed no behaviour.
 */
export class Recognizer {
  readonly mode: LiveMode;
  private readonly silent: boolean;
  private readonly assetBase: string;
  private channels: Channel[] = [];
  private motionBuf: Float32Array[] = [];

  constructor(opts: RecognizerOptions = {}) {
    this.mode = opts.mode ?? 'fingerspell';
    this.silent = opts.silent ?? false;
    this.assetBase = opts.assetBase ?? '';
  }

  /** Channels exist (and so `handleFrame` is safe to call) as soon as this is
   *  invoked; the returned promise only settles once weights have landed. */
  async load(): Promise<void> {
    const channels: Channel[] = MODES_FOR[this.mode].map((m) => ({
      mode: m,
      classifier: new Classifier(),
      smoother: smootherFor(m),
      lastCommitAt: 0,
      spaceInserted: false,
    }));
    this.channels = channels;
    await Promise.all(
      channels.map((ch) => ch.classifier.load(`${this.assetBase}/models/${ch.mode}_asl`)),
    );
  }

  ready(): boolean {
    return this.channels.length > 0 && this.channels.every((ch) => ch.classifier.ready());
  }

  dispose(): void {
    this.channels = [];
    this.motionBuf = [];
  }

  /** null = not loaded yet; consumers should leave all state untouched. */
  handleFrame(frame: FeatureFrame): RecognizerUpdate | null {
    const channels = this.channels;
    if (channels.length === 0 || !channels.every((ch) => ch.classifier.ready())) return null;

    const handsPresent = (frame.meta?.handsDetected ?? 0) > 0;
    // Skip the classifier entirely when no hands — the network confidently maps
    // all-zero hand vectors to a fixed class (a training-data artifact), and
    // that garbage prediction otherwise leaks through to scoring UIs.
    if (!handsPresent) {
      this.motionBuf = [];
      return { handsPresent: false, pending: false, display: null, topK: [], moving: false, commits: [] };
    }

    const motionBuf = this.motionBuf;
    motionBuf.push(frame.vector);
    if (motionBuf.length > MOTION_WINDOW) motionBuf.shift();

    const results = channels
      .map((ch) => {
        const pred = ch.classifier.predict(frame);
        return pred ? { ch, pred, smooth: ch.smoother.push(pred, handsPresent) } : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (results.length !== channels.length) {
      return { handsPresent: true, pending: true, display: null, topK: [], moving: false, commits: [] };
    }

    // Only arbitrate when both channels are live. In single-mode there's
    // nothing to disambiguate, and gating there would break J and Z — the two
    // letters that are themselves drawn with movement.
    const arbitrate = results.length > 1;
    const moving = meanTravel(motionBuf) >= MOTION_IS_WORD;

    // Display: winner among the channels that survive the SAME motion gate the
    // commit loop below applies.
    //
    // Previously the display took the raw-confidence winner across *all*
    // channels while only commits were gated. Because neither model has a
    // reject class and the words model returns 1.00 on 100% of letter frames,
    // holding a letter in 'both' mode displayed a word gloss while the
    // transcript correctly received the letter — measured at 56/56 frames for
    // each of A/B/C/D, and HELLO/both read "YOU" at 1.00 mid-sign.
    //
    // In the web app that was a misleading hold bar. In a video call the
    // overlay *is* the caption, so a caption that contradicts the transcript is
    // the entire output. Fixed here rather than in the shell, so every surface
    // inherits it.
    const survivors = arbitrate
      ? results.filter((r) => (r.ch.mode === 'words') === moving)
      : results;
    // Exactly one channel survives arbitration today; fall back rather than
    // throw on reduce() if a third channel ever changes that.
    const pool = survivors.length > 0 ? survivors : results;
    const winner = pool.reduce((best, r) => (r.pred.confidence > best.pred.confidence ? r : best));
    const display: Display = {
      top: winner.smooth.top,
      channel: winner.ch.mode,
      confidence: winner.pred.confidence,
      hold: winner.smooth.hold,
    };
    // ponytail: topK stays merged across both channels on purpose — it feeds
    // the confidence bar's candidate list, nothing reads it as "the" answer,
    // and the golden file doesn't cover it. Gate it too if a surface ever
    // presents it as the caption.
    const topK = results
      .flatMap((r) => r.pred.topK)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    const commits: RecognizerCommit[] = [];

    if (!this.silent) {
      for (const { ch, pred, smooth } of results) {
        // A hand in motion is signing a word, not holding a letter — and a
        // hand at rest is the reverse. One signal, both directions.
        if (arbitrate && ch.mode === 'fingerspell' && moving) continue;
        if (arbitrate && ch.mode === 'words' && !moving) continue;

        // Word cooldown: reject stable commits that arrive during the quiet
        // window after the previous word committed. Gives the user a
        // deliberate beat between signs and prevents transition-tail commits.
        if (
          ch.mode === 'words' &&
          ch.lastCommitAt > 0 &&
          frame.timestamp - ch.lastCommitAt < WORD_COMMIT_COOLDOWN_MS
        ) {
          continue;
        }

        if (smooth.stable) {
          // Word signs commit as whole tokens with a trailing space; letters
          // append raw and rely on the idle-based auto-space below.
          const appended = ch.mode === 'words' ? smooth.stable + ' ' : smooth.stable;
          commits.push({
            channel: ch.mode,
            label: smooth.stable,
            appended,
            confidence: pred.confidence,
          });
          ch.lastCommitAt = frame.timestamp;
          ch.spaceInserted = ch.mode === 'words';
        } else if (
          !ch.spaceInserted &&
          ch.lastCommitAt > 0 &&
          frame.timestamp - ch.lastCommitAt > SPACE_AFTER_MS
        ) {
          commits.push({ channel: ch.mode, autoSpace: true });
          ch.spaceInserted = true;
        }
      }
    }

    return { handsPresent: true, pending: false, display, topK, moving, commits };
  }
}
