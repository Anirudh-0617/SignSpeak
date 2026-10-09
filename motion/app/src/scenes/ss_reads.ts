// READS — "SignSpeak reads it, live, right in your browser."
// The stage becomes the app: a browser window draws in around the figure, the rail on the right is
// the app's "Now" panel. Each time the sign is made the highlighter fills under its gloss (the
// hold timer) and the word lands in the transcript.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D } from '../engine/gl';
import { type Word } from '../engine/lyrics';
import { ease, prog } from '../engine/util';
import { Cam2D, gridPass, setGrid, lineOf, wordOf } from './_vo';
import { Captions, GF, POST, figure, frameIdx, frameRect, loadClip, loadGlossFonts, marked, note, text, type Clip } from './_gloss';

const WX = -760, WY = -400, WW = 1520, WH = 800; // the browser window

export default class Reads extends Scene {
  cam = new Cam2D();
  grid = gridPass(24, 96);
  ui = new Layer2D();
  cap!: Captions;
  hello!: Clip;
  w: Record<string, Word> = {};

  override async init() {
    await loadGlossFonts();
    this.hello = await loadClip('HELLO');
    const L = lineOf(this.ctx.lyrics, 'SignSpeak reads');
    for (const k of ['SignSpeak', 'reads', 'live', 'right', 'browser']) this.w[k] = wordOf(L, k);
    this.cap = new Captions(this.ctx.lyrics, this.ctx.start, this.ctx.end);
    const s = this.ctx.start;
    this.cam.key(s, -120, -20, 1.2).key(this.w.right!.start, -100, -10, 1.14, 0, ease.linear).key(this.w.browser!.end + 0.2, 0, -10, 1.0, 0, ease.inOutCubic).key(this.ctx.end, 0, -10, 0.98, 0, ease.linear);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t, w = this.w, lt = f.lt;
    const c = this.cam.at(t);
    setGrid(this.grid, c, { ink: 0.45 });
    this.grid.render(renderer, out);
    const U = this.ui; U.clear();
    const x = U.ctx;
    // the window and its chrome
    const win = prog(t, w.SignSpeak!.start - 0.1, w.reads!.end, ease.outCubic);
    frameRect(x, c, WX, WY, WW, WH, { r: 18, fill: 'ink', fillAlpha: 0.92 * win, alpha: 0.28 * win });
    frameRect(x, c, WX, WY, WW, 54, { r: 18, fill: 'ink2', fillAlpha: win, alpha: 0 });
    for (let i = 0; i < 3; i++) frameRect(x, c, WX + 26 + i * 22, WY + 21, 12, 12, { r: 6, fill: 'graphite', fillAlpha: win, alpha: 0 });
    text(x, c, 'SignSpeak · Transcribe', WX + 110, WY + 34, 17, GF.body(500), 'ash', { alpha: win });
    // camera stage (7fr) and rail (5fr), like the app's desk layout
    const SX = WX + 32, SY = WY + 86, SW = 820, SH = 615;
    frameRect(x, c, SX, SY, SW, SH, { r: 12, fill: 'ink2', fillAlpha: win, alpha: 0.12 * win });
    const fi = frameIdx(this.hello, lt * 0.85 + 0.6);
    figure(x, c, this.hello, fi, { x: SX + 10, y: SY + 6, w: 800, h: 600 }, { width: 3.5 });
    const live = prog(t, w.live!.start, w.live!.end);
    note(x, c, '● live', SX + 22, SY + 40, { col: 'bone', alpha: live * win });
    const RX = SX + SW + 48;
    note(x, c, 'Now', RX, SY + 30, { alpha: win });
    // hold timer: fills while the hand is up in the clip (frames 12-47 of 54), committed once per loop
    const n = this.hello.frames.length;
    const k = Math.max(0, Math.min(1, (fi - 14) / 26));
    const committed = lt * 0.85 + 0.6 >= (40 / this.hello.fps);
    marked(x, c, 'HELLO', RX, SY + 190, 120, k, { alpha: win });
    note(x, c, `hold ${Math.round(k * 100)}%`, RX, SY + 250, { alpha: win * 0.9 });
    void n;
    note(x, c, 'Transcript', RX, SY + 400, { alpha: win });
    frameRect(x, c, RX - 6, SY + 425, 560, 150, { r: 8, alpha: 0.18 * win });
    if (committed) text(x, c, 'HELLO', RX + 18, SY + 485, 40, GF.body(600), 'bone', { alpha: win * prog(lt * 0.85 + 0.6, 40 / this.hello.fps, 40 / this.hello.fps + 0.2) });
    this.cap.draw(x, c, t);
    comp.draw(renderer, U.upload(), out);
    return { ...POST };
  }
}
