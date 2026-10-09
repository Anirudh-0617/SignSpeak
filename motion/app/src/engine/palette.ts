import { hexToLinear } from './util';

// SignSpeak "Gloss" palette (src/index.css --g-*): graphite, paper-white text, and one
// highlighter yellow that only ever marks the sign being made now. Role names are the
// pdoom engine's, so shaders and the _vo toolkit pick the palette up unchanged.
export const HEX = {
  ink: '#16181B', // --g-bg
  ink2: '#0E1012', // --g-plate: the figure stage, a step below the page
  graphite: '#4A5058', // hairlines, construction
  ash: '#8D939B', // --g-text-3
  bone: '#ECEEF0', // --g-text
  signal: '#FFE066', // --g-mark: the highlighter
  ember: '#FFF0A8', // the highlighter's hot core (pen head)
  blood: '#B8962A', // the highlighter's shadow
  acid: '#AAB0B7', // --g-text-2 (no second accent in Gloss)
  violet: '#5B3DF5', // right-hand landmarks (src/ui/tokens.ts landmarkColors)
  slate: '#94A3B8', // pose landmarks
} as const;

export type PaletteKey = keyof typeof HEX;

/** Linear RGB triplets for GL uniforms. */
export const LIN: Record<PaletteKey, [number, number, number]> = Object.fromEntries(
  Object.entries(HEX).map(([k, v]) => [k, hexToLinear(v)]),
) as Record<PaletteKey, [number, number, number]>;

/** CSS rgba() for Canvas2D. */
export function rgba(key: PaletteKey | string, a = 1): string {
  const hex = (HEX as Record<string, string>)[key] ?? key;
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
