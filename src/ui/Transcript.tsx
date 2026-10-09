import { memo, useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { translate } from '../translate/translate';
import { speak, ttsSupported } from '../translate/speak';
import { GlossChips } from './translation/GlossChips';
import { Alert } from './Alert';

function TranscriptImpl() {
  const transcript = useStore((s) => s.transcript);
  const setTranscript = useStore((s) => s.setTranscript);
  const backspace = useStore((s) => s.backspace);
  const clear = useStore((s) => s.clearTranscript);
  const insertSpace = useStore((s) => s.insertSpaceIfNeeded);
  const translation = useStore((s) => s.translation);
  const translationAlternates = useStore((s) => s.translationAlternates);
  const translationStatus = useStore((s) => s.translationStatus);
  const translationError = useStore((s) => s.translationError);
  const setTranslation = useStore((s) => s.setTranslation);
  const setTranslationAlternates = useStore((s) => s.setTranslationAlternates);
  const setTranslationStatus = useStore((s) => s.setTranslationStatus);
  const [showAlts, setShowAlts] = useState(false);

  const onTranslate = async () => {
    setTranslationStatus('loading');
    setShowAlts(false);
    try {
      const texts = await translate(transcript);
      const [primary, ...rest] = texts;
      setTranslation(primary);
      setTranslationAlternates(rest);
      setTranslationStatus('idle');
      // ponytail: auto-speak on translate — the app becomes sign→voice, not sign→text.
      // If users find this annoying, gate behind a settings toggle.
      speak(primary);
    } catch (e) {
      setTranslationStatus('error', e instanceof Error ? e.message : String(e));
    }
  };

  const pickAlternate = (alt: string) => {
    // Swap: promote alternate to primary, demote current primary into alternates.
    const nextAlts = translationAlternates.filter((a) => a !== alt);
    if (translation) nextAlts.push(translation);
    setTranslation(alt);
    setTranslationAlternates(nextAlts);
    speak(alt);
  };

  // Keyboard shortcuts (only when not editing the textarea).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) return;
      // Space/Backspace on a focused control must operate that control.
      if (t?.closest('button, a, summary, select, [role="tab"], [contenteditable="true"]')) return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === ' ') {
        e.preventDefault();
        insertSpace();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [backspace, insertSpace]);

  return (
    <section className="grid gap-3" aria-label="Transcript">
      <div className="flex items-baseline justify-between border-b border-rule pb-2">
        <label htmlFor="transcript" className="g-gloss text-[11px] text-ink-3">
          Transcript
        </label>
        <span className="text-xs text-ink-3">Edit freely</span>
      </div>
      {/* A ruled writing line, not a box: it's a document you sign into. */}
      <textarea
        id="transcript"
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder="Signed letters and words land here. A space is added after 1.5 s without a sign."
        rows={4}
        className="w-full resize-y bg-transparent g-mono text-lg leading-relaxed text-ink placeholder:text-ink-3 placeholder:font-[family-name:var(--font-body)] placeholder:text-sm border-b-2 border-rule-strong focus:border-ink focus-visible:outline-none pb-2 transition-colors"
        aria-label="Sign transcript. Edit or type directly."
      />
      <GlossChips />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={onTranslate}
          disabled={!transcript.trim() || translationStatus === 'loading'}
          className="g-btn press px-3.5 py-2"
          aria-label="Translate transcript to English"
        >
          {translationStatus === 'loading' ? 'Translating…' : 'Translate'}
        </button>
        <button
          type="button"
          onClick={insertSpace}
          className="g-ghost press px-3 py-[7px]"
          aria-label="Insert space (Space key)"
        >
          Space <kbd>Space</kbd>
        </button>
        <button
          type="button"
          onClick={backspace}
          disabled={!transcript}
          className="g-ghost press px-3 py-[7px]"
          aria-label="Delete last character (Backspace key)"
        >
          Back <kbd>Bksp</kbd>
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={!transcript}
          className="g-quiet ml-auto px-1 hover:!text-danger"
          aria-label="Clear transcript"
        >
          Clear
        </button>
      </div>
      {(translation || translationError) && (
        <div className="grid gap-2 border-t border-rule pt-3 text-sm" aria-live="polite">
          <div className="flex items-baseline justify-between">
            <span className="g-gloss text-[11px] text-ink-3">English</span>
            {translation && !translationError && ttsSupported() && (
              <button
                type="button"
                onClick={() => speak(translation)}
                className="g-quiet text-xs"
                aria-label="Speak translation aloud"
              >
                Speak
              </button>
            )}
          </div>
          {translationError ? (
            <Alert
              title="Translation failed"
              body={translationError}
              action={{ label: 'Retry', onClick: onTranslate }}
            />
          ) : (
            <>
              <textarea
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                rows={2}
                className="w-full resize-y bg-transparent text-lg leading-snug text-ink border-b border-rule-strong focus:border-ink focus-visible:outline-none pb-1 transition-colors"
                aria-label="Translation. Edit freely."
              />
              {translationAlternates.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAlts((v) => !v)}
                    className="g-quiet text-xs"
                    aria-expanded={showAlts}
                  >
                    {showAlts ? 'Hide' : 'Show'} {translationAlternates.length} alternate
                    {translationAlternates.length === 1 ? '' : 's'}
                  </button>
                  {showAlts && (
                    <ul className="mt-2 grid gap-1">
                      {translationAlternates.map((alt, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => pickAlternate(alt)}
                            className="g-quiet w-full text-left py-1"
                            aria-label={`Use alternate: ${alt}`}
                          >
                            {alt}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <p className="text-xs text-ink-3">
                The model paraphrases, so check it. Only the transcript text is sent to translate.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

export const Transcript = memo(TranscriptImpl);
