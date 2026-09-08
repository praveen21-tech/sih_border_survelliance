from __future__ import annotations

from typing import Any

from ..config import settings
from ..ontology import SECURITY_TAXONOMY


PRIORITY = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}


def fuse_events(*sources: list[dict]) -> list[dict]:
    """Merge overlapping labels from YAMNet, PANNs, and DSP specialists.

    Deduplicates by (category, label) key, keeping max score and boosting
    slightly when multiple models agree.  Also applies category suppression:
    generic labels (vehicle) are downranked when a more specific label in the
    same acoustic domain (aircraft_rotorcraft) is strongly present.
    """
    bucket: dict[str, dict] = {}
    for src in sources:
        for hit in src or []:
            key = f"{hit['category']}|{hit['label'].lower()}"
            if key not in bucket:
                bucket[key] = dict(hit)
                bucket[key]["sources"] = [hit["source_model"]]
            else:
                bucket[key]["score"] = max(bucket[key]["score"], hit["score"])
                if hit["source_model"] not in bucket[key]["sources"]:
                    bucket[key]["sources"].append(hit["source_model"])
                    bucket[key]["score"] = min(1.0, bucket[key]["score"] * 1.08)

    # ------------------------------------------------------------------
    # Category-level suppression: if a specific aerial label reaches ≥0.45,
    # suppress the generic "vehicle" event so it doesn't top the list for
    # aircraft clips.  YAMNet/PANNs both score "Vehicle" broadly on engine
    # noise regardless of altitude.
    # ------------------------------------------------------------------
    aerial_score = max(
        (v["score"] for v in bucket.values() if v.get("category") == "aircraft_rotorcraft"),
        default=0.0,
    )
    if aerial_score >= 0.45:
        for v in bucket.values():
            if v.get("category") == "vehicle":
                v["score"] = min(v["score"], aerial_score * 0.70)

    fused = sorted(bucket.values(), key=lambda x: x["score"], reverse=True)
    return fused[:24]


def build_alerts(
    events: list[dict],
    transcript: dict,
    drone: dict,
) -> list[dict[str, Any]]:
    alerts: list[dict[str, Any]] = []

    by_cat: dict[str, dict] = {}
    for ev in events:
        cat = ev.get("category") or "other"
        if cat in ("other", "speech", "vehicle") and ev["score"] < settings.event_alert_threshold:
            continue
        if cat not in SECURITY_TAXONOMY:
            continue
        floor = settings.event_alert_threshold
        if cat in ("gunshot", "explosion"):
            floor = 0.22
        elif cat == "scream":
            floor = 0.22
        elif cat in ("alarm", "aircraft_rotorcraft"):
            floor = 0.32
        elif cat == "crowd":
            floor = 0.45
        if ev["score"] < floor:
            continue
        if cat == "scream" and events:
            lead = events[0]
            if lead.get("category") == "other" and lead["score"] >= ev["score"] + 0.12:
                continue
        prev = by_cat.get(cat)
        if not prev or ev["score"] > prev["score"]:
            by_cat[cat] = ev

    for cat, ev in by_cat.items():
        spec = SECURITY_TAXONOMY[cat]
        if cat in ("speech", "vehicle") and not transcript.get("distress"):
            continue
        alerts.append(
            {
                "alert_type": cat,
                "severity": spec["severity"],
                "title": f"{cat.replace('_', ' ').title()} detected",
                "title_hi": spec["hindi"],
                "detail": f"{ev['label']} (score {ev['score']:.2f}) via {', '.join(ev.get('sources') or [ev['source_model']])}. {spec['note']}",
                "score": ev["score"],
                "metadata": {"label": ev["label"], "models": ev.get("sources")},
            }
        )

    if transcript.get("distress"):
        alerts.append(
            {
                "alert_type": "distress_call",
                "severity": "CRITICAL",
                "title": "Distress / help call (speech)",
                "title_hi": "संकट काल / मदद की पुकार",
                "detail": (
                    f"Whisper [{transcript.get('language_name') or transcript.get('language','')} "
                    f"— {transcript.get('language_native','')}] transcript contains distress markers "
                    f"{transcript.get('distress_phrases')}: "
                    f"[{transcript.get('text','')[:240]}]"
                ),
                "score": max(0.72, float(transcript.get("language_probability") or 0.72)),
                "metadata": {
                    "phrases":        transcript.get("distress_phrases"),
                    "threat_keywords":transcript.get("threat_keywords"),
                    "language":       transcript.get("language"),
                    "language_name":  transcript.get("language_name"),
                    "script":         transcript.get("language_script"),
                },
            }
        )

    # Tactical keyword alert (independent of full distress — fires on bomb/infiltrate/tunnel etc.)
    if transcript.get("threat_keywords") and not transcript.get("distress"):
        kws = transcript["threat_keywords"]
        alerts.append(
            {
                "alert_type": "tactical_keyword",
                "severity": "HIGH",
                "title": "Tactical threat keyword in speech",
                "title_hi": "भाषण में सामरिक खतरे का शब्द",
                "detail": (
                    f"Keywords detected: {', '.join(kws[:6])}. "
                    f"Language: {transcript.get('language_name','')} "
                    f"({transcript.get('language','')}). "
                    f"Transcript: [{transcript.get('text','')[:200]}]"
                ),
                "score": 0.62,
                "metadata": {"keywords": kws, "language": transcript.get("language")},
            }
        )

    if drone.get("threat"):
        alerts.append(
            {
                "alert_type": "unauthorised_uav",
                "severity": "CRITICAL",
                "title": "Unauthorised drone / UAV acoustic signature",
                "title_hi": "\u0905\u0928\u0927\u093f\u0915\u0943\u0924 \u0921\u094d\u0930\u094b\u0928 / \u0935\u093e\u092f\u0941\u092f\u093e\u0928 \u0927\u094d\u0935\u0928\u093f \u0938\u0902\u0915\u0947\u0924",
                "detail": (
                    f"Class={drone.get('class_name')} score={drone.get('threat_score'):.2f}. "
                    f"{drone.get('recommended_action')}"
                ),
                "score": float(drone.get("threat_score") or 0),
                "metadata": drone,
            }
        )

    alerts.sort(key=lambda a: (PRIORITY.get(a["severity"], 0), a["score"]), reverse=True)
    return alerts


def calculate_fused_risk(acoustic_score: float, visual_score: float, speech_result: dict) -> dict:
    """
    Ensure identified threat words and acoustic/visual signals override default risk scoring.
    """
    base_score = (acoustic_score * 0.45) + (visual_score * 0.35)

    # Keyword threat boost
    speech_boost = 0.0
    if speech_result.get("is_distress") or speech_result.get("distress"):
        kws = speech_result.get("threat_keywords", [])
        speech_boost = 0.20 + (0.05 * len(kws))

    fused_risk = min(1.0, base_score + speech_boost)

    return {
        "fused_risk_score": round(fused_risk, 3),
        "threat_level": "CRITICAL" if fused_risk > 0.75 else "WARNING" if fused_risk > 0.45 else "INFO",
        "speech_trigger": bool(speech_result.get("is_distress") or speech_result.get("distress")),
        "detected_keywords": speech_result.get("threat_keywords", [])
    }
