import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';

import { perceptionAssets } from './assets';

export type FaceResult = FaceLandmarkerResult;

export async function createFaceLandmarker(): Promise<FaceLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(perceptionAssets.wasm);
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: perceptionAssets.face, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numFaces: 1,
    // Blendshapes on: 52 semantic emotion signals (mouthSmile, browInnerUp, etc.).
    // CameraView renders the live top-3; feature-vector integration is Phase 10 M4.
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false,
  });
}
