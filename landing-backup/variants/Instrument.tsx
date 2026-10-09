import {
  lazy,
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Link } from "react-router-dom";
import { useTheme, type Theme } from "../../ui/theme";
import { TUTORIAL_SEEN_KEY } from "../../ui/tutorial/seenKey";
import { landmarkColors } from "../../ui/tokens";
import {
  CTA,
  FACTS,
  HERO_SEQUENCE,
  LINKS,
  MODES,
  PIPELINE,
  PRIVACY,
  WORD_SIGNS_NOTE,
} from "../content";
import { Chevron, PopNumber, Reveal, Stagger, SwapText } from "../motion";
import { frameVector, loadClip } from "../signClip";
import "./instrument.css";

// Design read: a landing for hackathon judges and Deaf / hard-of-hearing
// reviewers, set as a precision instrument. The landmark stage is the screen;
// every readout around it is computed from the same clip the screen is drawing.
// Dials: VARIANCE 6 / MOTION 5 / DENSITY 5.

const SignPlayer = lazy(() => import("../SignPlayer"));

// ------------------------------------------------------------------ readouts

// Hand landmark indices worth naming (MediaPipe HandLandmarker order).
const NAMED_POINTS = [
  { i: 0, name: "wrist" },
  { i: 4, name: "thumb tip" },
  { i: 8, name: "index tip" },
  { i: 20, name: "pinky tip" },
] as const;

type ClipStats = {
  frames: number;
  sampled: number;
  handPts: number;
  posePts: number;
  hand: "left" | "right" | null;
  points: { name: string; x: number; y: number }[];
};

