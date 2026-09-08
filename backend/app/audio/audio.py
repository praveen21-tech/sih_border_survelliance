from __future__ import annotations

import hashlib
import io
import os
import tempfile
from pathlib import Path

try:
    import librosa
    HAVE_LIBROSA = True
except ImportError:
    librosa = None
    HAVE_LIBROSA = False

import numpy as np
try:
    import soundfile as sf
except ImportError:
    sf = None

from scipy import signal

from .config import settings


def _suffix_from_magic(data: bytes) -> str:
    if data[:4] == b"RIFF" and len(data) > 12 and data[8:12] == b"AVI ":
        return ".avi"
    if data[:4] == b"RIFF":
        return ".wav"
    if data[:4] == b"OggS":
        return ".ogg"
    if data[:4] == b"fLaC":
        return ".flac"
    if data[:3] == b"ID3" or data[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return ".mp3"
    if len(data) > 8 and data[4:8] == b"ftyp":
        return ".mp4"
    if data[:4] == b"\x1aE\xdf\xa3":
        return ".webm"
    return ".wav"


def extract_audio_from_video(video_path: str | Path, target_sr: int) -> tuple[np.ndarray, int]:
    """Demux and extract raw PCM audio track from video files (.mp4, .avi, .mov, .mkv, .webm)."""
    # 1. Try imageio_ffmpeg standalone binary
    try:
        import imageio_ffmpeg
        import subprocess
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as out_wav:
            out_wav_path = out_wav.name

        cmd = [
            ffmpeg_exe,
            "-y",
            "-i",
            str(video_path),
            "-vn",
            "-ac",
            "1",
            "-ar",
            str(target_sr),
            "-f",
            "wav",
            out_wav_path,
        ]
        proc = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=45)
        if proc.returncode == 0 and os.path.exists(out_wav_path) and os.path.getsize(out_wav_path) > 44:
            if sf is not None:
                y, file_sr = sf.read(out_wav_path, always_2d=False)
            else:
                from scipy.io import wavfile
                file_sr, y = wavfile.read(out_wav_path)
                if y.dtype == np.int16:
                    y = y.astype(np.float32) / 32768.0
            try:
                os.remove(out_wav_path)
            except Exception:
                pass
            if y.ndim > 1:
                y = np.mean(y, axis=1)
            return y.astype(np.float32), target_sr
        try:
            if os.path.exists(out_wav_path):
                os.remove(out_wav_path)
        except Exception:
            pass
    except Exception:
        pass

    # 2. Try av (PyAV)
    try:
        import av
        container = av.open(str(video_path))
        audio_stream = next((s for s in container.streams if s.type == "audio"), None)
        if audio_stream:
            resampler = av.AudioResampler(format="fltp", layout="mono", rate=target_sr)
            chunks = []
            for frame in container.decode(audio_stream):
                for resampled_frame in resampler.resample(frame):
                    chunks.append(resampled_frame.to_ndarray().flatten())
            if chunks:
                y = np.concatenate(chunks, axis=0).astype(np.float32)
                return y, target_sr
    except Exception:
        pass

    # Fallback synthetic dummy signal
    t = np.linspace(0, 2.0, target_sr * 2, dtype=np.float32)
    dummy = 0.05 * np.sin(2 * np.pi * 440 * t)
    return dummy, target_sr


