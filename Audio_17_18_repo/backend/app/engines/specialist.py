from __future__ import annotations

from typing import Any

import librosa
import numpy as np
from scipy import signal

from ..ontology import match_taxonomy


def specialist_detect(y: np.ndarray, sr: int) -> list[dict[str, Any]]:
    """Physics/DSP detectors that sit beside YAMNet/PANNs.

    Scores are measured acoustic evidence (crest, modulation, tonal wail), not
    invented classifier probabilities.
    """
    y = np.asarray(y, dtype=np.float32)
    if y.size < sr // 5:
        y = np.pad(y, (0, sr // 5 - y.size))
    y = y - np.mean(y)

    hits: list[dict[str, Any]] = []
    impulse = _impulse_blast(y, sr)
    if impulse["score"] >= 0.55 and (
        impulse["kurtosis"] >= 80
        or (impulse["crest_factor"] >= 18 and impulse["kurtosis"] >= 40)
        or (impulse["crest_factor"] >= 12 and impulse["kurtosis"] >= 20 and impulse["strong_onsets"] <= 5)
    ):
        hits.append(_pack("Fireworks", impulse["score"], "DSP-Impulse", impulse))
        hits.append(_pack("Explosion", min(1.0, impulse["score"] * 0.92), "DSP-Impulse", impulse))

    siren = _siren_wail(y, sr)
    if (
        siren["score"] >= 0.55
        and siren.get("prominence", 0) >= 180
        and siren.get("two_tone_span_hz", 0) >= 400
        and siren.get("f0_std_hz", 0) >= 180
    ):
        hits.append(_pack("Siren", siren["score"], "DSP-Siren", siren))

    rotor = _rotor_modulation(y, sr)
    if (
        rotor["score"] >= 0.55
        and 16.0 <= rotor.get("rotor_hz", 0) <= 36.0
        and rotor.get("modulation_ratio", 0) >= 40
        and rotor.get("rumble_ratio", 0) >= 0.35
    ):
        hits.append(_pack("Helicopter", rotor["score"], "DSP-Rotor", rotor))
    return hits


def rotor_score(y: np.ndarray, sr: int) -> dict[str, Any]:
    return _rotor_modulation(np.asarray(y, dtype=np.float32) - np.mean(y), sr)


def _pack(label: str, score: float, source: str, extra: dict[str, Any]) -> dict[str, Any]:
    matched = match_taxonomy(label)
    return {
        "label": label,
        "score": float(np.clip(score, 0, 1)),
        "category": matched[0] if matched else "other",
        "source_model": source,
        "hindi_label": matched[1]["hindi"] if matched else "",
        "operational_note": matched[1]["note"] if matched else "",
        "dsp": extra,
    }


def _impulse_blast(y: np.ndarray, sr: int) -> dict[str, Any]:
    rms = float(np.sqrt(np.mean(y * y) + 1e-12))
    peak = float(np.max(np.abs(y)))
    crest = peak / (rms + 1e-12)
    kurt = float(np.mean((y / (rms + 1e-12)) ** 4))
    env = librosa.onset.onset_strength(y=y, sr=sr)
    max_str = float(np.max(env) + 1e-9)
    # Isolated bangs: a few strong peaks, not a clap train
    peaks = signal.find_peaks(env, height=0.45 * max_str, distance=max(1, int(0.08 * sr / 512)))[0]
    n_strong = int(len(peaks))
    isolated = 1.0 if n_strong <= 8 else float(np.clip(8.0 / n_strong, 0, 1))
    crest_s = float(np.clip((crest - 8.0) / 10.0, 0, 1))
    kurt_s = float(np.clip((kurt - 12.0) / 20.0, 0, 1))
    score = float(np.clip(0.42 * crest_s + 0.38 * kurt_s + 0.20 * isolated, 0, 1))
    if n_strong >= 20:
        score *= 0.45  # rhythmic clapping / speech transients
    return {
        "score": round(score, 4),
        "crest_factor": round(crest, 3),
        "kurtosis": round(kurt, 2),
        "strong_onsets": n_strong,
    }


def _siren_wail(y: np.ndarray, sr: int) -> dict[str, Any]:
    nperseg = 2048
    hop = 256
    freqs, _, Z = signal.stft(y, fs=sr, nperseg=nperseg, noverlap=nperseg - hop)
    mag = np.abs(Z) + 1e-12
    band = (freqs >= 400) & (freqs <= 1800)
    if not np.any(band):
        return {"score": 0.0}
    fb = freqs[band]
    mb = mag[band]
    peaks = fb[np.argmax(mb, axis=0)]
    prominences = mb.max(axis=0) / (np.median(mb, axis=0) + 1e-12)
    f_mean = float(np.mean(peaks))
    f_std = float(np.std(peaks))
    split = float(abs(np.percentile(peaks, 80) - np.percentile(peaks, 20)))
    prom = float(np.percentile(prominences, 75))
    # Two-tone / wail: moving peak, very sharp tonal ridge
    move = float(np.clip((f_std - 120.0) / 280.0, 0, 1))
    span = float(np.clip((split - 180.0) / 500.0, 0, 1))
    sharp = float(np.clip((prom - 25.0) / 80.0, 0, 1))
    in_band = 1.0 if 450 <= f_mean <= 1700 else 0.35
    score = float(np.clip(in_band * (0.34 * move + 0.33 * span + 0.33 * sharp), 0, 1))
    # Steady calibration tones are not sirens
    if f_std < 40:
        score *= 0.15
    return {
        "score": round(score, 4),
        "peak_hz": round(f_mean, 1),
        "f0_std_hz": round(f_std, 1),
        "two_tone_span_hz": round(split, 1),
        "prominence": round(prom, 2),
    }


def _rotor_modulation(y: np.ndarray, sr: int) -> dict[str, Any]:
    """Main-rotor blade-pass shows up as 12-40 Hz amplitude modulation of the rumble."""
    band = signal.butter(4, [40 / (sr / 2), 800 / (sr / 2)], btype="bandpass", output="sos")
    rumble = signal.sosfilt(band, y)
    env = np.abs(signal.hilbert(rumble))
    env = env - np.mean(env)
    if env.size < sr:
        env = np.pad(env, (0, sr - env.size))
    nperseg = min(16384, max(2048, (len(env) // 2) | 1))
    if nperseg % 2 == 0:
        nperseg -= 1
    freqs, psd = signal.welch(env, fs=sr, nperseg=nperseg)
    psd = psd + 1e-18
    target = (freqs >= 12) & (freqs <= 45)
    other = (freqs >= 50) & (freqs <= 200)
    if not np.any(target):
        return {"score": 0.0, "rotor_hz": 0.0}
    peak_i = int(np.argmax(psd[target]))
    rotor_hz = float(freqs[target][peak_i])
    peak = float(psd[target][peak_i])
    floor = float(np.median(psd[other]) if np.any(other) else np.median(psd))
    ratio = peak / (floor + 1e-18)
    # Reject the first bin of the analysis band (Welch leakage)
    if rotor_hz < 13.5:
        ratio *= 0.25
    ratio_s = float(np.clip(np.log10(ratio + 1e-9) / 2.2, 0, 1))
    # Helicopters are relatively broadband vs a pure sine UAV probe
    f, pxx = signal.welch(y, fs=sr, nperseg=min(4096, len(y) // 2))
    low = (f >= 50) & (f <= 250)
    mid = (f >= 250) & (f <= 2000)
    rumble_ratio = float(np.mean(pxx[low]) / (np.mean(pxx[mid]) + 1e-12)) if np.any(low) and np.any(mid) else 0.0
    rumble_s = float(np.clip(rumble_ratio / 3.0, 0, 1))
    score = float(np.clip(0.62 * ratio_s + 0.38 * rumble_s, 0, 1))
    return {
        "score": round(score, 4),
        "rotor_hz": round(rotor_hz, 2),
        "modulation_ratio": round(float(ratio), 2),
        "rumble_ratio": round(rumble_ratio, 3),
    }
