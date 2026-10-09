// TRANSLATE — "Press Translate, and the gloss becomes plain English, read out loud."
// Gloss chips (HELLO MY NAME A-N-I), the app's primary button pressed on "Translate", the chips fold
// into an English sentence (labelled as an example), a speaker with its level bars on "read out loud".
// The privacy fact rides along: Translate sends the words as text, never video (content.ts PRIVACY).
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D } from '../engine/gl';
import { type Word } from '../engine/lyrics';
import { rgba } from '../engine/palette';
import { ease, lerp, noise1, prog } from '../engine/util';
import { Cam2D, gridPass, setGrid, lineOf, wordOf, setWorld } from './_vo';
import { Captions, GF, POST, frameRect, loadGlossFonts, note, text, textW } from './_gloss';

const CHIPS = ['HELLO', 'MY', 'NAME', 'A-N-I'];
const ENGLISH = 'Hello, my name is Ani.';

export default class Translate extends Scene {
  cam = new Cam2D();
  grid = gridPass(24, 96);
  ui = new Layer2D();
  cap!: Captions;
  w: Record<string, Word> = {};

  override async init() {
    await loadGlossFonts();
    const L = lineOf(this.ctx.lyrics, 'Press Translate');
    for (const k of ['Press', 'Translate', 'gloss', 'becomes', 'plain', 'English', 'read', 'loud']) this.w[k] = wordOf(L, k);
    this.cap = new Captions(this.ctx.lyrics, this.ctx.start, this.ctx.end);
    this.cam.key(this.ctx.start, 0, -40, 1.04).key(this.ctx.end, 0, -20, 1.0, 0, ease.linear);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t, w = this.w;
    const c = this.cam.at(t);
    setGrid(this.grid, c, { ink: 0.45 });
    this.grid.render(renderer, out);
    const U = this.ui; U.clear();
    const x = U.ctx;
    const a = prog(t, this.ctx.start, this.ctx.start + 0.3);
    const fold = prog(t, w.becomes!.start, w.English!.end, ease.inOutCubic);
    // chips
    const cf = GF.mono(500), cs = 34, pad = 22, gap = 18;
    const widths = CHIPS.map((s) => textW(s, cs, cf, 0.06) + pad * 2);
    const tot = widths.reduce((p, q) => p + q, 0) + gap * (CHIPS.length - 1);
    let cx = -tot / 2;
    note(x, c, 'gloss', -tot / 2, -270, { alpha: a * (1 - fold) });
    CHIPS.forEach((s, i) => {
      const k = prog(fold, i * 0.12, 0.5 + i * 0.12, ease.inOutCubic);
      const y = lerp(-230, -60, k), al = a * (1 - k);
      if (al > 0.01) {
        frameRect(x, c, cx, y, widths[i]!, 64, { r: 8, alpha: 0.35 * al });
        text(x, c, s, cx + pad, y + 44, cs, cf, 'bone', { alpha: al, tracking: 0.06 });
      }
      cx += widths[i]! + gap;
    });
    // the Translate button (inverse fill = the app's primary button)
    const press = prog(t, w.Translate!.start, w.Translate!.start + 0.12) * (1 - prog(t, w.Translate!.start + 0.12, w.Translate!.end + 0.1));
    const bw = 300, bh = 76, bs = 1 - 0.05 * press;
    const ba = a * (1 - prog(t, w.plain!.start, w.English!.end));
    setWorld(x, c, 0, 0, bs);
    x.fillStyle = rgba('bone', ba * (1 - 0.15 * press));
    x.beginPath(); x.roundRect(-bw / 2, -bh / 2, bw, bh, 10); x.fill();
    x.setTransform(1, 0, 0, 1, 0, 0);
    text(x, c, 'Translate', 0, 13 * bs, 36 * bs, GF.body(600), 'ink', { align: 'center', alpha: ba });
    // the English sentence
    const ea = prog(t, w.plain!.start, w.English!.end, ease.outCubic);
    const es = 96, ef = GF.display(700);
    const ew = textW(ENGLISH, es, ef);
    text(x, c, ENGLISH, -ew / 2, lerp(150, 120, ea), es, ef, 'bone', { alpha: ea });
    note(x, c, 'example output', -ew / 2, 190, { alpha: ea });
    // read out loud: speaker + level bars
    const ra = prog(t, w.read!.start, w.read!.start + 0.2);
    if (ra > 0) {
      const sx = ew / 2 + 60, sy = 90;
      setWorld(x, c);
      x.fillStyle = rgba('bone', ra);
      x.beginPath(); x.moveTo(sx, sy - 12); x.lineTo(sx + 14, sy - 12); x.lineTo(sx + 30, sy - 28); x.lineTo(sx + 30, sy + 28); x.lineTo(sx + 14, sy + 12); x.lineTo(sx, sy + 12); x.closePath(); x.fill();
      for (let i = 0; i < 7; i++) {
        const h = 10 + 46 * Math.abs(noise1(t * 7 + i * 1.7, i)) * (1 - prog(t, w.loud!.end + 0.6, w.loud!.end + 1.2));
        x.fillRect(sx + 50 + i * 14, sy - h / 2, 6, h);
      }
      x.setTransform(1, 0, 0, 1, 0, 0);
    }
    note(x, c, 'sends the words as text · never video', 0, 300, { align: 'center', alpha: prog(t, w.gloss!.start, w.gloss!.end + 0.3) });
    this.cap.draw(x, c, t);
    comp.draw(renderer, U.upload(), out);
    return { ...POST };
  }
}
