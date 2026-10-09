// The public surface of what becomes @signspeak/core.
//
// Everything a non-React shell (the in-call extension, the golden harness, a
// future glove app) is allowed to import. If a shell needs something that isn't
// re-exported here, that's the signal to widen this file deliberately rather
// than to reach into src/ internals — reaching in is how the recognizer gets
// forked, which is the exact failure Phase 18 exists to prevent.
//
// Nothing in here may import React, Zustand, or touch the DOM beyond a passed-in
// element. `useLiveLetter` is the React binding and is deliberately absent.
//
// ponytail: a barrel file, not a package, until the extension repo exists. The
// eventual `npm init` is then a `git mv` of these modules plus a package.json —
// the boundary is already drawn and already honoured.

export { Recognizer } from './recognition/recognizer';
export type {
  Mode,
  LiveMode,
  Display,
  RecognizerCommit,
  RecognizerUpdate,
  RecognizerOptions,
} from './recognition/recognizer';

export { Classifier } from './recognition/classifier';
export type { Prediction } from './recognition/classifier';
export { Smoother } from './recognition/smoothing';

export { normalize } from './perception/normalize';
export { createHandLandmarker, splitHands } from './perception/hand';
export type { HandResult } from './perception/hand';
export { perceptionAssets, configurePerceptionAssets } from './perception/assets';

export { CameraSource } from './input/CameraSource';
export { VideoElementSource } from './input/VideoElementSource';
export type { InputSource, FeatureFrame } from './input/InputSource';