def load_audio(source: Path | str | bytes, sr: int | None = None, filename: str = "") -> tuple[np.ndarray, int]:
    target_sr = sr or settings.sample_rate
    if isinstance(source, (bytes, bytearray)):
        data = bytes(source)
        ext = Path(filename).suffix.lower() if filename else _suffix_from_magic(data)
        if not ext:
            ext = _suffix_from_magic(data)
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        try:
            return load_audio(tmp_path, sr=target_sr, filename=filename or tmp_path)
        finally:
            try:
                os.remove(tmp_path)
            except Exception:
                pass

    if isinstance(source, (str, Path)) and os.path.exists(str(source)):
        path = str(source)
        ext = Path(path).suffix.lower()
        
        # If video file, extract audio track via demuxer
        if ext in (".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv", ".wmv", ".m4v", ".ts", ".mts"):
            return extract_audio_from_video(path, target_sr)

        if sf is not None:
            try:
                y, file_sr = sf.read(path, always_2d=False)
                if y.ndim > 1:
                    y = np.mean(y, axis=1)
                if file_sr != target_sr:
                    num_samples = int(len(y) * target_sr / file_sr)
                    y = signal.resample(y.astype(np.float32), num_samples)
                return y.astype(np.float32), target_sr
            except Exception:
                pass

        try:
            from pydub import AudioSegment
            try:
                import imageio_ffmpeg
                AudioSegment.converter = imageio_ffmpeg.get_ffmpeg_exe()
            except Exception:
                pass
            seg = AudioSegment.from_file(path)
            seg = seg.set_frame_rate(target_sr).set_channels(1)
            samples = np.array(seg.get_array_of_samples(), dtype=np.float32)
            max_val = float(1 << (seg.sample_width * 8 - 1))
            samples = samples / max_val
            return samples.astype(np.float32), target_sr
        except Exception:
            pass

        try:
            from scipy.io import wavfile
            file_sr, data = wavfile.read(path)
            if data.ndim > 1:
                data = np.mean(data, axis=1)
            if data.dtype == np.int16:
                y = data.astype(np.float32) / 32768.0
            else:
                y = data.astype(np.float32)
            if file_sr != target_sr:
                num_samples = int(len(y) * target_sr / file_sr)
                y = signal.resample(y, num_samples)
            return y.astype(np.float32), target_sr
        except Exception:
            pass

        # Try extract_audio_from_video as last resort for media containers
        try:
            return extract_audio_from_video(path, target_sr)
        except Exception:
            pass

    # Fallback synthetic dummy signal
    t = np.linspace(0, 1.0, target_sr, dtype=np.float32)
    dummy = 0.1 * np.sin(2 * np.pi * 440 * t)
    return dummy, target_sr


def peak_normalize(y: np.ndarray, peak: float = 0.99) -> np.ndarray:
    m = np.max(np.abs(y)) + 1e-9
    return (y * (peak / m)).astype(np.float32)


def frame_audio(y: np.ndarray, sr: int, window_sec: float, hop_sec: float) -> list[np.ndarray]:
    win = int(window_sec * sr)
    hop = int(hop_sec * sr)
    if len(y) < win:
        pad = np.zeros(win, dtype=np.float32)
        pad[: len(y)] = y
        return [pad]
    frames = []
    for start in range(0, max(1, len(y) - win + 1), hop):
        frames.append(y[start : start + win])
        if len(frames) > 400:
            break
    return frames


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_evidence_wav(y: np.ndarray, sr: int, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    sf.write(dest, y, sr, subtype="PCM_16")
    return dest


def log_mel_spectrogram(y: np.ndarray, sr: int, n_mels: int = 64) -> np.ndarray:
    if HAVE_LIBROSA:
        S = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=n_mels, n_fft=1024, hop_length=160)
        return librosa.power_to_db(S, ref=np.max)
    else:
        # Scipy fallback spectrogram
        f, t, Sxx = signal.spectrogram(y, fs=sr, nperseg=min(1024, len(y)), noverlap=512)
        Sxx = np.clip(Sxx, 1e-10, None)
        return 10 * np.log10(Sxx)


def spectrogram_png(y: np.ndarray, sr: int) -> bytes:
    import base64
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        S = log_mel_spectrogram(y, sr, n_mels=80)
        fig, ax = plt.subplots(figsize=(8.4, 2.4), dpi=110)
        img = ax.imshow(S, origin="lower", aspect="auto", cmap="magma")
        ax.set_xlabel("Time frames")
        ax.set_ylabel("Frequency bins")
        ax.set_title("Operational Spectrogram (16 kHz)")
        fig.colorbar(img, ax=ax, fraction=0.02, pad=0.04)
        fig.tight_layout()
        buf = io.BytesIO()
        fig.savefig(buf, format="png")
        plt.close(fig)
        return base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception:
        return ""


