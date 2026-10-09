// Single source of every factual claim the landing makes. Variants may word
// things their own way, but numbers and capability claims come from here.
// Each entry says where it was checked. No em-dashes anywhere (house rule for
// landing copy, per the taste-skill pre-flight).

export const FACTS = {
  // public/models/fingerspell_asl/labels.json (A-Z)
  letters: 26,
  // public/models/words_asl/labels.json
  words: 33,
  // CLAUDE.md phase 3: Kaggle holdout. Static handshapes, one signer set.
  letterAccuracy: '98.3%',
  // CLAUDE.md phase 5, restated 2026-08-06 on a deduplicated split. The older
  // 0.965 figure was leakage. Do not quote it anywhere.
  wordAccuracy: '56.5%',
  // public/reference-signs/*.json
  referenceClips: 61,
  // MediaPipe HandLandmarker / PoseLandmarker
  handPoints: 21,
  posePoints: 33,
  // Feature spec v0.3 hands block: 2 hands x 21 points x 3 coords
  featureDims: 126,
} as const;

// Privacy, stated precisely. Recognition is fully local. The optional
// Translate button sends the recognized gloss TEXT (never video) to an LLM
// (src/translate/translate.ts -> NVIDIA nemotron via proxy). "Nothing leaves
// your machine" was the old copy and is not true when Translate is used.
export const PRIVACY = {
  short: 'Your camera feed never leaves the tab.',
  long: 'Hand tracking and recognition run in your browser. Video is never uploaded. The optional Translate button sends only the recognized words, as text, to a language model.',
};

// Honest framing for word signs: a starter vocabulary, not fluency.
export const WORD_SIGNS_NOTE =
  'Word signs are an early vocabulary trained on a few hundred public clips. Expect misses; fingerspelling is the reliable path today.';

export const LINKS = {
  app: '/app',
  login: '/login',
  feedback: 'mailto:anirudhannaboina1@gmail.com?subject=SignSpeak%20feedback',
  mediapipe: 'https://ai.google.dev/edge/mediapipe',
  wlasl: 'https://dxli94.github.io/WLASL/',
  kaggle: 'https://www.kaggle.com/datasets/grassknoted/asl-alphabet',
};

// One label per intent (taste-skill: no duplicate CTA intent).
export const CTA = {
  primary: 'Open SignSpeak',
  signIn: 'Sign in',
  feedback: 'Send feedback',
};

// The three things you can do in /app. Descriptions are what the app actually
// does today (src/ui/*), not roadmap.
export const MODES = [
  {
    id: 'transcribe',
    name: 'Transcribe',
    body: 'Sign into an editable transcript. Letters, words, or both. Auto-spaces after a pause.',
    sample: ['HELLO', 'MY', 'NAME', 'A-N-I'],
  },
  {
    id: 'practice',
    name: 'Practice',
    body: 'Pick a sign, copy the reference figure, and get scored live with the top guesses shown.',
    sample: ['THANK-YOU'],
  },
  {
    id: 'sentence',
    name: 'Sentence builder',
    body: 'Walk through short phrases like MY NAME, then fingerspell the blank.',
    sample: ['MY', 'NAME'],
  },
] as const;

// Pipeline, in the order data actually flows (src/perception -> recognition).
export const PIPELINE = [
  { id: 'see', name: 'Camera', body: 'Frames stay in the browser tab.' },
  { id: 'track', name: 'Landmarks', body: `MediaPipe finds ${FACTS.handPoints} points per hand and ${FACTS.posePoints} for the body.` },
  { id: 'encode', name: 'Features', body: `Points are anchored to the wrist and flattened into ${FACTS.featureDims} numbers.` },
  { id: 'classify', name: 'Label', body: 'A small neural net, running in the page, names the sign.' },
] as const;

// Glosses with good-looking reference clips for hero/demo loops. HELLO, MY,
// NAME are the conversational opener the app's Sentence Builder teaches.
export const HERO_SEQUENCE = ['HELLO', 'MY', 'NAME'] as const;
