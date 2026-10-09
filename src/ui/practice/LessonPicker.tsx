import { memo } from 'react';
import { LESSONS } from '../../practice/lessons';
import { usePracticeStore, type ProgressEntry } from '../../state/practiceStore';

// History by ink density, never colour: untried is ink-3, attempted is ink-2
// with a dotted underline, passed is solid ink with a small `!`.
function stateOf(p: ProgressEntry | undefined): 'passed' | 'attempted' | 'untried' {
  if (p?.passed) return 'passed';
  if (p && p.attempts.length > 0) return 'attempted';
  return 'untried';
}

const STATE_LABEL = { passed: 'passed', attempted: 'attempted', untried: 'not tried' } as const;
const STATE_INK = { passed: 'text-ink', attempted: 'text-ink-2', untried: 'text-ink-3' } as const;

function LessonPickerImpl() {
  const progress = usePracticeStore((s) => s.progress);
  const setCurrentSign = usePracticeStore((s) => s.setCurrentSign);

  const byCategory = LESSONS.reduce<Record<string, typeof LESSONS>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});
  const passedTotal = LESSONS.filter((s) => progress[s.gloss]?.passed).length;

  return (
    <div className="grid gap-8" aria-label="Lesson picker">
      <header className="grid gap-2">
        <h1 className="font-display text-3xl sm:text-4xl tracking-[-0.03em]">Practice</h1>
        <p className="text-ink-2 max-w-[60ch]">
          Pick a sign, copy the reference figure, and hold it until it's recognized.
        </p>
        <p className="g-mono text-sm text-ink-3">
          {passedTotal} of {LESSONS.length} passed
        </p>
      </header>

      <div className="grid">
        {Object.entries(byCategory).map(([cat, signs]) => {
          const isWords = signs[0]?.mode === 'words';
          const passed = signs.filter((s) => progress[s.gloss]?.passed).length;
          const headingId = `practice-cat-${cat.replace(/\W+/g, '-').toLowerCase()}`;
          return (
            <section
              key={cat}
              aria-labelledby={headingId}
              className="grid gap-3 border-t border-rule py-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8"
            >
              <div className="flex items-baseline gap-3 lg:grid lg:content-start lg:gap-1">
                <h2 id={headingId} className="g-gloss text-sm text-ink-2">{cat}</h2>
                <span className="g-mono text-xs text-ink-3">
                  {passed} / {signs.length}
                </span>
              </div>
              <div
                className={
                  isWords
                    ? 'flex flex-wrap gap-x-6 gap-y-1'
                    : 'flex flex-wrap gap-x-3 gap-y-1'
                }
              >
                {signs.map((s) => {
                  const st = stateOf(progress[s.gloss]);
                  return (
                    <button
                      key={s.gloss}
                      type="button"
                      onClick={() => setCurrentSign(s.gloss)}
                      aria-label={`${s.gloss}, ${STATE_LABEL[st]}`}
                      className={
                        `${STATE_INK[st]} hover:text-ink transition-colors duration-150 inline-flex items-start py-1.5 ` +
                        (isWords ? 'g-gloss text-base sm:text-lg px-0.5' : 'g-mono text-3xl leading-none px-1.5')
                      }
                    >
                      <span
                        className={
                          st === 'attempted'
                            ? 'underline decoration-dotted decoration-1 underline-offset-[0.25em]'
                            : undefined
                        }
                      >
                        {s.gloss}
                      </span>
                      {st === 'passed' && (
                        <span aria-hidden="true" className="g-mono text-[0.5em] leading-none ml-0.5">
                          !
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export const LessonPicker = memo(LessonPickerImpl);
