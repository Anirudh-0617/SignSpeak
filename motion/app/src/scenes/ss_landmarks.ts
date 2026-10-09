// LANDMARKS — "The camera finds 21 points on each hand. / Anchored to the wrist, they become 126 numbers."
// The H handshape (real MediaPipe landmarks from the reference still). The 21 points pop in as they
// are counted, then the bones. On "wrist" every point is tied back to landmark 0; on "126 numbers"
// they fly into the feature strip: 63 zeros (no left hand) and 63 real wrist-anchored values, the
// exact vector the model reads (data/signs/predictions.json, computed by analysis/predict_signs.py).
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D } from '../engine/gl';
import { type Word } from '../engine/lyrics';
import { rgba } from '../engine/palette';
import { clamp, ease, lerp, prog } from '../engine/util';
import { Cam2D, gridPass, setGrid, lineOf, wordOf, setWorld } from './_vo';
import { Captions, GF, HAND_EDGES, POST, figure, fitBox, handOf, loadClip, loadGlossFonts, loadPredictions, mapPt, note, text, type Box, type Clip } from './_gloss';

const COLS = 14, ROWS = 9, CW = 64, CH = 40; // 126 cells
const GX = -40, GY = -250; // strip origin (world)

export default class Landmarks extends Scene {
  cam = new Cam2D();
  grid = gridPass(24, 96);
  ui = new Layer2D();
  cap!: Captions;
  H!: Clip;
  vec: number[] = [];
  pts: { x: number; y: number }[] = [];
  box!: Box;
  w: Record<string, Word> = {};
  tPts0 = 0; tPts1 = 0;

  override async init() {
    await loadGlossFonts();
    this.H = await loadClip('H');
    this.vec = (await loadPredictions()).H!.vector;
    const hand = handOf(this.H, 0)!;
    this.box = fitBox(hand, -430, -40, 640);
    this.pts = hand.map((p) => mapPt(this.box, p));
    const ly = this.ctx.lyrics;
    const l1 = lineOf(ly, 'The camera finds'), l2 = lineOf(ly, 'Anchored to the wrist');
    for (const k of ['finds', '21', 'points', 'each', 'hand']) this.w[k] = wordOf(l1, k);
    for (const k of ['Anchored', 'wrist', 'become', '126', 'numbers']) this.w[k] = wordOf(l2, k);
    this.tPts0 = this.w.finds!.start; this.tPts1 = this.w.points!.end;
    this.cap = new Captions(ly, this.ctx.start, this.ctx.end);
    const s = this.ctx.start;
    this.cam.key(s, -430, -40, 1.12).key(this.w.Anchored!.start, -420, -40, 1.18, 0, ease.linear)
      .key(this.w.become!.start + 0.3, 330, -20, 0.92, 0, ease.inOutCubic).key(this.ctx.end, 340, -20, 0.95, 0, ease.linear);
  }

