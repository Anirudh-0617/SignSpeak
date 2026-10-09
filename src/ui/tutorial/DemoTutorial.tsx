import { memo, useEffect, useRef, useState } from "react";
import { CameraView } from "../CameraView";
import { ReferenceSkeleton } from "../practice/ReferenceSkeleton";
import { ConfidenceBar } from "../practice/ConfidenceBar";
import { useLiveLetter } from "../../recognition/useLiveLetter";
import { Alert } from "../Alert";
import { Spinner } from "../Spinner";
import { TUTORIAL_SEEN_KEY } from "./seenKey";

// ponytail: lower thresholds than practice-mode default (0.4 / 600ms). This
// path is for judges/first-timers — reward the attempt fast. If tutorials feel
// too easy after a few days of judging, bump both toward practice defaults.
const TUTORIAL_PASS_CONFIDENCE = 0.35;
const TUTORIAL_DWELL_MS = 400;

const STEPS: { gloss: string; hint: string }[] = [
  {
    gloss: "HELLO",
    hint: "Flat hand at your forehead, then out, like a salute.",
  },
  {
    gloss: "THANK-YOU",
    hint: "Fingertips on your chin, then forward toward the camera.",
  },
  {
    gloss: "YES",
    hint: "Make a fist and nod it up and down, like a head nod.",
  },
];

type Props = {
  onExit: () => void;
  onSwitchToSentence: () => void;
};

function StageLabel({ children }: { children: string }) {
  return <span className="g-gloss text-[11px] text-ink-3">{children}</span>;
}

