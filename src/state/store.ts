import { create } from 'zustand';
import type { FeatureFrame } from '../input/InputSource';

export const FEATURE_SPEC_VERSION = '0.4';

export type Sample = {
  label: string;
  signer: string;
  createdAt: number;
  featureSpecVersion: string;
  source: 'camera' | 'glove';
  frames: number[][];
};

export type GlossToken = {
  id: string;
  label: string;
  appended: string; // exact string appended to transcript (label or "label ")
  timestamp: number;
  confidence: number;
};

type State = {
  // Transcript (Phase 4)
  transcript: string;
  setTranscript: (s: string) => void;
  appendChar: (c: string) => void;
  insertSpaceIfNeeded: () => void;
  backspace: () => void;
  clearTranscript: () => void;

  // Gloss stream (Phase 7.5) — parallel view of classifier commits.
  glossStream: GlossToken[];
  appendGloss: (t: Omit<GlossToken, 'id' | 'timestamp'>) => void;
  removeGloss: (id: string) => void;

  // Translation (Phase 7)
  translation: string;
  translationAlternates: string[];
  translationStatus: 'idle' | 'loading' | 'error';
  translationError: string | null;
  setTranslation: (s: string) => void;
  setTranslationAlternates: (a: string[]) => void;
  setTranslationStatus: (s: 'idle' | 'loading' | 'error', err?: string | null) => void;

  // Capture (Phase 2)
  label: string;
  signer: string;
  recording: boolean;
  buffer: FeatureFrame[];
  samples: Sample[];
  setLabel: (s: string) => void;
  setSigner: (s: string) => void;
  startRecording: () => void;
  stopRecording: () => void;
  pushFrame: (f: FeatureFrame) => void;
  clearSamples: () => void;
};

export const useStore = create<State>((set, get) => ({
  transcript: '',
  setTranscript: (transcript) => set({ transcript }),
  appendChar: (c) => set({ transcript: get().transcript + c }),
  insertSpaceIfNeeded: () => {
    const t = get().transcript;
    if (t.length > 0 && !t.endsWith(' ')) set({ transcript: t + ' ' });
  },
  backspace: () => set({ transcript: get().transcript.slice(0, -1) }),
  clearTranscript: () => set({ transcript: '', glossStream: [], translation: '', translationAlternates: [], translationStatus: 'idle', translationError: null }),

  glossStream: [],
  appendGloss: (t) =>
    set({
      glossStream: [
        ...get().glossStream,
        { ...t, id: crypto.randomUUID(), timestamp: Date.now() },
      ],
    }),
  removeGloss: (id) => {
    const { glossStream, transcript } = get();
    const tok = glossStream.find((g) => g.id === id);
    if (!tok) return;
    // ponytail: strip last occurrence of what this chip appended. Handles the
    // common "just committed, undo" case. Heavy hand-editing may desync — fine.
    const idx = transcript.lastIndexOf(tok.appended);
    const nextTranscript =
      idx >= 0 ? transcript.slice(0, idx) + transcript.slice(idx + tok.appended.length) : transcript;
    set({
      glossStream: glossStream.filter((g) => g.id !== id),
      transcript: nextTranscript,
    });
  },

  translation: '',
  translationAlternates: [],
  translationStatus: 'idle',
  translationError: null,
  setTranslation: (translation) => set({ translation }),
  setTranslationAlternates: (translationAlternates) => set({ translationAlternates }),
  setTranslationStatus: (translationStatus, err = null) =>
    set({ translationStatus, translationError: err }),

  label: 'A',
  signer: '',
  recording: false,
  buffer: [],
  samples: [],
  setLabel: (label) => set({ label }),
  setSigner: (signer) => set({ signer }),
  startRecording: () => set({ recording: true, buffer: [] }),
  stopRecording: () => {
    const { buffer, label, signer, samples } = get();
    if (buffer.length === 0) {
      set({ recording: false });
      return;
    }
    const sample: Sample = {
      label,
      signer: signer.trim(),
      createdAt: Date.now(),
      featureSpecVersion: FEATURE_SPEC_VERSION,
      source: buffer[0].source,
      frames: buffer.map((f) => Array.from(f.vector)),
    };
    set({ recording: false, buffer: [], samples: [...samples, sample] });
  },
  pushFrame: (f) => {
    if (!get().recording) return;
    // ponytail: skip frames when no hands are visible. normalize.ts emits an
    // all-zero vector in that case; committing them poisons the training data
    // with "signs = blank frame".
    if (!f.meta?.handsDetected) return;
    set({ buffer: [...get().buffer, f] });
  },
  clearSamples: () => set({ samples: [] }),
}));
