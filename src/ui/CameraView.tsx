import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  DrawingUtils,
  type FaceLandmarkerResult,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { CameraSource } from '../input/CameraSource';
import { splitHands } from '../perception/hand';
import { drawFace, drawHand, drawPose, handColor } from './landmarkDraw';
import type { FeatureFrame } from '../input/InputSource';
import { LAB, LITE } from './lab';

type Blendshape = { label: string; score: number };


function cameraErrorMessage(e: unknown): string {
  if (e instanceof DOMException) {
    if (e.name === 'NotAllowedError')
      return 'Camera access was blocked. Allow it in your browser’s site settings (on iPhone: Settings › Safari › Camera), then reload.';
    if (e.name === 'NotFoundError' || e.name === 'OverconstrainedError')
      return 'No front camera was found on this device.';
    if (e.name === 'NotReadableError')
      return 'The camera is in use by another app. Close it and reload.';
  }
  if (typeof window !== 'undefined' && !window.isSecureContext)
    return 'The camera needs a secure (https) connection.';
  return e instanceof Error ? e.message : String(e);
}

// Composite raw-landmark payload emitted per hand-rate frame. Consumers today:
// reference-clip recording in PracticeSession. Also re-exported for its consumer.
export type RawSample = {
  pose: NormalizedLandmark[] | null;
  left: NormalizedLandmark[] | null;
  right: NormalizedLandmark[] | null;
};

