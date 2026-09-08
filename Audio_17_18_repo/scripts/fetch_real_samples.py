# -*- coding: utf-8 -*-
"""Download real public audio for operational checkout (not synthetic mock scores)."""
from __future__ import annotations

import ssl
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "real_samples"
DEST.mkdir(parents=True, exist_ok=True)

SOURCES = {
    "helicopter_esc50.wav": "https://cdn.jsdelivr.net/gh/karolpiczak/ESC-50@master/audio/1-172649-A-40.wav",
    "crowds_clapping_esc50.wav": "https://cdn.jsdelivr.net/gh/karolpiczak/ESC-50@master/audio/1-104089-A-22.wav",
    "siren_esc50.wav": "https://cdn.jsdelivr.net/gh/karolpiczak/ESC-50@master/audio/1-31482-A-42.wav",
    "engine_esc50.wav": "https://cdn.jsdelivr.net/gh/karolpiczak/ESC-50@master/audio/1-19840-A-36.wav",
    "fireworks_esc50.wav": "https://cdn.jsdelivr.net/gh/karolpiczak/ESC-50@master/audio/1-115545-A-48.wav",
    "crying_esc50.wav": "https://cdn.jsdelivr.net/gh/karolpiczak/ESC-50@master/audio/1-187207-A-20.wav",
}


def fetch() -> None:
    ctx = ssl.create_default_context()
    opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx))
    opener.addheaders = [("User-Agent", "BorderEyeAudioIntelligence/1.0")]
    urllib.request.install_opener(opener)
    for name, url in SOURCES.items():
        dest = DEST / name
        if dest.exists() and dest.stat().st_size > 1000:
            print("exists", dest)
            continue
        print("downloading", name)
        try:
            urllib.request.urlretrieve(url, dest)
            print(" saved", dest, dest.stat().st_size)
        except Exception as exc:
            print(" FAILED", name, exc)


if __name__ == "__main__":
    fetch()
