// ponytail: dev tools (training-data capture, reference-clip recording, the
// blendshape readout) are hidden unless the URL carries ?lab. They're for
// building the dataset, not for someone trying the app. Read once per load.
export const LAB =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('lab');

// Phones/tablets: touch-first and usually thermally limited, so the camera runs
// hands + pose only (no face model). ?lab keeps the full pipeline so the
// blendshape readout still works on a device.
export const LITE =
  typeof window !== 'undefined' && !LAB && window.matchMedia('(pointer: coarse)').matches;