  /** Fly progress of point i into the strip. */
  fly(t: number, i: number) { const t0 = this.w.become!.start + i * 0.018; return prog(t, t0, t0 + 0.55, ease.inOutCubic); }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t, w = this.w;
    const c = this.cam.at(t);
    setGrid(this.grid, c, { ink: 0.6 });
    this.grid.render(renderer, out);
    const U = this.ui; U.clear();
    const x = U.ctx;
    const P = this.pts;
    const bones = prog(t, w.each!.start, w.hand!.end + 0.2, ease.outCubic);
    const anchor = prog(t, w.wrist!.start, w.wrist!.end + 0.3, ease.outCubic);
    const gone = prog(t, w.become!.start, w.become!.start + 0.4);
    // the hand as the camera first sees it: a ghost until its points are counted
    figure(x, c, this.H, 0, this.box, { pose: false, mono: 'ash', alpha: 0.22 * prog(t, this.ctx.start, this.ctx.start + 0.3) * (1 - bones), width: 2 });
    setWorld(x, c);
    x.lineCap = 'round';
    // bones, drawn outward from the wrist
    if (bones > 0) {
      x.strokeStyle = rgba('violet', 0.95 * (1 - gone)); x.lineWidth = 3.5 / c.z;
      x.beginPath();
      HAND_EDGES.forEach(([a, b], k) => {
        const u = clamp(bones * HAND_EDGES.length - k * 0.6);
        if (u <= 0) return;
        x.moveTo(P[a]!.x, P[a]!.y); x.lineTo(lerp(P[a]!.x, P[b]!.x, u), lerp(P[a]!.y, P[b]!.y, u));
      });
      x.stroke();
    }
    // wrist vectors
    if (anchor > 0) {
      x.strokeStyle = rgba('bone', 0.5 * (1 - gone)); x.lineWidth = 1.2 / c.z;
      x.setLineDash([6 / c.z, 6 / c.z]);
      x.beginPath();
      for (let i = 1; i < 21; i++) { const u = clamp(anchor * 1.6 - i * 0.03); x.moveTo(P[0]!.x, P[0]!.y); x.lineTo(lerp(P[0]!.x, P[i]!.x, u), lerp(P[0]!.y, P[i]!.y, u)); }
      x.stroke(); x.setLineDash([]);
      x.strokeStyle = rgba('bone', anchor * (1 - gone)); x.lineWidth = 2 / c.z;
      x.beginPath(); x.arc(P[0]!.x, P[0]!.y, 22 * (1 + 0.6 * (1 - anchor)), 0, Math.PI * 2); x.stroke();
    }
    // the 21 points: counted in, then flying to the strip (each point carries its x, y, z cells)
    for (let i = 0; i < 21; i++) {
      const pop = prog(t, lerp(this.tPts0, this.tPts1, i / 21), lerp(this.tPts0, this.tPts1, i / 21) + 0.18, ease.outCubic);
      if (pop <= 0) continue;
      const fl = this.fly(t, i);
      const cell = this.cell(63 + i * 3 + 1);
      const px = lerp(P[i]!.x, cell.x, fl), py = lerp(P[i]!.y, cell.y, fl);
      setWorld(x, c);
      x.fillStyle = rgba('bone', pop * (1 - prog(fl, 0.85, 1)));
      x.beginPath(); x.arc(px, py, 7 * pop, 0, Math.PI * 2); x.fill();
      if (fl < 0.05) text(x, c, String(i), P[i]!.x + 12, P[i]!.y - 10, 15, GF.mono(500), 'ash', { alpha: pop * (1 - gone) });
    }
    // the count
    const n21 = Math.round(21 * prog(t, this.tPts0, this.tPts1));
    const ca = prog(t, w['21']!.start - 0.4, w['21']!.start) * (1 - gone);
    text(x, c, String(n21), 60, -40, 230, GF.display(800), 'bone', { alpha: ca });
    note(x, c, 'points per hand · MediaPipe', 66, 20, { alpha: ca });
    // the feature strip
    const sa = prog(t, w.become!.start, w.become!.start + 0.3);
    if (sa > 0) this.strip(x, c, t, sa);
    this.cap.draw(x, c, t);
    comp.draw(renderer, U.upload(), out);
    return { ...POST };
  }

  cell(k: number) { return { x: GX + (k % COLS) * CW + CW / 2, y: GY + Math.floor(k / COLS) * CH + CH / 2 }; }

  strip(x: CanvasRenderingContext2D, c: ReturnType<Cam2D['at']>, t: number, a: number) {
    const w = this.w;
    const count = Math.round(126 * prog(t, w['126']!.start, w.numbers!.end, ease.outCubic));
    note(x, c, 'left hand · absent → 0', GX, GY - 54, { alpha: a });
    note(x, c, 'right hand · 21 × (x, y, z)', GX + 7 * CW, GY - 54, { alpha: a });
    for (let k = 0; k < 126; k++) {
      const p = this.cell(k);
      const on = k < count;
      const v = this.vec[k] ?? 0;
      setWorld(x, c);
      x.strokeStyle = rgba('bone', 0.12 * a); x.lineWidth = 1 / c.z;
      x.strokeRect(p.x - CW / 2, p.y - CH / 2, CW, CH);
      if (!on) continue;
      text(x, c, v === 0 ? '0' : v.toFixed(2), p.x, p.y + 6, 15, GF.mono(400), v === 0 ? 'graphite' : 'bone', { align: 'center', alpha: a });
    }
    text(x, c, String(count), GX, GY + ROWS * CH + 150, 150, GF.display(800), 'bone', { alpha: a * prog(t, w['126']!.start - 0.2, w['126']!.start) });
    note(x, c, 'numbers · one frame', GX + 300, GY + ROWS * CH + 150, { alpha: a * prog(t, w.numbers!.start, w.numbers!.end) });
  }
}
