import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { TUTORIAL_SEEN_KEY } from '../../ui/tutorial/seenKey';
import { useTheme, type Theme } from '../../ui/theme';
import { landmarkColors } from '../../ui/tokens';
import { CTA, FACTS, HERO_SEQUENCE, LINKS, MODES, PIPELINE, PRIVACY, WORD_SIGNS_NOTE } from '../content';
import { Chevron, PopNumber, Reveal, Stagger, SwapText } from '../motion';
import { useInView } from '../useInView';
import './hands.css';

// Hands: the page is something you do before it is something you read. The
// name speller is the hero, the alphabet is a specimen sheet you can play, and
// everything else is short and honest.

// ponytail: SignPlayer and signClip both pull in MediaPipe DrawingUtils, so
// they are only ever reached through dynamic import.
const SignPlayer = lazy(() => import('../SignPlayer'));
const clipModule = () => import('../signClip');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const MOTION_LETTERS = new Set(['J', 'Z']);
const DEMO = 'HELLO';
const MAX_LETTERS = 14;

const toLetters = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '').slice(0, MAX_LETTERS);

function StageFallback({ aspect }: { aspect: '1/1' | '4/3' }) {
  return (
    <div
      aria-hidden
      className={'stage-fallback ' + (aspect === '1/1' ? 'aspect-square' : 'aspect-[4/3]')}
    />
  );
}

// ------- nav ---------------------------------------------------------------

function ThemeSwitch({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <div className="theme" role="group" aria-label="Colour theme">
      {(['light', 'dark'] as const).map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={theme === t}
          onClick={() => theme !== t && onToggle()}
        >
          {t === 'light' ? 'Light' : 'Dark'}
        </button>
      ))}
    </div>
  );
}

function Nav({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <header className="nav">
      <nav className="wrap nav-row" aria-label="Main">
        <Link to="/" className="wordmark">SignSpeak</Link>
        <a href="#alphabet" className="nav-link nav-hide-sm">Alphabet</a>
        <a href="#how" className="nav-link nav-hide-sm">How it works</a>
        <Link to={LINKS.login} className="nav-link nav-hide-sm">{CTA.signIn}</Link>
        <Link to={LINKS.app} className="btn btn-primary btn-sm press nav-hide-sm">{CTA.primary}</Link>
        <ThemeSwitch theme={theme} onToggle={onToggle} />
      </nav>
    </header>
  );
}

// ------- hero: fingerspell your name ---------------------------------------

type PlayState = 'playing' | 'paused' | 'done';