// Every number the hero prints comes from here. We sample the clip's middle
// frame because that is the frame SignPlayer holds under reduced motion, so the
// readout and the still match exactly for those visitors.
// ponytail: SignPlayer doesn't expose its per-frame index (only per-gloss), so
// the readout is a labelled sample, not a live frame counter. See report.
function useClipStats(gloss: string): ClipStats | null {
  const [stats, setStats] = useState<ClipStats | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadClip(gloss)
      .then((clip) => {
        if (cancelled) return;
        const n = clip.frames.length;
        const mid = Math.floor(n / 2);
        const f = clip.frames[mid];
        const vec = frameVector(clip, mid);
        const hand = f.left ? "left" : f.right ? "right" : null;
        const handCount = (f.left ? 1 : 0) + (f.right ? 1 : 0);
        setStats({
          frames: n,
          sampled: mid + 1,
          handPts: handCount * FACTS.handPoints,
          posePts: f.pose ? FACTS.posePoints : 0,
          hand,
          points: hand
            ? NAMED_POINTS.map((p) => ({
                name: p.name,
                x: vec[p.i * 2],
                y: vec[p.i * 2 + 1],
              }))
            : [],
        });
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [gloss]);
  return stats;
}

const fmt = (v: number) => v.toFixed(3);

// ------------------------------------------------------------------ header

function ThemeSwitch({ theme, toggle }: { theme: Theme; toggle: () => void }) {
  // Two labelled positions instead of a sun/moon icon: it reads as a hardware
  // selector and says what it does.
  return (
    <div className="vi-theme" role="group" aria-label="Color theme">
      {(["light", "dark"] as const).map((t) => (
        <button
          key={t}
          type="button"
          className="vi-theme-opt press"
          aria-pressed={theme === t}
          onClick={() => theme !== t && toggle()}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function Header({ theme, toggle }: { theme: Theme; toggle: () => void }) {
  return (
    <header className="vi-header">
      <div className="vi-wrap vi-header-row">
        <Link to="/" className="vi-wordmark">
          SignSpeak
        </Link>
        <nav aria-label="Primary" className="vi-nav">
          <a href="#how" className="vi-nav-link vi-hide-sm">
            How it works
          </a>
          <Link to={LINKS.login} className="vi-nav-link">
            {CTA.signIn}
          </Link>
          <ThemeSwitch theme={theme} toggle={toggle} />
          <Link
            to={LINKS.app}
            className="vi-btn vi-btn--primary vi-btn--sm press vi-hide-sm"
          >
            {CTA.primary}
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ------------------------------------------------------------------ hero

function ScreenFallback({ square = false }: { square?: boolean }) {
  return (
    <div
      className={"vi-screen-fallback " + (square ? "is-square" : "")}
      aria-hidden
    />
  );
}

function Hero() {
  const [gloss, setGloss] = useState<string>(HERO_SEQUENCE[0]);
  const [paused, setPaused] = useState(false);
  const stats = useClipStats(gloss);
  const handColor =
    stats?.hand === "left" ? landmarkColors.leftHand : landmarkColors.rightHand;

  return (
    <section className="vi-hero" aria-label="Introduction">
      <div className="vi-wrap">
        <div className="vi-panel">
          <div className="vi-hero-copy">
            <Stagger as="h1" className="vi-h1">
              <span className="t-stagger-line">Sign to the camera.</span>
              <span className="t-stagger-line t-stagger-line--2 vi-dim">
                Read it as text.
              </span>
            </Stagger>
            <div className="vi-hero-foot">
              <p className="vi-lede">
                SignSpeak tracks your hands on camera and turns fingerspelling
                and a starter set of word signs into an editable transcript.
              </p>
              <div className="vi-actions">
                <Link to={LINKS.app} className="vi-btn vi-btn--primary press">
                  {CTA.primary}
                </Link>
                <a href="#how" className="vi-textlink t-learn">
                  How it works
                  <Chevron />
                </a>
              </div>
            </div>
          </div>

          <figure className="vi-scope">
            <div className="vi-scope-grid">
              <div className="vi-ruler-y" aria-hidden>
                <span>0.0</span>
                <span>0.5</span>
                <span>1.0</span>
              </div>
              <div className="vi-screen">
                <Suspense fallback={<ScreenFallback />}>
                  <SignPlayer
                    glosses={[...HERO_SEQUENCE]}
                    aspect="4/3"
                    paused={paused}
                    onIndexChange={(_, g) => setGloss(g)}
                    label={`Hand and body landmarks from reference clips of the signs ${HERO_SEQUENCE.join(", ")}, playing in a loop.`}
                  />
                </Suspense>
              </div>
              <div className="vi-ruler-x" aria-hidden>
                <span>1.0</span>
                <span>0.5</span>
                <span>0.0</span>
              </div>
            </div>
            <figcaption className="vi-sr">
              Landmark coordinates are normalized from 0 to 1 across the frame.
              The view is mirrored, so x runs from 1 on the left to 0 on the
              right.
            </figcaption>
          </figure>

          <dl className="vi-readouts">
            <div className="vi-ro vi-ro--gloss">
              <div className="vi-ro-head">
                <dt className="vi-label">gloss</dt>
                <button
                  type="button"
                  className="vi-mini press"
                  aria-pressed={paused}
                  onClick={() => setPaused((p) => !p)}
                >
                  {paused ? "play" : "pause"}
                </button>
              </div>
              <dd>
                <SwapText text={gloss} className="vi-ro-big" />
                <span
                  className="vi-seq"
                  aria-label={`Sequence: ${HERO_SEQUENCE.join(", ")}`}
                >
                  {HERO_SEQUENCE.map((g) => (
                    <span
                      key={g}
                      className={g === gloss ? "is-on" : ""}
                      aria-hidden
                    >
                      {g}
                    </span>
                  ))}
                </span>
              </dd>
            </div>
            <div className="vi-ro">
              <dt className="vi-label">sampled frame</dt>
              <dd>
                <span className="vi-ro-big">
                  {stats ? stats.sampled : "--"}
                  <span className="vi-dim">
                    {" "}
                    / {stats ? stats.frames : "--"}
                  </span>
                </span>
                <span className="vi-ro-sub">middle of the clip</span>
              </dd>
            </div>
            <div className="vi-ro">
              <dt className="vi-label">points tracked</dt>
              <dd>
                <span className="vi-ro-big">
                  {stats ? stats.handPts + stats.posePts : "--"}
                </span>
                <span className="vi-ro-sub">
                  {stats
                    ? `${stats.handPts} hand, ${stats.posePts} body`
                    : "loading"}
                </span>
              </dd>
            </div>
            <div className="vi-ro vi-ro--vec">
              <dt className="vi-label">
                landmarks x, y
                {stats?.hand && (
                  <span
                    className="vi-swatch"
                    style={{ background: handColor }}
                    aria-hidden
                  />
                )}
                <span className="vi-sr">
                  {stats?.hand ? `, ${stats.hand} hand` : ""}
                </span>
              </dt>
              <dd>
                {stats && stats.points.length ? (
                  <table className="vi-vec">
                    <tbody>
                      {stats.points.map((p) => (
                        <tr key={p.name}>
                          <th scope="row">{p.name}</th>
                          <td>{fmt(p.x)}</td>
                          <td>{fmt(p.y)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <span className="vi-ro-sub">
                    {stats ? "no hand in this frame" : "loading"}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ speller

const DEMO = "HELLO";
const MAX_LETTERS = 14;
const clean = (s: string) =>
  s
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, MAX_LETTERS);

function Speller() {
  const inputId = useId();
  const helpId = useId();
  const [value, setValue] = useState("");
  const [word, setWord] = useState("");
  const [run, setRun] = useState(0);
  const [active, setActive] = useState(0);
  const [done, setDone] = useState(false);

  // Commit typing after a short pause so the player doesn't restart on every
  // keystroke. The Spell button commits immediately.
  useEffect(() => {
    const t = window.setTimeout(() => setWord(value), 450);
    return () => window.clearTimeout(t);
  }, [value]);

  useEffect(() => {
    setActive(0);
    setDone(false);
  }, [word, run]);

  const shown = word || DEMO;
  const letters = shown.split("");

  return (
    <section className="vi-speller" aria-labelledby="speller-title">
      <div className="vi-wrap">
        <div className="vi-speller-grid">
          <div className="vi-speller-controls">
            <h2 id="speller-title" className="vi-h2">
              Fingerspell your name.
            </h2>
            <p className="vi-body">
              Each letter plays as a reference handshape from the alphabet set,
              in order, the way you would spell it to someone.
            </p>

            <form
              className="vi-field"
              onSubmit={(e) => {
                e.preventDefault();
                setWord(value);
                setRun((r) => r + 1);
              }}
            >
              <label htmlFor={inputId} className="vi-field-label">
                Your name
              </label>
              <div className="vi-field-row">
                <input
                  id={inputId}
                  className="vi-input"
                  value={value}
                  onChange={(e) => setValue(clean(e.target.value))}
                  maxLength={MAX_LETTERS}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="HELLO"
                  aria-describedby={helpId}
                />
                <button type="submit" className="vi-btn vi-btn--primary press">
                  Spell
                </button>
              </div>
              <p id={helpId} className="vi-help">
                Letters A to Z, up to {MAX_LETTERS}. Anything else is skipped.
              </p>
            </form>

            <p
              className={
                "vi-note " +
                (!done && (letters[active] === "J" || letters[active] === "Z")
                  ? "is-on"
                  : "")
              }
            >
              J and Z are drawn in the air. A still can only show where they
              start, so that is what you see for those two.
            </p>
          </div>

          <div className="vi-speller-display">
            <div className="vi-tape" aria-hidden>
              {Array.from({ length: MAX_LETTERS }, (_, i) => (
                <span
                  key={i}
                  className={
                    "vi-tape-cell " +
                    (i >= letters.length
                      ? "is-empty"
                      : i === active && !done
                        ? "is-on"
                        : i < active || done
                          ? "is-past"
                          : "")
                  }
                >
                  {letters[i] ?? ""}
                </span>
              ))}
            </div>
            <div className="vi-screen vi-screen--square">
              <Suspense fallback={<ScreenFallback square />}>
                <SignPlayer
                  key={run}
                  glosses={letters}
                  aspect="1/1"
                  loop={false}
                  holdMs={750}
                  onIndexChange={(i) => setActive(i)}
                  onDone={() => setDone(true)}
                  label={`Handshapes spelling ${shown}, one letter at a time.`}
                />
              </Suspense>
            </div>
            <div className="vi-speller-status">
              <span className="vi-label">
                {!word
                  ? "demo word, type to replace it"
                  : done
                    ? "done"
                    : "spelling"}
              </span>
              <button
                type="button"
                className="vi-mini press"
                onClick={() => setRun((r) => r + 1)}
              >
                replay
              </button>
            </div>
            <p className="vi-sr" aria-live="polite">
              {word ? `Spelling ${word.split("").join(" ")}` : ""}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ how it works

function How() {
  return (
    <section id="how" className="vi-how" aria-labelledby="how-title">
      <div className="vi-wrap">
        <h2 id="how-title" className="vi-h2">
          From camera frame to label, inside the tab.
        </h2>
        <Reveal as="ol" className="vi-chain">
          {PIPELINE.map((s, i) => (
            <li
              key={s.id}
              className="vi-stage"
              style={{ ["--i" as string]: i }}
            >
              <span className="vi-stage-io" aria-hidden>
                {i === 0 ? "in" : "→"}
              </span>
              <h3 className="vi-h3">{s.name}</h3>
              <p className="vi-body">{s.body}</p>
              {s.id === "encode" && (
                <p className="vi-formula">
                  2 hands × {FACTS.handPoints} points × 3 coords ={" "}
                  <b>{FACTS.featureDims}</b>
                </p>
              )}
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ honesty

function Honest() {
  return (
    <section className="vi-honest" aria-labelledby="honest-title">
      <div className="vi-wrap">
        <h2 id="honest-title" className="vi-h2">
          What works, and what doesn&rsquo;t yet.
        </h2>
        <p className="vi-body vi-measure">
          Two recognizers with very different track records. Both numbers are
          accuracy on examples the model never trained on.
        </p>

        <div className="vi-cal">
          <article className="vi-cal-main">
            <p className="vi-status">Reliable</p>
            <p className="vi-figure">
              <PopNumber value={FACTS.letterAccuracy} />
            </p>
            <h3 className="vi-h3">Fingerspelled letters</h3>
            <p className="vi-body">
              All {FACTS.letters} letters of the ASL alphabet, measured on a
              held-out split of the Kaggle ASL Alphabet images. This is the path
              to use for names and anything not in the word list.
            </p>
          </article>

          <article className="vi-cal-main vi-cal-main--early">
            <p className="vi-status vi-status--early">Early</p>
            <p className="vi-figure">
              <PopNumber value={FACTS.wordAccuracy} />
            </p>
            <h3 className="vi-h3">Word signs, {FACTS.words} of them</h3>
            <p className="vi-body">{WORD_SIGNS_NOTE}</p>
            <p className="vi-body vi-small">
              Measured after removing duplicate clips. An earlier, higher score
              was inflated by those duplicates and has been withdrawn.
            </p>
          </article>

          <div className="vi-cal-aside">
            <div className="vi-spec">
              <p className="vi-spec-n">
                <PopNumber value={String(FACTS.referenceClips)} />
              </p>
              <p className="vi-spec-l">
                reference clips, the source of every landmark figure on this
                page
              </p>
            </div>
            <div className="vi-spec">
              <p className="vi-spec-n">
                <PopNumber value={String(FACTS.handPoints)} />
                <span className="vi-dim"> / </span>
                <PopNumber value={String(FACTS.posePoints)} />
              </p>
              <p className="vi-spec-l">landmarks per hand / for the body</p>
            </div>
            <div className="vi-spec">
              <p className="vi-spec-n">
                <PopNumber value={String(FACTS.featureDims)} />
              </p>
              <p className="vi-spec-l">
                numbers per frame reach the classifier
              </p>
            </div>
          </div>
        </div>

        <div className="vi-privacy">
          <h3 className="vi-h3">{PRIVACY.short}</h3>
          <div className="vi-privacy-cols">
            <div>
              <p className="vi-label">stays in the tab</p>
              <p className="vi-body">
                Camera video, hand tracking and recognition. Video is never
                uploaded.
              </p>
            </div>
            <div>
              <p className="vi-label">leaves only if you press Translate</p>
              <p className="vi-body">
                The recognized words, as text, sent to a language model. Nothing
                else.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ modes

function Modes() {
  const [sel, setSel] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const mode = MODES[sel];

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = MODES.length - 1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? sel === last
          ? 0
          : sel + 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? sel === 0
            ? last
            : sel - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    setSel(next);
    tabs.current[next]?.focus();
  };

  return (
    <section className="vi-modes" aria-labelledby="modes-title">
      <div className="vi-wrap">
        <div className="vi-modes-grid">
          <div>
            <h2 id="modes-title" className="vi-h2">
              Three ways to use it.
            </h2>
            <div
              className="vi-selector"
              role="tablist"
              aria-label="Modes"
              aria-orientation="vertical"
              onKeyDown={onKey}
            >
              {MODES.map((m, i) => (
                <button
                  key={m.id}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  id={`${baseId}-tab-${m.id}`}
                  role="tab"
                  type="button"
                  aria-selected={i === sel}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={i === sel ? 0 : -1}
                  className="vi-selector-opt"
                  onClick={() => setSel(i)}
                >
                  <span className="vi-selector-pos" aria-hidden />
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div
            id={`${baseId}-panel`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${mode.id}`}
            className="vi-mode-panel"
            tabIndex={0}
          >
            <div key={mode.id} className="vi-mode-body">
              <h3 className="vi-h3 vi-mode-name">{mode.name}</h3>
              <p className="vi-body vi-mode-text">{mode.body}</p>
              <p className="vi-label">example gloss</p>
              <p className="vi-gloss-line">
                {mode.sample.map((g, i) => (
                  <span key={i}>{g}</span>
                ))}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ close

function Close() {
  return (
    <section className="vi-close" aria-labelledby="close-title">
      <div className="vi-wrap vi-close-grid">
        <h2 id="close-title" className="vi-h1 vi-close-title">
          Try it with your own hands.
        </h2>
        <div className="vi-close-side">
          <p className="vi-body">
            It runs in a browser tab with a webcam. No install. SignSpeak is a
            research preview built for a hackathon, so tell us what it gets
            wrong.
          </p>
          <div className="vi-actions">
            <Link to={LINKS.app} className="vi-btn vi-btn--primary press">
              {CTA.primary}
            </Link>
            <a href={LINKS.feedback} className="vi-textlink t-learn">
              {CTA.feedback}
              <Chevron />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="vi-footer">
      <div className="vi-wrap vi-footer-grid">
        <p className="vi-wordmark">SignSpeak</p>
        <nav aria-label="Footer" className="vi-footer-links">
          <Link to={LINKS.app}>{CTA.primary}</Link>
          <Link to={LINKS.login}>{CTA.signIn}</Link>
          <a href={LINKS.feedback}>{CTA.feedback}</a>
        </nav>
        <p className="vi-credits">
          Hand and pose tracking by{" "}
          <a href={LINKS.mediapipe} target="_blank" rel="noreferrer">
            MediaPipe
          </a>
          . Word clips from{" "}
          <a href={LINKS.wlasl} target="_blank" rel="noreferrer">
            WLASL
          </a>
          . Letter images from the{" "}
          <a href={LINKS.kaggle} target="_blank" rel="noreferrer">
            Kaggle ASL Alphabet
          </a>{" "}
          set. Research preview, no warranty.
        </p>
      </div>
    </footer>
  );
}

// ------------------------------------------------------------------ page

function useReturning(): boolean {
  const [returning] = useState(() => {
    try {
      return !!window.localStorage.getItem(TUTORIAL_SEEN_KEY);
    } catch {
      return false;
    }
  });
  return returning;
}

export default function Instrument() {
  const [theme, toggle] = useTheme();
  const returning = useReturning();

  return (
    <div className="v-instrument">
      <a href="#main" className="vi-skip">
        Skip to content
      </a>
      <Header theme={theme} toggle={toggle} />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Speller />
        <How />
        <Honest />
        <Modes />
        <Close />
      </main>
      <Footer />
      {returning && (
        <Link to={LINKS.app} className="vi-resume press">
          Welcome back, resume
        </Link>
      )}
    </div>
  );
}
