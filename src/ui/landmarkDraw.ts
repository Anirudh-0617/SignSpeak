import {
  DrawingUtils,
  HandLandmarker,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import { landmarkColors, landmarkHalo } from './tokens';

// Shared overlay drawing for CameraView (live video) and ReferenceSkeleton
// (recorded clips), so the two can't drift apart — the palette was duplicated
// across three files once already and the legend started lying about it.
//
// Two rules encoded here:
//   1. Every stroke gets a dark halo first. The overlay is composited over
//      arbitrary camera content, so colour alone can't guarantee legibility.
//   2. Roles are separated by FORM as well as hue, because four colours cannot
//      be mutually distinguished on a single luminance axis while all staying
//      readable. Hands are thick with filled joints, pose is a thin jointless
//      frame, face is a dot cloud. Scale and density do the work that colour
//      can't.

export function drawHand(
  draw: DrawingUtils,
  landmarks: NormalizedLandmark[],
  color: string,
): void {
  draw.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
    color: landmarkHalo,
    lineWidth: 7,
  });
  draw.drawLandmarks(landmarks, { color: landmarkHalo, radius: 5 });
  draw.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color, lineWidth: 3 });
  draw.drawLandmarks(landmarks, { color, radius: 3 });
}

export function drawPose(draw: DrawingUtils, landmarks: NormalizedLandmark[]): void {
  // No joint dots: the jointless thin frame is what tells pose apart from a
  // hand at a glance, now that hue no longer can.
  draw.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
    color: landmarkHalo,
    lineWidth: 4,
  });
  draw.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
    color: landmarkColors.pose,
    lineWidth: 1.5,
  });
}

export function drawFace(draw: DrawingUtils, landmarks: NormalizedLandmark[]): void {
  // ponytail: no halo pass here. 478 dots × 2 was what thrashed the framerate
  // last time this got heavier, and cyan already sits at ~11:1 on the stage.
  draw.drawLandmarks(landmarks, { color: landmarkColors.face, radius: 1 });
}

export function handColor(handedness: string | undefined): string {
  return handedness === 'Left' ? landmarkColors.leftHand : landmarkColors.rightHand;
}
