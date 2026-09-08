"""
Drone Engine — Module 18
========================
Orchestrates the full acoustic UAV detection pipeline:
  1. Physics fingerprint  (acoustic_drone_signature)
  2. DroneClassifier      (custom dataset + YAMNet + PANNs fusion)
  3. DSP rotor-modulation specialist
  4. Track management     (maintains a rolling window of detections per post)
  5. Early-warning output with camera cue

All scores are real measured values — no random or placeholder numbers.
"""

from __future__ import annotations

import threading
import time
from collections import deque
from typing import Any

import numpy as np

from ..audio import acoustic_drone_signature
from ..config import settings
from .drone_classifier import DRONE_PROFILES, EW_NONE, drone_classifier

# AudioSet aerial label catalogue (unchanged from original)
AERIAL_LABELS = {
    "aircraft",
    "fixed-wing aircraft, airplane",
    "helicopter",
    "propeller, airscrew",
    "aircraft engine",
    "jet engine",
    "rotorcraft",
    "quadcopter",
}

# Rolling track window: keep last 60 detections per post
_TRACK_MAXLEN = 60
_tracks: dict[str, deque] = {}          # post_id → deque[dict]
_tracks_lock = threading.Lock()


# ── Main engine ───────────────────────────────────────────────────────────────

class DroneEngine:
    """Fuses all acoustic UAV detection layers into a single assessment."""

    def assess(
        self,
        y: np.ndarray,
        sr: int,
        yamnet_hits: list[dict[str, Any]],
        panns_hits:  list[dict[str, Any]],
        embedding:   np.ndarray | None = None,
        dsp_hits:    list[dict[str, Any]] | None = None,
        post_id:     str = "unknown",
        analysis_id: str = "",
    ) -> dict[str, Any]:
        """
        Full pipeline assessment.  Returns a dict with:
          threat, threat_score, class_name, class_label, class_label_hi,
          class_confidence, early_warning_level, bearing_deg, camera_cue,
          timeline, profile, model_votes, physics_detail, signature,
          recommended_action, track_summary
        """
        # ── Step 1: physics fingerprint ───────────────────────────────────
        signature = acoustic_drone_signature(y, sr)

        # ── Step 2: DSP rotor modulation specialist score ─────────────────
        rotor_score = 0.0
        for h in (dsp_hits or []):
            if str(h.get("label") or "").lower() == "helicopter":
                rotor_score = max(rotor_score, float(h.get("score") or 0))

        # ── Step 3: full classifier ───────────────────────────────────────
        result = drone_classifier.classify(
            y=y,
            sr=sr,
            yamnet_hits=yamnet_hits,
            panns_hits=panns_hits,
            embedding=embedding,
            physics=signature,
            analysis_id=analysis_id,
        )

        # Incorporate rotor-mod into model_votes
        result["model_votes"]["rotor_mod"] = round(rotor_score, 4)

        # Re-fuse with rotor_mod for final score (5% weight adjustment)
        base_score  = result["threat_score"]
        final_score = float(np.clip(base_score * 0.95 + rotor_score * 0.05, 0, 1))
        result["threat_score"]       = round(final_score, 4)
        result["class_confidence"]   = round(final_score, 4)
        result["threat"]             = final_score >= settings.drone_alert_threshold

        # ── Step 4: recommended action (richer than old engine) ───────────
        result["recommended_action"] = _build_action(result)

        # ── Step 5: legacy fields for backward compatibility ──────────────
        result["class_name"] = result["drone_class"]
        result["signature"]  = signature

        # ── Step 6: track management ──────────────────────────────────────
        # Incorporate visual score from any running camera source
        try:
            from ..camera_stream import camera_manager
            visual_score = camera_manager.get_all_visual_score()
        except Exception:
            visual_score = 0.0

        # Always include visual_yolo in model_votes (0.0 when no camera active)
        result["model_votes"]["visual_yolo"] = round(visual_score, 4)

        if visual_score > 0.0:
            # Fuse: acoustic is primary (75%), visual is corroborating (25%)
            fused_with_visual = float(np.clip(
                0.75 * final_score + 0.25 * visual_score, 0, 1
            ))
            result["threat_score"]     = round(fused_with_visual, 4)
            result["class_confidence"] = round(fused_with_visual, 4)
            result["threat"]           = fused_with_visual >= settings.drone_alert_threshold
            result["model_votes"]["visual_yolo"] = round(visual_score, 4)
            # Re-evaluate early warning with fused score
            if fused_with_visual >= 0.65:
                result["early_warning_level"] = "CRITICAL"
            elif fused_with_visual >= 0.42:
                result["early_warning_level"] = "ALERT"
            elif fused_with_visual >= 0.25:
                result["early_warning_level"] = "WATCH"

        track_entry = {
            "analysis_id":         analysis_id,
            "ts":                  time.time(),
            "threat_score":        result["threat_score"],
            "threat":              result["threat"],
            "early_warning_level": result["early_warning_level"],
            "drone_class":         result["drone_class"],
            "class_label":         result["class_label"],
            "bearing_deg":         result["bearing_deg"],
            "bpf_hz":              float(signature.get("bpf_hz", 0)),
            "physics_score":       float(signature.get("physics_score", 0)),
            "visual_score":        visual_score,
        }
        _push_track(post_id, track_entry)
        result["track_summary"] = _track_summary(post_id)

        return result