function NameSpeller({ returning }: { returning: boolean }) {
  const [value, setValue] = useState('');
  const typed = toLetters(value);
  // Debounced so the player waits for a pause in typing instead of restarting
  // on every keystroke.
  const [spelled, setSpelled] = useState(DEMO);
  const [run, setRun] = useState(0);
  const [idx, setIdx] = useState(0);
  const [state, setState] = useState<PlayState>('playing');

  useEffect(() => {
    const next = typed || DEMO;
    if (next === spelled) return;
    const t = window.setTimeout(() => {
      setSpelled(next);
      setIdx(0);
      setState('playing');
    }, 320);
    return () => window.clearTimeout(t);
  }, [typed, spelled]);

  const letters = useMemo(() => spelled.split(''), [spelled]);
  const onIndex = useCallback((i: number) => setIdx(i), []);
  const onDone = useCallback(() => setState('done'), []);
  const replay = () => {
    setIdx(0);
    setState('playing');
    setRun((r) => r + 1);
  };

  const rawLetterCount = value.toUpperCase().replace(/[^A-Z]/g, '').length;
  let hint: ReactNode = (
    <>
      Letters A to Z, up to {MAX_LETTERS}. <strong>J and Z</strong> are drawn in the air, so their
      still shows the starting handshape.
    </>
  );
  if (value.trim() && !typed) hint = <>No letters yet, so this is still spelling {DEMO}. Try A to Z.</>;
  else if (rawLetterCount > MAX_LETTERS) hint = <>Spelling the first {MAX_LETTERS} letters.</>;

  const current = letters[idx] ?? letters[0];
  const status =
    state === 'done'
      ? `Done. ${letters.length} letters.`
      : state === 'paused'
        ? `Paused on ${current}, ${idx + 1} of ${letters.length}`
        : MOTION_LETTERS.has(current)
          ? `${current} moves. This is where it starts.`
          : `${idx + 1} of ${letters.length}`;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap hero-grid">
        <div>
          {returning && (
            <Link to={LINKS.app} className="resume">
              Welcome back, resume <span aria-hidden>→</span>
            </Link>
          )}
          <Stagger as="h1" className="display">
            <span id="hero-title">
              <span className="t-stagger-line">Type your name.</span>
              <span className="t-stagger-line t-stagger-line--2">See it signed.</span>
            </span>
          </Stagger>
          <p className="hero-sub fade-in fade-in-delay-2">
            SignSpeak turns ASL from your webcam into text you can edit. Start with the letters of
            your name.
          </p>

          <div className="field fade-in fade-in-delay-3">
            <label htmlFor="name-input">Your name</label>
            <input
              id="name-input"
              type="text"
              inputMode="text"
              autoComplete="given-name"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={32}
              placeholder="e.g. Priya"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-describedby="name-hint"
            />
            <p id="name-hint" className="hint">{hint}</p>
          </div>

          <div className="cta-row fade-in fade-in-delay-3">
            <Link to={LINKS.app} className="btn btn-primary press">{CTA.primary}</Link>
            <a href="#how" className="t-learn link" style={{ textDecoration: 'none' }}>
              How it works <Chevron />
            </a>
          </div>
        </div>

        <figure className="speller m-0">
          <div className="stage">
            <Suspense fallback={<StageFallback aspect="1/1" />}>
              <SignPlayer
                key={run}
                glosses={letters}
                aspect="1/1"
                loop={false}
                holdMs={800}
                paused={state === 'paused'}
                onIndexChange={onIndex}
                onDone={onDone}
                label={`Hand landmarks fingerspelling ${spelled}, one handshape per letter`}
              />
            </Suspense>
          </div>
          <div className="strip" aria-hidden>
            <ol style={{ '--n': Math.max(letters.length, 5) } as CSSProperties}>
              {letters.map((l, i) => (
                <li
                  key={`${spelled}-${i}`}
                  data-state={state === 'done' || i < idx ? 'past' : i === idx ? 'now' : 'next'}
                >
                  {l}
                </li>
              ))}
            </ol>
          </div>
          <p className="sr-only" aria-live="polite">
            {typed ? `Spelling ${typed.split('').join(' ')}` : ''}
          </p>
          <figcaption className="speller-bar">
            <span className="speller-status mono">{status}</span>
            <span className="speller-controls">
              {state !== 'done' && (
                <button
                  type="button"
                  className="btn btn-quiet btn-sm press"
                  onClick={() => setState((s) => (s === 'paused' ? 'playing' : 'paused'))}
                >
                  {state === 'paused' ? 'Resume' : 'Pause'}
                </button>
              )}
              <button type="button" className="btn btn-quiet btn-sm press" onClick={replay}>
                Replay
              </button>
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

// ------- alphabet specimen --------------------------------------------------

function Alphabet() {
  const [selected, setSelected] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const shown = ALPHABET[hover ?? selected];
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const { ref, inView } = useInView<HTMLElement>({ rootMargin: '400px 0px 400px 0px', threshold: 0 });

  // Warm the cache as the section approaches, so the first hover is instant.
  useEffect(() => {
    if (!inView) return;
    clipModule().then((m) => ALPHABET.forEach((l) => m.loadClip(l).catch(() => {})));
  }, [inView]);

  const move = (to: number) => {
    const n = (to + ALPHABET.length) % ALPHABET.length;
    setSelected(n);
    cells.current[n]?.focus();
  };

  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    let to: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = i + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = i - 1;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = ALPHABET.length - 1;
    else if (/^[a-z]$/i.test(e.key)) to = e.key.toUpperCase().charCodeAt(0) - 65;
    if (to === null) return;
    e.preventDefault();
    move(to);
  };

  const moves = MOTION_LETTERS.has(shown);

  return (
    <section ref={ref} id="alphabet" className="section" aria-labelledby="abc-title">
      <div className="wrap">
        <h2 id="abc-title" className="display h2">All 26 letters, one hand each.</h2>
        <p className="lede">
          Point at a letter, or tab in and use the arrow keys. Each one is a real handshape
          traced from a photo, mirrored so you can copy it.
        </p>

        <div
          className="abc"
          role="radiogroup"
          aria-labelledby="abc-title"
          onMouseLeave={() => setHover(null)}
        >
          <div className="abc-stage" aria-hidden>
            <div className="abc-canvas">
              <Suspense fallback={<StageFallback aspect="1/1" />}>
                <SignPlayer glosses={[shown]} aspect="1/1" loop={false} />
              </Suspense>
            </div>
            <div>
              <p className="abc-glyph">{shown}</p>
              <p className="abc-note">
                {moves ? 'Moves. The still is where it starts.' : 'Right hand, mirrored.'}
              </p>
            </div>
          </div>

          {ALPHABET.map((l, i) => {
            const isMotion = MOTION_LETTERS.has(l);
            return (
              <button
                key={l}
                ref={(el) => {
                  cells.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={selected === i}
                aria-label={isMotion ? `${l}, a moving letter: shows its starting handshape` : l}
                tabIndex={selected === i ? 0 : -1}
                data-motion={isMotion}
                className="cell press"
                onClick={() => setSelected(i)}
                onFocus={() => setSelected(i)}
                onMouseEnter={() => setHover(i)}
                onKeyDown={(e) => onKey(e, i)}
              >
                {isMotion && <span className="moves" aria-hidden>moves</span>}
                {!isMotion && <span className="lc" aria-hidden>{l.toLowerCase()}</span>}
                {l}
              </button>
            );
          })}
        </div>
        <p className="abc-help">
          Keyboard: <kbd>←</kbd> <kbd>→</kbd> to step, or type any letter to jump to it.
        </p>
      </div>
    </section>
  );
}

// ------- how it works --------------------------------------------------------

function FeatureReadout() {
  const [nums, setNums] = useState<number[] | null>(null);
  const [failed, setFailed] = useState(false);
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0 });

  useEffect(() => {
    if (!inView) return;
    let off = false;
    clipModule()
      .then(async (m) => {
        const clip = await m.loadClip(HERO_SEQUENCE[0]);
        return m.frameVector(clip, Math.floor(clip.frames.length / 2));
      })
      .then((v) => !off && (v.length >= 6 ? setNums(v.slice(0, 6)) : setFailed(true)))
      .catch(() => !off && setFailed(true));
    return () => {
      off = true;
    };
  }, [inView]);

  if (failed) return null;
  const pairs = nums
    ? [0, 2, 4].map((k) => `(${nums[k].toFixed(3)}, ${nums[k + 1].toFixed(3)})`).join(' ')
    : null;
  return (
    <div ref={ref} className="vec">
      {pairs ? <code className="mono">{pairs}</code> : <span className="vec-skel" aria-hidden />}
      Three points from the middle frame of {HERO_SEQUENCE[0]}, as raw x and y before anchoring.
    </div>
  );
}

