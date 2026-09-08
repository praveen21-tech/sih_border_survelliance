import os
import sys
import time
import json
import base64
import logging
import asyncio
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Body, Response, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import cv2
import numpy as np

from .config import settings
from .database.db_session import init_db
from .hub import hub
from .routes import routes_system, routes_vision, routes_reid, routes_query, routes_audio, routes_evidence

try:
    from .vision import face_pipeline
    from .vision.face_detector import FaceDetector
    from .vision.watchlist_manager import WatchlistManager
    from .vision.intrusion import FenceEngine
    from .vision.camera_runner import (
        start_all_pipelines,
        stop_all_pipelines,
        get_pipeline,
        PIPELINES,
    )
except Exception as e:
    face_pipeline = None
    FaceDetector = None
    WatchlistManager = None
    FenceEngine = None
    start_all_pipelines = None
    stop_all_pipelines = None
    get_pipeline = lambda x: None
    PIPELINES = []

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("bordereye.master")

_loop: Optional[asyncio.AbstractEventLoop] = None
DATA_DIR = Path("data")
DATA_DIR.mkdir(parents=True, exist_ok=True)
watchlist_mgr = WatchlistManager(DATA_DIR / "watchlist.json") if WatchlistManager else None
_face_detector = None

def get_face_detector():
    global _face_detector
    if _face_detector is None and FaceDetector:
        _face_detector = FaceDetector(min_det_score=0.35)
    return _face_detector

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _loop
    _loop = asyncio.get_running_loop()
    logger.info("Initializing Unified Surveillance & Intelligence Database...")
    init_db()
    
    # 1. Warmup Audio Intelligence Engine in background
    try:
        from .audio.pipeline import pipeline as audio_pipeline
        threading.Thread(target=audio_pipeline.warmup, name="audio-warmup", daemon=True).start()
    except Exception as e:
        logger.warning(f"Audio engine warmup deferred: {e}")

    # 2. Start CAM-01 to CAM-05 Video Inference & Analytics Pipelines
    if start_all_pipelines:
        try:
            start_all_pipelines(_loop)
            logger.info("Camera pipelines (CAM-01 to CAM-05) started successfully")
        except Exception as e:
            logger.error(f"Failed to start camera pipelines: {e}")

    # 3. Start CAM06 live webcam face pipeline in background
    if face_pipeline:
        try:
            face_pipeline.set_broadcaster(
                lambda payload: asyncio.run_coroutine_threadsafe(
                    hub.broadcast_camera(face_pipeline.CAMERA_ID, payload), _loop
                )
            )
            threading.Thread(
                target=face_pipeline.run_webcam_pipeline,
                args=(face_pipeline.FACE_PIPELINE,),
                daemon=True,
                name="cam-06-webcam",
            ).start()
            logger.info("[cam-06] Facial recognition webcam pipeline started")
        except Exception as e:
            logger.warning(f"[cam-06] Webcam pipeline notice: {e}")

    yield
    logger.info("Shutting down unified surveillance backend...")
    if stop_all_pipelines:
        stop_all_pipelines()
    if face_pipeline:
        face_pipeline.FACE_PIPELINE.stop = True

app = FastAPI(
    title="Unified BorderEye Surveillance & Intelligence Platform",
    description="Comprehensive platform integrating Vision (IVBAP), Feature 12 (NL Query Engine), Feature 13 (Multi-Camera Re-ID), and Features 17-18 (Bharat Border Audio Intelligence & Acoustic Drone Sentry).",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount Modular API Routers ────────────────────────────────────────────────
app.include_router(routes_system.router)
app.include_router(routes_vision.router)
app.include_router(routes_reid.router)
app.include_router(routes_query.router)
app.include_router(routes_audio.router)
app.include_router(routes_evidence.router)

# ── Static Recordings Mount ──────────────────────────────────────────────────
recordings_dir = Path("data/cam_samples")
if not recordings_dir.exists():
    recordings_dir.mkdir(parents=True, exist_ok=True)
app.mount("/recordings", StaticFiles(directory="data/cam_samples"), name="recordings")

# ── Top-Level IVBAP Compatibility Endpoints ──────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "platform": "BorderEye Unified AI (Vision + Audio + Re-ID + NL Query)",
        "pipelines": {
            "cam-01": {"name": "Human Detection & ByteTrack", "status": "active"},
            "cam-02": {"name": "Vehicle ANPR (Number Plate)", "status": "active"},
            "cam-03": {"name": "Low-Light Night Vision", "status": "active"},
            "cam-04": {"name": "Virtual Fence Intrusion", "status": "active"},
            "cam-05": {"name": "Acoustic / Thermal Sentry", "status": "active"},
            "cam-06": {
                "name": "Facial Recognition & Access Control",
                "webcam": getattr(face_pipeline.FACE_PIPELINE, "webcam", False) if face_pipeline else False,
                "status": "active",
                "enrolled_personnel": len(watchlist_mgr.people) if watchlist_mgr else 0,
            },
        },
        "audio_modules": {
            "feature_17_aed": "active",
            "feature_18_drone_sentry": "active"
        },
        "llm_query_engine": {
            "feature_12_nl": "active",
            "feature_13_reid": "active"
        }
    }

