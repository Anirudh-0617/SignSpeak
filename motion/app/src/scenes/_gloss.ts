// SignSpeak "Gloss" toolkit for the plates, on top of _vo.ts:
//  - the app's three faces (Bricolage Grotesque, Public Sans, JetBrains Mono) as static weights,
//  - real MediaPipe landmark clips (data/signs/*.json, copied from public/reference-signs) drawn with
//    the app's colours and hand-dropout rules (src/landing/signClip.ts),
//  - the highlighter: yellow only ever marks the sign being made now,
//  - burned-in captions. The film is about Deaf users: the voiceover is never the only channel.
import { HEX, rgba } from '../engine/palette';
import { font, layout } from '../engine/type';
import { Lyrics, type Line, type Lyrics as LyricsT } from '../engine/lyrics';
import { clamp, ease, lerp, prog } from '../engine/util';
import { setWorld, type Cam } from './_vo';
import type { PostOverrides } from '../engine/scene';

// ================================================================== fonts
const FACES: [string, string, number[]][] = [
  ['Brico', 'Bricolage.ttf', [500, 700, 800]],
  ['Public', 'PublicSans.ttf', [400, 500, 600, 700]],
  ['JBMono', 'JetBrainsMono.ttf', [400, 500, 700]],
];
let fontsP: Promise<void> | null = null;
/** Variable TTFs registered once per weight (the canvas font string carries no weight; the face does). */
export function loadGlossFonts() {
  fontsP ??= (async () => {
    for (const [fam, file, wts] of FACES) {
      const buf = await (await fetch(`fonts/gloss/${file}`)).arrayBuffer();
      for (const wt of wts) {
        const ff = new FontFace(`${fam}-${wt}`, buf, { weight: String(wt) });
        await ff.load();
        document.fonts.add(ff);
      }
    }
    await document.fonts.ready;
  })();
  return fontsP;
}
const near = (ws: number[], v: number) => ws.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
export const GF = {
  display: (wt = 800) => `Brico-${near([500, 700, 800], wt)}`,
  body: (wt = 500) => `Public-${near([400, 500, 600, 700], wt)}`,
  mono: (wt = 500) => `JBMono-${near([400, 500, 700], wt)}`,
};

/** Gloss post: no film halation, bloom only on true highlights, so the mark reads as ink, not neon. */
export const POST: PostOverrides = { bloom: 0.08, bloomThreshold: 1.4, halation: 0, ca: 0.35, grain: 0.035, vignette: 0.28 };

// ================================================================== text
export function text(c: CanvasRenderingContext2D, cam: Cam, s: string, x: number, y: number, size: number, fam: string, col: string, o: { align?: CanvasTextAlign; alpha?: number; tracking?: number } = {}) {
  setWorld(c, cam, x, y, size / 100);
  c.font = font(fam, 100);
  c.letterSpacing = `${(o.tracking ?? 0) * 100}px`;
  c.textAlign = o.align ?? 'left';
  c.textBaseline = 'alphabetic';
  c.fillStyle = rgba(col, o.alpha ?? 1);
  c.fillText(s, 0, 0);
  c.letterSpacing = '0px';
  c.textAlign = 'left';
  c.setTransform(1, 0, 0, 1, 0, 0);
}
/** Width in world px of s at size. */
export const textW = (s: string, size: number, fam: string, tracking = 0) => (layout(s, fam, 100, tracking * 100).width / 100) * size;

/** Spaced mono caps note, the app's "gloss" voice. */
export const note = (c: CanvasRenderingContext2D, cam: Cam, s: string, x: number, y: number, o: { size?: number; col?: string; alpha?: number; align?: CanvasTextAlign } = {}) =>
  text(c, cam, s.toUpperCase(), x, y, o.size ?? 15, GF.mono(500), o.col ?? 'ash', { align: o.align, alpha: o.alpha, tracking: 0.12 });

// ================================================================== the highlighter
/**
 * A highlighter stroke over [x, x+w] at baseline-relative box (y = top, h = height), laid down to
 * fraction k (left to right). Slightly sheared ends, like a chisel tip. Yellow: the sign being made now.
 */
