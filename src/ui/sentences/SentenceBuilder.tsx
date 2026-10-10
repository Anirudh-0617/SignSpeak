import { memo, useEffect, useRef, useState } from 'react';
import { CameraView } from '../CameraView';
import { ReferenceSkeleton } from '../practice/ReferenceSkeleton';
import { ConfidenceBar } from '../practice/ConfidenceBar';
import { useLiveLetter } from '../../recognition/useLiveLetter';
import { PASS_CONFIDENCE, PASS_DWELL_MS } from '../../practice/config';
import { useStore } from '../../state/store';
import { Alert } from '../Alert';
import { Spinner } from '../Spinner';

// Slot = one step in a template. Word slots score against a target gloss;
// fingerspell slots collect letters until the user hits "Done".
type Slot =
  | { kind: 'word'; gloss: string }
  | { kind: 'fingerspell'; hint: string };

type Template = {
  id: string;
  title: string;
  english: string;
  slots: Slot[];
};

// ASL grammar note: no IS/AM/THE. Templates express the ASL sign order.
// English label is a translation for the user, not the sign sequence.
const TEMPLATES: Template[] = [
  {
    id: 'my-name',
    title: 'Introduce yourself',
    english: 'My name is (your name).',
    slots: [
      { kind: 'word', gloss: 'MY' },
      { kind: 'word', gloss: 'NAME' },
      { kind: 'fingerspell', hint: 'your name' },
    ],
  },
  {
    id: 'your-name',
    title: "Ask someone's name",
    english: "What's your name?",
    slots: [
      { kind: 'word', gloss: 'YOU' },
      { kind: 'word', gloss: 'NAME' },
      { kind: 'word', gloss: 'WHAT' },
    ],
  },
  {
    id: 'nice-meet',
    title: 'Nice to meet you',
    english: 'Nice to meet you.',
    slots: [
      { kind: 'word', gloss: 'NICE' },
      { kind: 'word', gloss: 'MEET' },
      { kind: 'word', gloss: 'YOU' },
    ],
  },
  {
    id: 'please-help',
    title: 'Ask for help',
    english: 'Please help.',
    slots: [
      { kind: 'word', gloss: 'PLEASE' },
      { kind: 'word', gloss: 'HELP' },
    ],
  },
  {
    id: 'want-x',
    title: 'Say what you want',
    english: 'I want (something).',
    slots: [
      { kind: 'word', gloss: 'WANT' },
      { kind: 'fingerspell', hint: 'what you want' },
    ],
  },
];

// ------- shared UI -------

// A fingerspell slot with nothing in it yet: a ruled blank, announced by its hint.
function Blank({ hint }: { hint: string }) {
  return (
    <>
      <span aria-hidden="true" className="g-blank" />
      <span className="sr-only">{hint}</span>
    </>
  );
}

// The sentence as one gloss line. Every slot carries g-mark so that when the
// slot index advances, the highlighter wipes off one span and draws on the
// next (same elements, only data-on flips).
function SentenceStrip({
  template,
  tokens,
  activeIdx,
  spelled,
  done,
}: {
  template: Template;
  tokens: string[];
  activeIdx: number;
  spelled: string;
  done: boolean;
}) {
  const total = template.slots.length;
  return (
    <div className="grid gap-3">
      <p className="g-gloss flex flex-wrap items-baseline gap-x-[0.55em] gap-y-2 text-3xl leading-[1.15] sm:text-5xl">
        {template.slots.map((slot, i) => {
          const filled = i < tokens.length;
          const active = !done && i === activeIdx;
          const content = filled
            ? tokens[i]
            : slot.kind === 'word'
              ? slot.gloss
              : active && spelled
                ? spelled
                : <Blank hint={slot.hint} />;
          return (
            <span
              key={i}
              data-on={active}
              className={'g-mark ' +(filled ? 'text-ink' : active ? '' : 'text-ink-3')}
            >
              {content}
            </span>
          );
        })}
      </p>
      <p className="text-ink-2">{template.english}</p>
      <p className="sr-only" aria-live="polite">
        {done ? 'Sentence complete' : `Slot ${activeIdx + 1} of ${total}`}
      </p>
    </div>
  );
}

function StageLabel({ children }: { children: string }) {
  return <span className="g-gloss text-[11px] text-ink-3">{children}</span>;
}

// ------- word slot -------

