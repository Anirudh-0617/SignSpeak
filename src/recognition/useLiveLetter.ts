import { useCallback, useEffect, useRef, useState } from 'react';
import { Recognizer } from './recognizer';
import type { LiveMode } from './recognizer';
import type { FeatureFrame } from '../input/InputSource';
import { useStore } from '../state/store';

// Recognition logic lives in ./recognizer (framework-free, shared with the
// golden test and the in-call extension). This hook is only the React binding:
// it maps Recognizer updates onto component state and the transcript store.
// Anything that decides *what* gets recognised belongs in recognizer.ts.
export type { Mode, LiveMode } from './recognizer';

export type LiveLetterState = {
  handleFrame: (f: FeatureFrame) => void;
  top: string | null;
  confidence: number;
  topK: { label: string; confidence: number }[];
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  handsPresent: boolean;
  // 0→1 progress toward committing `top`. Drives the hold indicator so the
  // wait reads as the app working rather than the app missing the sign.
  hold: number;
};

export function useLiveLetter(
  mode: LiveMode = 'fingerspell',
  // silent: run classifier + topK but skip transcript-store side effects.
  // Used by Practice mode where the target is already known.
  silent = false,
): LiveLetterState {
  const recognizerRef = useRef<Recognizer | null>(null);
  const [top, setTop] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [topK, setTopK] = useState<{ label: string; confidence: number }[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [handsPresent, setHandsPresent] = useState(false);
  const [hold, setHold] = useState(0);
  // ponytail: mirror to a ref so we only fire setHandsPresent on transitions.
  // Per-frame setState of a boolean wastes renders across the tree.
  const handsPresentRef = useRef(false);

  const appendChar = useStore((s) => s.appendChar);
  const insertSpaceIfNeeded = useStore((s) => s.insertSpaceIfNeeded);
  const appendGloss = useStore((s) => s.appendGloss);

  // `silent` is in the dep list because the Recognizer owns it — it gates the
  // commit loop, which also advances per-channel cooldown state, so it can't be
  // filtered downstream without changing behaviour. Every call site passes a
  // literal, so this never actually re-loads models.
  useEffect(() => {
    setStatus('loading');
    setError(null);
    setTop(null);
    const recognizer = new Recognizer({ mode, silent });
    recognizerRef.current = recognizer;
    recognizer
      .load()
      .then(() => setStatus('ready'))
      .catch((e: unknown) => {
        setStatus('error');
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      recognizer.dispose();
      recognizerRef.current = null;
    };
  }, [mode, silent]);

  // ponytail: identity-stable so CameraView's effect doesn't re-mount per frame.
  const handleFrame = useCallback(
    (frame: FeatureFrame) => {
      const update = recognizerRef.current?.handleFrame(frame);
      if (!update) return;

      // Sync handsPresent state on transitions only.
      if (update.handsPresent !== handsPresentRef.current) {
        handsPresentRef.current = update.handsPresent;
        setHandsPresent(update.handsPresent);
      }
      if (!update.handsPresent) {
        setTop(null);
        setConfidence(0);
        setTopK([]);
        setHold(0);
        return;
      }
      // Hands are in frame but the classifier is still filling its window —
      // hold the previous display rather than blanking it.
      if (update.pending || !update.display) return;

      setTop(update.display.top);
      setConfidence(update.display.confidence);
      setHold(update.display.hold);
      setTopK(update.topK);

      // Empty when silent, so no branch needed here.
      for (const commit of update.commits) {
        if ('autoSpace' in commit) {
          insertSpaceIfNeeded();
          continue;
        }
        appendChar(commit.appended);
        appendGloss({
          label: commit.label,
          appended: commit.appended,
          confidence: commit.confidence,
        });
      }
    },
    [appendChar, appendGloss, insertSpaceIfNeeded],
  );

  return { handleFrame, top, confidence, topK, status, error, handsPresent, hold };
}