export function mark(c: CanvasRenderingContext2D, cam: Cam, x: number, y: number, w: number, h: number, k: number, alpha = 1, col = 'signal') {
  if (k <= 0 || alpha <= 0) return;
  setWorld(c, cam);
  const sh = h * 0.12, x1 = x + w * clamp(k);
  c.beginPath();
  c.moveTo(x + sh, y); c.lineTo(x1 + sh, y); c.lineTo(x1 - sh * 0.4, y + h); c.lineTo(x - sh * 0.4, y + h);
  c.closePath();
  c.fillStyle = rgba(col, alpha);
  c.fill();
  c.setTransform(1, 0, 0, 1, 0, 0);
}
/** A gloss word on a highlighter: the mark fills over [t0, t1]; the text turns ink where the mark is. */
export function marked(c: CanvasRenderingContext2D, cam: Cam, s: string, x: number, y: number, size: number, k: number, o: { fam?: string; alpha?: number; markAlpha?: number; align?: 'left' | 'center' } = {}) {
  const fam = o.fam ?? GF.display(800);
  const w = textW(s, size, fam);
  const x0 = o.align === 'center' ? x - w / 2 : x;
  const padX = size * 0.2, top = y - size * 0.86, h = size * 1.08;
  const a = o.alpha ?? 1;
  text(c, cam, s, x0, y, size, fam, 'bone', { alpha: a });
  if (k <= 0) return w;
  mark(c, cam, x0 - padX, top, w + padX * 2.4, h, k, a * (o.markAlpha ?? 1));
  // ink over the marked part
  setWorld(c, cam);
  c.save();
  c.beginPath();
  c.rect(x0 - padX, top - 4, (w + padX * 2.4) * clamp(k), h + 8);
  c.clip();
  c.setTransform(1, 0, 0, 1, 0, 0);
  text(c, cam, s, x0, y, size, fam, 'ink', { alpha: a * (o.markAlpha ?? 1) });
  c.restore();
  return w;
}

// ================================================================== landmark clips
// Raw MediaPipe tracks are 30 fps, drop hands mid-sign, sometimes label the signing hand as the other
// one, and place off-camera joints (elbows, hips) below the frame. loadClip() cleans each track once;
// figure() then samples it at a fractional frame, so the animation is continuous at 60 fps.
type Pt = { x: number; y: number; z: number; visibility?: number };
type Track = (Pt[] | null)[];
export interface SignFrame { pose: Pt[] | null; left: Pt[] | null; right: Pt[] | null }
export interface Clip { fps: number; gloss: string; frames: SignFrame[]; n: number; pose: Track; L: Track; R: Track; aL: number[]; aR: number[] }

const GAP = 6; // frames of missing hand bridged by interpolation (0.2 s); longer gaps fade instead
const FADE = 3; // frames a hand takes to fade in/out where it really appears/disappears
const SEAM = 8; // frames over which a looped clip eases back into its first frame
const FLIP = 0.15; // max wrist distance (frame widths) for a mislabelled hand to count as the other one

const lerpPts = (A: Pt[], B: Pt[], u: number): Pt[] => A.map((p, k) => {
  const q = B[k] ?? p;
  return { x: lerp(p.x, q.x, u), y: lerp(p.y, q.y, u), z: lerp(p.z, q.z, u), visibility: lerp(p.visibility ?? 1, q.visibility ?? 1, u) };
});
const wristD = (A: Pt[], B: Pt[]) => Math.hypot(A[0]!.x - B[0]!.x, A[0]!.y - B[0]!.y);

