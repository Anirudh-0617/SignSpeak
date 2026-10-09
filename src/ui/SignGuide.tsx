import { memo, useEffect, useState } from 'react';
import { LESSONS } from '../practice/lessons';
import { ReferenceSkeleton } from './practice/ReferenceSkeleton';
import type { LiveMode } from '../recognition/useLiveLetter';

// ponytail: derives its list from LESSONS so there's no second source of
// truth for "which signs do we support". Every gloss there now ships a
// reference clip (26 letters + 35 words), so nothing here can 404.
function glossesFor(mode: LiveMode): string[] {
  if (mode === 'both') return LESSONS.map((s) => s.gloss);
  return LESSONS.filter((s) => s.mode === mode).map((s) => s.gloss);
}

const DEFAULT_FOR: Record<LiveMode, string> = {
  fingerspell: 'A',
  words: 'HELLO',
  both: 'HELLO',
};

function SignGuideImpl({ mode }: { mode: LiveMode }) {
  // A filter over ~46 items on the rare mode switch — memoising it costs more
  // in dep-array upkeep than it saves.
  const glosses = glossesFor(mode);
  const [selected, setSelected] = useState(() => DEFAULT_FOR[mode]);

  // Mode switch can strand a selection that no longer exists in the list
  // (e.g. 'A' while switching to words-only).
  // Recompute inside the effect rather than depending on `glosses` — that array
  // is a fresh reference every render, so listing it would re-run this on every
  // render instead of only on a mode switch.
  useEffect(() => {
    setSelected((cur) => (glossesFor(mode).includes(cur) ? cur : DEFAULT_FOR[mode]));
  }, [mode]);

  const sign = LESSONS.find((s) => s.gloss === selected);

  return (
    <section
      aria-label="How to sign"
      className="grid gap-4 border-t border-rule pt-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-6"
    >
      <ReferenceSkeleton gloss={selected} />

      <div className="grid content-start gap-2">
        <h2 className="g-gloss text-[11px] text-ink-3">How to sign</h2>
        <p className="g-gloss text-2xl text-ink">{selected}</p>
        <p className="text-sm text-ink-2 max-w-[60ch] min-h-[1.25rem]">
          {sign?.description ?? `Sign ${selected}.`}
        </p>
        <div role="group" aria-label="Pick a sign to preview" className="mt-2 flex flex-wrap gap-x-1 gap-y-1.5">
          {glosses.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelected(g)}
              aria-pressed={selected === g}
              className={
                'g-mono border-b px-1 pb-0.5 text-[13px] transition-colors ' +
                (selected === g
                  ? 'border-ink text-ink'
                  : 'border-transparent text-ink-3 hover:text-ink')
              }
            >
              {g}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export const SignGuide = memo(SignGuideImpl);
