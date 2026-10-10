import type { FaceLandmarker, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { createHandLandmarker, splitHands, type HandResult } from '../perception/hand';
import { createFaceLandmarker, type FaceResult } from '../perception/face';
import { createPoseLandmarker, type PoseResult } from '../perception/pose';
import { normalize } from '../perception/normalize';
import type { FeatureFrame, InputSource } from './InputSource';

type FrameCb = (frame: FeatureFrame) => void;
type RawCb = (result: HandResult) => void;
type FaceCb = (result: FaceResult) => void;
type PoseCb = (result: PoseResult) => void;

// ponytail: 33 ms ≈ 30 Hz, matches hand + display refresh. Earlier 100 ms
// throttle made face dots visibly lag behind the video when the head moved
// (read as "horizontal offset"). GPU delegate handles per-frame face fine on
// modern hardware; if it ever drags FPS below ~25, raise this back to 50–66 ms.
const FACE_INTERVAL_MS = 33;
// ponytail: pose is display-only (Phase 12), throttled 10 Hz for the same
// reasons as face. Not written into the feature vector — classifier stays v0.4.
const POSE_INTERVAL_MS = 100;
// Lite (phones): no face model at all — the live classifiers are hands-only
// (featureLen 252), so face only ever fed the overlay dots. Pose still runs
// for the practice torso gate, at half rate.
const LITE_POSE_INTERVAL_MS = 200;

export class CameraSource implements InputSource {
  readonly kind = 'camera' as const;
  private stream: MediaStream | null = null;
  private landmarker: HandLandmarker | null = null;
  private faceLandmarker: FaceLandmarker | null = null;
  private poseLandmarker: PoseLandmarker | null = null;
  private raf = 0;
  private lastVideoTs = -1;
  private lastFaceAt = 0;
  private lastFaceResult: FaceResult | null = null;
  private lastPoseAt = 0;
  private lastPoseResult: PoseResult | null = null;
  private cancelled = false;
  private frameCbs: FrameCb[] = [];
  private rawCbs: RawCb[] = [];
  private faceCbs: FaceCb[] = [];
  private poseCbs: PoseCb[] = [];

  private readonly video: HTMLVideoElement;
  private readonly lite: boolean;
  private readonly poseIntervalMs: number;
  constructor(video: HTMLVideoElement, opts: { lite?: boolean } = {}) {
    this.video = video;
    this.lite = opts.lite ?? false;
    this.poseIntervalMs = this.lite ? LITE_POSE_INTERVAL_MS : POSE_INTERVAL_MS;
  }

  onFrame(cb: FrameCb) {
    this.frameCbs.push(cb);
  }

  // ponytail: camera-only escape hatch for the overlay. Not on InputSource
  // because a glove has no raw video frame to draw.
  onRaw(cb: RawCb) {
    this.rawCbs.push(cb);
  }

  onRawFace(cb: FaceCb) {
    this.faceCbs.push(cb);
  }

  onRawPose(cb: PoseCb) {
    this.poseCbs.push(cb);
  }

  async start() {
    this.cancelled = false;
    this.stream = await navigator.mediaDevices.getUserMedia({
      // `ideal`, not exact: phones in portrait hand back 480×640 and some
      // can't do 640×480 at all. normalize() multiplies x by the real aspect
      // ratio, so features are the same in either orientation.
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    if (this.cancelled) return this.teardown();
    this.video.srcObject = this.stream;
    // ponytail: play() rejects with AbortError when React StrictMode unmounts
    // us mid-mount — that's the expected shutdown, not a real failure.
    try {
      await this.video.play();
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
    }
    if (this.cancelled) return this.teardown();
    // ponytail: init hand + face + pose in parallel. Any of face/pose failing
    // (rare) is non-fatal — hands are the only required signal for classification.
    const [hand, face, pose] = await Promise.all([
      createHandLandmarker(),
      this.lite
        ? null
        : createFaceLandmarker().catch((e) => {
            console.warn('[camera] FaceLandmarker init failed, continuing without face:', e);
            return null;
          }),
      createPoseLandmarker().catch((e) => {
        console.warn('[camera] PoseLandmarker init failed, continuing without pose:', e);
        return null;
      }),
    ]);
    if (this.cancelled) {
      hand.close();
      face?.close();
      pose?.close();
      return this.teardown();
    }
    this.landmarker = hand;
    this.faceLandmarker = face;
    this.poseLandmarker = pose;
    this.loop();
  }

  async stop() {
    this.cancelled = true;
    this.teardown();
    this.frameCbs = [];
    this.rawCbs = [];
    this.faceCbs = [];
    this.poseCbs = [];
  }

  private teardown() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.landmarker?.close();
    this.faceLandmarker?.close();
    this.poseLandmarker?.close();
    this.stream = null;
    this.landmarker = null;
    this.faceLandmarker = null;
    this.poseLandmarker = null;
    if (this.video.srcObject) this.video.srcObject = null;
  }

  private loop = () => {
    const l = this.landmarker;
    if (!l || this.cancelled) return;
    if (this.video.readyState >= 2 && this.video.currentTime !== this.lastVideoTs) {
      this.lastVideoTs = this.video.currentTime;
      const ts = performance.now();
      const result = l.detectForVideo(this.video, ts);
      let freshFace = false;
      if (this.faceLandmarker && ts - this.lastFaceAt >= FACE_INTERVAL_MS) {
        this.lastFaceResult = this.faceLandmarker.detectForVideo(this.video, ts);
        this.lastFaceAt = ts;
        freshFace = true;
      }
      let freshPose = false;
      if (this.poseLandmarker && ts - this.lastPoseAt >= this.poseIntervalMs) {
        this.lastPoseResult = this.poseLandmarker.detectForVideo(this.video, ts);
        this.lastPoseAt = ts;
        freshPose = true;
      }
      const cachedFace = this.lastFaceResult;
      const cachedPose = this.lastPoseResult;
      const { left, right } = splitHands(result);
      const handsDetected = (left ? 1 : 0) + (right ? 1 : 0);
      const faceDetected = (cachedFace?.faceLandmarks.length ?? 0) > 0;
      const blendshapes = cachedFace?.faceBlendshapes[0]?.categories;
      const aspectRatio =
        this.video.videoHeight > 0 ? this.video.videoWidth / this.video.videoHeight : 1;
      const frame: FeatureFrame = {
        timestamp: ts,
        vector: normalize(left, right, aspectRatio, blendshapes),
        source: 'camera',
        meta: { handsDetected, faceDetected },
      };
      for (const cb of this.frameCbs) cb(frame);
      for (const cb of this.rawCbs) cb(result);
      // ponytail: face callbacks fire only on fresh detects (10 Hz). Blendshape
      // UI + face-mesh cache both throttle naturally; hand overlay reads face
      // from a ref, so hand-rate drawing gets the latest face for free.
      if (freshFace && cachedFace) for (const cb of this.faceCbs) cb(cachedFace);
      if (freshPose && cachedPose) for (const cb of this.poseCbs) cb(cachedPose);
    }
    this.raf = requestAnimationFrame(this.loop);
  };
}
