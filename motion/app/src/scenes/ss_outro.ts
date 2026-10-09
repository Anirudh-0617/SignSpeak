// OUTRO — "Your camera feed never leaves the tab. / SignSpeak. Sign, and be understood."
// A browser tab with the camera stage inside. The feed tries to leave: its arrow runs to the tab's
// edge and stops there. Then the wordmark, and HELLO one last time, marked: the sign being made now.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D } from '../engine/gl';
import { type Word } from '../engine/lyrics';
import { rgba } from '../engine/palette';
import { clamp, ease, lerp, prog } from '../engine/util';
import { Cam2D, gridPass, setGrid, lineOf, wordOf, setWorld, arrowHead } from './_vo';
import { Captions, GF, POST, figure, frameIdx, frameRect, loadClip, loadGlossFonts, marked, note, text, textW, type Clip } from './_gloss';

export default class Outro extends Scene {
  cam = new Cam2D();
  grid = gridPass(24, 96);
  ui = new Layer2D();
  cap!: Captions;
  hello!: Clip;
  w: Record<string, Word> = {};

  override async init() {
    await loadGlossFonts();
    this.hello = await loadClip('HELLO');
    const ly = this.ctx.lyrics;
    const a = lineOf(ly, 'Your camera feed'), b = lineOf(ly, 'be understood');
    for (const k of ['camera', 'never', 'leaves', 'tab']) this.w[k] = wordOf(a, k);
    this.w.SignSpeak = wordOf(b, 'SignSpeak'); this.w.Sign = wordOf(b, 'Sign'); this.w.understood = wordOf(b, 'understood');
    this.cap = new Captions(ly, this.ctx.start, this.ctx.end);
    const sw = this.w.SignSpeak!.start - 0.3;
    this.cam.key(this.ctx.start, 0, -30, 1.0).key(sw, 0, -30, 1.03, 0, ease.linear).key(sw + 0.6, 0, 1300, 1.0, 0, ease.inOutCubic).key(this.ctx.end, 0, 1300, 1.04, 0, ease.linear);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t, w = this.w, lt = f.lt;
    const c = this.cam.at(t);
    setGrid(this.grid, c, { ink: 0.45 });
    this.grid.render(renderer, out);
    const U = this.ui; U.clear();
    const x = U.ctx;
    // ---- the tab
    const a = prog(t, this.ctx.start, this.ctx.start + 0.3);
    const TX = -560, TY = -330, TW = 1120, TH = 620;
    frameRect(x, c, TX, TY, TW, TH, { r: 16, fill: 'ink', fillAlpha: 0.9 * a, alpha: 0.4 * a, width: 1.6 });
    note(x, c, 'this tab', TX + 24, TY + 40, { col: 'bone', alpha: a });
    frameRect(x, c, TX + 40, TY + 80, 600, 450, { r: 10, fill: 'ink2', fillAlpha: a, alpha: 0.12 * a });
    figure(x, c, this.hello, frameIdx(this.hello, lt * 0.85), { x: TX + 46, y: TY + 84, w: 588, h: 441 }, { alpha: a, width: 3 });
    note(x, c, 'camera', TX + 60, TY + 116, { alpha: a });
    // the feed tries to leave, and stops at the edge
    const run = prog(t, w.never!.start, w.leaves!.end, ease.outCubic);
    const stop = prog(t, w.leaves!.end, w.tab!.end + 0.2);
    const ax0 = TX + 660, ay = TY + 305, ax1 = TX + TW - 14;
    if (run > 0) {
      const ax = lerp(ax0, ax1, run);
      setWorld(x, c);
      x.strokeStyle = rgba('bone', 0.8 * a); x.lineWidth = 2 / c.z;
      x.setLineDash([8 / c.z, 7 / c.z]);
      x.beginPath(); x.moveTo(ax0, ay); x.lineTo(ax, ay); x.stroke();
      x.setLineDash([]);
      arrowHead(x, ax, ay, 0, 14);
      // the wall it meets
      x.strokeStyle = rgba('bone', stop); x.lineWidth = 4 / c.z;
      x.beginPath(); x.moveTo(TX + TW, ay - 60 * stop); x.lineTo(TX + TW, ay + 60 * stop); x.stroke();
      x.setTransform(1, 0, 0, 1, 0, 0);
    }
    note(x, c, 'video is never uploaded', ax1 - 10, ay - 40, { align: 'right', alpha: stop });
    // ---- the wordmark
    const oy = 1300;
    const wm = prog(t, w.SignSpeak!.start - 0.1, w.SignSpeak!.end, ease.outCubic);
    const fam = GF.display(800), sz = 210;
    const ww = textW('SignSpeak', sz, fam);
    text(x, c, 'SignSpeak', -ww / 2, oy - 170 + 20 * (1 - wm), sz, fam, 'bone', { alpha: wm });
    const tag = prog(t, w.Sign!.start, w.understood!.end, ease.outCubic);
    text(x, c, 'Sign, and be understood.', 0, oy - 80, 46, GF.body(500), 'ash', { align: 'center', alpha: tag });
    // HELLO, once more, beside it: the mark rides the clip's hold
    const hf = frameIdx(this.hello, Math.max(0, t - w.Sign!.start + 0.2) * 0.85, false);
    figure(x, c, this.hello, hf, { x: -150, y: oy - 20, w: 300, h: 225 }, { alpha: tag, width: 2.5, loop: false });
    marked(x, c, 'HELLO', 0, oy + 290, 54, clamp((hf - 14) / 26) * tag, { align: 'center', alpha: tag });
    this.cap.draw(x, c, t);
    comp.draw(renderer, U.upload(), out);
    return { ...POST, fade: prog(t, this.ctx.end - 0.9, this.ctx.end - 0.05, ease.inOutCubic) };
  }
}
