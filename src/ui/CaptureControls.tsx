import { memo } from 'react';
import { useStore, FEATURE_SPEC_VERSION, type Sample } from '../state/store';
import type { Mode } from '../recognition/useLiveLetter';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function download(samples: Sample[], signer: string, mode: Mode) {
  const jsonl = samples.map((s) => JSON.stringify(s)).join('\n');
  const blob = new Blob([jsonl], { type: 'application/x-ndjson' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${mode}_${signer || 'anon'}_${Date.now()}.jsonl`;
  a.click();
  URL.revokeObjectURL(url);
}

function CaptureControlsImpl({ mode }: { mode: Mode }) {
  const label = useStore((s) => s.label);
  const signer = useStore((s) => s.signer);
  const recording = useStore((s) => s.recording);
  const samples = useStore((s) => s.samples);
  const bufferLen = useStore((s) => s.buffer.length);
  const setLabel = useStore((s) => s.setLabel);
  const setSigner = useStore((s) => s.setSigner);
  const startRecording = useStore((s) => s.startRecording);
  const stopRecording = useStore((s) => s.stopRecording);
  const clearSamples = useStore((s) => s.clearSamples);

  const perLabel = LETTERS.map((l) => samples.filter((s) => s.label === l).length);
  const canRecord = signer.trim().length > 0 && label.trim().length > 0;
  const savePath = mode === 'fingerspell' ? 'ml/data/fingerspell_<lang>/' : 'ml/data/words_<lang>/';

  return (
    <section className="grid gap-3 text-sm">
      <div className="flex gap-2 items-center">
        <label htmlFor="signer" className="text-ink-2 w-16">Signer</label>
        <input
          id="signer"
          value={signer}
          onChange={(e) => setSigner(e.target.value)}
          placeholder="name or handle (required)"
          className="flex-1 bg-transparent border-b border-rule-strong px-1 py-1 focus:border-ink focus-visible:outline-none"
        />
      </div>

      {mode === 'fingerspell' ? (
        <div className="flex flex-wrap gap-1">
          {LETTERS.map((l, i) => (
            <button
              key={l}
              type="button"
              onClick={() => setLabel(l)}
              className={`w-9 h-10 rounded-[2px] g-mono border flex flex-col items-center justify-center ${
                label === l
                  ? 'bg-inverse text-on-inverse border-transparent'
                  : 'border-rule-strong text-ink-2 hover:text-ink'
              }`}
            >
              <span className="text-sm leading-none">{l}</span>
              <span className="text-[9px] opacity-70 leading-none mt-0.5">{perLabel[i]}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <label htmlFor="word-label" className="text-ink-2 w-16">Label</label>
          <input
            id="word-label"
            value={label}
            onChange={(e) => setLabel(e.target.value.toUpperCase().replace(/\s+/g, '-'))}
            placeholder="e.g. HELLO, THANK-YOU, YES"
            className="flex-1 bg-transparent border-b border-rule-strong px-1 py-1 g-mono focus:border-ink focus-visible:outline-none"
          />
          <span className="text-xs text-ink-3">
            {samples.filter((s) => s.label === label).length} taken
          </span>
        </div>
      )}

      <div className="flex gap-2 items-center flex-wrap">
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={!canRecord}
          className={`g-btn press px-3 py-1.5 ${recording ? '!bg-danger' : ''}`}
        >
          {recording ? `Stop (${bufferLen} frames)` : `Record ${label || '…'}`}
        </button>
        <span className="text-ink-2">{samples.length} samples buffered</span>
        <button
          type="button"
          onClick={() => download(samples, signer, mode)}
          disabled={samples.length === 0}
          className={"g-ghost press ml-auto px-3 py-1.5"}
        >
          Download JSONL
        </button>
        <button
          type="button"
          onClick={clearSamples}
          disabled={samples.length === 0}
          className="g-quiet px-2 py-1.5 hover:!text-danger"
        >
          Clear
        </button>
      </div>

      <p className="text-xs text-ink-3">
        Save downloads under <code className="text-ink-2">{savePath}</code>.
        Spec: <code className="text-ink-2">ml/feature_spec.json</code> (v{FEATURE_SPEC_VERSION}).
        {mode === 'fingerspell'
          ? ' J and Z need motion: record about 2 s while signing.'
          : ' Record ~2 s per word-sign, ~10+ takes per label. Then run: uv run ml/train.py --data ml/data/words_<lang> --out public/models/words_<lang>.'}
      </p>
    </section>
  );
}

// ponytail: memoized — parent re-renders every predicted frame.
export const CaptureControls = memo(CaptureControlsImpl);
