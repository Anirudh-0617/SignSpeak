import { memo, useEffect, useRef, useState } from 'react';
import { loadClip, makeRenderer, type HandColors, type RefClip } from './signClip';
import { usePrefersReducedMotion } from './useInView';

// Plays one or more reference clips back to back on a single canvas. The
// landing's only moving "image" is real landmark data from real signing video,
// so this is the hero asset, the name speller and the alphabet wall at once.
//
// Import it lazily: it pulls in @mediapipe/tasks-vision's DrawingUtils.
//
// Behaviour contract:
// - Pauses (no rAF) while scrolled off screen or when `paused`.
// - Reduced motion: no continuous frames. Each item shows its middle frame and
//   items still step, because a sequence (a spelled name) is content, not
//   decoration. Pair with a visible pause control if it auto-advances > 5 s.
// - Missing clips are skipped, never thrown.

export type SignPlayerProps = {
  glosses: string[];
  /** ms each single-frame clip (letters) is held. Word clips run at their fps. */
  holdMs?: number;
  loop?: boolean;
  paused?: boolean;
  /** 640x480 for words (pose + hands); 480x480 suits letter stills. */
  aspect?: '4/3' | '1/1';
  mirror?: boolean;
  /** Override hand colours for this stage (see HandColors). */
  handColors?: HandColors;
  onIndexChange?: (index: number, gloss: string) => void;
  /** Fires only when the drawn frame changes, never per rAF tick. */
  onFrame?: (frame: number, frameCount: number) => void;
  onDone?: () => void;
  className?: string;
  label?: string;
};

type Loaded = { gloss: string; clip: RefClip }[];

function SignPlayerImpl({
  glosses,
  holdMs = 650,
  loop = true,
  paused = false,
  aspect = '4/3',
  mirror = true,
  handColors,
  onIndexChange,
  onFrame,
  onDone,
  className = '',
  label,
}: SignPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [items, setItems] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const reduced = usePrefersReducedMotion();

  // Callbacks via refs so a parent's inline arrow doesn't restart playback.
  const onIndexRef = useRef(onIndexChange);
  const onDoneRef = useRef(onDone);
  const onFrameRef = useRef(onFrame);
  useEffect(() => {
    onIndexRef.current = onIndexChange;
    onDoneRef.current = onDone;
    onFrameRef.current = onFrame;
  });

  const key = glosses.join(' ');
  // Primitives, so an inline { rightHand } object doesn't restart playback.
  const leftColor = handColors?.leftHand;
  const rightColor = handColors?.rightHand;

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setFailed(false);
    // Rebuilt from `key` (glosses never contain spaces) so an inline array
    // from the caller doesn't refetch on every render.
    const list = key.split(' ').filter(Boolean);
    Promise.allSettled(list.map(loadClip)).then((rs) => {
      if (cancelled) return;
      const ok: Loaded = [];
      rs.forEach((r, i) => {
        if (r.status === 'fulfilled') ok.push({ gloss: list[i], clip: r.value });
      });
      if (ok.length) setItems(ok);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), {
      rootMargin: '120px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Playback position survives pause/resume and in-view toggles.
  // `done` lives here, not in the effect, so a restart (theme change, pause
  // toggle) after a non-looping run neither replays the last item nor fires
  // onDone twice.
  const pos = useRef({ item: 0, elapsed: 0, done: false });
  useEffect(() => {
    pos.current = { item: 0, elapsed: 0, done: false };
  }, [key]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !items) return;
    canvas.width = aspect === '1/1' ? 480 : 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderers = items.map((it) =>
      makeRenderer(ctx, it.clip, { leftHand: leftColor, rightHand: rightColor }),
    );
    const dur = (it: Loaded[number]) =>
      it.clip.frames.length <= 1
        ? holdMs
        : (it.clip.frames.length / Math.max(it.clip.fps, 1)) * 1000;
    // Reduced motion holds each item a little longer: a still swap every
    // 650 ms reads as flicker.
    const itemDur = (i: number) => dur(items[i]) * (reduced ? 1.6 : 1);

    let lastKey = '';
    const paint = () => {
      const { item, elapsed } = pos.current;
      const it = items[item];
      const n = it.clip.frames.length;
      const frame = reduced
        ? Math.floor(n / 2)
        : Math.min(n - 1, Math.floor((elapsed / 1000) * Math.max(it.clip.fps, 1)));
      const k = `${item}:${frame}`;
      if (k === lastKey) return; // same frame as last tick: skip redraw + callback
      lastKey = k;
      renderers[item](frame);
      onFrameRef.current?.(frame, n);
    };

    onIndexRef.current?.(pos.current.item, items[pos.current.item].gloss);
    paint();
    if (paused || !onScreen || pos.current.done) return;

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      pos.current.elapsed += now - last;
      last = now;
      if (pos.current.elapsed >= itemDur(pos.current.item)) {
        pos.current.elapsed = 0;
        const next = pos.current.item + 1;
        if (next >= items.length) {
          if (!loop) {
            // Hold on the last item's final frame.
            pos.current.done = true;
            pos.current.elapsed = itemDur(pos.current.item) - 1;
            paint();
            onDoneRef.current?.();
            return;
          }
          pos.current.item = 0;
        } else pos.current.item = next;
        onIndexRef.current?.(pos.current.item, items[pos.current.item].gloss);
      }
      paint();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [items, paused, onScreen, reduced, holdMs, loop, aspect, leftColor, rightColor]);

  const state = failed ? 'error' : items ? 'ready' : 'loading';
  return (
    <canvas
      ref={canvasRef}
      data-state={state}
      role="img"
      aria-label={label ?? `Landmark animation: ${glosses.join(', ')}`}
      className={
        'block w-full h-auto ' +
        (aspect === '1/1' ? 'aspect-square ' : 'aspect-[4/3] ') +
        (mirror ? '-scale-x-100 ' : '') +
        className
      }
    />
  );
}

export const SignPlayer = memo(SignPlayerImpl);
export default SignPlayer;
