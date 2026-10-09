// ponytail: dev tools (training-data capture, reference-clip recording, the
// blendshape readout) are hidden unless the URL carries ?lab. They're for
// building the dataset, not for someone trying the app. Read once per load.
export const LAB =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('lab');
