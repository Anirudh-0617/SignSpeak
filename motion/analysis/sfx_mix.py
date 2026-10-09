"""Sound design for the voiceover video.

The cue sheet below is derived from data/lyrics.json — the same word times the plates animate on —
so every effect lands on its visual event. The sounds are the ElevenLabs library in audio/sfx/
(name_1.mp3, name_2.mp3 … alternate takes). Each sound is placed by its transient ('onset'), by its
loudest point ('peak', whooshes), by its end ('end', reverse sucks and risers) or as recorded
('raw', beds). Effects are ducked under the voice, then the whole mix is loudness-normalised.

    python -m uv run --no-project --with numpy python analysis/sfx_mix.py
Writes out/mix.wav (48 kHz stereo) and out/sfx_cues.json; mux with:
    ffmpeg -i out/motion-as-code.mp4 -i out/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -shortest out/…
"""
import json, re, subprocess
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SFX = ROOT / "audio" / "sfx"
SR = 48000
DUR = json.loads((Path(__file__).resolve().parent.parent / "data" / "audio.json").read_text())["duration"]

# ------------------------------------------------------------------ the script
LY = json.loads((ROOT / "data" / "lyrics.json").read_text(encoding="utf-8"))["lines"]
fold = lambda s: s.lower().replace("’", "'").replace("“", '"').replace("”", '"')
norm = lambda s: re.sub(r"[^a-z0-9()]", "", fold(s))


def line(q, nth=0):
    ls = [l for l in LY if fold(q) in fold(l["text"])]
    return ls[nth]


def W(lq, wq, nth=0):
    ws = [w for w in line(lq)["words"] if norm(w["w"]) == norm(wq)]
    return ws[nth]


def parts(w):
    return w.get("syl") or [[w["start"], w["end"]]]


def cut(q):
    l = line(q)
    i = LY.index(l)
    gap = l["start"] - LY[i - 1]["end"] if i else 1
    return l["start"] - min(0.18, max(0.04, gap * 0.45))


# ------------------------------------------------------------------ the library
MODE = {  # how a sound is placed relative to its cue time
    "whoosh_fast": "peak", "whoosh_soft": "peak", "reverse_suck": "end", "riser": "end",
    "spark_sizzle": "raw", "projector_run": "raw", "tape_rewind": "raw", "tape_ff": "raw", "scan_sweep": "raw", "spark_zip": "raw",
    "falling_pieces": "onset", "paper_slide": "onset",
}
_cache = {}


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def takes(name):
    if name == "tape_ff":  # the rewind, played backwards: a fast-forward
        return [t[::-1].copy() for t in takes("tape_rewind")]
    if name not in _cache:
        fs = sorted(SFX.glob(f"{name}_*.mp3"))
        if not fs:
            raise FileNotFoundError(f"no takes for {name}")
        out = []
        for f in fs:
            x = decode(f)
            x = x - x.mean()
            pk = np.abs(x).max() + 1e-9
            x = x / pk * 10 ** (-1 / 20)  # peak -1 dBFS
            out.append(x)
        _cache[name] = out
    return _cache[name]


def onset(x):
    """Start of the main transient: the first sample above half the peak, less 8 ms of attack
    (a soft pre-noise before the hit must not shift the hit off its frame)."""
    a = np.abs(x)
    idx = np.where(a > 0.5 * a.max())[0]
    return max(0, int(idx[0]) - int(0.008 * SR)) if len(idx) else 0


def peak_at(x):
    env = np.convolve(np.abs(x), np.ones(int(0.02 * SR)) / (0.02 * SR), mode="same")
    return int(np.argmax(env))


def resample(x, rate):
    if abs(rate - 1) < 1e-4:
        return x
    n = int(len(x) / rate)
    return np.interp(np.arange(n) * rate, np.arange(len(x)), x).astype(np.float32)


# ------------------------------------------------------------------ cues
CUES = []
_n = {}


def cue(t, name, db, pan=0.0, rate=1.0, take=None, length=None, fade=0.03, mode=None):
    """Place `name` at time t (seconds). take: 1-based take index (default: alternate)."""
    k = _n.get(name, 0)
    _n[name] = k + 1
    CUES.append(dict(t=float(t), name=name, db=float(db), pan=float(pan), rate=float(rate), take=take if take else None, k=k, length=length, fade=fade, mode=mode or MODE.get(name, "onset")))


