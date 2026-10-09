import type { HandLandmarker } from '@mediapipe/tasks-vision';
import { createHandLandmarker, splitHands, type HandResult } from '../perception/hand';
import { normalize } from '../perception/normalize';
import type { FeatureFrame, InputSource } from './InputSource';

type FrameCb = (frame: FeatureFrame) => void;
type RawCb = (result: HandResult) => void;

/**
 * Reads landmarks from a `<video>` element that something else owns and plays —
 * a call client's own self-view tile, typically.
 *
 * Why this exists rather than reusing CameraSource: inside a video call the
 * camera is already open and being encoded by the call client. Opening a second
 * getUserMedia beside it risks a second permission prompt, a second device
 * consumer some drivers refuse, and landmarks computed from different pixels
 * than the ones participants actually see. Borrowing the element the page is
 * already painting avoids all three.
 *
 * Deliberately hands-only. Face and pose are display-only in this project and
 * cost framerate that a call has no spare budget for.
 *
 * ⚠️ This source does NOT own the stream. `stop()` must never touch the video's
 * tracks or srcObject — doing so would kill the user's camera inside the call.
 * That is the one behavioural difference from CameraSource, and the reason this
 * is a separate class rather than a flag on it.
 */
export class VideoElementSource implements InputSource {
  // Still 'camera': the pixels are a camera's, just routed through a call
  // client. Keeping the discriminant means the feature vector is byte-identical
  // to what the web app and the Python importer produce.
  readonly kind = 'camera' as const;

  private landmarker: HandLandmarker | null = null;
  private raf = 0;
  private lastVideoTs = -1;
  private lastDetectAt = 0;
  private cancelled = false;
  private frameCbs: FrameCb[] = [];
  private rawCbs: RawCb[] = [];

  private readonly video: HTMLVideoElement;
  private readonly detectIntervalMs: number;

  /**
   * @param detectIntervalMs floor between detections. 0 (default) matches
   * CameraSource — detect on every new video frame. Raise it only after
   * measuring CPU in a real call; guessing here is how framerate bugs get
   * "fixed" without evidence.
   */
  constructor(video: HTMLVideoElement, opts: { detectIntervalMs?: number } = {}) {
    this.video = video;
    this.detectIntervalMs = opts.detectIntervalMs ?? 0;
  }

  onFrame(cb: FrameCb) {
    this.frameCbs.push(cb);
  }

  // ponytail: mirrors CameraSource.onRaw so an overlay renderer can draw
  // landmarks without a second detect pass.
  onRaw(cb: RawCb) {
    this.rawCbs.push(cb);
  }

  async start() {
    this.cancelled = false;
    const landmarker = await createHandLandmarker();
    if (this.cancelled) {
      landmarker.close();
      return;
    }
    this.landmarker = landmarker;
    this.loop();
  }

  async stop() {
    this.cancelled = true;
    this.teardown();
    this.frameCbs = [];
    this.rawCbs = [];
  }

  private teardown() {
    cancelAnimationFrame(this.raf);
    this.landmarker?.close();
    this.landmarker = null;
    // Intentionally nothing about this.video — see the class comment.
  }

  private loop = () => {
    const landmarker = this.landmarker;
    if (!landmarker || this.cancelled) return;

    // readyState >= 2 means dimensions and current frame data exist. A call
    // client can swap or detach srcObject at any time (camera toggled off,
    // layout change), so this is a normal transient state, not an error.
    if (this.video.readyState >= 2 && this.video.currentTime !== this.lastVideoTs) {
      const ts = performance.now();
      if (ts - this.lastDetectAt >= this.detectIntervalMs) {
        this.lastVideoTs = this.video.currentTime;
        this.lastDetectAt = ts;
        const result = landmarker.detectForVideo(this.video, ts);
        const { left, right } = splitHands(result);
        const handsDetected = (left ? 1 : 0) + (right ? 1 : 0);
        // Intrinsic stream dimensions, not the element's CSS box — the tile is
        // usually letterboxed. Getting this wrong is not subtle: the same clip
        // scores p(HELLO)=1.00 at 4:3 and ~0 at 16:9.
        const aspectRatio =
          this.video.videoHeight > 0 ? this.video.videoWidth / this.video.videoHeight : 1;
        const frame: FeatureFrame = {
          timestamp: ts,
          vector: normalize(left, right, aspectRatio),
          source: 'camera',
          meta: { handsDetected, faceDetected: false },
        };
        for (const cb of this.frameCbs) cb(frame);
        for (const cb of this.rawCbs) cb(result);
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };
}
