import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { LESSONS } from '../../practice/lessons';
import { usePracticeStore } from '../../state/practiceStore';
import { useLiveLetter } from '../../recognition/useLiveLetter';
import { CameraView } from '../CameraView';
import { ConfidenceBar } from './ConfidenceBar';
import { ReferenceSkeleton, type RefClip } from './ReferenceSkeleton';
import type { RawSample } from '../CameraView';
import { FAIL_TIMEOUT_MS, PASS_CONFIDENCE, PASS_DWELL_MS } from '../../practice/config';
import { Alert } from '../Alert';
import { Spinner } from '../Spinner';
import { LAB } from '../lab';

const REF_RECORD_MS = 2000;
const REF_FPS = 30;

type Outcome = 'trying' | 'passed' | 'failed';
type Read = { label: string; confidence: number };

// kbd sitting on the inverse fill of a primary button: take the button's ink
// instead of the page's ink-3, which would vanish on the light fill.
const ON_INVERSE_KBD = { color: 'inherit', borderColor: 'currentColor', opacity: 0.6 } as const;

function PracticeSessionImpl() {
  const currentSign = usePracticeStore((s) => s.currentSign);
  const setCurrentSign = usePracticeStore((s) => s.setCurrentSign);
  const recordAttempt = usePracticeStore((s) => s.recordAttempt);
  const index = LESSONS.findIndex((s) => s.gloss === currentSign);
  const sign = index >= 0 ? LESSONS[index] : undefined;
  const live = useLiveLetter(sign?.mode ?? 'fingerspell', true);

  const [outcome, setOutcome] = useState<Outcome>('trying');
  // ponytail: seed true — pose landmarker takes a beat to warm up; refusing to
  // score before first pose result would strand the user staring at the hint.
  const [torsoVisible, setTorsoVisible] = useState(true);
  const [recording, setRecording] = useState(false);
  const [closest, setClosest] = useState<Read | null>(null);
  const recordBufRef = useRef<RawSample[]>([]);
  const recordEndRef = useRef(0);
  const dwellStartRef = useRef(0);
  const sessionStartRef = useRef(0);
  const peakRef = useRef(0);
  const topKRef = useRef(live.topK);

  const onRawSample = useCallback((s: RawSample) => {
    if (performance.now() >= recordEndRef.current) return;
    recordBufRef.current.push(s);
  }, []);

  const startRecording = useCallback(() => {
    if (!sign) return;
    recordBufRef.current = [];
    recordEndRef.current = performance.now() + REF_RECORD_MS;
    setRecording(true);
    setTimeout(() => {
      const clip: RefClip = {
        gloss: sign.gloss,
        fps: REF_FPS,
        frames: recordBufRef.current,
      };
      const blob = new Blob([JSON.stringify(clip)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sign.gloss}.json`;
      a.click();
      URL.revokeObjectURL(url);
      recordBufRef.current = [];
      setRecording(false);
    }, REF_RECORD_MS);
  }, [sign]);

  const resetAttempt = useCallback(() => {
    dwellStartRef.current = 0;
    sessionStartRef.current = performance.now();
    peakRef.current = 0;
    setClosest(null);
    setOutcome('trying');
  }, []);

  // Next entry in LESSONS order, wrapping at the end.
  const goNext = useCallback(() => {
    if (index < 0) return;
    setCurrentSign(LESSONS[(index + 1) % LESSONS.length].gloss);
  }, [index, setCurrentSign]);

  // Fresh timers each time the target sign changes.
  useEffect(() => {
    resetAttempt();
  }, [currentSign, resetAttempt]);

  // Latest predictions, for the "Closest read" snapshot taken on a miss.
  useEffect(() => {
    topKRef.current = live.topK;
  }, [live.topK]);

  // ponytail: piggyback on topK re-renders (~30 fps) — no separate interval.
  useEffect(() => {
    if (!sign || outcome !== 'trying') return;
    const now = performance.now();
    const target = sign.gloss;
    const top = live.topK[0];
    const targetConf = live.topK.find((r) => r.label === target)?.confidence ?? 0;
    if (targetConf > peakRef.current) peakRef.current = targetConf;

    // Torso hidden: freeze dwell + pause fail-timer so the user isn't punished
    // for framing they can fix.
    if (!torsoVisible) {
      dwellStartRef.current = 0;
      sessionStartRef.current = now;
      return;
    }

    if (top && top.label === target && top.confidence >= PASS_CONFIDENCE[sign.mode]) {
      if (dwellStartRef.current === 0) dwellStartRef.current = now;
      if (now - dwellStartRef.current >= PASS_DWELL_MS) {
        recordAttempt(target, peakRef.current, true);
        setOutcome('passed');
      }
    } else {
      dwellStartRef.current = 0;
    }

    if (
      sessionStartRef.current > 0 &&
      now - sessionStartRef.current >= FAIL_TIMEOUT_MS &&
      outcome === 'trying'
    ) {
      recordAttempt(target, peakRef.current, false);
      setOutcome('failed');
    }
  }, [live.topK, sign, outcome, recordAttempt, torsoVisible]);

  // ponytail: snapshot the best non-target read at the moment of the miss, so
  // the qualifier doesn't drift as the user lowers their hands afterwards.
  useEffect(() => {
    if (outcome !== 'failed' || !sign) return;
    setClosest(topKRef.current.find((r) => r.label !== sign.gloss) ?? null);
  }, [outcome, sign]);

  // R = try again, ArrowRight = next sign. Typing and tab arrow-keys win.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest('input, textarea, select, [contenteditable="true"], [role="tablist"]'))) return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetAttempt();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resetAttempt, goNext]);

  if (!sign) {
    return <p className="text-sm text-ink-3">Pick a sign to practice.</p>;
  }

  const top = live.topK[0];
  const statusText =
    outcome === 'passed'
      ? 'Recognized.'
      : outcome === 'failed'
        ? `Not recognized in ${FAIL_TIMEOUT_MS / 1000} s.`
        : !torsoVisible
          ? 'Step back so both shoulders are in frame. Scoring is paused.'
          : live.status === 'ready' && !live.handsPresent
            ? "Show your hands. Landmarks appear on your fingers when they're detected."
            : top && top.label === sign.gloss
              ? 'Hold the sign steady.'
              : 'Copy the reference figure.';
  // The last two hints follow the frame-by-frame reading, so they stay out of
  // the live region; only verdicts and framing prompts are announced.
  const coaching =
    outcome === 'trying' && torsoVisible && !(live.status === 'ready' && !live.handsPresent);

  // Desk layout: the target, its verdict and the model readout stay together
  // in a left column, so the verdict is never below the fold under two
  // full-width stages. Stacks on smaller screens.
  return (
    <section
      className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"
      aria-label={`Practicing ${sign.gloss}`}
    >
      <div className="grid content-start gap-6">
        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={() => setCurrentSign(null)} className="g-quiet text-sm py-1">
            <span aria-hidden="true">&larr; </span>All signs
          </button>
          <span className="g-mono text-xs text-ink-3">
            <span aria-hidden="true">{index + 1} / {LESSONS.length}</span>
            <span className="g-sr">Sign {index + 1} of {LESSONS.length}</span>
          </span>
        </div>

        <header className="grid gap-3">
          <div className="flex items-baseline gap-3">
            <h1
              className={
                'font-display text-5xl lg:text-6xl tracking-[-0.03em] leading-none break-words ' +
                (outcome === 'failed' ? 'text-ink-3' : 'text-ink')
              }
            >
              <span className="g-mark" data-on={outcome !== 'failed'}>
                {sign.gloss}
              </span>
            </h1>
            {outcome !== 'trying' && (
              <span
                aria-hidden="true"
                className={`g-mono text-3xl md:text-4xl leading-none ${outcome === 'passed' ? 'text-ink' : 'text-ink-3'}`}
              >
                {outcome === 'passed' ? '!' : '?'}
              </span>
            )}
          </div>
          <p className="text-ink-2 max-w-[60ch]">{sign.description}</p>
        </header>

        {/* Action zone: the verdict lands here, next to the target. */}
        <div className="grid gap-6 border-t border-rule pt-4">
          <div className="grid gap-4 content-start">
            {coaching && <p className="text-ink-2">{statusText}</p>}
            <div role="status" aria-live="polite" className="grid gap-1 empty:hidden">
              {!coaching && (
                <p className={outcome === 'trying' ? 'text-ink-2' : 'text-ink font-medium'}>{statusText}</p>
              )}
              {outcome === 'failed' && closest && (
                <p className="text-ink-2">
                  Closest read:{' '}
                  <span className="g-mono text-ink">
                    {closest.label} {closest.confidence.toFixed(2)}
                  </span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {outcome === 'trying' && (
                <button type="button" onClick={goNext} className="g-quiet text-sm py-1" aria-keyshortcuts="ArrowRight">
                  Skip
                </button>
              )}
              {outcome === 'passed' && (
                <>
                  <button
                    type="button"
                    onClick={goNext}
                    className="g-btn press px-4 py-2 text-sm"
                    aria-keyshortcuts="ArrowRight"
                  >
                    Next sign <kbd aria-hidden="true" style={ON_INVERSE_KBD}>&rarr;</kbd>
                  </button>
                  <button
                    type="button"
                    onClick={resetAttempt}
                    className="g-quiet inline-flex items-center gap-2 text-sm py-1"
                    aria-keyshortcuts="R"
                  >
                    Try again <kbd aria-hidden="true">R</kbd>
                  </button>
                </>
              )}
              {outcome === 'failed' && (
                <>
                  <button
                    type="button"
                    onClick={resetAttempt}
                    className="g-btn press px-4 py-2 text-sm"
                    aria-keyshortcuts="R"
                  >
                    Try again <kbd aria-hidden="true" style={ON_INVERSE_KBD}>R</kbd>
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="g-quiet inline-flex items-center gap-2 text-sm py-1"
                    aria-keyshortcuts="ArrowRight"
                  >
                    Skip <kbd aria-hidden="true">&rarr;</kbd>
                  </button>
                </>
              )}
            </div>
          </div>
          <div>
            {live.status === 'loading' && <Spinner label="Loading model" />}
            {live.status === 'error' && (
              <Alert
                title="Model failed to load"
                body={live.error ?? undefined}
                action={{ label: 'Retry', onClick: () => window.location.reload() }}
              />
            )}
            {live.status === 'ready' && <ConfidenceBar topK={live.topK} target={sign.gloss} />}
          </div>

        </div>
      </div>

      {/* Side-by-side on md+, stacked on mobile. Each stage keeps its own 4:3
          aspect so heights match without extra math. */}
      <div className="grid gap-4 content-start md:grid-cols-2">
        <div className="grid gap-1.5 content-start">
          <span className="g-gloss text-[11px] text-ink-3">Reference</span>
          <ReferenceSkeleton gloss={sign.gloss} />
        </div>
        <div className="grid gap-1.5 content-start">
          <span className="g-gloss text-[11px] text-ink-3">You</span>
          <CameraView
            onFrame={live.handleFrame}
            onPoseVisibility={setTorsoVisible}
            onRawSample={onRawSample}
          />
        </div>
      </div>

      {LAB && (
        <div className="lg:col-span-2 flex flex-wrap items-center gap-3 border-t border-rule pt-3 text-xs text-ink-3">
          <button
            type="button"
            onClick={startRecording}
            disabled={recording}
            className="g-ghost press px-2 py-1 text-xs"
          >
            {recording
              ? `Recording ${REF_RECORD_MS / 1000} s`
              : `Record reference (${REF_RECORD_MS / 1000} s)`}
          </button>
          <span>
            Saves <code className="g-mono">{sign.gloss}.json</code>. Move it to{' '}
            <code className="g-mono">public/reference-signs/</code>.
          </span>
        </div>
      )}
    </section>
  );
}

export const PracticeSession = memo(PracticeSessionImpl);