# ── Track management ──────────────────────────────────────────────────────────

def _push_track(post_id: str, entry: dict) -> None:
    with _tracks_lock:
        if post_id not in _tracks:
            _tracks[post_id] = deque(maxlen=_TRACK_MAXLEN)
        _tracks[post_id].appendleft(entry)


def get_tracks(post_id: str | None = None, limit: int = 20) -> list[dict]:
    """Return recent drone detection entries, optionally filtered by post."""
    with _tracks_lock:
        if post_id:
            dq = _tracks.get(post_id, deque())
            return list(dq)[:limit]
        # All posts merged, sorted by ts desc
        all_entries: list[dict] = []
        for dq in _tracks.values():
            all_entries.extend(list(dq))
        all_entries.sort(key=lambda x: x["ts"], reverse=True)
        return all_entries[:limit]


def get_active_threats(min_score: float = 0.42) -> list[dict]:
    """Return current threat entries above threshold across all posts."""
    with _tracks_lock:
        threats = []
        for post_id, dq in _tracks.items():
            for entry in list(dq)[:5]:   # only check recent 5 per post
                if entry.get("threat_score", 0) >= min_score:
                    threats.append({**entry, "post_id": post_id})
                    break   # one active threat per post
        threats.sort(key=lambda x: x["threat_score"], reverse=True)
        return threats


def get_drone_status() -> dict[str, Any]:
    """
    System-wide drone monitoring status summary.
    Used by GET /api/v1/drone/status.
    """
    with _tracks_lock:
        posts_monitored  = len(_tracks)
        total_detections = sum(len(dq) for dq in _tracks.values())
        active_threats   = []
        highest_score    = 0.0
        for post_id, dq in _tracks.items():
            for entry in list(dq)[:3]:
                sc = entry.get("threat_score", 0)
                if sc >= settings.drone_alert_threshold:
                    active_threats.append({**entry, "post_id": post_id})
                    highest_score = max(highest_score, sc)
                    break

    active_threats.sort(key=lambda x: x["threat_score"], reverse=True)

    # Overall warning level
    if highest_score >= 0.65:
        level = "CRITICAL"
    elif highest_score >= 0.42:
        level = "ALERT"
    elif highest_score >= 0.25:
        level = "WATCH"
    else:
        level = "NONE"

    return {
        "system_warning_level":  level,
        "highest_threat_score":  round(highest_score, 4),
        "active_threats":        active_threats[:5],
        "posts_monitored":       posts_monitored,
        "total_detections":      total_detections,
        "drone_classes":         list(DRONE_PROFILES.keys()),
        "threshold":             settings.drone_alert_threshold,
    }


def _track_summary(post_id: str) -> dict[str, Any]:
    """Summary of recent track history for this post."""
    with _tracks_lock:
        dq = _tracks.get(post_id, deque())
        entries = list(dq)[:20]

    if not entries:
        return {"count": 0, "max_score": 0.0, "trend": "stable"}

    scores = [e["threat_score"] for e in entries]
    max_sc = max(scores)
    avg_sc = sum(scores) / len(scores)

    # Trend: compare first 5 vs last 5
    if len(scores) >= 10:
        recent_avg = sum(scores[:5])  / 5
        older_avg  = sum(scores[-5:]) / 5
        if recent_avg > older_avg + 0.05:
            trend = "increasing"
        elif recent_avg < older_avg - 0.05:
            trend = "decreasing"
        else:
            trend = "stable"
    else:
        trend = "stable"

    return {
        "count":     len(entries),
        "max_score": round(max_sc, 4),
        "avg_score": round(avg_sc, 4),
        "trend":     trend,
        "entries":   entries[:10],
    }


# ── Recommended action builder ────────────────────────────────────────────────

def _build_action(result: dict[str, Any]) -> str:
    ew    = result.get("early_warning_level", EW_NONE)
    cls   = result.get("drone_class", "none")
    score = result.get("threat_score", 0.0)
    cue   = result.get("camera_cue", {})
    brg   = result.get("bearing_deg")

    if ew == "CRITICAL":
        brg_str = f" Bearing {brg:.0f}°." if brg is not None else ""
        return (
            f"CRITICAL UAV INCURSION — {DRONE_PROFILES.get(cls, {}).get('label', cls)} "
            f"(score {score:.2f}).{brg_str} "
            f"Immediate QRT cue. Slew PTZ camera: {cue.get('note', '')} "
            f"Notify sector HQ and correlate with RF/radar sensors."
        )
    elif ew == "ALERT":
        return (
            f"Unauthorised aerial acoustic signature detected "
            f"({DRONE_PROFILES.get(cls, {}).get('label', cls)}, score {score:.2f}). "
            f"Camera cue: {cue.get('note', 'Slew to bearing.')} "
            f"Elevate to sector HQ."
        )
    elif ew == "WATCH":
        return (
            f"Possible aerial acoustic activity (score {score:.2f}). "
            f"Increase acoustic sentry sensitivity. Continue monitoring."
        )
    else:
        return "Monitor acoustic sentry — no UAV signature detected."
