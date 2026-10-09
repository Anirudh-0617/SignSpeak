import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { Link } from 'react-router-dom';
import { useTheme, type Theme } from '../ui/theme';
import { TUTORIAL_SEEN_KEY } from '../ui/tutorial/seenKey';
import { CTA, FACTS, HERO_SEQUENCE, LINKS, MODES, PIPELINE, PRIVACY, WORD_SIGNS_NOTE } from './content';
import { Chevron, PopNumber, Reveal, Stagger } from './motion';
import { frameVector, loadClip, type RefClip } from './signClip';
import { useInView } from './useInView';
import { ThemeSwitch } from '../ui/ThemeSwitch';
import '../ui/gloss.css';

// Gloss: the page is typeset the way linguists write sign language down.
// Uppercase glosses (HELLO MY NAME), fingerspelling as A-N-I, and one yellow
// highlighter that only ever means "this is the sign being made right now".

const SignPlayer = lazy(() => import('./SignPlayer'));

const WRAP = 'mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-10';

// On the dark plate the landmark halo vanishes and the app's #5b3df5 right hand
// sits at 3.11:1. Same hue, lifted to 5.64:1 on --g-plate. The light plate
// keeps the app colour (5.81:1 there). Hands stay apart by hue; pose by form.
const DARK_PLATE_HANDS = { rightHand: '#8a78ff' };
const handColorsFor = (theme: Theme) => (theme === 'dark' ? DARK_PLATE_HANDS : undefined);

// ---------------------------------------------------------------- helpers

/** Holds the player's exact box while the chunk and clip load, so nothing
 *  reflows when the canvas arrives. */
function PlayerSlot({ aspect }: { aspect: '4/3' | '1/1' }) {
  return <div aria-hidden className={'w-full ' + (aspect === '1/1' ? 'aspect-square' : 'aspect-[4/3]')} />;
}

/** Mounts children only once the slot is near the viewport. Below-the-fold
 *  players then cost nothing (no chunk, no clip fetch) until they matter. */
function NearView({ aspect, children }: { aspect: '4/3' | '1/1'; children: ReactNode }) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '400px 0px', threshold: 0 });
  return (
    <div ref={ref}>
      {inView ? <Suspense fallback={<PlayerSlot aspect={aspect} />}>{children}</Suspense> : <PlayerSlot aspect={aspect} />}
    </div>
  );
}