/** A rarely seen hand side is the main hand mislabelled: fold its frames in where the main one is missing nearby. */
function absorb(main: Track, minor: Track): Track {
  return main.map((m, i) => {
    const o = minor[i];
    if (m || !o) return m;
    for (let d = 1; d <= GAP; d++) for (const j of [i - d, i + d]) { const r = main[j]; if (r) return wristD(r, o) < FLIP ? o : null; }
    return null;
  });
}
/** Fill gaps of up to GAP frames between two detections by interpolation. */
function bridge(tr: Track, max = GAP): Track {
  const out = tr.slice();
  for (let i = 0; i < tr.length; i++) {
    if (tr[i] || !tr[i - 1]) continue;
    let e = i; while (e < tr.length && !tr[e]) e++;
    if (e < tr.length && e - i <= max) for (let k = i; k < e; k++) out[k] = lerpPts(tr[i - 1]!, tr[e]!, (k - i + 1) / (e - i + 1));
    i = e;
  }
  return out;
}
/** Light de-jitter: a centred [1 2 1]/4 filter where both neighbours exist. */
const smooth = (tr: Track): Track => tr.map((c, i) => {
  const a = tr[i - 1], b = tr[i + 1];
  return c && a && b ? lerpPts(lerpPts(a, b, 0.5), c, 0.5) : c;
});
/** Per-frame opacity: ramps over FADE frames at a run's ends (not at the clip's own ends; the seam handles those). */
function presence(tr: Track): number[] {
  const n = tr.length, a = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (!tr[i]) continue;
    let s = i; while (s > 0 && tr[s - 1]) s--;
    let e = i; while (e < n - 1 && tr[e + 1]) e++;
    a[i] = Math.min(1, s === 0 ? 1 : (i - s + 1) / FADE, e === n - 1 ? 1 : (e - i + 1) / FADE);
  }
  return a;
}

export async function loadClip(name: string): Promise<Clip> {
  const j = await (await fetch(`data/signs/${name}.json`)).json();
  const fr = j.frames as SignFrame[];
  const n = fr.length;
  const pres = (k: 'left' | 'right') => fr.reduce((m, f) => m + (f[k] ? 1 : 0), 0) / n;
  let L: Track = fr.map((f) => f.left), R: Track = fr.map((f) => f.right);
  const none: Track = fr.map(() => null);
  const showL = pres('left') >= 0.15, showR = pres('right') >= 0.15; // the app's rule: rarer hands are noise
  if (showR && !showL) { R = absorb(R, L); L = none; }
  else if (showL && !showR) { L = absorb(L, R); R = none; }
  else if (!showL && !showR) { L = none; R = none; }
  L = smooth(bridge(L)); R = smooth(bridge(R));
  // pose: bridge, then hold the nearest detection across anything longer
  let pose = bridge(fr.map((f) => f.pose));
  const first = pose.find((p) => p) ?? null;
  let last: Pt[] | null = first;
  pose = smooth(pose.map((p) => (p ? (last = p) : last)));
  return { fps: j.fps, gloss: j.gloss, frames: fr, n, pose, L, R, aL: presence(L), aR: presence(R) };
}
export interface Predictions { [letter: string]: { vector: number[]; top: [string, number][] } }
export const loadPredictions = async (): Promise<Predictions> => (await fetch('data/signs/predictions.json')).json();

/** Fractional frame position for a time in seconds (looped, or held on the last frame). */
export const frameIdx = (clip: Clip, sec: number, loop = true) => {
  const f = sec * clip.fps;
  return loop ? ((f % clip.n) + clip.n) % clip.n : clamp(f, 0, clip.n - 1);
};

type Sample = { pts: Pt[]; a: number } | null;
/** A track at fractional frame f: points interpolated between neighbours, fading where one side is missing. */
function at1(tr: Track, al: number[], f: number): Sample {
  const n = tr.length, i0 = clamp(Math.floor(f), 0, n - 1), i1 = Math.min(i0 + 1, n - 1), u = clamp(f - i0);
  const A = tr[i0], B = tr[i1];
  if (A && B) return { pts: lerpPts(A, B, u), a: lerp(al[i0]!, al[i1]!, u) };
  if (A) return { pts: A, a: al[i0]! * (1 - u) };
  if (B) return { pts: B, a: al[i1]! * u };
  return null;
}
/** With the loop seam: over the last SEAM frames the clip eases into its first frame, so the wrap is continuous. */
function sampleTrack(clip: Clip, tr: Track, al: number[], f: number, loop: boolean): Sample {
  const s = at1(tr, al, f);
  const w = loop && clip.n > SEAM * 2 ? ease.inOutCubic(clamp((f - (clip.n - 1 - SEAM)) / SEAM)) : 0;
  if (w <= 0) return s;
  const t = at1(tr, al, 0);
  if (s && t) return { pts: lerpPts(s.pts, t.pts, w), a: lerp(s.a, t.a, w) };
  if (s) return { pts: s.pts, a: s.a * (1 - w) };
  if (t) return { pts: t.pts, a: t.a * w };
  return null;
}

