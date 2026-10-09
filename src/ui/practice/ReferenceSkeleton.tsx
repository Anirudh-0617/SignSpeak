import { memo, useEffect, useRef, useState } from 'react';
import { DrawingUtils } from '@mediapipe/tasks-vision';
import type { RawSample } from '../CameraView';
import { drawHand, drawPose } from '../landmarkDraw';
import { landmarkColors } from '../tokens';
import { Spinner } from '../Spinner';

// A stored reference clip = the same RawSample stream, timestamped as a fixed-FPS
// sequence. Serializing MediaPipe results via JSON.stringify already produces
// the same landmark shape, so no conversion at either end.
export type RefClip = {
  gloss: string;
  fps: number;
  frames: RawSample[];
};

function ReferenceSkeletonImpl({ gloss }: { gloss: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [clip, setClip] = useState<RefClip | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMissing(false);
    setClip(null);
    fetch(`/reference-signs/${gloss}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: RefClip) => {
        if (!cancelled) setClip(data);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [gloss]);

  useEffect(() => {
    if (!clip) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const draw = new DrawingUtils(ctx);
    const frameMs = 1000 / Math.max(clip.fps, 1);
    const frames = clip.frames;
    const start = performance.now();
    let raf = 0;

    // WLASL clips have two distinct kinds of missing hands, and they need
    // opposite treatment:
    //
    //   1. Spurious blips — a hand "detected" in a handful of frames of a clip
    //      where it is never actually raised (HELLO: left hand in 1/54 frames).
    //      Rendering these at all is wrong; they show up as a frozen ghost.
    //   2. Real dropouts — MediaPipe losing a genuinely-present hand for a few
    //      frames mid-motion (BOOK: 87% present, longest gap 3). Blanking here
    //      makes the coach strobe.
    //
    // So: drop any hand below PRESENCE_MIN of the clip entirely, and bridge
    // gaps up to STICKY_GRACE frames for the hands that survive. Beyond the
    // grace window the hand is genuinely down — clear it.
    const PRESENCE_MIN = 0.15;
    const STICKY_GRACE = 4; // ~130–160 ms at 25–30 fps

    const presence = (key: 'left' | 'right') =>
      frames.reduce((n, f) => n + (f[key] ? 1 : 0), 0) / frames.length;
    const showLeft = presence('left') >= PRESENCE_MIN;
    const showRight = presence('right') >= PRESENCE_MIN;

    let lastPose: RawSample['pose'] = null;
    let lastLeft: RawSample['left'] = null;
    let lastRight: RawSample['right'] = null;
    let leftAge = Infinity;
    let rightAge = Infinity;

    const tick = () => {
      const t = performance.now() - start;
      const idx = Math.floor(t / frameMs) % frames.length;
      const f = frames[idx];

      if (f.pose) lastPose = f.pose;
      if (f.left) {
        lastLeft = f.left;
        leftAge = 0;
      } else {
        leftAge++;
      }
      if (f.right) {
        lastRight = f.right;
        rightAge = 0;
      } else {
        rightAge++;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (lastPose) {
        drawPose(draw, lastPose);
      }
      if (showLeft && lastLeft && leftAge <= STICKY_GRACE) {
        drawHand(draw, lastLeft, landmarkColors.leftHand);
      }
      if (showRight && lastRight && rightAge <= STICKY_GRACE) {
        drawHand(draw, lastRight, landmarkColors.rightHand);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [clip]);

  // ponytail: user-facing copy only. Every lesson ships a reference now
  // (26 letters + 35 words), so this is a genuine edge case, not the common path.
  if (missing) {
    return (
      <div
        className="g-stage relative w-full aspect-[4/3] grid place-content-center p-6 text-center"
        aria-label={`No reference available for ${gloss}`}
      >
        <p className="text-sm text-white/70">
          No reference clip for <span className="g-mono text-white">{gloss}</span>.
        </p>
      </div>
    );
  }
  return (
    <div className="g-stage relative w-full aspect-[4/3]" aria-label={`Reference figure signing ${gloss}`}>
      {/* Mirror so the coach faces the user. Landmarks were captured from raw
          (un-mirrored) video, so the CSS flip matches the CameraView's own flip. */}
      <canvas ref={canvasRef} className="w-full h-full -scale-x-100" />
      {!clip && (
        <div className="absolute inset-0 grid place-items-center [&_*]:!text-white/60">
          <Spinner label="Loading reference" />
        </div>
      )}
    </div>
  );
}

export const ReferenceSkeleton = memo(ReferenceSkeletonImpl);
