// Where MediaPipe's runtime and model files are fetched from.
//
// The defaults are the public CDNs, which is correct for the web app. A browser
// extension MUST override `wasm`: Manifest V3 bans remotely-hosted code, so the
// Chrome Web Store rejects an extension that pulls its WASM from jsdelivr. The
// `.task` files are model *data* rather than code and remote fetch is
// technically permitted, but bundling them too buys offline support, no CDN
// dependency, and a faster cold start.
//
// ponytail: a mutable module singleton instead of threading parameters through
// createXLandmarker -> CameraSource -> every caller. One call at startup and
// nothing else in the tree has to know. The three landmarker modules each had
// this same CDN string copy-pasted; this is also where that triplication went.
//
//   configurePerceptionAssets({
//     wasm: chrome.runtime.getURL('wasm'),
//     hand: chrome.runtime.getURL('models/hand_landmarker.task'),
//   });

const CDN_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const CDN_MODELS = 'https://storage.googleapis.com/mediapipe-models';

export const perceptionAssets = {
  wasm: CDN_WASM,
  hand: `${CDN_MODELS}/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task`,
  face: `${CDN_MODELS}/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
  pose: `${CDN_MODELS}/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task`,
};

/** Call once, before the first landmarker is created. Each create* function
 *  reads these at call time, so ordering is the only requirement. */
export function configurePerceptionAssets(
  overrides: Partial<typeof perceptionAssets>,
): void {
  Object.assign(perceptionAssets, overrides);
}
