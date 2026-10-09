// CLASSIFY — "A small neural network, running inside the page, names the sign. / Hold a letter, and
// the highlighter fills. / Full means committed."
// 1. The live fingerspell model as it really is (public/models/fingerspell_asl): 252 inputs (the 126
//    numbers, mean + std over the window), 128 hidden, 26 letters. A dashed boundary: "this tab".
// 2. "names the sign": its real top-3 on the H reference still (analysis/predict_signs.py).
// 3. The Composer: the candidate letter; the highlighter under it is the hold timer. Full = committed,
//    and the letter drops into the transcript.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D } from '../engine/gl';
import { type Word } from '../engine/lyrics';
import { rgba } from '../engine/palette';
import { clamp, ease, hash, lerp, prog } from '../engine/util';
import { Cam2D, gridPass, setGrid, lineOf, wordOf, setWorld } from './_vo';
import { Captions, GF, POST, figure, fitBox, frameRect, handOf, loadClip, loadGlossFonts, loadPredictions, marked, note, text, type Clip, type Predictions } from './_gloss';

const LAYERS = [{ n: 252, show: 28, x: -620 }, { n: 128, show: 20, x: -260 }, { n: 26, show: 26, x: 100 }];
const TOP = -330, SPAN = 620;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default class Classify extends Scene {
  cam = new Cam2D();
  grid = gridPass(24, 96);
  ui = new Layer2D();
  cap!: Captions;
  H!: Clip;
  pred!: Predictions;
  w: Record<string, Word> = {};

  override async init() {
    await loadGlossFonts();
    this.H = await loadClip('H');
    this.pred = await loadPredictions();
    const ly = this.ctx.lyrics;
    const l1 = lineOf(ly, 'A small neural'), l2 = lineOf(ly, 'Hold a letter'), l3 = lineOf(ly, 'Full means');
    for (const k of ['small', 'network', 'running', 'inside', 'page', 'names', 'sign']) this.w[k] = wordOf(l1, k);
    for (const k of ['Hold', 'letter', 'highlighter', 'fills']) this.w[k] = wordOf(l2, k);
    for (const k of ['Full', 'committed']) this.w[k] = wordOf(l3, k);
    this.cap = new Captions(ly, this.ctx.start, this.ctx.end);
    const s = this.ctx.start, sw = this.w.Hold!.start - 0.35;
    this.cam.key(s, -180, -20, 1.05).key(sw, -120, -20, 1.0, 0, ease.linear)
      .key(sw + 0.7, 2200, -20, 1.0, 0, ease.inOutCubic).key(this.ctx.end, 2220, -20, 1.03, 0, ease.linear);
  }

  node(l: number, i: number) {
    const L = LAYERS[l]!;
    return { x: L.x, y: TOP + (L.show === 1 ? 0.5 : i / (L.show - 1)) * SPAN };
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t, w = this.w;
    const c = this.cam.at(t);
    setGrid(this.grid, c, { ink: 0.5 });
    this.grid.render(renderer, out);
    const U = this.ui; U.clear();
    const x = U.ctx;
    // ---- the network
    const build = prog(t, this.ctx.start, w.network!.end, ease.outCubic);
    const wires = prog(t, w.small!.start, w.running!.start, ease.inOutCubic);
    setWorld(x, c);
    x.lineWidth = 1 / c.z;
    for (let l = 0; l < 2; l++) {
      for (let i = 0; i < LAYERS[l]!.show; i++) for (let j = 0; j < LAYERS[l + 1]!.show; j++) {
        const hsh = hash(l, i, j);
        if (hsh > 0.22) continue; // a sparse sample of the dense wiring reads as a net
        const a = this.node(l, i), b = this.node(l + 1, j);
        const u = clamp(wires * 1.4 - hsh * 2);
        if (u <= 0) continue;
        x.strokeStyle = rgba('ash', 0.22);
        x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(lerp(a.x, b.x, u), lerp(a.y, b.y, u)); x.stroke();
      }
    }
    // signal pulses travelling through on "names the sign"
    const go = prog(t, w.names!.start - 0.4, w.sign!.end, ease.inOutCubic);
    const top = this.pred.H!.top;
    for (let l = 0; l < 3; l++) {
      for (let i = 0; i < LAYERS[l]!.show; i++) {
        const p = this.node(l, i);
        const pop = clamp(build * 3 - l * 0.6 - i * 0.02);
        if (pop <= 0) continue;
        const act = l === 2 ? (LETTERS[i] === top[0]![0] ? 1 : 0.15) : 0.25 + 0.75 * hash(l, i, 9);
        const lit = clamp(go * 3 - l) * act;
        setWorld(x, c);
        x.fillStyle = rgba(lit > 0.5 && l === 2 ? 'bone' : 'ash', 0.35 + 0.65 * lit);
        x.beginPath(); x.arc(p.x, p.y, (l === 2 ? 5 : 4) * pop, 0, Math.PI * 2); x.fill();
        if (l === 2) text(x, c, LETTERS[i]!, p.x + 16, p.y + 5, 14, GF.mono(500), 'ash', { alpha: pop * 0.8 });
      }
    }
    LAYERS.forEach((L, l) => note(x, c, `${L.n}`, L.x, TOP - 40, { col: 'bone', alpha: build, align: 'center' }));
    note(x, c, 'in · 126 × mean, std', LAYERS[0]!.x, TOP + SPAN + 50, { alpha: build, align: 'center' });
    note(x, c, 'hidden', LAYERS[1]!.x, TOP + SPAN + 50, { alpha: build, align: 'center' });
    note(x, c, 'letters', LAYERS[2]!.x, TOP + SPAN + 50, { alpha: build, align: 'center' });
    // "running inside the page": the tab boundary
    const tab = prog(t, w.inside!.start, w.page!.end, ease.outCubic);
    if (tab > 0) {
      frameRect(x, c, -720, TOP - 100, 920 + 0 * tab, SPAN + 200, { r: 14, alpha: 0.4 * tab, dash: [10, 8] });
      note(x, c, 'this tab · no server', -700, TOP - 116, { col: 'bone', alpha: tab });
    }
    // "names the sign": the real top-3 on the H still
    const nm = prog(t, w.names!.start, w.sign!.end + 0.2, ease.outCubic);
    if (nm > 0) {
      const bx = 300;
      note(x, c, 'output on the H reference still', bx, TOP + 40, { alpha: nm });
      top.forEach(([lab, p], k) => {
        const y = TOP + 140 + k * 110;
        text(x, c, lab, bx, y, 64, GF.display(800), k === 0 ? 'bone' : 'ash', { alpha: nm });
        const bw = 280 * p * clamp(nm * 1.4 - k * 0.15);
        frameRect(x, c, bx + 70, y - 34, Math.max(2, bw), 22, { r: 3, fill: k === 0 ? 'bone' : 'ash', fillAlpha: nm, alpha: 0 });
        text(x, c, `${(p * 100).toFixed(1)}%`, bx + 70, y + 20, 16, GF.mono(500), 'ash', { alpha: nm });
      });
    }
    // ---- the Composer (at world x ≈ 2200)
    const ox = 2200;
    const hand = handOf(this.H, 0)!;
    const ca = prog(t, w.Hold!.start - 0.3, w.Hold!.start + 0.2);
    figure(x, c, this.H, 0, fitBox(hand, ox - 520, -40, 380), { alpha: ca, pose: false, width: 3.5 });
    note(x, c, 'now', ox - 80, -300, { alpha: ca });
    const hold = prog(t, w.highlighter!.start, w.committed!.end, ease.linear);
    const commit = prog(t, w.committed!.end - 0.05, w.committed!.end + 0.25, ease.outCubic);
    marked(x, c, 'H', ox - 80, 90, 330, hold, { alpha: ca, markAlpha: 1 - commit });
    note(x, c, hold >= 1 ? 'committed' : `hold ${Math.round(hold * 100)}%`, ox - 80, 170, { col: hold >= 1 ? 'bone' : 'ash', alpha: ca });
    // transcript line receives the letter
    frameRect(x, c, ox + 220, -60, 420, 110, { r: 8, alpha: 0.2 * ca });
    note(x, c, 'transcript', ox + 220, -80, { alpha: ca });
    if (commit > 0) text(x, c, 'H', lerp(ox + 60, ox + 248, commit), lerp(60, 16, commit), lerp(140, 44, commit), GF.body(600), 'bone', { alpha: commit });
    this.cap.draw(x, c, t);
    comp.draw(renderer, U.upload(), out);
    return { ...POST };
  }
}
