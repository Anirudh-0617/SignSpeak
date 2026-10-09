import { useCallback, useState } from 'react';
import { CameraView } from './CameraView';
import { CaptureControls } from './CaptureControls';
import { Composer } from './Composer';
import { LandmarkLegend } from './LandmarkLegend';
import { SignGuide } from './SignGuide';
import { Transcript } from './Transcript';
import { LAB } from './lab';
import { useLiveLetter, type LiveMode } from '../recognition/useLiveLetter';
import { useStore } from '../state/store';
import type { FeatureFrame } from '../input/InputSource';

const MODES: { id: LiveMode; label: string }[] = [
  { id: 'fingerspell', label: 'Letters' },
  { id: 'words', label: 'Words' },
  { id: 'both', label: 'Both' },
];

// Desk layout. Camera is the large stage; the rail (what's being read now +
// the transcript) sits beside it and stays in view while the reference row
// below scrolls. On phones the order is camera, rail, reference, so the
// transcript is never below the lookup table.
export function Transcribe() {
  const pushFrame = useStore((s) => s.pushFrame);
  const [mode, setMode] = useState<LiveMode>('fingerspell');
  const live = useLiveLetter(mode);

  const liveHandleFrame = live.handleFrame;
  const handleFrame = useCallback(
    (f: FeatureFrame) => {
      pushFrame(f);
      liveHandleFrame(f);
    },
    [pushFrame, liveHandleFrame],
  );

  return (
    <div className="grid gap-x-10 gap-y-6 [grid-template-areas:'cam'_'rail'_'ref'] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[auto_1fr] lg:[grid-template-areas:'cam_rail'_'ref_rail']">
      <h1 className="g-sr">Transcribe</h1>

      <section aria-label="Camera" className="[grid-area:cam] grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div role="group" aria-label="Recognise" className="g-theme g-mono flex items-center gap-4 text-[13px]">
            {MODES.map((m) => (
              <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
          <LandmarkLegend />
        </div>
        <CameraView onFrame={handleFrame} />
      </section>

      <div className="[grid-area:rail] grid content-start gap-10 lg:sticky lg:top-20 lg:self-start">
        <Composer
          mode={mode}
          top={live.top}
          confidence={live.confidence}
          hold={live.hold}
          status={live.status}
          error={live.error}
        />
        <Transcript />
      </div>

      <div className="[grid-area:ref] grid gap-6">
        <SignGuide mode={mode} />
        {LAB && mode !== 'both' && (
          <details className="border-t border-rule pt-4">
            <summary className="g-gloss cursor-pointer text-[11px] text-ink-3 hover:text-ink">
              Capture training data
            </summary>
            <div className="mt-3">
              <CaptureControls mode={mode} />
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
