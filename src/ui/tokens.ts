// Landmark overlay colours. UI colours are the --g-* tokens in index.css,
// exposed to Tailwind as text-ink / bg-plate / bg-mark etc.

// Landmark overlay palette. Single source — CameraView and ReferenceSkeleton
// both draw through src/ui/landmarkDraw.ts, which is the only consumer.
//
// The two hands carry the entire luminance budget (#FFE066 vs #5B3DF5 =
// 4.69:1, up from 1.03:1 for the old pink/violet pair, which was the same
// colour to a projector, a greyscale capture, or a colourblind viewer).
//
// Pose and face are NOT separated by colour — they can't be. Four colours have
// to spread along one luminance axis while all staying legible on the stage,
// and those demands fight; every four-colour set measured left 4+ pairs under
// the 3:1 floor. They're separated by form instead (see landmarkDraw.ts):
// pose = thin lines with no joints, face = 1px dots, hands = thick + filled.
export const landmarkColors = {
  pose: '#94a3b8',      // slate — recedes behind the hands, reads as structure
  leftHand: '#ffe066',
  rightHand: '#5b3df5',
  face: '#22d3ee',
} as const;

// Drawn under every stroke. The overlay sits on live video, not a fixed dark
// stage: measured against a mid-grey shirt, every hand colour dark enough to
// separate from the bright one by luminance falls to ~1.2:1 and vanishes. The
// halo decouples legibility from whatever the camera sees, which is what makes
// the wide-contrast pair safe.
export const landmarkHalo = 'rgba(4,4,8,0.82)';