export const HAND_EDGES: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];
// face outline, shoulders and arms; the pose's own finger stubs are left out (the hand model draws hands)
const POSE_EDGES: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16]];
/** How much a pose joint is really there: confident and inside the camera frame. */
const seen = (p: Pt) => clamp(((p.visibility ?? 1) - 0.4) / 0.2) * clamp((1.0 - p.y) / 0.04) * clamp((p.y + 0.02) / 0.04) * clamp((p.x + 0.02) / 0.04) * clamp((1.02 - p.x) / 0.04);

export interface Box { x: number; y: number; w: number; h: number }
/** Map a normalised landmark into a world box (mirrored like the app's selfie view). */
export const mapPt = (b: Box, p: Pt, mirror = true) => ({ x: b.x + (mirror ? 1 - p.x : p.x) * b.w, y: b.y + p.y * b.h });

export interface FigureOpts { alpha?: number; mirror?: boolean; pose?: boolean; hands?: boolean; width?: number; dots?: boolean; mono?: string; handAlpha?: number; loop?: boolean }
/**
 * The app's figure at fractional frame f: slate pose, yellow left hand, violet right hand
 * (src/ui/tokens.ts landmarkColors). `loop` (default true) eases the clip's end into its start.
 */
export function figure(c: CanvasRenderingContext2D, cam: Cam, clip: Clip, f: number, b: Box, o: FigureOpts = {}) {
  const a = o.alpha ?? 1, mir = o.mirror ?? true, lw = (o.width ?? 3) / cam.z, loop = o.loop ?? true;
  setWorld(c, cam);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const L = (o.hands ?? true) ? sampleTrack(clip, clip.L, clip.aL, f, loop) : null;
  const R = (o.hands ?? true) ? sampleTrack(clip, clip.R, clip.aR, f, loop) : null;
  if (o.pose ?? true) {
    const P = sampleTrack(clip, clip.pose, clip.pose.map(() => 1), f, loop);
    if (P) {
      const pts = P.pts.slice();
      // the arm ends where the hand model says the wrist is (pose 15 = left wrist, 16 = right)
      for (const [h, k] of [[L, 15], [R, 16]] as const) {
        if (!h || !pts[k]) continue;
        const q = lerpPts([pts[k]!], [h.pts[0]!], h.a)[0]!;
        pts[k] = { ...q, visibility: Math.max(pts[k]!.visibility ?? 1, h.a) };
      }
      c.lineWidth = lw * 0.7;
      for (const [p, q] of POSE_EDGES) {
        const A = pts[p], B = pts[q];
        if (!A || !B) continue;
        const ea = 0.55 * a * Math.min(seen(A), seen(B));
        if (ea <= 0.01) continue;
        const m = mapPt(b, A, mir), nn = mapPt(b, B, mir);
        c.strokeStyle = rgba(o.mono ?? 'slate', ea);
        c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(nn.x, nn.y); c.stroke();
      }
    }
  }
  const hand = (h: Sample, col: string) => {
    if (!h || h.a <= 0.01) return;
    const ha = a * (o.handAlpha ?? 1) * h.a;
    const stroke = (sc: string, al: number, w: number) => {
      c.strokeStyle = rgba(sc, al); c.lineWidth = w;
      c.beginPath();
      for (const [p, q] of HAND_EDGES) { const m = mapPt(b, h.pts[p]!, mir), nn = mapPt(b, h.pts[q]!, mir); c.moveTo(m.x, m.y); c.lineTo(nn.x, nn.y); }
      c.stroke();
    };
    stroke('ink2', 0.8 * ha, lw * 2.3); // halo (src/ui/landmarkDraw.ts)
    stroke(col, ha, lw);
    if (o.dots ?? true) {
      c.fillStyle = rgba(col, ha);
      for (const p of h.pts.slice(0, 21)) { const m = mapPt(b, p, mir); c.beginPath(); c.arc(m.x, m.y, lw * 1.25, 0, Math.PI * 2); c.fill(); }
    }
  };
  hand(L, o.mono ?? 'signal');
  hand(R, o.mono ?? 'violet');
  c.setTransform(1, 0, 0, 1, 0, 0);
}
/** The hand in a frame of a still (right first: letter stills are right-handed). */
export const handOf = (clip: Clip, i: number) => clip.R[i] ?? clip.L[i];

