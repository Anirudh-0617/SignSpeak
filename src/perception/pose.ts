import {
  PoseLandmarker,
  FilesetResolver,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';

import { perceptionAssets, withDelegateFallback } from './assets';

export type PoseResult = PoseLandmarkerResult;

export async function createPoseLandmarker(): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(perceptionAssets.wasm);
  return withDelegateFallback((delegate) =>
    PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: perceptionAssets.pose, delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
    }),
  );
}
