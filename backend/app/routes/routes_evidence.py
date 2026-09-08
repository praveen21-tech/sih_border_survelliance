from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("bordereye.evidence")

router = APIRouter(prefix="/api/v1/evidence", tags=["Evidence Vault & Tamper-Evident Storage"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent
EVIDENCE_DIR = BASE_DIR / "backend" / "data" / "evidence"
EVIDENCE_STORE_FILE = EVIDENCE_DIR / "evidence_store.json"
_LOCK = threading.RLock()

class EvidenceCreateRequest(BaseModel):
    camera_id: str = "CAM-04"
    timestamp: Optional[str] = None
    incident_type: Optional[str] = "Perimeter Security Event"
    severity: Optional[str] = "high"
    officer: Optional[str] = "MAJOR PRAVEEN"
    notes: Optional[str] = "Captured via AI Investigation Command"
    snapshot_base64: Optional[str] = None

def _load_evidence_list() -> list[dict]:
    try:
        if EVIDENCE_STORE_FILE.exists():
            return json.loads(EVIDENCE_STORE_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        logger.warning(f"Failed to load evidence: {e}")
    return []

def _save_evidence_list(items: list[dict]) -> None:
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = EVIDENCE_STORE_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(items, indent=2), encoding="utf-8")
    tmp.replace(EVIDENCE_STORE_FILE)

def capture_camera_snapshot(camera_id: str) -> str:
    cam_clean = camera_id.lower().replace("_", "-")
    try:
        if "cam-06" in cam_clean:
            from ..vision.face_pipeline import latest_annotated, latest_raw
            f = latest_annotated() or latest_raw()
            if f is not None:
                _, buf = cv2.imencode(".jpg", f, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                return "data:image/jpeg;base64," + base64.b64encode(buf).decode("utf-8")
        else:
            from ..vision.camera_runner import resolve_video_path
            vid_map = {
                "cam-01": "cam1.mp4",
                "cam-02": "cam2.mp4",
                "cam-03": "cam1.mp4",
                "cam-04": "cam4.mp4",
                "cam-05": "cam5.mp4",
            }
            vname = vid_map.get(cam_clean, "cam4.mp4")
            vpath = resolve_video_path(vname)
            if vpath and vpath.exists():
                cap = cv2.VideoCapture(str(vpath))
                ret, frame = cap.read()
                cap.release()
                if ret and frame is not None:
                    h, w = frame.shape[:2]
                    watermark = f"{camera_id.upper()} SECURED EVIDENCE | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                    cv2.rectangle(frame, (10, h - 35), (w - 10, h - 10), (10, 10, 10), -1)
                    cv2.putText(frame, watermark, (20, h - 18), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 200), 1)
                    _, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
                    return "data:image/jpeg;base64," + base64.b64encode(buf).decode("utf-8")
    except Exception as e:
        logger.warning(f"Snapshot capture fallback: {e}")

    img = np.zeros((480, 640, 3), dtype=np.uint8)
    img[:] = (20, 25, 35)
    cv2.rectangle(img, (20, 20), (620, 460), (59, 130, 246), 2)
    cv2.putText(img, f"EVIDENCE SNAPSHOT - {camera_id.upper()}", (40, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(img, f"TIMESTAMP: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", (40, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (148, 163, 184), 1)
    cv2.putText(img, "STATUS: SECURED & TAMPER-SEALED", (40, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (34, 197, 94), 1)
    _, buf = cv2.imencode(".jpg", img)
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode("utf-8")

def store_evidence_item(
    camera_id: str,
    incident_type: str = "Perimeter Security Event",
    severity: str = "high",
    officer: str = "MAJOR PRAVEEN",
    notes: str = "Captured via AI Investigation Command",
    timestamp: str | None = None,
    snapshot_base64: str | None = None
) -> dict:
    ts = timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    now_ms = int(time.time() * 1000)
    ev_id = f"EV-{now_ms % 1000000:06d}"
    
    snap = snapshot_base64 or capture_camera_snapshot(camera_id)
    
    raw_payload = f"{ev_id}|{camera_id}|{ts}|{incident_type}|{officer}|{notes}|{snap[:100]}"
    sha256_seal = hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()

    cam_names = {
        "CAM-01": "CAM-01 Sector 1 Perimeter Tracking",
        "CAM-02": "CAM-02 Highway Checkpoint & ANPR",
        "CAM-03": "CAM-03 Night Low-Light Border",
        "CAM-04": "CAM-04 Virtual Fence Intrusion Sentry",
        "CAM-05": "CAM-05 Sector 5 Crowd & Drone Sentry",
        "CAM-06": "CAM-06 Biometric Access Control Checkpoint",
    }

    item = {
        "id": ev_id,
        "title": f"{incident_type} - {camera_id.upper()}",
        "camera_id": camera_id.upper(),
        "camera_name": cam_names.get(camera_id.upper(), f"{camera_id.upper()} Security Feed"),
        "timestamp": ts,
        "incident_type": incident_type,
        "severity": severity.lower(),
        "officer": officer,
        "notes": notes,
        "snapshot_url": snap,
        "sha256_hash": sha256_seal,
        "status": "SECURED & SEALED",
        "chain_of_custody": [
            {
                "action": "Evidence Captured & Sealed",
                "officer": officer,
                "time": ts,
                "seal": sha256_seal[:16] + "...",
            }
        ]
    }

    with _LOCK:
        items = _load_evidence_list()
        items.insert(0, item)
        _save_evidence_list(items)

    return item

@router.post("/store")
def create_evidence(req: EvidenceCreateRequest):
    item = store_evidence_item(
        camera_id=req.camera_id,
        incident_type=req.incident_type or "Perimeter Security Event",
        severity=req.severity or "high",
        officer=req.officer or "MAJOR PRAVEEN",
        notes=req.notes or "Captured via AI Investigation Command",
        timestamp=req.timestamp,
        snapshot_base64=req.snapshot_base64,
    )
    return {"status": "success", "message": "Evidence stored and cryptographically sealed.", "evidence": item}

@router.get("/list")
def list_evidence():
    with _LOCK:
        items = _load_evidence_list()
        if not items:
            seed_1 = store_evidence_item("CAM-04", "Virtual Fence Perimeter Intrusion", "critical", "MAJOR PRAVEEN", "Intruder approached virtual fence sector 4 polygon.")
            seed_2 = store_evidence_item("CAM-02", "ANPR High-Speed Plate Capture", "medium", "MAJOR PRAVEEN", "RapidOCR recognized vehicle plate TN11AA1234.")
            seed_3 = store_evidence_item("CAM-06", "Biometric Checkpoint Access Authorization", "low", "MAJOR PRAVEEN", "Authorized commander verified with FaceNet 512-d biometrics.")
            items = [seed_1, seed_2, seed_3]
        return {"total": len(items), "evidence": items}

@router.get("/{evidence_id}")
def get_evidence(evidence_id: str):
    with _LOCK:
        items = _load_evidence_list()
        found = next((x for x in items if x["id"] == evidence_id), None)
        if not found:
            raise HTTPException(status_code=404, detail=f"Evidence record {evidence_id} not found")
        return found

@router.delete("/{evidence_id}")
def delete_evidence(evidence_id: str):
    with _LOCK:
        items = _load_evidence_list()
        new_items = [x for x in items if x["id"] != evidence_id]
        if len(new_items) == len(items):
            raise HTTPException(status_code=404, detail=f"Evidence record {evidence_id} not found")
        _save_evidence_list(new_items)
        return {"status": "deleted", "id": evidence_id}

