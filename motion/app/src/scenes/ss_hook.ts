// HOOK — "This is HELLO, in American Sign Language. / If you don't sign, it's just a gesture."
// The real HELLO clip (WLASL landmarks) plays on the stage. Its gloss is marked while it is named;
// on "don't sign" the mark lifts and the figure drains to grey: unread, it is only a gesture.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D } from '../engine/gl';
import { type Word } from '../engine/lyrics';
import { ease, prog } from '../engine/util';
import { Cam2D, gridPass, setGrid, lineOf, wordOf } from './_vo';
import { Captions, GF, POST, figure, frameIdx, loadClip, loadGlossFonts, marked, note, text, type Clip } from './_gloss';

export default class Hook extends Scene {
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
    const l1 = lineOf(ly, 'This is HELLO'), l2 = lineOf(ly, 'just a gesture');
    this.w.hello = wordOf(l1, 'HELLO');
    this.w.lang = wordOf(l1, 'Language');
    this.w.dont = wordOf(l2, "don't");
    this.w.gesture = wordOf(l2, 'gesture');
    this.cap = new Captions(ly, this.ctx.start, this.ctx.end);
    this.cam.key(0, -40, 0, 1.0).key(this.ctx.end, 10, 0, 1.07, 0, ease.linear);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t, w = this.w;
    const c = this.cam.at(t);
    setGrid(this.grid, c, { ink: 0.55 });
    this.grid.render(renderer, out);
    const U = this.ui; U.clear();
    const x = U.ctx;
    // the sign loops at 0.8x, starting a beat before it is named
    const fi = frameIdx(this.hello, Math.max(0, t - 0.3) * 0.8);
    const drain = prog(t, w.dont!.start, w.gesture!.end, ease.inOutCubic);
    const box = { x: -820, y: -470, w: 1013, h: 760 };
    if (drain < 1) figure(x, c, this.hello, fi, box, { alpha: 1 - drain, width: 4 });
    if (drain > 0) figure(x, c, this.hello, fi, box, { alpha: drain * 0.7, width: 4, mono: 'ash' });
    // the gloss: marked while it is named, unmarked once you "don't sign"
    const on = prog(t, w.hello!.start, w.hello!.end + 0.25, ease.outCubic);
    const off = prog(t, w.dont!.start, w.dont!.end + 0.2, ease.inOutCubic);
    const a = prog(t, 0.2, 0.7);
    note(x, c, 'ASL · gloss', 330, -150, { alpha: a * (1 - off * 0.6) });
    marked(x, c, 'HELLO', 330, 10, 168, on * (1 - off), { alpha: a * (1 - off * 0.55) });
    text(x, c, 'American Sign Language', 334, 70, 30, GF.body(500), 'ash', { alpha: prog(t, w.lang!.start, w.lang!.end) * (1 - off) });
    text(x, c, 'just a gesture.', 334, 70, 30, GF.body(500), 'ash', { alpha: prog(t, w.gesture!.start, w.gesture!.end) });
    this.cap.draw(x, c, t);
    comp.draw(renderer, U.upload(), out);
    return { ...POST, fade: 1 - prog(t, 0, 0.45) };
  }
}
