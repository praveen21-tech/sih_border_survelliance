import time
import json
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import cv2
import numpy as np

from ..database.db_session import get_db
from ..database.models import SurveillanceEvent, VehicleRecord, WatchlistRecord
from ..hub import hub

try:
    from ..vision.watchlist_manager import WatchlistManager
    from ..vision.intrusion import FenceEngine
    from ..vision import face_pipeline
except Exception:
    try:
        from app.vision.watchlist_manager import WatchlistManager
        from app.vision.intrusion import FenceEngine
        from app.vision import face_pipeline
    except Exception:
        WatchlistManager = None
        FenceEngine = None
        face_pipeline = None

logger = logging.getLogger('bordereye.vision')
router = APIRouter(prefix='/api/v1/vision', tags=['Vision & CCTV Core (IVBAP)'])

# Persistent watchlist & fences
DATA_DIR = Path('data')
DATA_DIR.mkdir(parents=True, exist_ok=True)
watchlist_mgr = WatchlistManager(DATA_DIR / 'watchlist.json') if WatchlistManager else None

# In-memory fence engines per camera
FENCE_ENGINES: Dict[str, Any] = {}

def get_fence_engine(camera_id: str):
    if camera_id not in FENCE_ENGINES and FenceEngine:
        engine = FenceEngine(threshold=0.07)
        fence_file = DATA_DIR / f'{camera_id}_fence.json'
        if fence_file.exists():
            try:
                data = json.loads(fence_file.read_text(encoding='utf-8'))
                engine.set_polygon(data.get('polygon'))
            except Exception:
                pass
        FENCE_ENGINES[camera_id] = engine
    return FENCE_ENGINES.get(camera_id)

@router.get('/events')
def get_surveillance_events(limit: int = 50, db: Session = Depends(get_db)):
    events = db.query(SurveillanceEvent).order_by(SurveillanceEvent.timestamp.desc()).limit(limit).all()
    return [{'id': e.id, 'camera_id': e.camera_id, 'event_type': e.event_type, 'severity': e.severity, 'description': e.description, 'timestamp': e.timestamp.isoformat() if e.timestamp else None} for e in events]

@router.get('/vehicles')
def get_vehicles(limit: int = 50, db: Session = Depends(get_db)):
    vehicles = db.query(VehicleRecord).order_by(VehicleRecord.timestamp.desc()).limit(limit).all()
    return [{'id': v.id, 'camera_id': v.camera_id, 'license_plate': v.license_plate, 'vehicle_type': v.vehicle_type, 'speed_kmh': v.speed_kmh, 'timestamp': v.timestamp.isoformat() if v.timestamp else None} for v in vehicles]

# ── Camera Feeds & Pipelines Status ──────────────────────────────────────────
@router.get('/cameras')
def get_camera_pipelines():
    return {
        'cameras': [
            {
                'id': 'cam-01',
                'name': 'CAM-01 Human Detection (ByteTrack)',
                'features': ['YOLO11 Person Detection', 'ByteTrack Persistent IDs'],
                'status': 'online',
                'fps': 30,
            },
            {
                'id': 'cam-02',
                'name': 'CAM-02 Vehicle ANPR (Number Plate)',
                'features': ['Vehicle Detection', 'RapidOCR Plate Recognition', 'Indian Format Validation'],
                'status': 'online',
                'fps': 30,
            },
            {
                'id': 'cam-03',
                'name': 'CAM-03 Low-Light Night Vision',
                'features': ['Low-Light CLAHE Enhancement', 'Dynamic Brightness Ramp'],
                'status': 'online',
                'fps': 30,
            },
            {
                'id': 'cam-04',
                'name': 'CAM-04 Virtual Fence Intrusion',
                'features': ['Interactive Polygon Tripwire', 'Approaching/Intrusion State Machine'],
                'status': 'online',
                'fps': 30,
            },
            {
                'id': 'cam-06',
                'name': 'CAM-06 Facial Recognition (Webcam / Live)',
                'features': ['InsightFace RetinaFace', 'ArcFace 512-d Embeddings', 'Watchlist Matcher'],
                'status': 'online',
                'fps': 15,
            },
        ]
    }