@app.get("/api/cameras")
async def list_cameras():
    return {
        "cameras": [
            {"id": "cam-01", "name": "CAM-01 Human Detection (ByteTrack)", "status": "online", "fps": 30},
            {"id": "cam-02", "name": "CAM-02 Vehicle ANPR (Number Plate)", "status": "online", "fps": 30},
            {"id": "cam-03", "name": "CAM-03 Low-Light Night Vision", "status": "online", "fps": 30},
            {"id": "cam-04", "name": "CAM-04 Virtual Fence Intrusion", "status": "online", "fps": 30},
            {"id": "cam-05", "name": "CAM-05 Acoustic Drone / Thermal Sentry", "status": "online", "fps": 30},
            {"id": "cam-06", "name": "CAM-06 Facial Recognition (Webcam / Live)", "status": "online", "fps": 15},
        ]
    }

# ── Watchlist & Personnel Enrollment Endpoints ──────────────────────────────
@app.get("/api/watchlist")
async def get_watchlist():
    if watchlist_mgr:
        return {"people": watchlist_mgr.get_people()}
    return {"people": []}

@app.post("/api/watchlist/upload")
async def upload_authorized_person(
    name: str = Form(...),
    designation: str = Form("Authorized Personnel"),
    role: str = Form("Security Officer"),
    file: UploadFile = File(...)
):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file uploaded")

        # Encode thumbnail
        h, w = img.shape[:2]
        thumb_h = 160
        thumb_w = int(w * (thumb_h / h))
        thumb = cv2.resize(img, (thumb_w, thumb_h))
        ok, buf = cv2.imencode(".jpg", thumb, [cv2.IMWRITE_JPEG_QUALITY, 80])
        photo_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf).decode('utf-8')}" if ok else ""

        # Extract FaceNet embeddings using FaceDetector
        detector = get_face_detector()
        embeddings = []
        if detector and hasattr(detector, "extract_face_embeddings"):
            embeddings = detector.extract_face_embeddings(img)
        elif detector:
            faces = detector.recognize(img, max_num=3)
            for f in faces:
                embeddings.append(f["embedding"])

        if not embeddings:
            raise HTTPException(status_code=400, detail="Could not process face from image")

        if watchlist_mgr:
            person = watchlist_mgr.add_person(
                name=name,
                embeddings=embeddings,
                designation=designation,
                role=role,
                photo_url=photo_b64,
                replace=True
            )
            logger.info(f"[Enrollment] Enrolled authorized personnel: {name} [{designation}] ({len(embeddings)} biometric vectors)")
            return {"status": "enrolled", "person": person}
        return {"status": "mock_enrolled", "name": name, "designation": designation}
    except Exception as e:
        logger.error(f"Enrollment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/watchlist/enroll_webcam")
async def enroll_from_webcam(payload: dict = Body(...)):
    name = payload.get("name")
    designation = payload.get("designation", "Authorized Personnel")
    role = payload.get("role", "Security Officer")
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    frame = face_pipeline.latest_raw() if face_pipeline else None
    if frame is None:
        frame = face_pipeline.latest_annotated() if face_pipeline else None
    if frame is None:
        raise HTTPException(status_code=503, detail="No active webcam frame available to capture")

    detector = get_face_detector()
    embeddings = []
    if detector and hasattr(detector, "extract_face_embeddings"):
        embeddings = detector.extract_face_embeddings(frame)
    elif detector:
        faces = detector.recognize(frame, max_num=1)
        for f in faces:
            embeddings.append(f["embedding"])

    if not embeddings:
        raise HTTPException(status_code=400, detail="No face clearly detected in current camera frame to capture")

    ok, buf = cv2.imencode(".jpg", cv2.resize(frame, (160, 120)), [cv2.IMWRITE_JPEG_QUALITY, 80])
    photo_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf).decode('utf-8')}" if ok else ""

    if watchlist_mgr:
        person = watchlist_mgr.add_person(
            name=name,
            embeddings=embeddings,
            designation=designation,
            role=role,
            photo_url=photo_b64,
            replace=True
        )
        return {"status": "enrolled", "person": person}
    return {"status": "error", "detail": "Watchlist manager not initialized"}

@app.delete("/api/watchlist/{person_id}")
async def delete_authorized_person(person_id: int):
    if watchlist_mgr:
        ok = watchlist_mgr.delete_person(person_id)
        if ok:
            return {"status": "deleted", "person_id": person_id}
        raise HTTPException(status_code=404, detail="Person not found")
    return {"status": "noop"}