def bed(name, t0, t1, db, pan=0.0, rate=1.0, fin=0.06, fout=0.12):
    CUES.append(dict(t=float(t0), name=name, db=float(db), pan=float(pan), rate=float(rate), take=1, k=0, length=float(t1 - t0), fade=fout, fin=fin, mode="bed"))


def jitter(i, a=0.05):
    """Deterministic ±a pitch jitter for repeated sounds."""
    return 1.0 + a * (((i * 7919) % 101) / 50.0 - 1.0)


def typing(name, t0, t1, db, pan=0.0, step=0.075, start=0):
    """Key strikes from t0 to t1 at ~step intervals (with a little swing)."""
    t, i = t0, start
    while t < t1 - 0.01:
        cue(t, name, db + (((i * 37) % 7) - 3) * 0.6, pan=pan, rate=jitter(i))
        t += step * (0.8 + 0.4 * (((i * 53) % 11) / 10.0))
        i += 1
    return i


# ------------------------------------------------------------------ SignSpeak cue sheet
# Sparse on purpose: one sound per thing that happens on screen, never a bed of noise. Highlighter =
# marker_strike (the sign being made now), commit = stamp/ui_tick, typing = key_click, cuts = paper.
for q in ["SignSpeak reads", "The camera finds", "A small neural", "Letters become", "Press Translate", "Still learning", "Fingerspelling scores", "Your camera feed"]:
    cue(cut(q), "paper_slide", -24)

# hook
cue(W("This is HELLO", "HELLO")["start"], "marker_strike", -13)
cue(W("just a gesture", "gesture")["start"], "whoosh_soft", -24)

# reads: the window, then one commit per loop of the clip (lt*0.85 + 0.6 crosses 40/fps + k*len)
r0 = cut("SignSpeak reads"); r1 = cut("The camera finds")
cue(W("SignSpeak reads", "SignSpeak")["start"], "ui_blip", -20)
fps, n = 29.97, 54
k = 0
while True:
    tc = r0 + ((40 / fps + k * n / fps) - 0.6) / 0.85
    if tc >= r1: break
    if tc > r0: cue(tc, "ui_tick", -18)
    k += 1

# landmarks: 21 point ticks, bones, the fly into the strip, the numbers typing in
f0, f1 = W("The camera finds", "finds")["start"], W("The camera finds", "points")["end"]
for i in range(21):
    cue(f0 + (f1 - f0) * i / 21, "pen_tick", -27 + (i % 3), rate=jitter(i, 0.08))
cue(W("The camera finds", "each")["start"], "pen_line", -22)
cue(W("Anchored to the wrist", "wrist")["start"], "scan_sweep", -24)
cue(W("Anchored to the wrist", "become")["start"] + 0.3, "whoosh_soft", -18)
typing("key_click", W("Anchored to the wrist", "126")["start"], W("Anchored to the wrist", "numbers")["end"], -27, step=0.06)

# classify
cue(W("A small neural", "small")["start"], "scan_sweep", -24)
cue(W("A small neural", "inside")["start"], "pen_line", -24)
cue(W("A small neural", "names")["start"], "ui_blip", -17)
cue(W("Hold a letter", "Hold")["start"] - 0.35, "whoosh_soft", -20)
cue(W("Hold a letter", "highlighter")["start"], "marker_strike", -14)
cue(W("Full means", "committed")["end"], "stamp", -14)

# transcript: five letters made and committed, then the transcript types in
t0, t1 = cut("Letters become") + 0.1, W("Letters become", "words")["start"] - 0.05
for i in range(5):
    cue(t0 + (t1 - t0) * i / 5, "marker_strike", -18, rate=jitter(i, 0.04))
cue(W("Letters become", "words")["start"], "whoosh_fast", -22)
tw0, tw1 = W("Words become an", "Words")["start"], W("Words become an", "editable")["end"]
for j in range(1, 4):
    tj = tw0 + (tw1 - tw0) * (j - 1) / 3
    typing("key_click", tj, tj + 0.22, -24, start=j * 5)

# translate
cue(W("Press Translate", "Translate")["start"], "mouse_click", -12)
cue(W("Press Translate", "becomes")["start"], "whoosh_soft", -19)
cue(W("Press Translate", "plain")["start"], "ui_blip", -19)

# practice
cue(W("Still learning", "Copy")["start"], "ui_tick", -20)
cue(W("Still learning", "scored")["start"], "riser", -24, mode="raw", length=0.9)
cue(W("Still learning", "live")["start"], "confirm_chime", -14)

# honest: the two counts tick up, the frame draws round both
for q, wq in [("Fingerspelling scores", "98.3%"), ("Word signs are early", "56.5%")]:
    w_ = W(q, wq)
    typing("ui_tick", w_["start"], w_["end"] - 0.15, -30, step=0.07)
