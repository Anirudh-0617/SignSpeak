import { memo, type CSSProperties } from 'react';
import { useStore } from '../state/store';
import type { LiveMode } from '../recognition/useLiveLetter';
import { Alert } from './Alert';
import { Spinner } from './Spinner';

// The "now" line. Replaces the old big-letter card + progress bar with one
// idea: the word you are spelling, followed by the sign the model is reading.
// The candidate sits at low ink (not yet written) and its highlighter fills as
// the recogniser's dwell completes. Full = committed: it becomes the last
// letter of the word, still marked while you hold it, and the mark wipes off
// when you let go. Same behaviour, no separate "added" readout to watch.
//
// hold semantics (smoothing.ts): 0..1 while dwelling, exactly 1 from the commit
// frame onward for as long as the same sign is held. So hold >= 1 means the
// transcript already contains it.

const MODEL_NAME: Record<LiveMode, string> = {
  fingerspell: 'fingerspelling model',
  words: 'word model',
  both: 'models',
};

function ComposerImpl({
  mode,
  top,
  confidence,
  hold,
  status,
  error,
}: {
  mode: LiveMode;
  top: string | null;
  confidence: number;
  hold: number;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
}) {
  // Only the tail matters here; selecting it keeps this from re-rendering on
  // edits earlier in the text.
  const tail = useStore((s) => s.transcript.slice(-40));

  // hold hits 1 on the stable frame, but the recogniser can still drop that
  // commit (word cooldown in recognizer.ts). So "committed" is proven by the
  // transcript, not assumed from hold: the last word must end with the sign.
  // After a word-sign the transcript ends in a space, hence trimEnd.
  const lastWord = tail.trimEnd().split(/\s/).pop() ?? '';
  const committed = hold >= 1 && !!top && lastWord.endsWith(top);
  const word = committed ? lastWord : (tail.split(/\s/).pop() ?? '');
  // The committed sign is the end of `word`; split it off so it wears the mark.
  // Only the last 14 glyphs of the head show, so a long word or pasted text
  // can't push the tape past the rail.
  const head = (committed ? word.slice(0, -top!.length) : word).slice(-14);
  const candidate = top;
  // A held-but-dropped sign shows as unfilled: nothing was written.
  const fill = committed ? 1 : hold >= 1 ? 0 : hold;
  const glyphs = Math.max(4, head.length + (candidate?.length ?? 1));

  const hint =
    status === 'loading'
      ? null
      : !top
        ? mode === 'fingerspell'
          ? 'Show a handshape to the camera.'
          : 'Sign a word to the camera.'
        : committed
          ? `Added ${top}. Relax your hand for the next one.`
          : hold > 0 && hold < 1
            ? `Hold ${top} steady.`
            : `Reading ${top}. Keep still.`;

  return (
    <section aria-label="Now signing" className="grid gap-3">
      <div className="flex items-baseline justify-between border-b border-rule pb-2">
        <h2 className="g-gloss text-[11px] text-ink-3">Now</h2>
        <span className="g-mono text-xs text-ink-3">
          <span className="g-sr">Model confidence </span>
          {top ? confidence.toFixed(2) : '-'}
        </span>
      </div>

      <div className="g-tape-wrap min-h-[6.5rem] flex items-center" aria-hidden="true">
        <p className="g-tape" style={{ '--glyphs': glyphs } as CSSProperties}>
          <span className="text-ink">{head}</span>
          {candidate ? (
            <span
              className={`g-hold ${committed ? 'text-ink' : 'text-ink-3'}`}
              data-committed={committed}
              style={{ '--hold': fill } as CSSProperties}
            >
              <span>{candidate}</span>
            </span>
          ) : (
            // One glyph wide: a cursor waiting for the next sign.
            <span className="g-blank !w-[0.6em] text-rule-strong" />
          )}
        </p>
      </div>

      {status === 'loading' && <Spinner label={`Loading the ${MODEL_NAME[mode]}`} />}
      {status === 'error' && (
        <Alert
          title="The model didn't load"
          body={error ?? undefined}
          action={{ label: 'Reload', onClick: () => window.location.reload() }}
        />
      )}
      {hint && <p className="text-sm text-ink-2">{hint}</p>}
      {/* The hint changes with every frame's reading; announce commits only. */}
      <p className="g-sr" aria-live="polite">
        {committed ? `Added ${top}` : ''}
      </p>
    </section>
  );
}

export const Composer = memo(ComposerImpl);
