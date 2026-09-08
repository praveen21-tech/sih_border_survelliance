from __future__ import annotations

import logging
import threading
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

import numpy as np

from .audio import load_audio, spectrogram_png, write_evidence_wav, sha256_bytes
from .config import settings
from .db import save_alerts, save_analysis, save_drone_track
from .engines.drone_engine import DroneEngine
from .engines.fusion import build_alerts, fuse_events, calculate_fused_risk
from .engines.panns_engine import PannsEngine
from .engines.specialist import specialist_detect
from .engines.whisper_engine import WhisperEngine
from .engines.yamnet_engine import YamnetEngine
from .schemas import SensorContext

log = logging.getLogger("border.audio")
IST = timezone(timedelta(hours=5, minutes=30))

SECTORS = [
    {"post_id": "BOP-JK-003", "sector": "Jammu-Kathua Belt", "state": "Jammu & Kashmir", "lat": 32.7266, "lon": 74.8570, "force": "BSF"},
    {"post_id": "BOP-PB-011", "sector": "Amritsar-Ferozepur", "state": "Punjab", "lat": 31.1471, "lon": 75.3412, "force": "BSF"},
    {"post_id": "BOP-RJ-014", "sector": "Barmer-Jaisalmer Sector", "state": "Rajasthan", "lat": 26.9157, "lon": 70.9083, "force": "BSF"},
    {"post_id": "BOP-GJ-007", "sector": "Kutch-Sir Creek Approaches", "state": "Gujarat", "lat": 23.7337, "lon": 69.8597, "force": "BSF"},
    {"post_id": "BOP-WB-021", "sector": "North 24 Parganas / Padma", "state": "West Bengal", "lat": 22.9868, "lon": 88.8850, "force": "BSF"},
    {"post_id": "BOP-AS-009", "sector": "Dhubri-South Salmara", "state": "Assam", "lat": 26.0207, "lon": 89.9743, "force": "BSF"},
    {"post_id": "BOP-NL-002", "sector": "Mon-Tuensang Ridge", "state": "Nagaland", "lat": 26.1584, "lon": 94.5624, "force": "Assam Rifles"},
    {"post_id": "BOP-AR-006", "sector": "Tawang-Bum La Axis", "state": "Arunachal Pradesh", "lat": 27.5860, "lon": 91.8590, "force": "ITBP"},
    {"post_id": "BOP-UK-004", "sector": "Pithoragarh-Lipulekh", "state": "Uttarakhand", "lat": 30.2880, "lon": 80.5000, "force": "ITBP"},
    {"post_id": "BOP-HP-001", "sector": "Shipki La Approaches", "state": "Himachal Pradesh", "lat": 31.8800, "lon": 78.6500, "force": "ITBP"},
]


