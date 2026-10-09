// HONEST — "Fingerspelling scores 98.3% on held-out images. / Word signs are early, at 56.5%. /
// We tell you that up front."
// Two measured numbers, each counted up while it is said, each with its bar and its source (the
// numbers and their caveats come from src/landing/content.ts and CLAUDE.md, nowhere else). No
// yellow: these are facts, not signs. "Up front" draws the frame around both.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D } from '../engine/gl';
import { type Word } from '../engine/lyrics';
import { ease, prog } from '../engine/util';
import { Cam2D, gridPass, setGrid, lineOf, wordOf } from './_vo';
import { Captions, GF, POST, frameRect, loadGlossFonts, note, text } from './_gloss';

const ROWS = [
  { label: 'fingerspelling · 26 letters', v: 98.3, src: 'kaggle asl alphabet · held-out split', q: '98.3%' },
  { label: 'word signs · 33 words', v: 56.5, src: '309 unique clips · deduplicated split', q: '56.5%.' },
];

export default class Honest extends Scene {
  cam = new Cam2D();
  grid = gridPass(24, 96);
  ui = new Layer2D();
  cap!: Captions;
  w: Record<string, Word> = {};
  l1!: Word; l2!: Word;

  override async init() {
    await loadGlossFonts();
    const ly = this.ctx.lyrics;
    const a = lineOf(ly, 'Fingerspelling scores'), b = lineOf(ly, 'Word signs are early'), c = lineOf(ly, 'We tell you');
    this.w['98.3%'] = wordOf(a, '98.3%'); this.w.Fingerspelling = wordOf(a, 'Fingerspelling'); this.w.images = wordOf(a, 'images');
    this.w['56.5%.'] = wordOf(b, '56.5%'); this.w.Word = wordOf(b, 'Word'); this.w.early = wordOf(b, 'early');
    this.w.up = wordOf(c, 'up'); this.w.front = wordOf(c, 'front');
    this.cap = new Captions(ly, this.ctx.start, this.ctx.end);
    this.cam.key(this.ctx.start, 0, -40, 1.05).key(this.w.up!.start, 0, -30, 1.0, 0, ease.linear).key(this.ctx.end, 0, -30, 0.94, 0, ease.inOutCubic);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t, w = this.w;
    const c = this.cam.at(t);
    setGrid(this.grid, c, { ink: 0.45 });
    this.grid.render(renderer, out);
    const U = this.ui; U.clear();
    const x = U.ctx;
    const starts = [w.Fingerspelling!.start - 0.2, w.Word!.start - 0.2];
    ROWS.forEach((r, i) => {
      const y = -230 + i * 300;
      const a = prog(t, starts[i]!, starts[i]! + 0.3);
      if (a <= 0) return;
      const num = w[r.q]!;
      const k = prog(t, num.start, num.end - 0.15, ease.outCubic);
      note(x, c, r.label, -700, y - 120, { alpha: a });
      text(x, c, `${(r.v * k).toFixed(1)}%`, -706, y + 40, 170, GF.display(800), 'bone', { alpha: a * prog(t, num.start - 0.05, num.start + 0.12) });
      const BX = 0, BW = 700;
      frameRect(x, c, BX, y - 40, BW, 24, { r: 4, alpha: 0.25 * a });
      frameRect(x, c, BX, y - 40, Math.max(1, BW * (r.v / 100) * k), 24, { r: 4, fill: i === 0 ? 'bone' : 'ash', fillAlpha: a, alpha: 0 });
      note(x, c, r.src, BX, y + 30, { alpha: a * prog(t, num.end, num.end + 0.3) });
    });
    note(x, c, 'expect misses on word signs · fingerspelling is the reliable path today', -700, 300, { alpha: prog(t, w.early!.start, w.early!.end + 0.3) });
    const fr = prog(t, w.up!.start, w.front!.end + 0.2, ease.inOutCubic);
    if (fr > 0) frameRect(x, c, -760, -400, 1520 * fr, 760, { r: 16, alpha: 0.45 * fr, width: 1.6 });
    this.cap.draw(x, c, t);
    comp.draw(renderer, U.upload(), out);
    return { ...POST };
  }
}
