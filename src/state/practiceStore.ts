import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Attempt = {
  timestamp: number;
  peakConfidence: number;
  passed: boolean;
};

export type ProgressEntry = {
  attempts: Attempt[];
  passed: boolean;
  bestConfidence: number;
};

type PracticeState = {
  progress: Record<string, ProgressEntry>;
  currentSign: string | null;
  setCurrentSign: (gloss: string | null) => void;
  recordAttempt: (gloss: string, peak: number, passed: boolean) => void;
  reset: (gloss?: string) => void;
};

export const usePracticeStore = create<PracticeState>()(
  persist(
    (set, get) => ({
      progress: {},
      currentSign: null,
      setCurrentSign: (currentSign) => set({ currentSign }),
      recordAttempt: (gloss, peak, passed) => {
        const prev = get().progress[gloss] ?? { attempts: [], passed: false, bestConfidence: 0 };
        const attempt: Attempt = { timestamp: Date.now(), peakConfidence: peak, passed };
        set({
          progress: {
            ...get().progress,
            [gloss]: {
              attempts: [...prev.attempts, attempt],
              passed: prev.passed || passed,
              bestConfidence: Math.max(prev.bestConfidence, peak),
            },
          },
        });
      },
      reset: (gloss) => {
        if (!gloss) return set({ progress: {}, currentSign: null });
        const { [gloss]: _drop, ...rest } = get().progress;
        set({ progress: rest });
      },
    }),
    { name: 'signspeak:practice:v1' },
  ),
);
