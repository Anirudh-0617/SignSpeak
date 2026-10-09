# SignSpeak — session handoff

**Date paused:** 2026-08-14. (Recognition work paused 2026-08-09; §2 added since.)
**Mode:** ponytail full.
**Resume with:** `/ponytail` then read this file first.
**Previous handoff:** 2026-08-08 (`861b3f1`) — superseded, merged forward below.
**HEAD:** `21f878a`. Build + lint clean. **Uncommitted:**
`docs/OMNIROUTE_PANEL.md`, `public/og-image.png`, `index.html`, this file.

**Done 2026-08-15:** step 0 (design skills personal) · step 5 (og-image).
**Next, in order:** step 1 — browser verification, the oldest open risk and the
one thing here I can't do for you → then the three decisions in §2.

---

## Legend
- ✅ shipped and verified
- 🆕 shipped this session
- 🟡 shipped but **unverified in browser**
- ⏳ blocked or explicitly deferred
- ⬜ not started

---

## ⚠️ Read this first

**1. The HELLO investigation is closed, and the answer is not what we assumed.**
Anirudh recorded 7 HELLO clips on his own camera. They proved the model
**already recognises his HELLO in 40 of 42 held-out frames at p≈1.00**.
Recognition was never the blocker. HELLO fails to *commit* because each clip
has only 7–24 frames with a hand in them, against a 700 ms dwell + 700 ms vote
window. Stop trying to fix HELLO by improving the model — see §1 below for the
three fixes already tried and rejected with numbers.

**2. Six commits are still unverified in a browser.** Four from 2026-08-08
(landmark contrast, type system, letter settle, `both`-mode motion) plus this
session's. None of it has been looked at rendered. Cheapest risk to retire.

**3. Do not put `ml/data/user_clips/imported.jsonl` into `ml/data/words_asl/`.**
`train.py` globs that directory. Measured over 4 seeds, including those clips
drops mean accuracy **0.577 → 0.512**. The README in that folder carries the
table.

**4. Do not change the Transcribe default mode.** A previous session switched it
to `words`; it broke fingerspelling and was reverted. `both` mode now works, so
that's the answer instead of a new default.

---

## Phase status

| Phase | State | Notes |
|---|---|---|
| 0–13.7 | ✅ | Foundation → perception → classifier → MVP UI → pose overlay → tutorial |
| 14 · Data expansion | ⏳ | Recording pipeline now exists (`ml/import_refclips.py`). See §1 for what to record |
| 15 · face+pose in classifier | ⏳ | Blocked on Phase 14 volume |
| 16 · UI polish (app) | ✅ | Tokens, a11y, Spinner/Alert, code-split |
| 17 · Landing page | ✅ | Re-skinned — see 19 |
| 18 · UX polish w/ ui-ux-pro-max | 🟡 | Installed, partially applied |
| 19 · Design re-direction | 🟡 | Type system + violet identity + hero rework. `ad9b858` |
| 20 · Overlay accessibility | 🟡 | Landmark contrast + form separation. `b389d6f` |
| 21 · Recognition feel | 🟡 | Letter settle + `both`-mode arbitration. `0feeffd`, `eac5f91` |
| **22 · In-domain clip pipeline** | 🆕 | Importer + 7 clips + the finding that closed HELLO. `602e811`, `d93b005` |

---

## §1 · The HELLO finding (this session) — read before touching recognition

Seven clips, Anirudh's camera, imported via the new `ml/import_refclips.py`.

**What they proved:** on held-out clips the current model calls HELLO correctly
in **40/42 frames at p≈1.00**. The model is fine. Each recording only holds
**7–24 hand frames** (0.23–0.8 s) — the hand arrives late and recording stops
~0.3 s later, so the clips capture the tail of the motion and little else.

**Three fixes tried, all rejected by measurement:**

| attempt | result |
|---|---|
| Lower the words dwell | **0/7** at every setting on the live model; corpus false commits 406 → 580 |
| Hold the pose after signing | **2/7**; the rest drift to YES/DRINK — a frozen hand is out-of-distribution for a motion model |
| Retrain including the clips | **Worse.** 4 seeds, mean **0.577 → 0.512** |

⚠️ The retrain looked like a win on one seed (0.565 → 0.635) before three more
seeds killed it. This is the second time a single seed nearly shipped a false
conclusion. **Always run ≥3.**