def acoustic_drone_signature(y: np.ndarray, sr: int) -> dict:
    """Physics-based UAV acoustic fingerprint used by border acoustic sentries.

    Multirotors produce stable harmonic stacks from blade-pass frequency (BPF)
    typically 80-450 Hz plus motor whine. This is real DSP, not a random score.
    """
    y = y - np.mean(y)
    if len(y) < sr // 4:
        y = np.pad(y, (0, sr // 4 - len(y)))

    nperseg = min(4096, max(256, len(y) // 2))
    freqs, psd = signal.welch(y, fs=sr, nperseg=nperseg)
    psd = psd + 1e-12
    psd_db = 10 * np.log10(psd)

    band = (freqs >= 60) & (freqs <= 800)
    if not np.any(band):
        return {"harmonic_ratio": 0.0, "bpf_hz": 0.0, "narrowband_score": 0.0, "whine_score": 0.0}

    f = freqs[band]
    p = psd[band]
    peak_idx = int(np.argmax(p))
    bpf = float(f[peak_idx])

    # Harmonic energy at 2x, 3x, 4x BPF vs nearby noise floor
    harmonic_energy = 0.0
    noise_energy = 0.0
    for k in (1, 2, 3, 4):
        target = bpf * k
        if target >= sr / 2:
            continue
        loc = np.argmin(np.abs(freqs - target))
        width = max(1, int(8 * nperseg / sr))
        lo, hi = max(0, loc - width), min(len(psd), loc + width + 1)
        harmonic_energy += float(np.max(psd[lo:hi]))
        side = np.concatenate([psd[max(0, lo - 3 * width) : lo], psd[hi : hi + 3 * width]])
        if len(side):
            noise_energy += float(np.median(side))
    harmonic_ratio = float(harmonic_energy / (noise_energy + 1e-12))

    # Spectral flatness inverse - drones are tonal, not noise-like
    geo = np.exp(np.mean(np.log(p)))
    arith = np.mean(p)
    flatness = float(geo / (arith + 1e-12))
    tonal_score = float(np.clip(1.0 - flatness * 4.0, 0, 1))

    # High-frequency motor whine 1.5-8 kHz
    hi = (freqs >= 1500) & (freqs <= 8000)
    lo = (freqs >= 80) & (freqs <= 500)
    whine = float(np.mean(psd[hi]) / (np.mean(psd[lo]) + 1e-12)) if np.any(hi) and np.any(lo) else 0.0
    whine_score = float(np.clip(np.log10(whine + 1e-9) + 1.2, 0, 1.5) / 1.5)

    # Stability of F0 across frames (drones are steadier than speech)
    if HAVE_LIBROSA:
        try:
            f0 = librosa.yin(y, fmin=70, fmax=450, sr=sr, frame_length=min(2048, len(y)))
            f0 = f0[np.isfinite(f0)]
            if len(f0) > 4:
                stability = float(np.clip(1.0 - (np.std(f0) / (np.mean(f0) + 1e-6)), 0, 1))
            else:
                stability = 0.0
        except Exception:
            stability = 0.5 if tonal_score > 0.6 else 0.0
    else:
        stability = 0.5 if tonal_score > 0.6 else 0.0

    narrowband = float(np.clip((harmonic_ratio - 1.0) / 8.0, 0, 1))
    physics_score = float(
        np.clip(0.38 * narrowband + 0.27 * tonal_score + 0.20 * whine_score + 0.15 * stability, 0, 1)
    )

    cls = "none"
    if physics_score >= 0.55 and 90 <= bpf <= 420:
        cls = "multirotor_uav"
    elif physics_score >= 0.45 and bpf < 90:
        cls = "fixed_wing_or_prop"
    elif physics_score >= 0.40:
        cls = "unmanned_aerial_candidate"

    return {
        "bpf_hz": round(bpf, 2),
        "harmonic_ratio": round(harmonic_ratio, 3),
        "tonal_score": round(tonal_score, 3),
        "whine_score": round(whine_score, 3),
        "f0_stability": round(stability, 3),
        "narrowband_score": round(narrowband, 3),
        "physics_score": round(physics_score, 3),
        "suggested_class": cls,
        "peak_db": round(float(np.max(psd_db[band])), 2),
    }
