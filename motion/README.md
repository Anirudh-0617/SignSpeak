# SignSpeak explainer (motion as code)

A 57-second, 1920×1080 / 60 fps explainer of SignSpeak, built on the "Motion as Code" kit below.
Every frame is a function of time, cut to the voiceover's word timings.

- **Voiceover**: Kokoro-82M (Apache 2.0, runs locally), voice `af_heart`. The script lives in
  `analysis/align_vo.py` (`SCRIPT`, `SPOKEN`), and `analysis/tts_vo.py` reads the same list, so the
  voiceover and the alignment always use the same text.
- **Plates**: `app/src/scenes/ss_*.ts`. Shared Gloss toolkit: `app/src/scenes/_gloss.ts`. It provides the app's
  fonts, real landmark clips from `data/signs/` (copied from `public/reference-signs/`), the highlighter
  (yellow = the sign being made now, nothing else), and burned-in captions.
- **Honest numbers**: every figure comes from `src/landing/content.ts`. The model output shown in the
  classify plate is the live fingerspell model run on the reference stills (`analysis/predict_signs.py`).
- **Palette**: `app/src/engine/palette.ts`, mapped to the Gloss `--g-*` tokens.

```sh
# Kokoro weights: kokoro-v1.0.onnx + voices-v1.0.bin from github.com/thewh1teagle/kokoro-onnx releases
uv run --no-project --python 3.12 --with kokoro-onnx --with soundfile --with numpy python analysis/tts_vo.py --model <dir>
uv run --no-project --with onnxruntime --with numpy python analysis/align_vo.py
uv run --no-project --with numpy python analysis/audio_vo.py
uv run --no-project --with numpy python analysis/predict_signs.py
cd app && bun install && bunx vite --port 5180          # preview (5173 is the SignSpeak app)
bun scripts/render.ts video --samples auto --min-samples 2 --max-samples 8 --crf 17 --out ../out/signspeak.mp4
cd .. && uv run --no-project --with numpy python analysis/sfx_mix.py
ffmpeg -i out/signspeak.mp4 -i out/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest out/signspeak_final.mp4
```

The kit's original plates (`hook.ts` … `verdict.ts`) stay in `app/src/scenes/` as reference. They are no
longer in the timeline.

---

# Motion as Code — voiceover video (original kit)

A 92.6-second, 1920×1080 / 60 fps explainer: *"What if I told you… you can create motion graphics like this without even opening After Effects?"*. Every frame is a deterministic function of time, rendered from code. The live preview in the browser and the exported MP4 are identical.

The visual language is the engine and style of **[pdoom-video](https://github.com/mexicat/pdoom-video)** by mexicat (Giacomo Magnanini, MIT licence, see `LICENSE.pdoom-engine`). That covers:
- the palette: ink, bone, signal orange;
- Archivo, IBM Plex Mono and Cormorant Garamond, plus the single-stroke plotter fonts;
- the spark motif, the graph-paper construction sheets and the bone-paper forms;
- the post-processing (bloom, halation, grain).

The nine plates themselves are new and written for this voiceover.

## Layout

- `audio/voiceover.mp3`: the voiceover (ElevenLabs).
- `data/lyrics.json`: word-level timings of the script, made by `analysis/align_vo.py`. It runs CTC forced alignment with wav2vec2-base-960h (quantized ONNX), then refines word edges against the audio's silences.
- `data/audio.json`: voice loudness envelopes and word onsets, plus a nominal beat grid, made by `analysis/audio_vo.py`.
- `app/`: the renderer (TypeScript + three.js, bun + Vite).
  - `src/engine/`: the pdoom-video engine (unchanged except the audio path).
  - `src/scenes/_vo.ts`: shared toolkit (2D camera, the plotter/pen, world-space karaoke, graph paper).
  - `src/scenes/*.ts`: the plates, listed below.
  - `src/timeline.ts`: when each plate plays (cuts sit in the pause before each line).
  - `scripts/render.ts`: offline renderer (headless Chrome → raw frames → ffmpeg).
- `out/`: renders.

| Plate | Time | Script |
|---|---|---|
| `hook` | 0.0–9.9 | What if I told you… / And no — not an After Effects MCP |
| `model` | 9.9–19.2 | This is Claude Opus 5.5 / Instead of controlling After Effects… |
| `prompt` | 19.2–29.7 | For example: "Create a 15-second cinematic…" |
| `crazy` | 29.7–35.4 | And this is where it gets crazy / not an MP4 directly |
| `code` | 35.4–48.0 | It writes the animation itself as code… defined mathematically over time |
| `frames` | 48.0–52.1 | rendered frame by frame and turned into a video |
| `pipeline` | 52.1–62.6 | After Effects → layers → … vs Prompt → code → render → video |
| `edits` | 62.6–80.6 | procedural / the four commands / hundreds of keyframes |
| `verdict` | 80.6–92.6 | Does this replace After Effects? Not really… pretty insane (loops to frame 0) |

## Requirements

You need [bun](https://bun.sh), Google Chrome and ffmpeg with libx264. To re-align a new voiceover you also need Python with uv; run it as `python -m uv`.

## Preview

```sh
cd app
bunx vite
```

Open http://localhost:5173. Controls:

| Key | Action |
|---|---|
| space | play / pause |
| ← / → | seek ±1 s (±5 s with shift) |
| `,` / `.` | step one frame |
| `[` / `]` | previous / next plate |
| `l` | loop the current plate |
| `h` | hide the UI |

Add `?t=35` to the URL to start at 35 s.

## Render

```sh
cd app
bun scripts/render.ts video --samples auto --min-samples 4 --max-samples 12 --shutter 0.5 --crf 17 --out ../out/motion-as-code.mp4
```

- `--samples auto` adds motion blur adaptively, using more sub-frames where motion is fast.
- `--samples 4` is about 4× faster but shows stepped copies on fast moves.
- `--scale 2` renders 4K (3840×2160).

Stills and contact sheets are useful while editing:

```sh
bun scripts/render.ts stills --t 12.5,40.2 --only code --out ../out/wip
```

## Sound effects

There are 28 effects, generated with ElevenLabs Sound Effects v2 and stored in `audio/sfx/` as `name_1.mp3`, `name_2.mp3`… (alternate takes). The ElevenLabs flow is "Motion as Code — SFX library".

`analysis/sfx_mix.py` holds the cue sheet, about 500 cues derived from the same word timings the plates animate on. Each sound is placed on its transient, on its peak (whooshes) or on its end (risers and reverse sucks). The effects are ducked by up to 7 dB under the voice and the mix is loudness-normalised to −14 LUFS. No re-render is needed: rebuild the mix, then copy the picture and add the new audio.

```sh
python -m uv run --no-project --with numpy python analysis/sfx_mix.py
cd out
ffmpeg -i motion-as-code.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -shortest motion-as-code_sfx.mp4
ffmpeg -i motion-as-code_web.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest motion-as-code_sfx_web.mp4
```

To make an effect louder or quieter, change its `db` value in the cue sheet. To move one, change its time expression.

## Swapping the voiceover

1. Replace `audio/voiceover.mp3`.
2. Edit `SCRIPT` (and `SPOKEN` for numbers and acronyms) in `analysis/align_vo.py`.
3. Re-run the alignment and the audio analysis:

```sh
python -m uv run --no-project --with onnxruntime --with numpy python analysis/align_vo.py
python -m uv run --no-project --with numpy python analysis/audio_vo.py
```

The plates find their words by content (`lineOf` and `wordOf`). If you keep the same script, every animation re-times itself to the new read.
