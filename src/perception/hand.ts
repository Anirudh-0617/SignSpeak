import {
  HandLandmarker,
  FilesetResolver,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';

import { perceptionAssets, withDelegateFallback } from './assets';

export type HandResult = HandLandmarkerResult;

export async function createHandLandmarker(): Promise<HandLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(perceptionAssets.wasm);
  return withDelegateFallback((delegate) =>
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: perceptionAssets.hand, delegate },
      runningMode: 'VIDEO',
      numHands: 2,
    }),
  );
}

// ponytail: split by MediaPipe's handedness call so left/right slots match
// what the Python importer wrote — training + inference share the same layout.
export function splitHands(result: HandResult): {
  left: NormalizedLandmark[] | undefined;
  right: NormalizedLandmark[] | undefined;
} {
  let left: NormalizedLandmark[] | undefined;
  let right: NormalizedLandmark[] | undefined;
  for (let i = 0; i < result.landmarks.length; i++) {
    const label = result.handedness[i]?.[0]?.categoryName;
    if (label === 'Left') left = result.landmarks[i];
    else if (label === 'Right') right = result.landmarks[i];
  }
  return { left, right };
}
