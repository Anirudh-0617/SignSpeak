// SignSpeak — in-call feasibility probe (Phase 18, step B1).
//
// Paste this whole file into the DevTools console of a tab that is IN a call
// (Google Meet, Teams web, or Zoom web), with your camera ON.
//
// It answers the three questions that decide whether the extension approach
// works at all, before any extension code gets written:
//
//   1. Can we find the self-view <video> and read its pixels?
//      If yes, we never call getUserMedia — no second permission prompt, no
//      camera contention, and landmarks come from the exact pixels the other
//      participants see. This is the cheap path and it deletes the plan's
//      biggest listed risk.
//
//   2. What aspect ratio is that video?
//      NOT cosmetic. The models were trained on 4:3 landmarks. The same clip
//      scores p(HELLO)=1.00 at 4:3 and ~0 at 16:9. If the call client hands us
//      16:9, normalize() must be told, or recognition silently collapses.
//
//   3. Is the element readable, or is the canvas tainted?
//      MediaPipe draws the element into a GPU texture. A tainted element would
//      make that throw, and would mean falling back to MAIN-world injection.
//
// Everything above is READ-ONLY and prompts nothing. The second-camera test is
// deliberately NOT automatic, because it triggers a permission prompt — run
// `__signspeak.testSecondCamera()` by hand if question 1 fails.

(() => {
  const ok = (s) => `%c PASS %c ${s}`;
  const no = (s) => `%c FAIL %c ${s}`;
  const okCss = ['background:#16a34a;color:#fff;font-weight:bold', 'color:inherit'];
  const noCss = ['background:#dc2626;color:#fff;font-weight:bold', 'color:inherit'];

  const videos = [...document.querySelectorAll('video')];
  console.log(`%cSignSpeak call probe — ${location.host}`, 'font-size:14px;font-weight:bold');
  console.log(`found ${videos.length} <video> element(s)\n`);

  if (videos.length === 0) {
    console.log(...[no('No <video> at all. Are you actually in the call, camera on?'), ...noCss]);
    return;
  }

  // Heuristic for "this is me": a local camera track carries the device name in
  // track.label ("FaceTime HD Camera"); remote WebRTC tracks normally don't.
  const describe = (v, i) => {
    const stream = v.srcObject;
    const tracks = stream && stream.getVideoTracks ? stream.getVideoTracks() : [];
    const labels = tracks.map((t) => t.label).filter(Boolean);
    const ar = v.videoHeight > 0 ? v.videoWidth / v.videoHeight : 0;
    const arName =
      ar === 0 ? 'n/a' : Math.abs(ar - 4 / 3) < 0.02 ? '4:3' : Math.abs(ar - 16 / 9) < 0.02 ? '16:9' : 'other';

    let readable = null;
    let readErr = '';
    if (v.videoWidth > 0) {
      try {
        const c = document.createElement('canvas');
        c.width = 32;
        c.height = 32;
        const ctx = c.getContext('2d');
        ctx.drawImage(v, 0, 0, 32, 32);
        ctx.getImageData(0, 0, 1, 1); // throws if tainted
        readable = true;
      } catch (e) {
        readable = false;
        readErr = String(e && e.name ? e.name : e);
      }
    }

    return {
      idx: i,
      kind: !stream ? 'no srcObject' : labels.length ? 'LIKELY SELF' : 'likely remote',
      size: `${v.videoWidth}x${v.videoHeight}`,
      aspect: `${ar ? ar.toFixed(3) : '-'} (${arName})`,
      readyState: v.readyState,
      paused: v.paused,
      trackLabel: labels[0] || '',
      pixelsReadable: readable,
      readErr,
    };
  };

  const rows = videos.map(describe);
  console.table(rows);

  const self = rows.find((r) => r.kind === 'LIKELY SELF') || rows.find((r) => r.readyState >= 2);
  if (!self) {
    console.log(...[no('No usable video found. Try toggling your camera off/on, then re-run.'), ...noCss]);
    return;
  }

  const v = videos[self.idx];
  console.log(`\n--- verdict for video[${self.idx}] (${self.kind}) ---`);

  if (self.pixelsReadable === true) {
    console.log(...[ok('Q1 pixels readable — MediaPipe can consume this element directly.'), ...okCss]);
    console.log('     => no second getUserMedia needed. Plan risk #1 is removed.');
  } else if (self.pixelsReadable === false) {
    console.log(...[no(`Q1 canvas TAINTED (${self.readErr}) — cannot read this element.`), ...noCss]);
    console.log('     => fall back to MAIN-world injection, or to a second getUserMedia.');
  } else {
    console.log(...[no('Q1 no frame data yet (videoWidth 0). Camera may still be starting.'), ...noCss]);
  }

  // Q2 used to assert "must be 4:3", which cried wolf. Measured 2026-09-24:
  // the x/y hand geometry is EXACTLY invariant to aspect ratio as long as the
  // true ratio reaches normalize(), which VideoElementSource computes per-frame
  // from these very fields. So the ratio only needs recording, not matching.
  const ar = v.videoHeight > 0 ? v.videoWidth / v.videoHeight : 0;
  if (ar > 0) {
    console.log(...[ok(`Q2 aspect ${ar.toFixed(3)} read OK from ${self.size} — normalize() gets this per-frame.`), ...okCss]);
    if (Math.abs(ar - 4 / 3) >= 0.02) {
      console.log('     note: not 4:3, which is fine — x/y features are AR-invariant.');
      console.log('     only z is un-corrected; see the comment in perception/normalize.ts.');
    }
  } else {
    console.log(...[no('Q2 no dimensions yet — camera still starting?'), ...noCss]);
  }

  // Rough frame-rate sample, so CPU headroom (risk #2) starts from a number.
  let frames = 0;
  const t0 = performance.now();
  let lastT = -1;
  const tick = () => {
    if (v.currentTime !== lastT) {
      lastT = v.currentTime;
      frames++;
    }
    if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
    else {
      const fps = (frames / ((performance.now() - t0) / 1000)).toFixed(1);
      console.log(`\nQ3 source framerate ≈ ${fps} fps over 2s (baseline, before MediaPipe load).`);
      console.log('Probe done. Copy this whole output into docs/PHASE_18_MEET.md §B results.');
    }
  };
  requestAnimationFrame(tick);

  window.__signspeak = {
    videos,
    rows,
    self: v,
    // Only run this if Q1 failed — it triggers a camera permission prompt and
    // tests whether the OS/driver tolerates two consumers of one camera.
    async testSecondCamera() {
      console.log('requesting a SECOND camera stream alongside the call...');
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        const t = s.getVideoTracks()[0];
        const st = t.getSettings();
        console.log(...[ok(`second stream OK — ${st.width}x${st.height} "${t.label}"`), ...okCss]);
        console.log('     => check the call still shows YOUR video, not a black tile.');
        s.getTracks().forEach((x) => x.stop());
      } catch (e) {
        console.log(...[no(`second stream refused: ${e && e.name} ${e && e.message}`), ...noCss]);
        console.log('     => camera contention is real on this machine. MAIN-world path it is.');
      }
    },
  };
})();