function WordSlot({ gloss, onPass }: { gloss: string; onPass: (token: string) => void }) {
  const live = useLiveLetter('words', true);
  const dwellStartRef = useRef(0);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    if (passed) return;
    const top = live.topK[0];
    const now = performance.now();
    if (top && top.label === gloss && top.confidence >= PASS_CONFIDENCE.words) {
      if (dwellStartRef.current === 0) dwellStartRef.current = now;
      if (now - dwellStartRef.current >= PASS_DWELL_MS) {
        setPassed(true);
        // Small pause so user sees the pass before advancing.
        setTimeout(() => onPass(gloss), 500);
      }
    } else {
      dwellStartRef.current = 0;
    }
  }, [live.topK, gloss, onPass, passed]);

  return (
    // Three columns on lg: reference, you, and the instruction + readout, so
    // the status sits beside the stages instead of under them. Below that the
    // two stages stay side by side (a phone has to show both to copy from).
    <div className="grid grid-cols-2 items-start gap-3 md:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,17rem)] lg:gap-6">
      <div className="grid content-start gap-2">
        <StageLabel>Reference</StageLabel>
        <ReferenceSkeleton gloss={gloss} />
      </div>
      <div className="grid content-start gap-2">
        <StageLabel>You</StageLabel>
        <CameraView onFrame={live.handleFrame} />
      </div>
      <div className="grid content-start gap-4 border-t border-rule pt-4 col-span-2 lg:col-span-1 lg:border-t-0 lg:pt-7">
        <p className="text-ink-2">
          Sign <span className="g-gloss text-ink">{gloss}</span>. Copy the reference figure.
        </p>
        {live.status === 'ready' && !passed && (
          <ConfidenceBar topK={live.topK} target={gloss} />
        )}
        {passed && (
          <p role="status" className="flex flex-wrap items-baseline gap-x-3">
            <span className="g-gloss text-xl text-ink">
              {gloss} <span aria-hidden="true">!</span>
            </span>
            <span className="text-sm text-ink-2">Recognized. Moving to the next slot.</span>
          </p>
        )}
        {!passed && live.status === 'ready' && !live.handsPresent && (
          <p role="status" className="text-sm text-ink-2">
            Show your hands to the camera. Landmarks appear on your fingers when they're detected.
          </p>
        )}
        {live.status === 'loading' && <Spinner label="Loading word model" />}
        {live.status === 'error' && (
          <Alert
            title="Model failed to load"
            body={live.error ?? undefined}
            action={{ label: 'Retry', onClick: () => window.location.reload() }}
          />
        )}
      </div>
    </div>
  );
}

// ------- fingerspell slot -------

// ponytail: silent mode gives us `top` (smoothed current letter) but no commit
// event. Watching `top` via useEffect deps doesn't work: React skips renders
// when the value doesn't change, so a held letter never triggers the dwell
// check. Fix: mirror `top` into a ref, poll every 100ms with setInterval.
// If FS recognition ever needs to be tighter, add an `onCommit` callback to
// useLiveLetter and delete this block.
const FS_HOLD_MS = 500;
const FS_REPEAT_COOLDOWN_MS = 1500;
const FS_POLL_MS = 100;

