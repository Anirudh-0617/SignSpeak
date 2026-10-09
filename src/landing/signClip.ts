import { DrawingUtils } from '@mediapipe/tasks-vision';
import type { RawSample } from '../ui/CameraView';
import type { RefClip } from '../ui/practice/ReferenceSkeleton';
import { drawHand, drawPose } from '../ui/landmarkDraw';
import { landmarkColors } from '../ui/tokens';

export type { RefClip };

// Every gloss that has a reference clip in public/reference-signs/. Letters are
// single frames lifted from Kaggle stills (right hand only, no pose); words are
// 50-70 frame WLASL clips with pose. J and Z are motion letters, so their still
// is only the starting handshape.
export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// ponytail: module-level promise cache. The name speller asks for the same
// letters repeatedly and the hero may request a clip another section already
// fetched; one Map is the whole caching layer.
const cache = new Map<string, Promise<RefClip>>();

export function loadClip(gloss: string): Promise<RefClip> {
  let p = cache.get(gloss);
  if (!p) {
    p = fetch(`/reference-signs/${gloss}.json`).then((r) =>
      r.ok ? (r.json() as Promise<RefClip>) : Promise.reject(new Error(`${gloss}: ${r.status}`)),
    );
    // Don't cache failures, so a flaky network can retry on the next ask.
    p.catch(() => cache.delete(gloss));
    cache.set(gloss, p);
  }
  return p;
}

// Frame renderer with the same hand-dropout rules as ReferenceSkeleton (drop
// hands present in <15% of the clip, bridge gaps up to 4 frames). Copied rather
// than shared so the landing redesign never touches /app code; if the rules
// change there, change them here too.
const PRESENCE_MIN = 0.15;
const STICKY_GRACE = 4;

export type ClipRenderer = (frameIndex: number) => void;

/** Landing-only hand colour overrides. The app palette is tuned for live
 *  video under a dark halo; on a flat dark stage the halo disappears and the
 *  blue-violet right hand drops to ~3:1, so the landing can lift it. */
export type HandColors = { leftHand?: string; rightHand?: string };

export function makeRenderer(
  ctx: CanvasRenderingContext2D,
  clip: RefClip,
  colors: HandColors = {},
): ClipRenderer {
  const left = colors.leftHand ?? landmarkColors.leftHand;
  const right = colors.rightHand ?? landmarkColors.rightHand;
  const draw = new DrawingUtils(ctx);
  const frames = clip.frames;
  const presence = (key: 'left' | 'right') =>
    frames.reduce((n, f) => n + (f[key] ? 1 : 0), 0) / frames.length;
  const showLeft = presence('left') >= PRESENCE_MIN;
  const showRight = presence('right') >= PRESENCE_MIN;

  let lastPose: RawSample['pose'] = null;
  let lastLeft: RawSample['left'] = null;
  let lastRight: RawSample['right'] = null;
  let leftAge = Infinity;
  let rightAge = Infinity;

  return (i) => {
    const f = frames[((i % frames.length) + frames.length) % frames.length];
    if (f.pose) lastPose = f.pose;
    if (f.left) {
      lastLeft = f.left;
      leftAge = 0;
    } else leftAge++;
    if (f.right) {
      lastRight = f.right;
      rightAge = 0;
    } else rightAge++;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (lastPose) drawPose(draw, lastPose);
    if (showLeft && lastLeft && leftAge <= STICKY_GRACE) drawHand(draw, lastLeft, left);
    if (showRight && lastRight && rightAge <= STICKY_GRACE) drawHand(draw, lastRight, right);
  };
}

/** Flat landmark vector for one frame: x,y per point, hands only. Real data for
 *  "what the model sees" readouts; never invent numbers for the page. */
export function frameVector(clip: RefClip, i: number): number[] {
  const f = clip.frames[((i % clip.frames.length) + clip.frames.length) % clip.frames.length];
  const out: number[] = [];
  for (const hand of [f.left, f.right]) {
    if (!hand) continue;
    for (const p of hand) out.push(p.x, p.y);
  }
  return out;
}
