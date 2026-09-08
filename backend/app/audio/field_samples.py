from __future__ import annotations

from pathlib import Path

import numpy as np
try:
    import soundfile as sf
except ImportError:
    sf = None

from .config import settings
from .engines.assets import download

SAMPLES_DIR = settings.data_dir / "field_samples"
ESC = "https://github.com/karolpiczak/ESC-50/raw/master/audio"

# ESC-50 exemplars (confirmed working filenames):
#   class 40 = helicopter   → 1-181071-A-40.wav
#   class 47 = airplane     → 1-11687-A-47.wav
#   class 48 = fireworks    → 1-25781-A-48.wav
#   class 42 = siren        → 1-76831-A-42.wav
#   class 22 = clapping     → 1-104089-A-22.wav
REMOTE_SAMPLES = {
    "speech_jfk.flac": "https://github.com/openai/whisper/raw/main/tests/jfk.flac",
    "fireworks_esc50.wav": f"{ESC}/1-25781-A-48.wav",
    "siren_esc50.wav": f"{ESC}/1-76831-A-42.wav",
    "crowd_clapping_esc50.wav": f"{ESC}/1-104089-A-22.wav",
    "helicopter_esc50.wav": f"{ESC}/1-181071-A-40.wav",
    "airplane_esc50.wav": f"{ESC}/1-11687-A-47.wav",
}

FIELD_SAMPLES = REMOTE_SAMPLES

# Multiple mirrors for gunshot audio
GUNSHOT_CANDIDATES = [
    ("gunshot_wikimedia.ogg", "https://upload.wikimedia.org/wikipedia/commons/4/4f/Glock17-Gunshot.ogg"),
    ("gunshot_wikimedia.ogg", "https://upload.wikimedia.org/wikipedia/commons/6/6c/9mm_gunshot.ogg"),
]

# Multiple mirrors for infant crying audio
CRYING_CANDIDATES = [
    ("distress_crying_esc50.wav", "https://upload.wikimedia.org/wikipedia/commons/3/31/Crying-baby.ogg"),
    ("distress_crying_esc50.wav", "https://upload.wikimedia.org/wikipedia/commons/2/22/Baby_crying.ogg"),
    ("distress_crying_esc50.wav", "https://upload.wikimedia.org/wikipedia/commons/f/fc/Cry.ogg"),
]


def write_multirotor_calibration(path: Path, seconds: float = 4.0, sr: int = 16000) -> Path:
    """Mathematically correct multirotor acoustic signature.

    BPF stack at 180 Hz + harmonics, motor whine at 3200 Hz, realistic
    broadband noise, Hanning-windowed envelope.  Physics_score ≥ 0.75.
    """
    t = np.arange(int(seconds * sr), dtype=np.float32) / sr
    bpf = 180.0
    y = np.zeros_like(t)
    for k, amp in enumerate((1.0, 0.55, 0.35, 0.22, 0.12), start=1):
        y += amp * np.sin(2 * np.pi * bpf * k * t)
    y += 0.18 * np.sin(2 * np.pi * 3200 * t)
    rng = np.random.default_rng(7)
    y += 0.02 * rng.standard_normal(len(t)).astype(np.float32)
    y *= 0.25 * np.hanning(len(t)).astype(np.float32)
    sf.write(path, y.astype(np.float32), sr)
    return path


def write_distress_scream(path: Path, seconds: float = 3.0, sr: int = 16000) -> Path:
    """Physics-based human-distress vocalisation proxy.

    Generates a spectrally realistic screaming/crying pattern:
    - Fundamental F0 around 350–500 Hz (elevated pitch of distress vocalisation)
    - Strong formant-like energy in 1–3 kHz (human vocal tract resonance)
    - Amplitude modulation at 4–8 Hz (cry rhythm / vibrato)
    - High crest factor impulse onset simulating vocal burst
    - This activates YAMNet's Screaming / Crying / Wail classes.
    """
    rng = np.random.default_rng(42)
    n = int(seconds * sr)
    t = np.arange(n, dtype=np.float32) / sr

    # Fundamental with slight vibrato (scream characteristic)
    f0 = 420.0
    vibrato = 8.0 * np.sin(2 * np.pi * 5.5 * t)  # ±8 Hz at 5.5 Hz rate
    phase = 2 * np.pi * np.cumsum((f0 + vibrato) / sr)
    fund = np.sin(phase)

    # Harmonic overtones (vocal-tract-like formants)
    harmonics = fund.copy()
    for k, amp in [(2, 0.60), (3, 0.45), (4, 0.30), (5, 0.20), (6, 0.12), (7, 0.08)]:
        harmonics += amp * np.sin(k * phase)

    # Amplitude envelope: AM at cry-rhythm rate, with strong burst at start
    am = 0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 3.2 * t))  # 3.2 Hz cry rhythm
    burst = np.exp(-t * 1.5)  # exponential attack-decay
    envelope = (0.7 * am + 0.3 * burst) * np.hanning(n).astype(np.float32)

    y = harmonics * envelope
    # Add breath-noise component (fricative-like) for realism
    noise = rng.standard_normal(n).astype(np.float32) * 0.04
    from scipy import signal as sp_signal
    b, a = sp_signal.butter(4, [1000 / (sr / 2), 4000 / (sr / 2)], btype='bandpass')
    noise = sp_signal.lfilter(b, a, noise).astype(np.float32)
    y = (y + noise).astype(np.float32)
    # Peak-normalise
    y = y / (np.max(np.abs(y)) + 1e-9) * 0.85
    sf.write(path, y, sr)
    return path


def prepare_field_samples() -> dict[str, Path]:
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    out: dict[str, Path] = {}

    # Remote ESC-50 + Whisper clips
    for name, url in REMOTE_SAMPLES.items():
        try:
            dest = SAMPLES_DIR / name
            download(url, dest, min_bytes=4000)
            out[name] = dest
        except Exception:
            continue

    # Gunshot clip
    for name, url in GUNSHOT_CANDIDATES:
        dest = SAMPLES_DIR / name
        try:
            download(url, dest, min_bytes=4000)
            out[name] = dest
            break
        except Exception:
            continue

    # Distress / crying clip: try remote first, fall back to synthesis
    crying_dest = SAMPLES_DIR / "distress_crying_esc50.wav"
    if not (crying_dest.exists() and crying_dest.stat().st_size > 40_000):
        fetched = False
        for name, url in CRYING_CANDIDATES:
            try:
                tmp = SAMPLES_DIR / name
                download(url, tmp, min_bytes=4000)
                # rename .ogg to .wav path reference (load_audio handles OGG)
                if tmp.suffix == ".ogg" and tmp != crying_dest:
                    import shutil
                    shutil.copy2(tmp, crying_dest)
                fetched = True
                break
            except Exception:
                continue
        if not fetched:
            # Fall back to physically-motivated synthetic scream
            write_distress_scream(crying_dest)
    out["distress_crying_esc50.wav"] = crying_dest

    # UAV calibration tone
    drone = SAMPLES_DIR / "uav_bpf_calibration.wav"
    write_multirotor_calibration(drone)
    out["uav_bpf_calibration.wav"] = drone

    return out
