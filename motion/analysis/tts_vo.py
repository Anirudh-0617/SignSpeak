"""Voiceover with Kokoro-82M (Apache 2.0, local): one clip per script line, joined with pauses.

SCRIPT and SPOKEN come from align_vo.py so the read and the alignment can never drift apart. Lines in
the same plate get a short pause, a new plate (PLATE_STARTS) a longer one.

    python -m uv run --no-project --python 3.12 --with kokoro-onnx --with soundfile --with numpy \
        python analysis/tts_vo.py --model <dir with kokoro-v1.0.onnx + voices-v1.0.bin>
"""
import argparse, subprocess, sys
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

sys.path.insert(0, str(Path(__file__).resolve().parent))
from align_vo import SCRIPT, SPOKEN, ROOT, AUDIO  # noqa: E402

# first line of each plate (a longer breath before it)
PLATE_STARTS = {"SignSpeak reads it", "The camera finds", "A small neural", "Letters become", "Press Translate", "Still learning", "Fingerspelling scores", "Your camera feed"}


def tts_text(line: str) -> str:
    """The line as Kokoro should read it: SPOKEN forms for numbers and names, plain punctuation."""
    out = []
    for w in line.split(" "):
        if w in SPOKEN and SPOKEN[w]:
            tail = w[-1] if w[-1] in ".,?" else ""
            out.append(" ".join(SPOKEN[w]).lower() + tail)
        else:
            # glosses are display caps ("HELLO,"); read them as words, not spelled letters
            out.append(w.lower() if sum(c.isupper() for c in w) > 1 else w)
    return " ".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--voice", default="af_heart")
    ap.add_argument("--speed", type=float, default=0.95)
    a = ap.parse_args()
    m = Path(a.model)
    k = Kokoro(str(m / "kokoro-v1.0.onnx"), str(m / "voices-v1.0.bin"))
    sr = 24000
    parts = [np.zeros(int(0.6 * sr), np.float32)]
    for i, line in enumerate(SCRIPT):
        if i:
            gap = 0.8 if any(line.startswith(p) for p in PLATE_STARTS) else 0.38
            parts.append(np.zeros(int(gap * sr), np.float32))
        text = tts_text(line)
        y, sr = k.create(text, voice=a.voice, speed=a.speed, lang="en-us")
        print(f"{len(y) / sr:5.2f}s  {text}", file=sys.stderr)
        parts.append(y.astype(np.float32))
    parts.append(np.zeros(int(1.2 * sr), np.float32))
    wav = ROOT / "audio" / "voiceover.wav"
    sf.write(wav, np.concatenate(parts), sr)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-c:a", "libmp3lame", "-b:a", "192k", str(AUDIO)], check=True)
    wav.unlink()
    print(f"wrote {AUDIO}", file=sys.stderr)


if __name__ == "__main__":
    main()