function How() {
  const [gloss, setGloss] = useState<string>(HERO_SEQUENCE[0]);
  const onIndex = useCallback((_: number, g: string) => setGloss(g), []);
  return (
    <section id="how" className="section" aria-labelledby="how-title" style={{ background: 'var(--surface)' }}>
      <div className="wrap">
        <h2 id="how-title" className="display h2">How a sign becomes a word.</h2>
        <div className="how-grid">
          <figure className="m-0">
            <div className="stage">
              <Suspense fallback={<StageFallback aspect="4/3" />}>
                <SignPlayer
                  glosses={[...HERO_SEQUENCE]}
                  aspect="4/3"
                  onIndexChange={onIndex}
                  label={`Reference clips of ${HERO_SEQUENCE.join(', ')}, body and both hands as landmarks`}
                />
              </Suspense>
            </div>
            <figcaption className="how-caption">
              <span className="how-gloss" aria-hidden>
                <SwapText text={gloss} />
              </span>
              <span className="legend">
                <span><i style={{ background: landmarkColors.leftHand }} />Left hand</span>
                <span><i style={{ background: landmarkColors.rightHand }} />Right hand</span>
                <span><i style={{ background: landmarkColors.pose }} />Body</span>
              </span>
            </figcaption>
          </figure>

          <ol className="steps">
            {PIPELINE.map((s) => (
              <li key={s.id}>
                <h3>{s.name}</h3>
                <p>{s.body}</p>
                {s.id === 'encode' && <FeatureReadout />}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

// ------- modes ----------------------------------------------------------------

function Modes() {
  const [transcribe, practice, sentence] = MODES;
  const [w1, w2, w3, fs] = transcribe.sample;
  return (
    <section className="section" aria-labelledby="modes-title">
      <div className="wrap">
        <h2 id="modes-title" className="display h2">Three ways in.</h2>
        <Reveal className="modes">
          <article className="mode mode-main" style={{ '--i': 0 } as CSSProperties}>
            <div>
              <h3>{transcribe.name}</h3>
              <p>{transcribe.body}</p>
            </div>
            <p className="transcript" aria-label={`Example transcript: ${transcribe.sample.join(' ')}`}>
              <span aria-hidden>
                {w1} {w2} {w3} <span className="fs">{fs}</span>
                <span className="caret" />
              </span>
            </p>
          </article>
          <article className="mode mode-practice" style={{ '--i': 1 } as CSSProperties}>
            <h3>{practice.name}</h3>
            <p>{practice.body}</p>
            <p className="sample">
              <span className="muted">Target</span>
              {practice.sample[0]}
            </p>
          </article>
          <article className="mode mode-sentence" style={{ '--i': 2 } as CSSProperties}>
            <h3>{sentence.name}</h3>
            <p>{sentence.body}</p>
            <p className="sample" aria-label={`Example phrase: ${sentence.sample.join(' ')}, then your fingerspelled name`}>
              <span aria-hidden>{sentence.sample.join(' ')}</span>
              <span className="blank" aria-hidden />
            </p>
          </article>
        </Reveal>
      </div>
    </section>
  );
}

// ------- honest note --------------------------------------------------------------

function Honest() {
  return (
    <section className="section" aria-labelledby="honest-title" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <h2 id="honest-title" className="display h2">What works today, and what is still early.</h2>
        <div className="ledger">
          <div>
            <p className="figure"><PopNumber value={FACTS.letterAccuracy} /></p>
            <p className="figure-label">Fingerspelling, all {FACTS.letters} letters</p>
            <p className="figure-body">
              Accuracy on held-out images from the Kaggle ASL Alphabet set. This is the reliable path.
            </p>
          </div>
          <div>
            <p className="figure figure-quiet"><PopNumber value={FACTS.wordAccuracy} /></p>
            <p className="figure-label">Word signs, {FACTS.words} so far</p>
            <p className="figure-body">
              Measured on a deduplicated test split. {WORD_SIGNS_NOTE}
            </p>
          </div>
        </div>
        <div className="privacy">
          <h3>{PRIVACY.short}</h3>
          <p>{PRIVACY.long}</p>
        </div>
      </div>
    </section>
  );
}

// ------- closing + footer ------------------------------------------------------------

function Closing() {
  return (
    <section className="wrap" aria-labelledby="closing-title">
      <div className="closing">
        <h2 id="closing-title" className="display">Now try it with your own hands.</h2>
        <p className="lede">Open the app, allow the camera, and fingerspell your name back to it.</p>
        <div className="cta-row">
          <Link to={LINKS.app} className="btn btn-invert press">{CTA.primary}</Link>
          <Link to={LINKS.login} className="link">{CTA.signIn}</Link>
        </div>
        <p className="preview-note">
          SignSpeak is a research preview built for a hackathon. If it misreads you, or gets
          something about ASL wrong, please tell us.{' '}
          <a href={LINKS.feedback} className="link">{CTA.feedback}</a>
        </p>
      </div>
    </section>
  );
}

function Footer() {
  const ext = { target: '_blank', rel: 'noreferrer', className: 'link' } as const;
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div>
          <p className="wordmark" style={{ color: 'var(--ink)' }}>SignSpeak</p>
          <p className="mt-3 max-w-[56ch]">
            Hand and pose tracking by <a href={LINKS.mediapipe} {...ext}>MediaPipe</a>. Word clips from{' '}
            <a href={LINKS.wlasl} {...ext}>WLASL</a>. Letter images from the{' '}
            <a href={LINKS.kaggle} {...ext}>Kaggle ASL Alphabet</a> dataset.
          </p>
          <p className="mt-2">Research preview. No warranty.</p>
        </div>
        <nav aria-label="Footer">
          <Link to={LINKS.app} className="link">{CTA.primary}</Link>
          <Link to={LINKS.login} className="link">{CTA.signIn}</Link>
          <a href={LINKS.feedback} className="link">{CTA.feedback}</a>
        </nav>
      </div>
    </footer>
  );
}

// ------- page --------------------------------------------------------------------------

function readReturning(): boolean {
  try {
    return !!window.localStorage.getItem(TUTORIAL_SEEN_KEY);
  } catch {
    return false;
  }
}

export default function Hands() {
  const [theme, toggle] = useTheme();
  const [returning] = useState(readReturning);
  return (
    <div className="v-hands">
      <a href="#main" className="skip">Skip to content</a>
      <Nav theme={theme} onToggle={toggle} />
      <main id="main" tabIndex={-1} className="outline-none">
        <NameSpeller returning={returning} />
        <Alphabet />
        <How />
        <Modes />
        <Honest />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}