class IntelligencePipeline:
    def __init__(self) -> None:
        self.yamnet = YamnetEngine()
        self.panns = PannsEngine()
        self.whisper = WhisperEngine()
        self.drone = DroneEngine()
        self._lock = threading.Lock()
        self.loaded = False
        self.subscribers: list = []

    def warmup(self) -> dict[str, Any]:
        with self._lock:
            if self.loaded:
                return self.status()
            log.info("Loading real acoustic models (YAMNet, PANNs CNN14, Whisper)")
            if not self.yamnet.ready:
                self.yamnet.load()
            if not self.panns.ready:
                self.panns.load()
            if not self.whisper.ready:
                self.whisper.load()
            self.loaded = True
        return self.status()

    def status(self) -> dict[str, Any]:
        from .engines.vision_engine import vision_engine
        return {
            "yamnet":           {"ready": self.yamnet.ready,  "error": self.yamnet.error},
            "panns_cnn14":      {"ready": self.panns.ready,   "error": self.panns.error},
            "whisper":          {
                "ready":  self.whisper.ready,
                "error":  self.whisper.error,
                "size":   getattr(self.whisper, "_size", settings.whisper_size),
                "languages": "22 Indian + global (auto-detect)",
            },
            "drone_physics":    {"ready": True, "error": None},
            "drone_classifier": {"ready": True, "error": None, "profiles": 7},
            "dsp_specialists":  {"ready": True, "error": None},
            "yolo_vision":      {"ready": vision_engine.ready, "error": vision_engine.error,
                                 "model": vision_engine._model_name},
            "operational":      self.yamnet.ready or self.panns.ready,
        }

    def analyze_bytes(self, data: bytes, context: SensorContext, filename: str = "capture.wav") -> dict[str, Any]:
        y, sr = load_audio(data, sr=settings.sample_rate)
        return self.analyze_array(y, sr, context, filename=filename, raw=data)

    def analyze_array(
        self,
        y: np.ndarray,
        sr: int,
        context: SensorContext,
        filename: str = "capture.wav",
        raw: bytes | None = None,
    ) -> dict[str, Any]:
        self.warmup()
        analysis_id = uuid.uuid4().hex[:16]
        created = datetime.now(IST)

        yamnet_hits: list = []
        panns_hits: list = []
        embedding = None
        try:
            yamnet_hits = self.yamnet.infer(y, sr)
        except Exception as exc:
            log.exception("YAMNet inference failed: %s", exc)
        try:
            panns_hits, embedding = self.panns.infer(y, sr)
        except Exception as exc:
            log.exception("PANNs inference failed: %s", exc)
        dsp_hits = specialist_detect(y, sr)
        events = fuse_events(yamnet_hits, panns_hits, dsp_hits)

        speech_score = max(
            [e["score"] for e in events if e.get("category") == "speech"] or [0.0]
        )
        transcript = {
            "text": "",
            "language": "",
            "language_probability": 0.0,
            "distress": False,
            "distress_phrases": [],
            "segments": [],
        }
        if speech_score >= settings.speech_gate:
            try:
                transcript = self.whisper.transcribe(y, sr)
            except Exception as exc:
                log.exception("Whisper failed: %s", exc)

        drone = self.drone.assess(
            y, sr, yamnet_hits, panns_hits, embedding,
            dsp_hits=dsp_hits,
            post_id=context.post_id,
            analysis_id=analysis_id,
        )
        fused_risk = calculate_fused_risk(
            acoustic_score=drone.get("threat_score", 0.0),
            visual_score=0.0,
            speech_result=transcript,
        )
        alerts = build_alerts(events, transcript, drone)

        evidence_name = f"{created.strftime('%Y%m%dT%H%M%S')}_{context.post_id}_{analysis_id}.wav"
        evidence_path = settings.evidence_dir / evidence_name
        write_evidence_wav(y, sr, evidence_path)
        digest = sha256_bytes(evidence_path.read_bytes())

        models_used = []
        if self.yamnet.ready:
            models_used.append("YAMNet")
        if self.panns.ready:
            models_used.append("PANNs-CNN14")
        if self.whisper.ready and speech_score >= settings.speech_gate:
            models_used.append(f"Whisper-{settings.whisper_size}")
        models_used.append("UAV-Acoustic-Physics")
        models_used.append("DSP-Impulse/Siren/Rotor")

        spec_b64 = spectrogram_png(y, sr)

        payload = {
            "analysis_id": analysis_id,
            "created_at": created.isoformat(),
            "duration_sec": round(len(y) / sr, 3),
            "sample_rate": sr,
            "context": context.model_dump(),
            "events": events,
            "transcript": transcript,
            "drone": drone,
            "alerts": alerts,
            "fused_risk": fused_risk,
            "evidence_sha256": digest,
            "evidence_path": str(evidence_path),
            "spectrogram_png_b64": spec_b64,
            "models_used": models_used,
            "source_filename": filename,
        }
        save_analysis(analysis_id, created, payload)
        ids = save_alerts(analysis_id, created, alerts, context.model_dump())
        for i, alert in enumerate(alerts):
            alert["id"] = ids[i] if i < len(ids) else None
        # Persist drone track for every analysis
        try:
            save_drone_track(analysis_id, context.post_id, created, drone)
        except Exception as exc:
            log.warning("drone track save failed: %s", exc)
        self._broadcast(payload)
        return payload

    def run_field_battery(self) -> dict[str, Any]:
        from .field_samples import prepare_field_samples

        files = prepare_field_samples()
        results = []
        for name, path in files.items():
            sector = SECTORS[2]
            if "gun" in name or "firework" in name or "impulse" in name:
                sector = SECTORS[0]
            elif "uav" in name or "drone" in name or "helicopter" in name or "airplane" in name:
                sector = SECTORS[2]
            elif "crowd" in name:
                sector = SECTORS[4]
            elif "distress" in name or "crying" in name or "scream" in name:
                sector = SECTORS[1]
            ctx = SensorContext(
                post_id=sector["post_id"],
                sector=sector["sector"],
                state=sector["state"],
                force=sector["force"],
                lat=sector["lat"],
                lon=sector["lon"],
            )
            payload = self.analyze_bytes(path.read_bytes(), ctx, filename=name)
            results.append(
                {
                    "sample": name,
                    "analysis_id": payload["analysis_id"],
                    "duration_sec": payload["duration_sec"],
                    "top_events": [
                        {
                            "label": e["label"],
                            "score": round(e["score"], 3),
                            "category": e["category"],
                        }
                        for e in payload["events"][:5]
                    ],
                    "drone_threat": payload["drone"]["threat"],
                    "drone_score": payload["drone"]["threat_score"],
                    "transcript": (payload["transcript"] or {}).get("text", "")[:180],
                    "alerts": [a["title"] for a in payload["alerts"]],
                    "models_used": payload["models_used"],
                }
            )
        return {"count": len(results), "results": results, "models": self.status()}

    def _broadcast(self, payload: dict[str, Any]) -> None:
        dead = []
        drone = payload.get("drone", {})
        # Build a compact drone-focused WebSocket message
        drone_msg = {
            "type":                "drone_update",
            "analysis_id":         payload.get("analysis_id"),
            "post_id":             (payload.get("context") or {}).get("post_id"),
            "created_at":          payload.get("created_at"),
            "threat":              drone.get("threat", False),
            "threat_score":        drone.get("threat_score", 0),
            "early_warning_level": drone.get("early_warning_level", "NONE"),
            "drone_class":         drone.get("drone_class") or drone.get("class_name", "none"),
            "class_label":         drone.get("class_label", ""),
            "bearing_deg":         drone.get("bearing_deg"),
            "camera_cue":          drone.get("camera_cue", {}),
            "timeline":            drone.get("timeline", []),
            "model_votes":         drone.get("model_votes", {}),
            "recommended_action":  drone.get("recommended_action", ""),
        }
        for q in self.subscribers:
            try:
                q.put_nowait({"type": "analysis", "data": _ws_trim(payload)})
                q.put_nowait(drone_msg)
            except Exception:
                dead.append(q)
        for q in dead:
            self.subscribers.remove(q)


def _ws_trim(payload: dict[str, Any]) -> dict[str, Any]:
    slim = dict(payload)
    slim.pop("spectrogram_png_b64", None)
    return slim


pipeline = IntelligencePipeline()
