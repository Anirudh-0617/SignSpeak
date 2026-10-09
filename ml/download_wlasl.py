# /// script
# requires-python = ">=3.10"
# ///
"""Download WLASL video instances into ml/data/wlasl_src/<GLOSS>/<id>.mp4.

Uses yt-dlp for everything (handles YouTube + direct .mp4 URLs uniformly).
Skips videos whose files already exist. Silent failures — not every URL is
still live years after the WLASL release, that's expected.

Usage:
  uv run ml/download_wlasl.py LOVE LIKE KISS HUG FAMILY
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

META = Path("ml/data/wlasl_meta/WLASL_v0.3.json")
OUT = Path("ml/data/wlasl_src")


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Usage: download_wlasl.py GLOSS [GLOSS ...]")
    wants = {g.lower() for g in sys.argv[1:]}
    data = json.loads(META.read_text())
    for entry in data:
        g = entry["gloss"].lower()
        if g not in wants:
            continue
        target_dir = OUT / entry["gloss"].upper().replace(" ", "-")
        target_dir.mkdir(parents=True, exist_ok=True)
        ok = fail = skip = 0
        for inst in entry["instances"]:
            url = inst.get("url")
            vid = inst.get("video_id")
            if not url or not vid:
                continue
            dst = target_dir / f"{vid}.mp4"
            if dst.exists():
                skip += 1
                continue
            r = subprocess.run(
                ["yt-dlp", "-q", "-f", "mp4/best[ext=mp4]/best",
                 "-o", str(dst), url],
                capture_output=True,
            )
            if r.returncode == 0 and dst.exists():
                ok += 1
            else:
                fail += 1
        print(f"{entry['gloss']}: +{ok} downloaded, {skip} already there, {fail} failed")


if __name__ == "__main__":
    main()
