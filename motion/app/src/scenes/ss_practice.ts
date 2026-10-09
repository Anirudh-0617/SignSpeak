// PRACTICE — "Still learning? Copy the reference figure, and get scored live."
// The app's practice desk: THANK-YOU's reference figure (real WLASL landmarks) on the stage, its gloss
// marked while the sign is made. On "scored live" the confidence bar climbs past the pass line
// (words pass at 0.4, PASS_CONFIDENCE in the app) and the verdict mark lands.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D } from '../engine/gl';
import { type Word } from '../engine/lyrics';
import { rgba } from '../engine/palette';
import { ease, prog } from '../engine/util';
import { Cam2D, gridPass, setGrid, lineOf, wordOf, setWorld } from './_vo';
import { Captions, GF, POST, figure, frameIdx, frameRect, loadClip, loadGlossFonts, marked, note, text, type Clip } from './_gloss';

export default class Practice extends Scene {
  cam = new Cam2D();
  grid = gridPass(24, 96);
  ui = new Layer2D();
  cap!: Captions;
  ty!: Clip;
  w: Record<string, Word> = {};

  override async init() {
    await loadGlossFonts();
    this.ty = await loadClip('THANK-YOU');
    const L = lineOf(this.ctx.lyrics, 'Still learning');
    for (const k of ['Still', 'learning?', 'Copy', 'reference', 'figure,', 'scored', 'live.']) this.w[k] = wordOf(L, k);
    this.cap = new Captions(this.ctx.lyrics, this.ctx.start, this.ctx.end);
    this.cam.key(this.ctx.start, 40, -30, 1.04).key(this.ctx.end, 20, -30, 1.0, 0, ease.linear);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t, w = this.w;
    const c = this.cam.at(t);
    setGrid(this.grid, c, { ink: 0.5 });
    this.grid.render(renderer, out);
    const U = this.ui; U.clear();
    const x = U.ctx;
    const a = prog(t, this.ctx.start, this.ctx.start + 0.35);
    // contents-page heading
    note(x, c, 'practice · word signs', -820, -400, { alpha: a });
    text(x, c, 'Thank you', -824, -320, 64, GF.display(700), 'bone', { alpha: a });
    // the stage
    const SX = -820, SY = -270, SW = 820, SH = 615;
    frameRect(x, c, SX, SY, SW, SH, { r: 12, fill: 'ink2', fillAlpha: a, alpha: 0.12 * a });
    const ref = prog(t, w.reference!.start - 0.2, w.reference!.start + 0.2);
    const sec = Math.max(0, t - w.Copy!.start + 0.4) * 0.9;
    const fi = frameIdx(this.ty, sec);
    figure(x, c, this.ty, fi, { x: SX + 10, y: SY + 6, w: 800, h: 600 }, { alpha: Math.max(0.25, ref) * a, width: 3.5 });
    note(x, c, 'reference', SX + 22, SY + 40, { col: 'bone', alpha: a * ref });
    // the gloss, marked while the clip's hands are up (the sign being made now)
    const n = this.ty.frames.length;
    const signing = fi > n * 0.15 && fi < n * 0.9 && t >= w.Copy!.start ? 1 : 0;
    marked(x, c, 'THANK-YOU', 80, -150, 104, signing * prog(fi, n * 0.15, n * 0.6), { alpha: a });
    // the score: climbs on "scored live", passes the 0.4 line, the verdict lands
    const sc = prog(t, w.scored!.start, w['live.']!.end + 0.2, ease.outCubic) * 0.78;
    const BX = 80, BY = 40, BW = 640;
    note(x, c, 'match · live', BX, BY - 22, { alpha: a });
    frameRect(x, c, BX, BY, BW, 26, { r: 4, alpha: 0.25 * a });
    frameRect(x, c, BX, BY, Math.max(1, BW * sc), 26, { r: 4, fill: 'bone', fillAlpha: a, alpha: 0 });
    setWorld(x, c);
    x.fillStyle = rgba('ash', a);
    x.fillRect(BX + BW * 0.4 - 1, BY - 10, 2, 46);
    x.setTransform(1, 0, 0, 1, 0, 0);
    note(x, c, 'pass', BX + BW * 0.4, BY + 64, { align: 'center', alpha: a });
    const pass = prog(t, w['live.']!.start, w['live.']!.start + 0.15, ease.outCubic);
    text(x, c, '!', BX + BW + 50, BY + 40, 120 * (0.85 + 0.15 * pass), GF.display(800), 'bone', { alpha: pass });
    note(x, c, 'copy the figure · R to retry', BX, BY + 170, { alpha: a * prog(t, w['figure,']!.start, w['figure,']!.end + 0.3) });
    this.cap.draw(x, c, t);
    comp.draw(renderer, U.upload(), out);
    return { ...POST };
  }
}
