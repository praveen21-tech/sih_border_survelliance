"""Offline file analysis against the live acoustic stack."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.audio import load_audio  # noqa: E402
from app.pipeline import pipeline  # noqa: E402
from app.schemas import SensorContext  # noqa: E402


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.analyze_file <audio>")
        sys.exit(1)
    path = Path(sys.argv[1])
    y, sr = load_audio(path)
    result = pipeline.analyze_array(y, sr, SensorContext(), filename=path.name)
    slim = dict(result)
    slim.pop("spectrogram_png_b64", None)
    print(json.dumps(slim, indent=2, default=str))


if __name__ == "__main__":
    main()
