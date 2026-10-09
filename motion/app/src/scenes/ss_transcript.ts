// TRANSCRIPT — "Letters become words. / Words become an editable transcript."
// H, E, L, L, O: each reference handshape is made in turn; the one being made carries the mark, and
// its letter commits beneath it. On "words" the letters close up into HELLO. Then the transcript:
// HELLO MY NAME A-N-I (the app's own sample, src/landing/content.ts), with a live caret.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D } from '../engine/gl';
import { type Word } from '../engine/lyrics';
import { rgba } from '../engine/palette';
import { clamp, ease, lerp, prog } from '../engine/util';
import { Cam2D, gridPass, setGrid, lineOf, wordOf, setWorld } from './_vo';
import { Captions, GF, POST, figure, fitBox, frameRect, handOf, loadClip, loadGlossFonts, mark, note, text, textW, type Clip } from './_gloss';

const SPELL = ['H', 'E', 'L', 'L', 'O'];
const TOKENS = ['HELLO', 'MY', 'NAME', 'A-N-I'];

export default class Transcript extends Scene {
  cam = new Cam2D();
  grid = gridPass(24, 96);
  ui = new Layer2D();
  cap!: Captions;
  clips: Record<string, Clip> = {};
  w: Record<string, Word> = {};

  override async init() {
    await loadGlossFonts();
    for (const l of ['H', 'E', 'L', 'O']) this.clips[l] = await loadClip(l);
    const ly = this.ctx.lyrics;
    const l1 = lineOf(ly, 'Letters become'), l2 = lineOf(ly, 'editable transcript');
    this.w.Letters = wordOf(l1, 'Letters'); this.w.words = wordOf(l1, 'words');
    for (const k of ['Words', 'editable', 'transcript']) this.w[k] = wordOf(l2, k);
    this.cap = new Captions(ly, this.ctx.start, this.ctx.end);
    const s = this.ctx.start;
    this.cam.key(s, 0, -60, 1.0).key(this.w.Words!.start - 0.1, 0, -40, 1.03, 0, ease.linear)
      .key(this.w.Words!.start + 0.6, 0, 520, 1.0, 0, ease.inOutCubic).key(this.ctx.end, 0, 520, 1.02, 0, ease.linear);
  }

  /** When letter i is made (spread over "Letters become"). */
  tLetter(i: number) { return lerp(this.ctx.start + 0.1, this.w.words!.start - 0.05, i / SPELL.length); }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t, w = this.w;
    const c = this.cam.at(t);
    setGrid(this.grid, c, { ink: 0.5 });
    this.grid.render(renderer, out);
    const U = this.ui; U.clear();
    const x = U.ctx;
    // ---- letters → word
    const join = prog(t, w.words!.start, w.words!.end + 0.15, ease.inOutCubic);
    const fam = GF.display(800), size = 170;
    const word = SPELL.join('');
    const ww = textW(word, size, fam);
    SPELL.forEach((ch, i) => {
      const t0 = this.tLetter(i), t1 = this.tLetter(i + 1);
      const sx = (i - 2) * 300;
      // the handshape above its slot
      const clip = this.clips[ch]!;
      const ha = prog(t, t0 - 0.1, t0 + 0.08) * (1 - join);
      figure(x, c, clip, 0, fitBox(handOf(clip, 0)!, sx, -330, 190), { alpha: ha * (t < t1 ? 1 : 0.45), pose: false, width: 3, mono: t < t1 ? undefined : 'ash' });
      // the letter: marked while it is being made, committed after
      const lx = lerp(sx - textW(ch, size, fam) / 2, -ww / 2 + textW(word.slice(0, i), size, fam), join);
      const a = prog(t, t0, t0 + 0.12);
      if (a <= 0) return;
      const now = t >= t0 && t < t1 && join === 0;
      if (now) mark(x, c, lx - 22, -size * 0.86 + 40, textW(ch, size, fam) + 44, size * 1.08, prog(t, t0, t1 - 0.04), 1);
      text(x, c, ch, lx, 40, size, fam, now ? 'ink' : 'bone', { alpha: a * (1 - prog(t, w.Words!.start - 0.1, w.Words!.start + 0.35)) });
    });
    note(x, c, 'fingerspelled · committed one by one', 0, 150, { align: 'center', alpha: prog(t, this.ctx.start, this.ctx.start + 0.3) * (1 - join) });
    // ---- the transcript
    const ta = prog(t, w.Words!.start - 0.1, w.Words!.start + 0.4);
    const BX = -620, BY = 380, BW = 1240, BH = 260;
    if (ta > 0) {
      note(x, c, 'transcript', BX, BY - 18, { alpha: ta });
      frameRect(x, c, BX, BY, BW, BH, { r: 12, fill: 'ink2', fillAlpha: ta, alpha: 0.22 * ta });
      const tsz = 64, tf = GF.body(600);
      let cx = BX + 44;
      const ty = BY + 110;
      const tw0 = w.Words!.start, tw1 = w.editable!.end;
      TOKENS.forEach((tok, k) => {
        const appear = k === 0 ? 1 : prog(t, lerp(tw0, tw1, (k - 1) / 3), lerp(tw0, tw1, (k - 1) / 3) + 0.15);
        if (appear > 0) text(x, c, tok, cx, ty, tsz, tf, 'bone', { alpha: ta * appear });
        cx += textW(tok + ' ', tsz, tf);
      });
      // "editable": a selection on NAME and the caret
      const sel = prog(t, w.editable!.start, w.editable!.end, ease.outCubic) * (1 - prog(t, w.transcript!.end, w.transcript!.end + 0.3));
      const nx = BX + 44 + textW('HELLO MY ', tsz, tf);
      if (sel > 0) frameRect(x, c, nx - 6, ty - 58, textW('NAME', tsz, tf) * sel + 12, 76, { r: 4, fill: 'bone', fillAlpha: 0.14, alpha: 0 });
      const blink = Math.floor((t - tw0) * 2.2) % 2 === 0 ? 1 : 0.15;
      setWorld(x, c);
      x.fillStyle = rgba('bone', ta * blink);
      const caretX = sel > 0 ? nx + textW('NAME', tsz, tf) * sel + 6 : cx - textW(' ', tsz, tf) + 6;
      x.fillRect(caretX, ty - 54, 4, 70);
      x.setTransform(1, 0, 0, 1, 0, 0);
      note(x, c, 'auto-space after a pause · type to fix', BX + 44, BY + BH - 40, { alpha: ta * prog(t, w.transcript!.start, w.transcript!.end) });
    }
    void clamp;
    this.cap.draw(x, c, t);
    comp.draw(renderer, U.upload(), out);
    return { ...POST };
  }
}