# ── Watchlist APIs ───────────────────────────────────────────────────────────
@router.get('/watchlist')
def get_watchlist():
    if watchlist_mgr:
        return {'people': watchlist_mgr.get_people()}
    return {'people': []}

@router.post('/watchlist')
def add_to_watchlist(payload: dict = Body(...)):
    name = payload.get('name')
    embeddings = payload.get('embeddings', [])
    if not name or not embeddings:
        raise HTTPException(status_code=400, detail='Name and embeddings required')
    if watchlist_mgr:
        watchlist_mgr.add_person(name, [np.array(e, dtype=np.float32) for e in embeddings])
        return {'status': 'added', 'name': name}
    return {'status': 'mock_added', 'name': name}

# ── Virtual Fence APIs ───────────────────────────────────────────────────────
@router.get('/fence/{camera_id}')
def get_fence(camera_id: str):
    engine = get_fence_engine(camera_id)
    return {'camera': camera_id, 'polygon': engine.polygon if engine else None}

@router.post('/fence/{camera_id}')
def set_fence(camera_id: str, payload: dict = Body(...)):
    polygon = payload.get('polygon')
    engine = get_fence_engine(camera_id)
    if engine:
        engine.set_polygon(polygon)
        fence_file = DATA_DIR / f'{camera_id}_fence.json'
        try:
            fence_file.write_text(json.dumps({'camera': camera_id, 'polygon': polygon}, indent=2), encoding='utf-8')
        except Exception:
            pass
        return {'status': 'updated', 'camera': camera_id, 'polygon': engine.polygon}
    return {'status': 'noop'}

@router.post('/fence/{camera_id}/reset')
def reset_fence(camera_id: str):
    engine = get_fence_engine(camera_id)
    if engine:
        engine.set_polygon(None)
        fence_file = DATA_DIR / f'{camera_id}_fence.json'
        if fence_file.exists():
            try:
                fence_file.unlink()
            except Exception:
                pass
        return {'status': 'cleared', 'camera': camera_id}
    return {'status': 'noop'}

# ── Facial Recognition CAM06 MJPEG Stream & Snapshots ────────────────────────
def _get_face_snapshot() -> tuple[bytes, bool]:
    if face_pipeline:
        frame = face_pipeline.latest_annotated()
        if frame is None:
            frame = face_pipeline.placeholder_frame('waiting for webcam')
        ok, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
        return (buf.tobytes() if ok else b''), face_pipeline.FACE_PIPELINE.webcam
    # Fallback placeholder image
    blank = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(blank, 'CAM-06 Facial Recognition Active', (80, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 128), 2)
    ok, buf = cv2.imencode('.jpg', blank, [cv2.IMWRITE_JPEG_QUALITY, 75])
    return buf.tobytes(), True

@router.get('/faces/stream')
async def faces_stream():
    def gen():
        while True:
            data, ok = _get_face_snapshot()
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + data + b'\r\n')
            time.sleep(0.12 if ok else 0.5)
    return StreamingResponse(
        gen(),
        media_type='multipart/x-mixed-replace; boundary=frame',
        headers={'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no'}
    )

@router.get('/faces/snapshot.jpg')
async def faces_snapshot():
    data, _ = _get_face_snapshot()
    return Response(content=data, media_type='image/jpeg', headers={'Cache-Control': 'no-store'})

@router.get('/faces/alerts')
async def faces_alerts():
    if face_pipeline:
        return {'camera': 'cam-06', 'alerts': list(face_pipeline.FACE_PIPELINE.alerts)}
    return {'camera': 'cam-06', 'alerts': []}