function FingerspellSlot({
  hint,
  onDone,
  onBuffer,
}: {
  hint: string;
  onDone: (token: string) => void;
  // Display-only mirror of the buffer so the sentence strip can show it.
  onBuffer: (buffer: string) => void;
}) {
  const live = useLiveLetter('fingerspell', true);
  const [buffer, setBuffer] = useState('');
  const liveTopRef = useRef<string | null>(null);
  const dwellRef = useRef<{ letter: string | null; since: number }>({ letter: null, since: 0 });
  const lastCommitRef = useRef<{ letter: string; at: number } | null>(null);

  useEffect(() => {
    liveTopRef.current = live.top;
  }, [live.top]);

  useEffect(() => {
    onBuffer(buffer);
  }, [buffer, onBuffer]);

  useEffect(() => {
    const iv = setInterval(() => {
      const top = liveTopRef.current;
      const now = performance.now();
      if (!top) {
        dwellRef.current = { letter: null, since: 0 };
        return;
      }
      if (top !== dwellRef.current.letter) {
        dwellRef.current = { letter: top, since: now };
        return;
      }
      if (now - dwellRef.current.since < FS_HOLD_MS) return;
      const last = lastCommitRef.current;
      if (last && last.letter === top && now - last.at < FS_REPEAT_COOLDOWN_MS) return;
      setBuffer((b) => b + top);
      lastCommitRef.current = { letter: top, at: now };
      dwellRef.current = { letter: null, since: 0 };
    }, FS_POLL_MS);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="grid gap-5">
      <p className="text-ink-2">
        Fingerspell {hint}. Hold each letter briefly.
      </p>
      <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="grid content-start gap-5">
          <div className="grid gap-2">
            <StageLabel>Spelled</StageLabel>
            <p className="g-mono min-h-[1.2em] break-all text-4xl leading-[1.15] tracking-[0.08em] text-ink sm:text-5xl">
              {buffer || <span className="text-base tracking-normal text-ink-3">No letters yet.</span>}
            </p>
            <p className="g-mono text-xs text-ink-3">reading: {live.top ?? '-'}</p>
          </div>
          {live.status === 'loading' && <Spinner label="Loading fingerspell model" />}
          {live.status === 'error' && (
            <Alert
              title="Model failed to load"
              body={live.error ?? undefined}
              action={{ label: 'Retry', onClick: () => window.location.reload() }}
            />
          )}
          {live.status === 'ready' && !live.handsPresent && (
            <p role="status" className="text-sm text-ink-2">
              Show your hand to the camera. Dots appear on your fingers when it sees them.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
            <button
              type="button"
              onClick={() => setBuffer((b) => b.slice(0, -1))}
              className="g-ghost press px-3 py-1.5 text-sm"
            >
              Backspace
            </button>
            <button
              type="button"
              onClick={() => setBuffer('')}
              className="g-ghost press px-3 py-1.5 text-sm"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => onDone(buffer.trim() || '(blank)')}
              disabled={!buffer.trim()}
              className="g-btn press ml-auto px-4 py-2 text-sm"
            >
              Done <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
        {/* Camera first on phones so the spelled letters sit right under it. */}
        <div className="order-first grid content-start gap-2 md:order-none">
          <StageLabel>You</StageLabel>
          <CameraView onFrame={live.handleFrame} />
        </div>
      </div>
    </div>
  );
}

// ------- main -------

function SentenceBuilderImpl() {
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [slotIndex, setSlotIndex] = useState(0);
  const [tokens, setTokens] = useState<string[]>([]);
  // Display-only: the active fingerspell slot's buffer, for the strip.
  const [spelled, setSpelled] = useState('');
  const appendChar = useStore((s) => s.appendChar);

  const template = TEMPLATES.find((t) => t.id === templateId);
  const done = template && slotIndex >= template.slots.length;
  const currentSlot = template && !done ? template.slots[slotIndex] : null;

  const restart = () => {
    setTemplateId(null);
    setSlotIndex(0);
    setTokens([]);
    setSpelled('');
  };

  const pick = (id: string) => {
    setTemplateId(id);
    setSlotIndex(0);
    setTokens([]);
    setSpelled('');
  };

  const advance = (token: string) => {
    setTokens((prev) => [...prev, token]);
    setSlotIndex((i) => i + 1);
    setSpelled('');
  };

  const commitAndRestart = () => {
    if (template) appendChar(tokens.join(' ') + ' ');
    restart();
  };

  if (!template) {
    return (
      <section className="grid w-full max-w-4xl gap-8" aria-label="Sentence templates">
        <div className="grid gap-2">
          <h1 className="font-display text-3xl tracking-[-0.03em] sm:text-4xl">Build a sentence</h1>
          <p className="text-ink-2">
            Pick a sentence. The app walks you through it one sign at a time.
          </p>
        </div>
        <ol className="border-b border-rule">
          {TEMPLATES.map((t, n) => (
            <li key={t.id} className="border-t border-rule">
              <button
                type="button"
                onClick={() => pick(t.id)}
                aria-label={`${t.title}: ${t.english}`}
                className="group grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-x-4 py-5 text-left sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]"
              >
                <span className="g-mono text-sm text-ink-3">({n + 1})</span>
                <span className="grid gap-1.5">
                  <span className="g-gloss flex flex-wrap items-baseline gap-x-[0.6em] gap-y-1 text-xl text-ink-2 transition-colors duration-150 group-hover:text-ink motion-reduce:transition-none">
                    {t.slots.map((s, i) => (
                      <span key={i}>{s.kind === 'word' ? s.gloss : <Blank hint={s.hint} />}</span>
                    ))}
                  </span>
                  <span className="text-sm text-ink-2">{t.english}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="g-mono text-ink opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
                >
                  →
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section className="grid w-full gap-8" aria-label={`Building sentence: ${template.title}`}>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <button type="button" onClick={restart} className="g-quiet text-sm">
          <span aria-hidden="true">← </span>All sentences
        </button>
        <h1 className="font-display text-3xl tracking-[-0.03em] sm:text-4xl">{template.title}</h1>
      </div>
      <SentenceStrip
        template={template}
        tokens={tokens}
        activeIdx={slotIndex}
        spelled={spelled}
        done={!!done}
      />
      {done ? (
        <div className="grid gap-4 border-t border-rule pt-5">
          <p role="status" className="text-ink-2">
            Sentence complete. Add it to the transcript to keep it.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={commitAndRestart} className="g-btn press px-4 py-2 text-sm">
              Add to transcript
            </button>
            <button type="button" onClick={restart} className="g-ghost press px-4 py-2 text-sm">
              Discard
            </button>
          </div>
        </div>
      ) : currentSlot!.kind === 'word' ? (
        <WordSlot key={slotIndex} gloss={currentSlot!.gloss} onPass={advance} />
      ) : (
        <FingerspellSlot
          key={slotIndex}
          hint={currentSlot!.hint}
          onDone={advance}
          onBuffer={setSpelled}
        />
      )}
    </section>
  );
}

export const SentenceBuilder = memo(SentenceBuilderImpl);