function StepView({
  gloss,
  hint,
  onPass,
  onSkip,
}: {
  gloss: string;
  hint: string;
  onPass: () => void;
  onSkip: () => void;
}) {
  const live = useLiveLetter("words", true);
  const dwellStartRef = useRef(0);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    if (passed) return;
    const top = live.topK[0];
    const now = performance.now();
    if (
      top &&
      top.label === gloss &&
      top.confidence >= TUTORIAL_PASS_CONFIDENCE
    ) {
      if (dwellStartRef.current === 0) dwellStartRef.current = now;
      if (now - dwellStartRef.current >= TUTORIAL_DWELL_MS) {
        setPassed(true);
        setTimeout(onPass, 700);
      }
    } else {
      dwellStartRef.current = 0;
    }
  }, [live.topK, gloss, onPass, passed]);

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="font-display text-3xl tracking-[-0.03em] sm:text-4xl">
          Sign {gloss}
        </h1>
        <p className="max-w-prose text-ink-2">
          Copy the reference figure with your hands. The camera shows what the
          app sees. {hint}
        </p>
      </div>
      {/* Reference gets the bigger share: it is what a non-signer is copying. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-2">
          <StageLabel>Reference</StageLabel>
          <ReferenceSkeleton gloss={gloss} />
        </div>
        <div className="grid content-start gap-2">
          <StageLabel>You</StageLabel>
          <CameraView onFrame={live.handleFrame} />
        </div>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 border-t border-rule pt-4">
        <div className="grid min-w-0 flex-1 gap-3">
          {passed ? (
            <p role="status" className="flex flex-wrap items-baseline gap-x-3">
              <span className="g-gloss text-xl text-ink">
                {gloss} <span aria-hidden="true">!</span>
              </span>
              <span className="text-sm text-ink-2">
                Recognized. Loading the next sign.
              </span>
            </p>
          ) : live.status === "loading" ? (
            <Spinner label="Loading the word model" />
          ) : live.status === "error" ? (
            <Alert
              title="Model failed to load"
              body={live.error ?? undefined}
              action={{
                label: "Retry",
                onClick: () => window.location.reload(),
              }}
            />
          ) : !live.handsPresent ? (
            <p role="status" className="text-sm text-ink-2">
              Show your hands to the camera. Dots appear on your fingers when it
              sees them.
            </p>
          ) : (
            <p className="text-sm text-ink-3">Hold the sign briefly.</p>
          )}
          {live.status === "ready" && !passed && (
            <ConfidenceBar topK={live.topK} target={gloss} />
          )}
        </div>
        {!passed && (
          <button
            type="button"
            onClick={onSkip}
            className="g-ghost press px-3 py-1.5 text-sm"
          >
            Skip this sign
          </button>
        )}
      </div>
    </div>
  );
}

// The three targets as one gloss line. Spans persist across steps, so on
// advance the highlighter wipes off one gloss and draws on the next.
function StepLine({ step, results }: { step: number; results: boolean[] }) {
  const current = step - 1;
  return (
    <p className="g-gloss flex flex-wrap items-baseline gap-x-5 gap-y-1 text-lg sm:text-xl">
      {STEPS.map((s, i) => {
        const isDone = i < current;
        const isActive = i === current;
        const passed = results[i] === true;
        return (
          <span
            key={s.gloss}
            className={
              isDone
                ? passed
                  ? "text-ink"
                  : "text-ink-2"
                : isActive
                  ? ""
                  : "text-ink-3"
            }
          >
            <span className="g-mark" data-on={isActive}>
              {s.gloss}
            </span>
            {isDone && passed && <span aria-hidden="true"> !</span>}
            {isDone && (
              <span className="sr-only">
                {passed ? ", passed" : ", skipped"}
              </span>
            )}
          </span>
        );
      })}
    </p>
  );
}

function DemoTutorialImpl({ onExit, onSwitchToSentence }: Props) {
  // 0 = welcome, 1..STEPS.length = steps, STEPS.length + 1 = celebration
  const [step, setStep] = useState(0);
  // Display-only: which steps were recognized (true) vs skipped.
  const [results, setResults] = useState<boolean[]>([]);
  const total = STEPS.length;
  const advance = () => setStep((s) => s + 1);
  const pass = () => {
    setResults((r) => {
      const next = [...r];
      next[step - 1] = true;
      return next;
    });
    advance();
  };

  const finish = () => {
    localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
    onExit();
  };

  const goSentence = () => {
    localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
    onSwitchToSentence();
  };

  const inSteps = step >= 1 && step <= total;

  return (
    <section className="grid w-full gap-6" aria-label="Demo tutorial">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-rule pb-4">
        <StepLine step={step} results={results} />
        <div className="flex items-baseline gap-5 text-sm">
          <span className="g-mono text-ink-3">
            {step === 0
              ? `${total} signs`
              : `${Math.min(step, total)} of ${total}`}
          </span>
          {inSteps && (
            <button type="button" onClick={finish} className="g-quiet">
              Skip tutorial
            </button>
          )}
        </div>
      </div>

      {step === 0 && (
        // Intro shows the first sign already playing, so "copy a reference
        // figure" is something you can see before you read about it.
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
          <div className="grid max-w-prose content-start gap-5">
            <div className="grid gap-2">
              <h1 className="font-display text-3xl tracking-[-0.03em] sm:text-4xl">
                Try three signs
              </h1>
              <p className="leading-relaxed text-ink-2">
                SignSpeak reads sign language from your webcam. For each sign, a
                reference figure shows the movement and you copy it with your
                hands. You do not need to know any sign language. It takes about
                a minute.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={advance}
                className="g-btn press px-4 py-2 text-sm"
              >
                Start tutorial
              </button>
              <button
                type="button"
                onClick={finish}
                className="g-quiet text-sm"
              >
                Skip, I know sign language
              </button>
            </div>
          </div>
          <ReferenceSkeleton gloss={STEPS[0].gloss} />
        </div>
      )}

      {inSteps && (
        <StepView
          key={step}
          gloss={STEPS[step - 1].gloss}
          hint={STEPS[step - 1].hint}
          onPass={pass}
          onSkip={advance}
        />
      )}

      {step > total && (
        <div className="grid max-w-prose gap-5">
          <div className="grid gap-2">
            <h1 className="font-display text-3xl tracking-[-0.03em] sm:text-4xl">
              Tutorial complete
            </h1>
            <p className="leading-relaxed text-ink-2">
              That is the whole loop: your hand landmarks go to a classifier on
              this device, and the result becomes text. Next, sign a full
              sentence such as{" "}
              <span className="g-gloss text-ink">
                MY NAME <span aria-hidden="true" className="g-blank" />
                <span className="sr-only">your name</span>
              </span>
              .
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5 border-t border-rule pt-4">
            <button
              type="button"
              onClick={goSentence}
              className="g-btn press px-4 py-2 text-sm"
            >
              Try a sentence <span aria-hidden="true">→</span>
            </button>
            <button type="button" onClick={finish} className="g-quiet text-sm">
              Close tutorial
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export const DemoTutorial = memo(DemoTutorialImpl);
