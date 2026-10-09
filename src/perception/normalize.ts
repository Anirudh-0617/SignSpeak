import type { Category, NormalizedLandmark } from '@mediapipe/tasks-vision';

// Feature spec v0.4 (hands + face blendshapes):
//   left hand (21×3=63) + right hand (21×3=63) + 52 face blendshapes = 178 dims.
//   Hands: v0.3 layout unchanged — per-hand wrist-anchored, absent→zeros, x×AR.
//   Blendshapes: MediaPipe's 52 canonical (mouthSmile, browInnerUp, ...) in
//   index order. Absent face → zeros. See ml/feature_spec.json.
const HAND_COUNT = 21;
const HANDS_LEN = 2 * HAND_COUNT * 3; // 126
const BLENDSHAPE_COUNT = 52;
export const FEATURE_LEN = HANDS_LEN + BLENDSHAPE_COUNT; // 178

// Aspect-ratio behaviour, measured 2026-09-24 (Phase 18 B-spike):
// because x is multiplied by AR and everything is then divided by the
// wrist→middle-MCP distance, the x/y hand geometry is EXACTLY invariant to the
// capture aspect ratio — 4:3 and 16:9 of the same hand give a bit-identical
// x/y block, provided the TRUE ratio is passed. Passing a wrong ratio is what
// destroys it (max|Δ| 0.756, which is the "16:9 collapses to ~0" note in
// HANDOFF.md — a mismatch bug, not a property of 16:9).
//
// ⚠️ z is the exception: it is never multiplied by AR. If a 16:9 frame relates
// to a 4:3 one by a vertical crop rather than a horizontal widening, the z
// block shifts by up to ~0.64 while x/y stay identical. Left alone deliberately
// — changing it would be a feature-spec bump invalidating every trained model,
// and MediaPipe's z is the weakest of the three signals anyway.
const WRIST = 0;
const MIDDLE_MCP = 9;

export function normalize(
  leftHand: NormalizedLandmark[] | undefined,
  rightHand: NormalizedLandmark[] | undefined,
  aspectRatio = 1,
  blendshapes?: Category[],
): Float32Array {
  const out = new Float32Array(FEATURE_LEN);
  const ar = aspectRatio > 0 ? aspectRatio : 1;
  writeHand(out, 0, leftHand, ar);
  writeHand(out, HAND_COUNT * 3, rightHand, ar);
  if (blendshapes && blendshapes.length > 0) {
    // ponytail: sort by canonical index — keeps browser + Python trainer in
    // lockstep regardless of runtime ordering quirks.
    const sorted = [...blendshapes].sort((a, b) => a.index - b.index);
    const n = Math.min(BLENDSHAPE_COUNT, sorted.length);
    for (let i = 0; i < n; i++) out[HANDS_LEN + i] = sorted[i].score;
  }
  return out;
}

function writeHand(
  out: Float32Array,
  dst: number,
  lm: NormalizedLandmark[] | undefined,
  ar: number,
) {
  if (!lm || lm.length < HAND_COUNT) return;
  const wx = lm[WRIST].x * ar;
  const wy = lm[WRIST].y;
  const wz = lm[WRIST].z;
  const mx = lm[MIDDLE_MCP].x * ar;
  const my = lm[MIDDLE_MCP].y;
  const scale = Math.hypot(mx - wx, my - wy) || 1e-6;
  for (let i = 0; i < HAND_COUNT; i++) {
    const p = lm[i];
    out[dst + i * 3] = (p.x * ar - wx) / scale;
    out[dst + i * 3 + 1] = (p.y - wy) / scale;
    out[dst + i * 3 + 2] = (p.z - wz) / scale;
  }
}
