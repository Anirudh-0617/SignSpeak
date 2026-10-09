import { memo } from 'react';
import { landmarkColors } from './tokens';

// ponytail: the overlay colours are meaningless to a first-time viewer, which
// is most of our judges. tokens.landmarkColors is the single source — the
// CameraView and ReferenceSkeleton draw calls read the same constants, so this
// key cannot drift out of sync with what's actually on screen.
//
// Each swatch draws the mark it actually stands for, because form now carries
// as much meaning as hue: the overlay separates pose and face from the hands by
// stroke weight and dot density, not colour (see landmarkDraw.ts). A row of
// identical dots would misrepresent that. Hands lead — they're the pair a
// viewer has to tell apart.
const ITEMS = [
  { color: landmarkColors.leftHand, label: 'left hand', mark: 'hand' },
  { color: landmarkColors.rightHand, label: 'right hand', mark: 'hand' },
  { color: landmarkColors.pose, label: 'body', mark: 'line' },
  { color: landmarkColors.face, label: 'face', mark: 'dots' },
] as const;

function Swatch({ color, mark }: { color: string; mark: 'hand' | 'line' | 'dots' }) {
  return (
    <svg viewBox="0 0 18 8" aria-hidden className="h-2 w-[18px] shrink-0 overflow-visible">
      {mark === 'dots' ? (
        [3, 9, 15].map((x) => <circle key={x} cx={x} cy="4" r="1" fill={color} />)
      ) : (
        <>
          <line
            x1="1"
            y1="4"
            x2="17"
            y2="4"
            stroke={color}
            strokeWidth={mark === 'hand' ? 3 : 1.5}
            strokeLinecap="round"
          />
          {mark === 'hand' && <circle cx="9" cy="4" r="2.5" fill={color} />}
        </>
      )}
    </svg>
  );
}

function LandmarkLegendImpl() {
  return (
    <ul
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3"
      aria-label="Overlay colour key"
    >
      {ITEMS.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <Swatch color={it.color} mark={it.mark} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

export const LandmarkLegend = memo(LandmarkLegendImpl);
