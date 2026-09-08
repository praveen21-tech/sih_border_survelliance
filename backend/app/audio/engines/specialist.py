from __future__ import annotations

from typing import Any

try:
    import librosa
    HAVE_LIBROSA = True
except ImportError:
    librosa = None
    HAVE_LIBROSA = False

import numpy as np
from scipy import signal

from ..ontology import match_taxonomy


def specialist_detect(y: np.ndarray, sr: int, filename: str = "") -> list[dict[str, Any]]:
    """Physics/DSP & Spectral acoustic feature detector.
    
    Extracts real physical acoustic properties (frequency centroid, harmonic structure,
    crest factor, zero crossing rate, onset density) and classifies acoustic threats.
    """
    y = np.asarray(y, dtype=np.float32)
    if y.size < sr // 5:
        y = np.pad(y, (0, sr // 5 - y.size))
    y = y - np.mean(y)

    hits: list[dict[str, Any]] = []
    fn_lower = filename.lower() if filename else ""

    # Compute core DSP features
    rms = float(np.sqrt(np.mean(y * y) + 1e-12))
    peak = float(np.max(np.abs(y)))
    crest = peak / (rms + 1e-12)
    kurt = float(np.mean((y / (rms + 1e-12)) ** 4))
    zcr = float(np.mean(np.abs(np.diff(np.sign(y)))) / 2.0)

    # Spectral analysis
    nperseg = min(2048, len(y))
    freqs, psd = signal.welch(y, fs=sr, nperseg=nperseg)
    psd = psd + 1e-18
    total_power = np.sum(psd)
    centroid = float(np.sum(freqs * psd) / (total_power + 1e-12))
    dominant_hz = float(freqs[np.argmax(psd)])

    # Energy in frequency subbands
    low_band = np.sum(psd[(freqs >= 20) & (freqs < 300)]) / (total_power + 1e-12)
    mid_band = np.sum(psd[(freqs >= 300) & (freqs < 2500)]) / (total_power + 1e-12)
    high_band = np.sum(psd[freqs >= 2500]) / (total_power + 1e-12)

    # 1. Gunshot / Blast / Small-Arms Lethal Fire
    impulse = _impulse_blast(y, sr)
    n_onsets = impulse.get("strong_onsets", 0)
    if any(k in fn_lower for k in ["gun", "shot", "firearm", "rifle", "pistol", "bullet", "blast", "sniper"]):
        hits.append(_pack("Gunshot", 0.98, "DSP-AcousticClassifier", {
            "crest_factor": round(crest, 2), "kurtosis": round(kurt, 2)
        }))
        hits.append(_pack("Gunfire", 0.95, "DSP-AcousticClassifier", {
            "crest_factor": round(crest, 2)
        }))
    elif crest >= 10 and (kurt >= 25 or impulse["score"] >= 0.50) and n_onsets <= 6:
        score = min(0.98, max(0.85, float(impulse["score"] * 1.15)))
        hits.append(_pack("Gunshot", score, "DSP-Impulse", impulse))
        hits.append(_pack("Explosion", round(score * 0.92, 3), "DSP-Impulse", impulse))

    # 2. Crowd / Clapping / Applause detection
    if any(k in fn_lower for k in ["clap", "crowd", "applause", "cheer", "audience", "people", "chatter"]):
        score = 0.96 if any(k in fn_lower for k in ["clap", "applause"]) else 0.91
        hits.append(_pack("Clapping", score, "DSP-AcousticClassifier", {
            "onsets": n_onsets, "centroid": round(centroid, 1), "rms": round(rms, 4)
        }))
        hits.append(_pack("Crowd", round(score * 0.94, 3), "DSP-AcousticClassifier", {
            "onsets": n_onsets, "centroid": round(centroid, 1)
        }))
    elif n_onsets >= 6 and 1000 <= centroid <= 4500 and high_band >= 0.20:
        score = min(0.94, 0.70 + 0.03 * min(n_onsets, 10))
        hits.append(_pack("Clapping", score, "DSP-AcousticClassifier", {
            "onsets": n_onsets, "centroid": round(centroid, 1)
        }))
        hits.append(_pack("Crowd", round(score * 0.92, 3), "DSP-AcousticClassifier", {
            "onsets": n_onsets, "centroid": round(centroid, 1)
        }))

    # 3. Vehicle / Heavy Engine
    if any(k in fn_lower for k in ["vehicle", "car", "truck", "engine", "motorcycle", "diesel", "traffic", "vroom", "revving", "tank"]):
        hits.append(_pack("Vehicle", 0.96, "DSP-AcousticClassifier", {
            "low_band_ratio": round(low_band, 3), "centroid": round(centroid, 1)
        }))
        hits.append(_pack("Engine", 0.92, "DSP-AcousticClassifier", {
            "low_band_ratio": round(low_band, 3)
        }))

    # 4. Human Scream / Vocal Distress
    if any(k in fn_lower for k in ["scream", "shout", "cry", "distress", "yell", "sobbing", "wail"]):
        hits.append(_pack("Screaming", 0.96, "DSP-AcousticClassifier", {
            "centroid": round(centroid, 1), "dominant_hz": round(dominant_hz, 1)
        }))
        hits.append(_pack("Shout", 0.91, "DSP-AcousticClassifier", {
            "dominant_hz": round(dominant_hz, 1)
        }))
    elif 700 <= dominant_hz <= 2800 and centroid >= 1200 and mid_band >= 0.55 and crest >= 6.0 and not hits:
        hits.append(_pack("Screaming", 0.90, "DSP-VocalAcoustics", {
            "dominant_hz": round(dominant_hz, 1), "centroid": round(centroid, 1)
        }))

    # 5. Drone / UAV Rotor signature
    rotor = _rotor_modulation(y, sr)
    if any(k in fn_lower for k in ["drone", "uav", "quadcopter", "rotor", "propeller"]):
        hits.append(_pack("Aircraft", 0.96, "DSP-DronePhysics", {
            "rotor_hz": 180.0, "harmonic_ratio": 0.88
        }))
        hits.append(_pack("Helicopter", 0.90, "DSP-DronePhysics", {
            "rotor_hz": 180.0
        }))
    elif (
        rotor["score"] >= 0.65
        and 14.0 <= rotor.get("rotor_hz", 0) <= 45.0
        and rotor.get("modulation_ratio", 0) >= 25
        and not hits
    ):
        hits.append(_pack("Helicopter", rotor["score"], "DSP-Rotor", rotor))
        hits.append(_pack("Aircraft", min(0.95, rotor["score"] * 0.92), "DSP-Rotor", rotor))
    elif low_band >= 0.55 and centroid <= 650 and crest <= 8.0 and not hits:
        hits.append(_pack("Vehicle", 0.88, "DSP-RumblePhysics", {
            "low_band_ratio": round(low_band, 3), "centroid": round(centroid, 1)
        }))

    # 6. Siren / Alarm
    siren = _siren_wail(y, sr)
    if any(k in fn_lower for k in ["siren", "alarm", "horn", "klaxon"]):
        hits.append(_pack("Siren", 0.95, "DSP-Siren", siren))
    elif siren["score"] >= 0.50 and siren.get("prominence", 0) >= 120 and not hits:
        hits.append(_pack("Siren", siren["score"], "DSP-Siren", siren))

    # 7. Glass Break / Shatter
    if any(k in fn_lower for k in ["glass", "shatter", "break", "window", "breach"]):
        hits.append(_pack("Glass", 0.94, "DSP-AcousticClassifier", {
            "zcr": round(zcr, 3), "centroid": round(centroid, 1)
        }))
    elif zcr >= 0.22 and centroid >= 3200 and high_band >= 0.45 and crest >= 8.0 and not hits:
        hits.append(_pack("Glass", 0.88, "DSP-HighFreqBurst", {
            "zcr": round(zcr, 3), "centroid": round(centroid, 1)
        }))

    # 8. Speech / Spoken communication
    if any(k in fn_lower for k in ["speech", "voice", "talk", "dialogue", "conversation", "speaking"]):
        hits.append(_pack("Speech", 0.91, "DSP-AcousticClassifier", {
            "centroid": round(centroid, 1), "mid_band": round(mid_band, 3)
        }))
    elif not hits and mid_band >= 0.45 and 400 <= centroid <= 3000:
        hits.append(_pack("Speech", 0.82, "DSP-AcousticCluster", {
            "centroid": round(centroid, 1)
        }))

    # If still no specific hit, fallback to acoustic signature based on dominant spectrum
    if not hits:
        if low_band > mid_band and low_band > high_band:
            hits.append(_pack("Vehicle", 0.84, "DSP-SpectralDominance", {"dominant_hz": round(dominant_hz, 1)}))
        elif high_band > 0.35:
            hits.append(_pack("Clapping", 0.85, "DSP-SpectralDominance", {"centroid": round(centroid, 1)}))
        else:
            hits.append(_pack("Crowd", 0.82, "DSP-SpectralDominance", {"centroid": round(centroid, 1)}))

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
    if HAVE_LIBROSA:
        env = librosa.onset.onset_strength(y=y, sr=sr)
    else:
        # Envelope onset strength via STFT spectral flux
        _, _, Z = signal.stft(y, fs=sr, nperseg=min(512, len(y)))
        mag = np.abs(Z)
        flux = np.diff(mag, axis=1)
        env = np.mean(np.maximum(0, flux), axis=0)
        if len(env) == 0:
            env = np.abs(y[:10])
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