function readReturning(): boolean {
  try {
    return !!window.localStorage.getItem(TUTORIAL_SEEN_KEY);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- top bar

function TopBar({ theme, toggle, returning }: { theme: Theme; toggle: () => void; returning: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b g-rule bg-[color:var(--g-bg)]">
      <div className={WRAP + ' flex h-16 items-center justify-between gap-4'}>
        <Link to="/" className="font-display text-[1.2rem] tracking-[-0.02em] g-t1">
          SignSpeak
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-5 text-sm sm:gap-7">
          {returning && (
            <Link to={LINKS.app} className="g-quiet hidden md:inline">
              Welcome back, resume <span aria-hidden>→</span>
            </Link>
          )}
          <a href="#how" className="g-quiet hidden lg:inline">
            How it works
          </a>
          <Link to={LINKS.login} className="g-quiet hidden sm:inline">
            {CTA.signIn}
          </Link>
          <ThemeSwitch theme={theme} toggle={toggle} />
          <Link to={LINKS.app} className="g-btn press px-3.5 py-2 text-[13px]">
            {CTA.primary}
          </Link>
        </nav>
      </div>
      {returning && (
        <div className={WRAP + ' border-t g-rule py-2 text-sm md:hidden'}>
          <Link to={LINKS.app} className="g-link">
            Welcome back, resume <span aria-hidden>→</span>
          </Link>
        </div>
      )}
    </header>
  );
}

// ---------------------------------------------------------------- hero

function Hero({ theme }: { theme: Theme }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const glosses = useMemo(() => [...HERO_SEQUENCE], []);
  const onIndex = useCallback((i: number) => setIdx(i), []);

  return (
    <section aria-label="Introduction" className="pb-24 pt-12 md:pb-32 md:pt-20">
      <div className={WRAP + ' grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,580px)] lg:gap-16'}>
        <div>
          <Stagger as="h1" className="g-display text-[clamp(3rem,6vw,5.6rem)]">
            <span className="t-stagger-line">Signing,</span>
            <span className="t-stagger-line t-stagger-line--2">written down.</span>
          </Stagger>
          <Stagger>
            <p className="t-stagger-line t-stagger-line--3 g-lede mt-8">
              Fingerspell or sign to your webcam. SignSpeak writes it into a transcript you can edit, right in the browser.
            </p>
            <div className="t-stagger-line t-stagger-line--4 mt-10">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link to={LINKS.app} className="g-btn press px-5 py-3 text-[15px]">
                {CTA.primary}
              </Link>
              <a href="#how" className="t-learn g-quiet inline-flex items-center gap-1 text-[15px]">
                How it works
                <Chevron />
              </a>
              </div>
            </div>
          </Stagger>
        </div>

        <figure className="m-0 w-full">
          <div className="g-plate">
            <Suspense fallback={<PlayerSlot aspect="4/3" />}>
              <SignPlayer
                glosses={glosses}
                paused={paused}
                handColors={handColorsFor(theme)}
                onIndexChange={onIndex}
                label={`Landmark animation of the signs ${HERO_SEQUENCE.join(', ')}, from reference video`}
              />
            </Suspense>
          </div>
          {/* Interlinear gloss: sign line on top, free translation under it,
              the way a linguistics paper sets an example. */}
          <figcaption className="mt-5 flex items-start justify-between gap-6">
            <div>
              <p className="g-gloss flex flex-wrap gap-x-[1.1em] text-[clamp(1.25rem,2.2vw,1.75rem)] g-t2">
                {HERO_SEQUENCE.map((g, i) => (
                  <span key={g} className="g-mark" data-on={i === idx}>
                    {g}
                  </span>
                ))}
              </p>
              <p className="mt-2 text-[15px] g-t3">‘Hello, my name is…’</p>
            </div>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Play the signing animation' : 'Pause the signing animation'}
              className="g-mono g-quiet press shrink-0 pt-1.5 text-[13px] underline decoration-[color:var(--g-rule-strong)] underline-offset-4"
            >
              {paused ? 'Play' : 'Pause'}
            </button>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- name speller

const DEMO_NAME = 'ANI';
const MAX_LETTERS = 14;
const clean = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '').slice(0, MAX_LETTERS);

function NameSpeller({ theme }: { theme: Theme }) {
  const [typed, setTyped] = useState('');
  const [spelled, setSpelled] = useState(DEMO_NAME);
  const [run, setRun] = useState(0);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  // Starts once the reader can actually see it, not 120 px early.
  const { ref: stageRef, inView } = useInView<HTMLDivElement>({ threshold: 0.35 });

  // Settle typing before restarting playback, so each keystroke doesn't
  // restart the spelling from the first letter.
  useEffect(() => {
    const next = typed || DEMO_NAME;
    if (next === spelled) return;
    const t = window.setTimeout(() => {
      setSpelled(next);
      setIdx(0);
      setDone(false);
    }, 380);
    return () => window.clearTimeout(t);
  }, [typed, spelled]);

  const letters = useMemo(() => spelled.split(''), [spelled]);
  const onIndex = useCallback((i: number) => setIdx(i), []);
  const onDone = useCallback(() => setDone(true), []);
  const replay = () => {
    setIdx(0);
    setDone(false);
    setRun((r) => r + 1);
  };

  const glyphs = letters.length * 2 - 1;
  const hasMotionLetter = letters.some((l) => l === 'J' || l === 'Z');

  return (
    <section aria-labelledby="g-name-h" className="border-t g-rule py-24 md:py-36">
      <div className={WRAP}>
        <h2 id="g-name-h" className="g-h2 max-w-[18ch]">
          Spell your name.
        </h2>
        <p className="g-lede mt-5">
          Type it and a real reference hand fingerspells it back, one letter at a time.
        </p>

        {/* Player and spelled name sit side by side so the reader sees the
            hand and the highlighted letter together; the form sits under the
            name. Mobile: name, then hand, then form. */}
        <div className="mt-14 grid items-center gap-x-16 gap-y-10 md:mt-20 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-x-24">
          <div ref={stageRef} className="g-plate order-2 w-full max-w-[300px] md:order-1 md:row-span-2 md:self-start">
            <NearView aspect="1/1">
              <SignPlayer
                key={`${spelled}-${run}`}
                glosses={letters}
                aspect="1/1"
                loop={false}
                holdMs={850}
                paused={!inView}
                handColors={handColorsFor(theme)}
                onIndexChange={onIndex}
                onDone={onDone}
                label={`Reference hand fingerspelling ${letters.join('-')}`}
              />
            </NearView>
          </div>

          {/* The typographic moment: the name set as a fingerspelling gloss,
              sized to always fit one line. */}
          <div className="g-spell-wrap order-1 md:order-2" aria-hidden>
            <p className="g-spell g-gloss" style={{ '--glyphs': glyphs } as CSSProperties}>
              {letters.map((l, i) => {
                const state = done || i < idx ? 'past' : i === idx ? 'now' : 'next';
                return (
                  <span key={i}>
                    {i > 0 && <span className="g-t3">-</span>}
                    <span className="g-mark" data-on={state === 'now'} data-state={state}>
                      {l}
                    </span>
                  </span>
                );
              })}
            </p>
          </div>

          <div className="order-3 max-w-[34rem] md:self-start">
            <label htmlFor="g-name" className="block text-[15px] font-medium g-t1">
              Your name
            </label>
            <div className="mt-2 flex items-end gap-6">
              <input
                id="g-name"
                type="text"
                value={typed}
                onChange={(e) => setTyped(clean(e.target.value))}
                placeholder="Type a name"
                autoComplete="given-name"
                autoCapitalize="characters"
                spellCheck={false}
                aria-describedby="g-name-help"
                className="g-input g-gloss min-w-0 flex-1 text-[clamp(1.5rem,2.6vw,2rem)] placeholder:normal-case"
              />
              <button type="button" onClick={replay} className="g-btn press shrink-0 px-4 py-2.5 text-sm">
                Replay
              </button>
            </div>
            <p id="g-name-help" className="mt-3 text-sm g-t3">
              Letters A to Z, up to {MAX_LETTERS}. Anything else is skipped.
              {!typed && ' Showing A-N-I until you type.'}
            </p>
            <p className={'mt-6 text-sm ' + (hasMotionLetter ? 'g-t1' : 'g-t3')}>
              J and Z are drawn in the air. The still shows only their starting handshape.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- how it works

const READOUT_GLOSS = 'MY';
const READOUT_POINTS = 8;
const fmt = (n: number) => (n < 0 ? '−' : '+') + Math.abs(n).toFixed(3);

/** Real numbers from the MY clip: right-hand points 1 to 8, x and y relative to
 *  the wrist. The player beside it drives `paintRef` with the frame it just
 *  drew, so the numbers are that exact frame. Written straight to the DOM; no
 *  React state per frame. */
function FeatureReadout({ paintRef }: { paintRef: RefObject<((frame: number) => void) | null> }) {
  const [clip, setClip] = useState<RefClip | null>(null);
  const [failed, setFailed] = useState(false);
  const cells = useRef<(HTMLSpanElement | null)[]>([]);
  const frameEl = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let off = false;
    loadClip(READOUT_GLOSS)
      .then((c) => !off && setClip(c))
      .catch(() => !off && setFailed(true));
    return () => {
      off = true;
    };
  }, []);

  useEffect(() => {
    if (!clip) return;
    const n = clip.frames.length;
    const need = (READOUT_POINTS + 1) * 2;
    // Seed with the first frame that has a hand, so early empty frames still
    // show real values rather than blanks.
    let last: number[] = [];
    for (let i = 0; i < n && !last.length; i++) {
      const v = frameVector(clip, i);
      if (v.length >= need) last = v;
    }
    const paint = (frame: number) => {
      const v = frameVector(clip, frame);
      if (v.length >= need) last = v;
      if (!last.length) return;
      for (let p = 1; p <= READOUT_POINTS; p++) {
        const x = cells.current[(p - 1) * 2];
        const y = cells.current[(p - 1) * 2 + 1];
        if (x) x.textContent = fmt(last[p * 2] - last[0]);
        if (y) y.textContent = fmt(last[p * 2 + 1] - last[1]);
      }
      if (frameEl.current) frameEl.current.textContent = String(frame + 1).padStart(2, '0');
    };
    // Real values before the player (lazy, below the fold) has drawn anything.
    paint(0);
    paintRef.current = paint;
    return () => {
      paintRef.current = null;
    };
  }, [clip, paintRef]);

  if (failed) {
    return <p className="text-sm g-t3">The sample clip did not load, so there are no numbers to show.</p>;
  }

  const total = clip?.frames.length ?? 0;
  return (
    <div>
      <p className="g-sr">
        Right-hand landmark coordinates from the {READOUT_GLOSS} clip, relative to the wrist, changing every frame.
      </p>
      <div aria-hidden className="g-mono max-w-[20rem] text-[13px] leading-[1.9]">
        <div className="mb-2 grid grid-cols-[2.2rem_1fr_1fr] g-t3">
          <span>pt</span>
          <span className="text-right">x</span>
          <span className="text-right">y</span>
        </div>
        {Array.from({ length: READOUT_POINTS }, (_, i) => (
          <div key={i} className="grid grid-cols-[2.2rem_1fr_1fr] g-t1">
            <span className="g-t3">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-right">
              <span className="g-num" ref={(el) => void (cells.current[i * 2] = el)} />
            </span>
            <span className="text-right">
              <span className="g-num" ref={(el) => void (cells.current[i * 2 + 1] = el)} />
            </span>
          </div>
        ))}
        <p className="mt-3 border-t g-rule pt-3 g-t3">
          frame <span ref={frameEl} className="g-t1">{'  '}</span> of {total || '  '}
        </p>
        <p className="mt-1 g-t3">right hand, from the wrist</p>
      </div>
    </div>
  );
}

function HowItWorks({ theme }: { theme: Theme }) {
  const paintRef = useRef<((frame: number) => void) | null>(null);
  const onFrame = useCallback((frame: number) => paintRef.current?.(frame), []);
  const glosses = useMemo(() => [READOUT_GLOSS], []);
  // Infinite loop beside reading content: WCAG 2.2.2 needs a pause control.
  const [paused, setPaused] = useState(false);
  const [s1, s2, s3, s4] = PIPELINE;

  const step = (s: (typeof PIPELINE)[number], area: string, i: number) => (
    <div key={i} className="g-flow-step" style={{ gridArea: area }}>
      <h3 className="font-display text-[1.35rem] tracking-[-0.015em] g-t1">{s.name}</h3>
      <p className="g-body mt-2 max-w-[28ch] text-[15px]">{s.body}</p>
    </div>
  );

  return (
    <section id="how" aria-labelledby="g-how-h" className="border-t g-rule py-24 md:py-36">
      <div className={WRAP}>
        <h2 id="g-how-h" className="g-h2 max-w-[22ch]">
          What happens between your hands and the text.
        </h2>
        <p className="g-lede mt-5">One reference clip, followed through every stage. All four run inside the page.</p>

        <div className="g-flow mt-16 md:mt-20">
          <div style={{ gridArea: 'vis' }} className="g-plate g-flow-vis">
            <NearView aspect="4/3">
              <SignPlayer
                glosses={glosses}
                paused={paused}
                handColors={handColorsFor(theme)}
                onFrame={onFrame}
                label="Landmark animation of the sign MY"
              />
            </NearView>
          </div>
          <div style={{ gridArea: 'feat' }} className="self-end">
            <FeatureReadout paintRef={paintRef} />
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Play the MY animation' : 'Pause the MY animation'}
              className="g-mono g-quiet press mt-4 text-[13px] underline decoration-[color:var(--g-rule-strong)] underline-offset-4"
            >
              {paused ? 'Play' : 'Pause'}
            </button>
          </div>
          <div style={{ gridArea: 'label' }} className="self-end">
            <p className="g-gloss text-[clamp(3rem,6vw,5rem)] leading-none">
              <span className="g-mark" data-on>
                {READOUT_GLOSS}
              </span>
            </p>
          </div>
          {step(s1, 's1', 0)}
          {step(s2, 's2', 1)}
          {step(s3, 's3', 2)}
          {step(s4, 's4', 3)}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- modes

function Modes() {
  return (
    <section aria-labelledby="g-modes-h" className="border-t g-rule py-24 md:py-36">
      <div className={WRAP}>
        <h2 id="g-modes-h" className="g-h2">
          Three ways in.
        </h2>
        {/* Set as numbered examples, the way a paper cites signed sentences. */}
        <Reveal as="ol" className="mt-16 grid gap-16 md:mt-20 md:gap-20">
          {MODES.map((m, i) => (
            <li
              key={m.id}
              style={{ '--i': i } as CSSProperties}
              className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 gap-y-5 md:grid-cols-[3rem_minmax(0,1.15fr)_minmax(0,1fr)] md:gap-x-8"
            >
              <span className="g-mono pt-1 text-[15px] g-t3" aria-hidden>
                ({i + 1})
              </span>
              <p className="g-gloss flex flex-wrap items-baseline gap-x-[0.9em] gap-y-1 text-[clamp(1.35rem,2.6vw,2.1rem)] leading-tight g-t1">
                {m.sample.map((g) => (
                  <span key={g}>{g}</span>
                ))}
                {m.id === 'sentence' && (
                  <span className="g-blank" role="img" aria-label="blank to fingerspell" />
                )}
              </p>
              <div className="col-start-2 md:col-start-3">
                <h3 className="font-display text-[1.6rem] tracking-[-0.02em] g-t1">{m.name}</h3>
                <p className="g-body mt-2 max-w-[40ch]">{m.body}</p>
              </div>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- honesty

function WhatWorks() {
  return (
    <section aria-labelledby="g-works-h" className="border-t g-rule py-24 md:py-36">
      <div className={WRAP}>
        <h2 id="g-works-h" className="g-h2">
          What works today.
        </h2>
        <div className="mt-14 grid gap-14 md:mt-20 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-end md:gap-16">
          <div>
            <p className="g-display text-[clamp(4.5rem,12vw,9.5rem)] leading-none g-t1">
              <PopNumber value={FACTS.letterAccuracy} />
            </p>
            <p className="g-body mt-5 max-w-[36ch] text-[17px]">
              Fingerspelled letters, all {FACTS.letters} of them, named correctly on a held-out test set.
            </p>
          </div>
          <div>
            <p className="g-display text-[clamp(3rem,6vw,5rem)] leading-none g-t2">
              <PopNumber value={FACTS.wordAccuracy} />
            </p>
            <p className="g-body mt-5 max-w-[36ch] text-[17px]">
              Word signs, all {FACTS.words} of them, on clips kept out of training. {WORD_SIGNS_NOTE}
            </p>
          </div>
        </div>
        <div className="mt-16 max-w-[44rem] border-l-2 g-rule pl-6 md:mt-24">
          <h3 className="text-[17px] font-medium g-t1">{PRIVACY.short}</h3>
          <p className="g-body mt-2">{PRIVACY.long}</p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- close + footer

function Closing() {
  return (
    <section aria-labelledby="g-close-h" className="border-t g-rule py-28 md:py-40">
      <div className={WRAP}>
        <h2 id="g-close-h" className="g-display text-[clamp(3rem,8vw,7rem)]">
          Your turn.
        </h2>
        <p className="g-lede mt-6">Open the app, allow the camera, and fingerspell one letter.</p>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link to={LINKS.app} className="g-btn press px-6 py-3.5 text-base">
            {CTA.primary}
          </Link>
          <Link to={LINKS.login} className="g-link text-[15px]">
            {CTA.signIn}
          </Link>
        </div>
        <div className="mt-16 flex max-w-[40rem] flex-wrap items-baseline gap-x-6 gap-y-2 text-[15px]">
          <p className="g-body">SignSpeak is a research preview, built for a hackathon. If it misreads you, tell us.</p>
          <a href={LINKS.feedback} className="g-link">
            {CTA.feedback}
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t g-rule pb-24 pt-12 text-sm">
      <div className={WRAP + ' grid gap-8 md:grid-cols-[1fr_auto] md:items-start md:gap-16'}>
        <div>
          <p className="font-display text-[1.1rem] tracking-[-0.02em] g-t1">SignSpeak</p>
          <p className="mt-3 max-w-[48ch] leading-relaxed g-t3">
            Research preview. Hand and pose tracking by{' '}
            <a href={LINKS.mediapipe} target="_blank" rel="noreferrer" className="g-link g-t2">
              MediaPipe
            </a>
            . Word clips from{' '}
            <a href={LINKS.wlasl} target="_blank" rel="noreferrer" className="g-link g-t2">
              WLASL
            </a>
            . Letter images from the{' '}
            <a href={LINKS.kaggle} target="_blank" rel="noreferrer" className="g-link g-t2">
              Kaggle ASL Alphabet
            </a>{' '}
            dataset.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-3">
          <Link to={LINKS.app} className="g-quiet">
            {CTA.primary}
          </Link>
          <Link to={LINKS.login} className="g-quiet">
            {CTA.signIn}
          </Link>
          <a href={LINKS.feedback} className="g-quiet">
            {CTA.feedback}
          </a>
        </nav>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------- page

export default function Landing() {
  const [theme, toggle] = useTheme();
  const [returning] = useState(readReturning);

  return (
    <div className="v-gloss min-h-[100dvh]">
      <a href="#main" className="g-skip">
        Skip to content
      </a>
      <TopBar theme={theme} toggle={toggle} returning={returning} />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero theme={theme} />
        <NameSpeller theme={theme} />
        <HowItWorks theme={theme} />
        <Modes />
        <WhatWorks />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}