// ================================================================== captions
/**
 * Burned-in captions for a plate's window, bottom centre: the current line, words appearing as said
 * (unsaid dim, said bone). No yellow: the mark belongs to the sign, not the narrator.
 */
export class Captions {
  lines: Line[];
  constructor(ly: LyricsT, start: number, end: number, public y = 470, public size = 34) {
    this.lines = ly.lines.filter((l) => l.start >= start - 0.05 && l.start < end);
  }
  draw(c: CanvasRenderingContext2D, cam: Cam, t: number) {
    const L = this.lines.find((l, k) => t >= l.start - 0.25 && t < (this.lines[k + 1]?.start ?? 1e9) - 0.25);
    if (!L) return;
    const next = this.lines[this.lines.indexOf(L) + 1];
    const a = prog(t, L.start - 0.25, L.start - 0.05) * (1 - prog(t, (next?.start ?? 1e9) - 0.4, (next?.start ?? 1e9) - 0.25));
    const fam = GF.body(500), sz = this.size;
    const sp = textW(' ', sz, fam);
    const ws = L.words.map((w) => textW(w.w, sz, fam));
    const tot = ws.reduce((x, y) => x + y, 0) + sp * (ws.length - 1);
    // fixed screen position (captions do not ride the camera)
    const fixed: Cam = { cx: 0, cy: 0, z: 1, roll: 0 };
    let x = -tot / 2;
    L.words.forEach((w, i) => {
      const said = Lyrics.wordProgress(w, t);
      const k = ease.outCubic(clamp(said * 3));
      text(c, fixed, w.w, x, this.y, sz, fam, said > 0 ? 'bone' : 'ash', { alpha: a * lerp(0.4, 1, k) });
      x += ws[i]! + sp;
    });
    void cam;
  }
}
export const lineOfT = (ly: LyricsT, q: string) => ly.get(q);
export { HEX };

/** A box that centres a set of landmarks on (cx, cy) with their larger extent = size (uniform scale). */
export function fitBox(pts: Pt[], cx: number, cy: number, size: number, mirror = true): Box {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const s = size / Math.max(x1 - x0, y1 - y0, 1e-3), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  return { x: cx - (mirror ? 1 - mx : mx) * s, y: cy - my * s, w: s, h: s };
}
/** Hairline rounded rect in world px. */
export function frameRect(c: CanvasRenderingContext2D, cam: Cam, x: number, y: number, w: number, h: number, o: { r?: number; col?: string; alpha?: number; fill?: string; fillAlpha?: number; width?: number; dash?: number[] } = {}) {
  setWorld(c, cam);
  c.beginPath();
  c.roundRect(x, y, w, h, o.r ?? 10);
  if (o.fill) { c.fillStyle = rgba(o.fill, o.fillAlpha ?? 1); c.fill(); }
  c.setLineDash((o.dash ?? []).map((d) => d / cam.z));
  c.strokeStyle = rgba(o.col ?? 'bone', o.alpha ?? 0.3);
  c.lineWidth = (o.width ?? 1.2) / cam.z;
  c.stroke();
  c.setLineDash([]);
  c.setTransform(1, 0, 0, 1, 0, 0);
}
