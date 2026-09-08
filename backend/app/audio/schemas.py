from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from pydantic import BaseModel, Field


def ist_now() -> datetime:
    return datetime.now(timezone.utc)


class SensorContext(BaseModel):
    post_id: str = "BOP-RJ-014"
    sector: str = "Barmer-Jaisalmer Sector"
    state: str = "Rajasthan"
    force: str = "Border Security Force"
    device_id: str = "MIC-ARRAY-01"
    lat: float = 26.9157
    lon: float = 70.9083
    camera_id: Optional[str] = "CAM-TOWER-4"


class AudioEventHit(BaseModel):
    label: str
    category: str
    score: float
    source_model: str
    hindi_label: str = ""
    operational_note: str = ""


class TranscriptResult(BaseModel):
    text: str = ""
    language: str = ""
    language_probability: float = 0.0
    distress: bool = False
    distress_phrases: list[str] = Field(default_factory=list)
    segments: list[dict[str, Any]] = Field(default_factory=list)


class DroneAssessment(BaseModel):
    threat: bool = False
    threat_score: float = 0.0
    class_name: str = "none"
    class_confidence: float = 0.0
    signature: dict[str, Any] = Field(default_factory=dict)
    model_votes: dict[str, float] = Field(default_factory=dict)
    recommended_action: str = ""


class AnalysisResult(BaseModel):
    analysis_id: str
    created_at: datetime
    duration_sec: float
    sample_rate: int
    context: SensorContext
    events: list[AudioEventHit]
    transcript: TranscriptResult
    drone: DroneAssessment
    alerts: list[dict[str, Any]]
    evidence_sha256: str
    evidence_path: Optional[str] = None
    spectrogram_png_b64: Optional[str] = None
    models_used: list[str] = Field(default_factory=list)


class AlertRecord(BaseModel):
    id: int | None = None
    analysis_id: str
    alert_type: str
    severity: str
    title: str
    title_hi: str
    detail: str
    score: float
    post_id: str
    sector: str
    acknowledged: bool = False
    created_at: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)