cue(W("We tell you", "up")["start"], "pen_line", -20)

# outro
cue(W("Your camera feed", "never")["start"], "whoosh_soft", -21)
cue(W("Your camera feed", "leaves")["end"], "impact_small", -15)
cue(W("be understood", "SignSpeak")["start"], "impact_slam", -20)
cue(W("be understood", "Sign")["start"] + 0.5, "marker_strike", -18)


def main():
    n = int(DUR * SR)
    bus = np.zeros((2, n), np.float32)
    report = []
    for c in CUES:
        tk = takes(c["name"])
        x = tk[(c["take"] - 1) % len(tk)] if c["take"] else tk[c["k"] % len(tk)]
        x = resample(x, c["rate"])
        mode = c["mode"]
        if mode == "onset":
            x = x[onset(x):]
            start = c["t"]
        elif mode == "peak":
            start = c["t"] - peak_at(x) / SR
        elif mode == "end":
            start = c["t"] - len(x) / SR
        else:
            start = c["t"]
        if mode == "bed":
            L = int(c["length"] * SR)
            reps = int(np.ceil(L / len(x))) + 1
            x = np.tile(x, reps)[:L].copy()
            fi = int(c.get("fin", 0.06) * SR)
            if fi:
                x[:fi] *= np.linspace(0, 1, fi)
        if c.get("length") and mode != "bed":
            x = x[: int(c["length"] * SR)].copy()
        fo = min(len(x), int(c["fade"] * SR))
        if fo > 1:
            x[-fo:] *= np.linspace(1, 0, fo)
        g = 10 ** (c["db"] / 20)
        a = (c["pan"] + 1) * np.pi / 4
        i0 = int(round(start * SR))
        j0 = max(0, -i0)
        i0 = max(0, i0)
        seg = x[j0:]
        m = min(len(seg), n - i0)
        if m <= 0:
            continue
        bus[0, i0:i0 + m] += seg[:m] * g * np.cos(a)
        bus[1, i0:i0 + m] += seg[:m] * g * np.sin(a)
        report.append({**{k: c[k] for k in ("t", "name", "db", "pan", "rate", "mode")}, "start": round(start, 3)})
    # the voice
    vo = decode(ROOT / "audio" / "voiceover.mp3")[:n]
    vo = np.pad(vo, (0, n - len(vo)))
    # ducking: effects dip up to 7 dB while the voice is speaking (10 ms attack, 180 ms release)
    hop = int(0.005 * SR)
    env = np.sqrt(np.convolve(vo ** 2, np.ones(hop * 4) / (hop * 4), mode="same"))
    env = env / (np.percentile(env, 99) + 1e-9)
    sm = np.zeros_like(env)
    a_att, a_rel = np.exp(-1 / (0.010 * SR)), np.exp(-1 / (0.180 * SR))
    prev = 0.0
    for i in range(0, n, hop):  # one-pole follower at 5 ms steps
        e = float(env[i])
        coef = a_att if e > prev else a_rel
        coef = coef ** hop
        prev = coef * prev + (1 - coef) * e
        sm[i:i + hop] = prev
    duck = 10 ** (-7 * np.clip(sm, 0, 1) / 20)
    mix = bus * duck[None, :] + vo[None, :]
    peak = np.abs(mix).max()
    if peak > 0.99:
        mix *= 0.99 / peak
    out = ROOT / "out" / "mix_raw.wav"
    import wave
    pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
    with wave.open(str(out), "wb") as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(pcm.tobytes())
    (ROOT / "out" / "sfx_cues.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
    sfx_rms = float(np.sqrt((bus ** 2).mean())); vo_rms = float(np.sqrt((vo ** 2).mean()))
    print(f"{len(report)} cues; SFX bus {20*np.log10(sfx_rms+1e-9):.1f} dB RMS vs voice {20*np.log10(vo_rms+1e-9):.1f} dB RMS; mix peak {20*np.log10(peak+1e-9):.1f} dBFS")
    # loudness: two-pass loudnorm to -14 LUFS, true peak -1.5
    meas = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(out), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    j = json.loads(meas[meas.rindex("{"): meas.rindex("}") + 1])
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(out), "-af", af, "-ar", str(SR), str(ROOT / "out" / "mix.wav")], check=True)
    print(f"input {j['input_i']} LUFS -> -14 LUFS; wrote out/mix.wav")


if __name__ == "__main__":
    main()
