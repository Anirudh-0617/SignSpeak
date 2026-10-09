import { memo } from 'react';

type TopK = { label: string; confidence: number }[];

const EMPTY = { label: '-', confidence: -1 };

// "Model reads": the classifier's top three, as a ruled readout. No track
// behind the bars; the fill width alone is the reading.
function ConfidenceBarImpl({ topK, target }: { topK: TopK; target: string }) {
  // ponytail: always three rows so the action zone never changes height as
  // predictions appear and disappear.
  const rows: TopK = [...topK.slice(0, 3), EMPTY, EMPTY, EMPTY].slice(0, 3);
  return (
    <div className="grid gap-2.5 w-full max-w-sm">
      <span className="g-gloss text-[11px] text-ink-3">Model reads</span>
      <ul className="grid gap-2.5" aria-label="Top predictions">
        {rows.map((row, i) => {
          const empty = row.confidence < 0;
          const hit = !empty && row.label === target;
          const v = empty ? 0 : Math.max(0, Math.min(1, row.confidence));
          return (
            <li key={`${i}-${row.label}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1">
              <span className={`g-mono text-sm truncate ${hit ? 'text-ink' : 'text-ink-3'}`}>
                {row.label}
              </span>
              <span className={`g-mono text-sm text-right ${hit ? 'text-ink' : 'text-ink-3'}`}>
                {empty ? '-' : v.toFixed(2)}
              </span>
              <div className="col-span-2 h-[2px]">
                <div
                  className={
                    'h-full transition-[width] duration-150 ease-out motion-reduce:transition-none ' +
                    (hit ? 'bg-ink' : 'bg-rule-strong')
                  }
                  style={{ width: `${v * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const ConfidenceBar = memo(ConfidenceBarImpl);