**Live model NOT retrained. Smoother NOT retuned.** Neither survived checking.

**Aspect ratio is 4:3, by measurement.** RefClip stores raw landmarks, so the
ratio has to be reapplied at import. At 4:3 the clips score p(HELLO)=1.00; at
16:9 they collapse to ~0. `--aspect-ratio` on the importer if the camera changes.

**What to record next (the actionable ask):** the **whole** sign with the hand
in frame throughout — rest → sign → rest — so clips resemble WLASL (29–94
frames of continuous hand presence). And spread across several glosses rather
than stacking one, or class balance tips again (that's what caused the
regression above).

---

## What shipped in the previous session (2026-08-08) — all still 🟡 unverified

Full detail is in `git log`; the essentials:

- **`both` mode letters never committed** (`eac5f91`). The gate compared the
  words model's raw confidence to 0.4, but that model returns 1.00 on 100% of
  letter frames, so every letter commit was skipped. Replaced with **motion**
  (a letter is a hold, a word sign is a trajectory). ⚠️ `MOTION_IS_WORD` is the
  one genuinely uncalibrated number in the codebase — only 4 usable hold
  windows exist to fit it. Raise if words stop landing, lower if stray letters
  appear mid-sign. J and Z stay unavailable in `both` mode (drawn with motion).
- **Letters settle before committing** (`0feeffd`). Signing A printed S first;
  the vote was a plurality, so the leader could commit mid-transition. Now needs
  ≥70% of the window. `LiveLetter` draws the hold as a filling bar, so a wrong
  letter is visible for ~650 ms and correctable. Does **not** fix a genuinely
  misread letter held 600 ms+.
- **Landmark overlay contrast** (`b389d6f`). All six pairs failed 3:1; hands
  were at **1.03:1**. Hands now `#ffe066` / `#5b3df5` = 4.69:1, pose and face
  separated by form, every stroke on a dark halo (the overlay sits on live
  video, where dark colours fall to ~1.2:1 against a mid-grey shirt).
- **Type system + violet identity** (`ad9b858`). Codebase had **zero font
  declarations**; the palette was a documented AI default (cream + terracotta).
  Now Bricolage Grotesque / Public Sans / JetBrains Mono, periwinkle ground,
  `/app` following via the Tailwind `--color-*` remap with no component edits.

Design direction doc: **https://claude.ai/code/artifact/a7152204-042e-4d1c-b293-6706c7321d0e**

---

## Ponytail review — **applied 2026-08-15**, see next-steps §4

Original estimate was −40 lines. Actual: **−22**, and the difference is the
point — two of the six "cuts" were wrong on inspection (`handColor` has a real
caller; the `MOTION_IS_WORD` comment is load-bearing knowledge), and one is
your open decision (`tokens.type`).

Imports from `tokens.ts` today: `focusRing` (7 files), `landmarkColors` (2),
`chip` (2), `landmarkHalo` (1). Everything else there is unreferenced.

❗ **Carry this:** a previous session's edits to `tokens.type` (`h1`/`h2`/`h3` →
`font-display`, `label` → `gloss`) **did nothing** — nothing imports that
export. A grep reported "23 uses"; it was matching `import type {…}`. The
landing typography works because those were direct `className` edits.
**`tokens.type` is not the lever for app headings.**

---

## §2 · Panel skill + OmniRoute — added 2026-08-14

Two new docs, **neither applied to the codebase**:

**`~/.claude/skills/panel/SKILL.md`** 🆕 — personal skill, works in every
project. Six staged subagent panels: RECON / DECIDE / DESIGN / BUILD / REVIEW /
SHIP, plus an AI-projects panel. Each names exact agents (all 31 `gsd-*` verified
to exist), what comes back, and **when to skip** — the skip lines are the point,
since ~25 cold-start spawns is the default failure mode. Trigger: `/panel`,
`/panel review`, etc.

⚠️ **Blocker found:** all 9 design/a11y skills (`frontend-design`,
`accessibility`, `ui-ux-pro-max`, `design`, `design-system`, `ui-styling`,
`brand`, `slides`, `banner-design`) plus `find-skills` are **project-scoped to
`~/Documents/101`**. In a new project they don't exist, so Panel 3 · DESIGN
degrades silently. Copy commands are in the skill's Prerequisites section. **Do
this first tomorrow — it's ~2 min and the skill is partly inert until it's done.**