@app.get("/api/fence/{camera_id}")
async def get_camera_fence(camera_id: str):
    p = get_pipeline(camera_id)
    if p and p.fence_engine:
        return {"camera": camera_id, "polygon": p.fence_engine.polygon}
    ffile = DATA_DIR / f"{camera_id}_fence.json"
    if ffile.exists():
        try:
            d = json.loads(ffile.read_text(encoding="utf-8"))
            return {"camera": camera_id, "polygon": d.get("polygon")}
        except Exception:
            pass
    return {"camera": camera_id, "polygon": None}

@app.post("/api/fence/{camera_id}")
async def set_camera_fence(camera_id: str, payload: dict = Body(...)):
    polygon = payload.get("polygon")
    p = get_pipeline(camera_id)
    if p and p.fence_engine:
        p.fence_engine.set_polygon(polygon)
        p._save_fence()
        return {"status": "updated", "camera": camera_id, "polygon": p.fence_engine.polygon}
    ffile = DATA_DIR / f"{camera_id}_fence.json"
    try:
        ffile.write_text(json.dumps({"camera": camera_id, "polygon": polygon}, indent=2), encoding="utf-8")
    except Exception:
        pass
    return {"status": "updated", "camera": camera_id, "polygon": polygon}

@app.post("/api/fence/{camera_id}/reset")
async def reset_camera_fence(camera_id: str):
    p = get_pipeline(camera_id)
    if p and p.fence_engine:
        p.fence_engine.set_polygon(None)
        p._save_fence()
    ffile = DATA_DIR / f"{camera_id}_fence.json"
    if ffile.exists():
        try:
            ffile.unlink()
        except Exception:
            pass
    return {"status": "cleared", "camera": camera_id}

def _get_face_snapshot() -> tuple[bytes, bool]:
    if face_pipeline:
        frame = face_pipeline.latest_annotated()
        if frame is None:
            frame = face_pipeline.placeholder_frame("waiting for webcam")
        ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
        return (buf.tobytes() if ok else b""), getattr(face_pipeline.FACE_PIPELINE, "webcam", False)
    blank = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(blank, "CAM-06 Facial Recognition Active", (80, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 128), 2)
    ok, buf = cv2.imencode(".jpg", blank, [cv2.IMWRITE_JPEG_QUALITY, 75])
    return buf.tobytes(), True

@app.get("/faces/stream")
async def faces_stream():
    def gen():
        while True:
            data, ok = _get_face_snapshot()
            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + data + b"\r\n")
            time.sleep(0.12 if ok else 0.5)
    return StreamingResponse(
        gen(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"}
    )

@app.get("/faces/snapshot.jpg")
async def faces_snapshot():
    data, _ = _get_face_snapshot()
    return Response(content=data, media_type="image/jpeg", headers={"Cache-Control": "no-store"})

@app.get("/faces/alerts")
async def faces_alerts():
    if face_pipeline:
        return {"camera": "cam-06", "alerts": list(face_pipeline.FACE_PIPELINE.alerts)}
    return {"camera": "cam-06", "alerts": []}

# ── Real-Time WebSockets ─────────────────────────────────────────────────────
@app.websocket("/ws/analytics")
async def ws_analytics(ws: WebSocket):
    await ws.accept()
    camera = None
    try:
        while True:
            raw = await ws.receive_json()
            cam = raw.get("camera")
            cmd_type = raw.get("type")
            
            if cam and cmd_type is None:
                camera = cam
                before = hub.count_camera(camera)
                await hub.subscribe_camera(camera, ws)
                
                pipeline = get_pipeline(camera)
                resetted = False
                if pipeline is not None and before == 0:
                    resetted = True
                    pipeline.t0 = time.time()
                    pipeline._sync_anchor_set = True
                    pipeline.reset_requested = True
                    logger.info(f"[{camera}] subscriber sync: resetting origin to frame 0")

                await ws.send_json({
                    "type": "subscribed",
                    "camera": camera,
                    "resetted": resetted,
                    "start_vts": 0.0
                })
                
                if pipeline and pipeline.fence_engine:
                    await ws.send_json({"type": "fence", "camera": camera, "polygon": pipeline.fence_engine.polygon})
                    await ws.send_json({"type": "timeline", "camera": camera, "events": list(pipeline.fence_engine.events)})

            elif cmd_type in ("set_fence", "clear_fence") and camera:
                pipeline = get_pipeline(camera)
                if pipeline and pipeline.fence_engine:
                    poly = raw.get("polygon") if cmd_type == "set_fence" else None
                    pipeline.fence_engine.set_polygon(poly)
                    pipeline._save_fence()
                    await ws.send_json({"type": "fence_set", "camera": camera, "polygon": pipeline.fence_engine.polygon})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if camera:
            await hub.unsubscribe_camera(camera, ws)

@app.websocket("/ws/live")
@app.websocket("/ws/audio")
async def ws_audio(ws: WebSocket):
    await ws.accept()
    await hub.subscribe_audio(ws)
    try:
        while True:
            data = await ws.receive_text()
            await ws.send_json({"type": "audio_heartbeat", "timestamp": time.time(), "status": "active"})
    except WebSocketDisconnect:
        pass
    finally:
        await hub.unsubscribe_audio(ws)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
