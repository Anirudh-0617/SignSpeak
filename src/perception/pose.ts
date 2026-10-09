import {
  PoseLandmarker,
  FilesetResolver,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';

import { perceptionAssets } from './assets';

export type PoseResult = PoseLandmarkerResult;

export async function createPoseLandmarker(): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(perceptionAssets.wasm);
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: perceptionAssets.pose, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
}