**`docs/OMNIROUTE_PANEL.md`** — the 7-step plan (§7) and the quota-fallback
runbook (§8). Two verified traps: `cc/claude-*` runs on **the same account as
this session** so it's dead exactly when needed; `gh/*` models list but return
400. Working fallback is `auto/best-reasoning` → antigravity (`rudhani03@`,
independent quota). Run `omniroute setup-claude` **while quota is healthy**.

Open decisions from that doc: tests yes/no · free-only or paid models ·
`tokens.type` delete or adopt.

---

## Next steps (in order)

### 0. ✅ Design skills made personal — done 2026-08-15
All 10 copied into `~/.claude/skills/` with `cp -RL`, so the three that were
symlinks into `~/Documents/.agents/skills/` are now real dirs. `/panel` has a
full DESIGN seat everywhere. **Not copied:** `ui-ux-pro-max-skill` — 24 MB with
no `SKILL.md`; it's a source bundle, not a skill.

### 1. 🟡 Browser-verify the six unverified commits — **the real work, still open**
Dev server runs clean (`:5173`, build 411 ms, lint clean) — but none of this is
visual verification. Checklist unchanged, and it needs a human at a screen.
- `/app` in **both** themes — the violet remap has never been seen rendered
- Sign a letter: does the hold bar fill and land? Is 650 ms right?
- `both` mode: do letters commit now? Do words still commit?
- Camera overlay: is the halo too heavy? `lineWidth: 7` in `landmarkDraw.ts`
- Landing: fonts loading, hero figure, both themes

### 2. Tune `MOTION_IS_WORD` from live use — ~2 min after step 1
The one number today's work leaves genuinely uncalibrated. Direction documented
in the source comment.

### 3. Record clips that capture whole signs — the only real accuracy lever
Pipeline is built and proven. See §1 for what makes a clip usable. Spread
across glosses; don't stack one class.

### 4. ✅ Ponytail cuts applied 2026-08-15 — partially, on purpose
Build + lint clean after. **Verified before cutting**, since the recorded lesson
is that a symbol grep lied here once: counting `\bcolors\b` returns **17**, but
all 17 are Tailwind's `transition-colors` class. The authoritative check is the
import list — only `chip`, `focusRing`, `landmarkColors`, `landmarkHalo` are
ever imported from `tokens.ts`.

| Cut | Done? |
|---|---|
| `tokens.colors` (14 lines) | ✅ deleted — 0 imports |
| `tokens.spacing` (6 lines) | ✅ deleted — 0 imports |
| `--l-surface-2` × 2 | ✅ deleted — 0 `var()` refs |
| `tokens.type` | ⏸️ **kept — your fork.** Now carries a comment saying nothing imports it and why it's still there |
| `handColor()` | ❌ **not cut.** Handoff called it "one-line ternary, one caller" — true, but it *is* imported by `CameraView.tsx:10` and called at `:134`. Inlining it lengthens an already-long call and drops the name explaining the left/right mapping. Naming earns its keep |
| `useLiveLetter.ts` 22-line comment | ❌ **not cut.** It's the calibration record for `MOTION_IS_WORD` — that 0.012 came from 4 usable windows and needs tuning. Step 2 *is* tuning it, so this comment is step 2's instructions. Ponytail deletes code that doesn't earn its keep, not the knowledge that stops a mistake repeating |

### 4b. 🆕 Blank first paint on every route — fixed 2026-08-15
Found in the dev-server log, not by looking for it. React Router warned **"No
`HydrateFallback` element provided"** twice. Cause: all three routes in
`routes.tsx` are `lazy`, so on a cold visit the router renders `null` — a blank
white page until the chunk downloads. Worst on `/`, which is the first
impression, and worst again on a slow connection.

Added `src/ui/RouteFallback.tsx` (reuses the existing `Spinner`, paints
`--l-bg`) and wired it as `HydrateFallback` on all three routes. Its own file
because `routes.tsx` exports `router`; defining a component beside a
non-component export trips `react(only-export-components)` and breaks fast
refresh — lint caught that, and it's why the first attempt was moved.

