// Pass thresholds. Letters get 0.60 (sharp softmax on static holds).
// Words get 0.40 — the 23-class softmax is flatter and dynamic signs never
// spike as high as a held letter shape. HANDOFF-noted starting point; tune
// during M5 user testing.
export const PASS_CONFIDENCE: Record<'fingerspell' | 'words', number> = {
  fingerspell: 0.6,
  words: 0.4,
};
export const PASS_DWELL_MS = 600;
export const FAIL_TIMEOUT_MS = 10_000;