function CameraViewImpl({
  onFrame,
  onPoseVisibility,
  onRawSample,
}: {
  onFrame?: (f: FeatureFrame) => void;
  onPoseVisibility?: (torsoVisible: boolean) => void;
  onRawSample?: (s: RawSample) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onFrameRef = useRef(onFrame);
  const onPoseVisibilityRef = useRef(onPoseVisibility);
  const onRawSampleRef = useRef(onRawSample);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [blendshapes, setBlendshapes] = useState<Blendshape[]>([]);
  // The stage takes the stream's real shape: 4:3 on laptops, 3:4 on a phone
  // held upright. A fixed 4:3 box with object-cover cropped hands off the top.
  const [aspect, setAspect] = useState(4 / 3);
  // Loading reminder: the landmark models take a few seconds (longer on a
  // phone), and signing into a camera that isn't tracking yet just looks
  // broken. 'loading' until the first tracked frame, then a short 'ready'.
  const [tracking, setTracking] = useState<'loading' | 'ready' | 'hidden'>('loading');

  // ponytail: mirror onFrame into a ref so identity churn upstream (e.g. state
  // updates every predicted frame) doesn't restart the camera.
  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);
  useEffect(() => {
    onPoseVisibilityRef.current = onPoseVisibility;
  }, [onPoseVisibility]);
  useEffect(() => {
    onRawSampleRef.current = onRawSample;
  }, [onRawSample]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const source = new CameraSource(video, { lite: LITE });

    const onResize = () => {
      if (video.videoWidth && video.videoHeight) setAspect(video.videoWidth / video.videoHeight);
    };
    // 'resize' also fires when a phone rotates mid-session.
    video.addEventListener('loadedmetadata', onResize);
    video.addEventListener('resize', onResize);

    // Keep the screen on while signing — nobody touches the phone mid-sentence.
    // The lock drops when the tab hides, so re-take it on return.
    let wakeLock: WakeLockSentinel | null = null;
    const takeWakeLock = () => {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
      navigator.wakeLock.request('screen').then(
        (l) => (wakeLock = l),
        () => {},
      );
    };
    takeWakeLock();
    document.addEventListener('visibilitychange', takeWakeLock);

    let last = performance.now();
    let ema = 0;
    let lastFpsAt = 0;
    let seenFirstFrame = false;
    let readyTimer = 0;
    // ponytail: throttle blendshape state to 5 Hz — labels barely change faster
    // than that and 30 Hz setState is wasted renders on a 3-row chip strip.
    let lastBlendshapeAt = 0;
    // ponytail: face fires at 10 Hz (throttled in CameraSource); hand fires per
    // frame. Cache the last face so the hand-rate redraw can composite both.
    let lastFace: FaceLandmarkerResult | null = null;
    // ponytail: pose is display-only, 10 Hz. Cache + composite in the hand-rate
    // draw pass — no separate rAF, no double-clears.
    let lastPose: PoseLandmarkerResult | null = null;
    // ponytail: dedupe transitions — fires ~10 Hz but state only flips a few
    // times per session. Undefined seed so first result always emits.
    let lastTorsoVisible: boolean | undefined;

    source.onRawPose((result) => {
      lastPose = result;
      // ponytail: shoulders (11,12) only. Hips (23,24) were in this check
      // originally, but a desk crops them out of frame in normal seated use —
      // the gate fired constantly and froze scoring for users who were framed
      // fine. Shoulders are what actually establish the signing space anchor;
      // hips add nothing for a seated signer. MediaPipe visibility is [0,1];
      // 0.5 is the standard "confident" threshold.
      const lm = result.landmarks[0];
      const visible = !!lm
        && (lm[11]?.visibility ?? 0) > 0.5
        && (lm[12]?.visibility ?? 0) > 0.5;
      if (visible !== lastTorsoVisible) {
        lastTorsoVisible = visible;
        onPoseVisibilityRef.current?.(visible);
      }
    });

    source.onRawFace((result) => {
      lastFace = result;
      const now = performance.now();
      if (LAB && now - lastBlendshapeAt > 200) {
        lastBlendshapeAt = now;
        // ponytail: neutral blendshape dominates when nothing's happening —
        // filter it out so the strip shows meaningful expressions.
        const cats = result.faceBlendshapes[0]?.categories ?? [];
        const top = cats
          .filter((c) => c.categoryName !== '_neutral' && c.score > 0.05)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((c) => ({ label: c.categoryName, score: c.score }));
        setBlendshapes(top);
      }
    });

    // Single per-frame draw: clear → face dots (cached) → hands on top.
    source.onRaw((result) => {
      if (!seenFirstFrame) {
        seenFirstFrame = true;
        setTracking('ready');
        readyTimer = window.setTimeout(() => setTracking('hidden'), 3500);
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const draw = new DrawingUtils(ctx);

      // ponytail: dots only, no tesselation. 478 dots ≪ 2500 line segments,
      // and dots read as the "many points on face" the user actually asked for.
      if (lastFace) {
        for (const face of lastFace.faceLandmarks) {
          drawFace(draw, face);
        }
      }

      // Pose under the hands — 33 landmarks, cheap to draw.
      if (lastPose) {
        for (const pose of lastPose.landmarks) {
          drawPose(draw, pose);
        }
      }

      for (let i = 0; i < result.landmarks.length; i++) {
        drawHand(draw, result.landmarks[i], handColor(result.handedness[i]?.[0]?.categoryName));
      }

      // ponytail: emit composite sample for reference-clip recording. Fires at
      // hand rate (~30 Hz) with the latest cached pose. No-op if no listener.
      if (onRawSampleRef.current) {
        const { left, right } = splitHands(result);
        onRawSampleRef.current({
          pose: lastPose?.landmarks[0] ?? null,
          left: left ?? null,
          right: right ?? null,
        });
      }

      const now = performance.now();
      const inst = 1000 / Math.max(now - last, 1);
      last = now;
      ema = ema ? ema * 0.9 + inst * 0.1 : inst;
      // 4 Hz is plenty for a readout; per-frame setState was 30 renders/s.
      if (now - lastFpsAt > 250) {
        lastFpsAt = now;
        setFps(ema);
      }
    });

    source.onFrame((f) => onFrameRef.current?.(f));

    let cancelled = false;
    source.start().catch((e: unknown) => {
      if (cancelled) return;
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(cameraErrorMessage(e));
    });
    return () => {
      cancelled = true;
      clearTimeout(readyTimer);
      video.removeEventListener('loadedmetadata', onResize);
      video.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', takeWakeLock);
      void wakeLock?.release();
      void source.stop();
    };
  }, []);

  return (
    <div className="g-stage g-cam relative w-full" style={{ '--ar': aspect } as CSSProperties}>
      <video ref={videoRef} playsInline muted className="w-full h-full object-cover -scale-x-100" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full -scale-x-100 pointer-events-none" />
      <div className="absolute top-2 right-2 rounded-[2px] bg-black/55 px-1.5 py-0.5 g-mono text-[11px] text-white/75">
        {fps.toFixed(0)} fps
      </div>
      {/* Dev readout: raw blendshape scores. ?lab only. */}
      {blendshapes.length > 0 && (
        <ul
          aria-label="Facial expression"
          className="absolute bottom-2 left-2 rounded-[2px] bg-black/60 px-2 py-1 text-[10px] g-mono text-white/80 grid gap-0.5"
        >
          {blendshapes.map((b) => (
            <li key={b.label} className="flex gap-2 justify-between">
              <span>{b.label}</span>
              <span className="opacity-70">{b.score.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
      {!error && tracking !== 'hidden' && (
        <p
          role="status"
          className="absolute inset-x-2 bottom-2 rounded-[2px] bg-black/65 px-2.5 py-1.5 text-[12px] leading-snug text-white/90 sm:inset-x-auto sm:left-2 sm:max-w-[22rem]"
        >
          {tracking === 'loading'
            ? 'The model is loading. Once tracking points appear on you, start signing.'
            : 'Tracking. You can start signing.'}
        </p>
      )}
      {error && (
        <div role="alert" className="absolute inset-0 grid place-content-center gap-1 bg-[#0e1012] p-6 text-center">
          <p className="text-sm font-medium text-white">Camera unavailable</p>
          <p className="text-xs text-white/65 max-w-xs">{error}</p>
        </div>
      )}
    </div>
  );
}

// ponytail: memoized — App re-renders every predicted frame; without memo,
// CameraView's function body runs 30×/sec doing nothing useful.
export const CameraView = memo(CameraViewImpl);