🟡 **Unverified in browser.** Build + lint clean, but the fallback is visible
only during chunk load — throttle the network to actually see it.

### 5. ✅ `/og-image.png` — fixed 2026-08-15
Was genuinely missing. ⚠️ Note for future checks: `curl` returned **200**,
because Vite serves the `index.html` fallback for unknown paths. Only
`Content-Type: text/html` gave it away — **check content-type, not status.**

Generated at `public/og-image.png` (1200×630, 310 KB) from the project's own
`public/reference-signs/HELLO.json` — real MediaPipe landmarks, real hand
topology, app palette (`#a78bfa` bones, `#ffe066` joints on `#14121f`).
Regenerator kept at `scratchpad/genog.mjs`; renders HTML → headless Chrome.
Also added `og:image:width/height/alt` + `og:site_name`.

⚠️ **Still relative** (`/og-image.png`). Facebook resolves that against the page
URL; LinkedIn and Slack are stricter. There's no production domain anywhere in
the repo, so it can't be made absolute yet — **swap it at deploy time.**

### 6. Per-gloss thresholds
`PASS_CONFIDENCE.words = 0.4` was tuned at **23** classes; there are now 33.

---

## Cleanup (needs explicit OK)

- `public/models/words_asl.nchunks1.bak` — broken nChunks=1 model
- `public/models/words_asl.pre-handsonly.bak` — rollback point
- `ml/data/fingerspell/round1.jsonl` — 1.5 MB of real user capture data.
  **Not touching without an explicit `rm` instruction.** Load-bearing: the only
  real held-letter data, used to calibrate the motion threshold.
- `ml/data/user_clips/` — **now version-controlled** (1 MB, irreplaceable).
  Corpora stay ignored via `ml/data/*` + `!ml/data/user_clips/`.

---

## Known open items

1. **HELLO still won't commit in practice** — root cause understood (§1), not
   fixable by tuning. Needs clips that capture whole signs.
2. **`MOTION_IS_WORD` uncalibrated** — 4 usable hold windows in the corpus.
3. **J and Z suppressed in `both` mode** — drawn with movement.
4. **A genuinely misread letter still commits** — smoothing can't fix a
   classifier that's confidently wrong for 600 ms+.
5. **App light mode never visually verified.**
6. ~~`/og-image.png` 404s~~ — fixed 2026-08-15. Remaining: make the URL absolute
   once a domain exists.
7. **Eval is underpowered** — 62-clip test set, ±0.10 noise floor.
8. **Fonts load from Google Fonts CDN** — first paint shows fallbacks.

---

## Files worth reopening

- `HANDOFF.md` — this file
- `ml/data/user_clips/README.md` — why the clips aren't in the training dir
- `ml/import_refclips.py` — new; RefClip → trainable samples, 4:3 default
- `src/recognition/useLiveLetter.ts` — motion arbitration, Smoother config
- `src/recognition/smoothing.ts` — `minShare`, `hold`
- `src/ui/landmarkDraw.ts` — halo + form rules, single source for the overlay
- `src/ui/tokens.ts` — 3 dead exports, see ponytail findings
- `src/index.css` — type roles, `--l-*`, both Tailwind remap branches
- `ml/train.py` — `dedupe()`, `--random-split`, `--keep-duplicates`, synth guard

---

## Reminders / conventions

- **Ponytail active every response.** Ladder before writing code.
- **`graphify query "..."` before grepping source.** Hook enforces it.
- **Never trust a single split seed** — ±0.10 noise floor; run ≥3. This has now
  nearly shipped a false conclusion **twice** (mirror augmentation, and the
  clip retrain).
- **Verify greps before believing them.** `--include=*.tsx` fails silently under
  zsh; `\btype\b` matches `import type` statements. Both produced wrong counts.
- **Don't let data land in a globbed training dir by accident.** `train.py`
  globs `--data/*.jsonl`; `--synth` used to overwrite the live model. Same class
  of footgun, both now guarded.
- **Word-sign retrains must carry the tuned flags** —
  `--n-chunks 5 --augment 16 --hidden 128 64 --hands-only --random-split`.
- **Theme is universal** — `data-theme` on `<html>` via `src/ui/theme.ts`.
- **ASL grammar:** no IS/AM/THE. Templates express ASL sign order.
- **User email:** `anirudhannaboina1@gmail.com`.
