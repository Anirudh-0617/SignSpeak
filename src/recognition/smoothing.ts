import type { Prediction } from './classifier';

/**
 * Temporal voting + dwell-to-commit for letter recognition.
 *
 * Emits a "stable" label only when the same label wins the majority vote over
 * the last `windowMs`, its mean confidence ≥ `minConfidence`, and it has been
 * top for ≥ `dwellMs`. `top` is the current best guess even if not committed.
 * After a commit, the same label can only re-fire once we've seen a stretch of
 * low-confidence predictions ≥ `releaseAfterMs` (interpreted as the user
 * lowering / repositioning the hand) — this is what makes "OO" in COOL work.
 */
export class Smoother {
  private buffer: Prediction[] = [];
  private stableSince: { label: string; sinceMs: number } | null = null;
  private lastCommitted: string | null = null;
  private lastConfidentAt = 0;

  private readonly windowMs: number;
  private readonly minConfidence: number;
  private readonly dwellMs: number;
  private readonly releaseAfterMs: number;
  private readonly minShare: number;
  constructor(
    windowMs = 400,
    minConfidence = 0.6,
    dwellMs = 500,
    releaseAfterMs = 300,
    // Share of the window the winner must hold. 0 = plurality (any lead wins),
    // which is the original behaviour and what word-mode still uses.
    minShare = 0,
  ) {
    this.windowMs = windowMs;
    this.minConfidence = minConfidence;
    this.dwellMs = dwellMs;
    this.releaseAfterMs = releaseAfterMs;
    this.minShare = minShare;
  }

  push(
    p: Prediction,
    handsPresent = true,
  ): { stable: string | null; top: string | null; hold: number } {
    this.buffer.push(p);
    const cutoff = p.timestamp - this.windowMs;
    while (this.buffer.length && this.buffer[0].timestamp < cutoff) this.buffer.shift();

    // Hands leaving the frame is a hard segment boundary — release the commit
    // lock immediately so the next sign can fire, even if it's the same label.
    if (!handsPresent) {
      this.stableSince = null;
      this.lastCommitted = null;
      return { stable: null, top: null, hold: 0 };
    }

    const votes = new Map<string, { count: number; confSum: number }>();
    for (const q of this.buffer) {
      const v = votes.get(q.label) ?? { count: 0, confSum: 0 };
      v.count++;
      v.confSum += q.confidence;
      votes.set(q.label, v);
    }

    let winner: string | null = null;
    let best = 0;
    for (const [label, v] of votes) {
      if (v.count > best) {
        best = v.count;
        winner = label;
      }
    }
    const meanConf = winner ? votes.get(winner)!.confSum / votes.get(winner)!.count : 0;
    // Fraction of the window backing the winner, not just whether it leads.
    const share = winner ? votes.get(winner)!.count / this.buffer.length : 0;

    // Track when we last had a confident prediction; a quiet stretch releases
    // the double-commit lock so the same letter can fire again (e.g. "OO").
    if (winner && meanConf >= this.minConfidence) {
      this.lastConfidentAt = p.timestamp;
    } else if (
      this.lastCommitted !== null &&
      p.timestamp - this.lastConfidentAt > this.releaseAfterMs
    ) {
      this.lastCommitted = null;
    }

    // A plurality isn't enough. Moving into a handshape, the hand passes
    // through neighbouring ones — A and S are both fists — so the votes split
    // and whichever momentarily leads used to commit the wrong letter before
    // the hand had arrived. Requiring the winner to *dominate* the window means
    // a transition simply doesn't commit until it settles. Measured on held
    // letters the winner's share is 1.00 median and 0.81 at worst, so 0.7
    // clears a real hold comfortably while a 50/50 transition can't reach it.
    if (!winner || meanConf < this.minConfidence || share < this.minShare) {
      this.stableSince = null;
      return { stable: null, top: winner, hold: 0 };
    }
    if (!this.stableSince || this.stableSince.label !== winner) {
      this.stableSince = { label: winner, sinceMs: p.timestamp };
      return { stable: null, top: winner, hold: 0 };
    }
    const heldMs = p.timestamp - this.stableSince.sinceMs;
    if (heldMs >= this.dwellMs && winner !== this.lastCommitted) {
      this.lastCommitted = winner;
      return { stable: winner, top: winner, hold: 1 };
    }
    // Surfaced so the UI can show the letter filling up rather than flickering:
    // the user gets told to keep holding instead of guessing.
    return { stable: null, top: winner, hold: Math.min(1, heldMs / this.dwellMs) };
  }

  reset() {
    this.buffer = [];
    this.stableSince = null;
    this.lastCommitted = null;
  }

  release() {
    this.lastCommitted = null;
  }
}
