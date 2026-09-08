from __future__ import annotations

import asyncio
import json
import logging
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from queue import SimpleQueue

from .config import settings
from .db import ack_alert, get_analysis, list_alerts, list_analyses, list_drone_tracks, get_drone_stats
from .pipeline import SECTORS, pipeline
from .schemas import SensorContext
from .engines.drone_engine import get_drone_status, get_tracks, get_active_threats
from .camera_stream import camera_manager
from .engines.vision_engine import vision_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("border.api")

FRONTEND = Path(__file__).resolve().parents[2] / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting model warmup thread")
    threading.Thread(target=pipeline.warmup, name="model-warmup", daemon=True).start()
    # Start YOLO vision engine warmup in background (non-blocking)
    def _vision_warmup():
        try:
            vision_engine.load()
        except Exception as exc:
            log.warning("Vision engine warmup failed: %s", exc)
    threading.Thread(target=_vision_warmup, name="vision-warmup", daemon=True).start()
    yield


app = FastAPI(
    title="Bharat Border Audio Intelligence",
    description="Modules 17-18: Multimodal Audio Intelligence and Acoustic Drone Detection",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ContextIn(BaseModel):
    post_id: str = Field(default=settings.default_post)
    sector: str = Field(default=settings.default_sector)
    state: str = "Rajasthan"
    force: str = "Border Security Force"
    device_id: str = "MIC-ARRAY-01"
    lat: float = 26.9157
    lon: float = 70.9083
    camera_id: Optional[str] = "CAM-TOWER-4"


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    log.exception("Unhandled error on %s", request.url.path)
    return JSONResponse({"error": str(exc)}, status_code=500)


@app.get("/api/v1/health")
def health():
    st = pipeline.status()
    return {
        "status": "operational" if st["operational"] else "degraded",
        "classification": settings.classification,
        "organisation": settings.organisation,
        "models": st,
    }


@app.get("/api/v1/sectors")
def sectors():
    return {"sectors": SECTORS}


@app.get("/api/v1/alerts")
def alerts(limit: int = 100, acknowledged: Optional[int] = None):
    return {"alerts": list_alerts(limit=limit, acknowledged=acknowledged)}


@app.post("/api/v1/alerts/{alert_id}/ack")
def acknowledge(alert_id: int):
    ok = ack_alert(alert_id)
    return {"ok": ok, "id": alert_id}


@app.get("/api/v1/analyses")
def analyses(limit: int = 40):
    return {"analyses": list_analyses(limit=limit)}


@app.get("/api/v1/analyses/{analysis_id}")
def analysis_detail(analysis_id: str):
    row = get_analysis(analysis_id)
    if not row:
        return JSONResponse({"error": "not found"}, status_code=404)
    return row


@app.post("/api/v1/audio/analyze")
async def analyze_upload(
    file: UploadFile = File(...),
    post_id: str = Form(default=settings.default_post),
    sector: str = Form(default=settings.default_sector),
    state: str = Form(default="Rajasthan"),
    device_id: str = Form(default="MIC-ARRAY-01"),
    lat: float = Form(default=26.9157),
    lon: float = Form(default=70.9083),
    camera_id: str = Form(default="CAM-TOWER-4"),
):
    data = await file.read()
    if not data:
        return JSONResponse({"error": "empty audio"}, status_code=400)
    ctx = SensorContext(
        post_id=post_id,
        sector=sector,
        state=state,
        device_id=device_id,
        lat=lat,
        lon=lon,
        camera_id=camera_id,
    )
    result = pipeline.analyze_bytes(data, ctx, filename=file.filename or "upload.wav")
    return result


@app.post("/api/v1/ops/self-test")
def self_test():
    return pipeline.run_field_battery()


# ── Drone Detection endpoints ─────────────────────────────────────────────────

@app.get("/api/v1/drone/status")
def drone_status():
    """System-wide drone monitoring status: warning level, active threats, stats."""
    status = get_drone_status()
    db_stats = get_drone_stats()
    status["db_stats"] = db_stats
    return status


@app.get("/api/v1/drone/tracks")
def drone_tracks(
    post_id: Optional[str] = None,
    limit: int = 40,
    threat_only: bool = False,
):
    """
    Recent drone detection track records.
    Filter by post_id, limit count, or threat_only=true.
    """
    tracks = list_drone_tracks(post_id=post_id, limit=limit, threat_only=threat_only)
    return {
        "count":  len(tracks),
        "tracks": tracks,
        "stats":  get_drone_stats(post_id=post_id),
    }


@app.get("/api/v1/drone/active-threats")
def drone_active_threats(min_score: float = 0.42):
    """Live active threats above threshold across all posts (in-memory, fast)."""
    return {
        "threats": get_active_threats(min_score=min_score),
        "status":  get_drone_status(),
    }


@app.post("/api/v1/drone/camera-cue/{post_id}")
def drone_camera_cue(post_id: str):
    """
    Latest camera PTZ cue for a given border post.
    Checks in-memory track window first, then SQLite.
    """
    # Try in-memory track first (faster, most recent)
    from .engines.drone_engine import get_tracks
    mem_tracks = get_tracks(post_id=post_id, limit=1)
    if mem_tracks:
        t = mem_tracks[0]
        return {
            "post_id":            post_id,
            "analysis_id":        t.get("analysis_id"),
            "created_at":         None,
            "threat":             bool(t.get("threat")),
            "threat_score":       t.get("threat_score"),
            "early_warning":      t.get("early_warning_level"),
            "camera_cue":         {},  # in-memory entry has no cue dict
            "bearing_deg":        t.get("bearing_deg"),
            "drone_class":        t.get("drone_class"),
            "class_label":        t.get("class_label"),
            "recommended_action": "",
        }
    # Fall back to SQLite
    tracks = list_drone_tracks(post_id=post_id, limit=1)
    if not tracks:
        return JSONResponse({"error": "no tracks for this post"}, status_code=404)
    t = tracks[0]
    return {
        "post_id":            post_id,
        "analysis_id":        t.get("analysis_id"),
        "created_at":         t.get("created_at"),
        "threat":             bool(t.get("threat")),
        "threat_score":       t.get("threat_score"),
        "early_warning":      t.get("early_warning_level"),
        "camera_cue":         t.get("camera_cue") or {},
        "bearing_deg":        t.get("bearing_deg"),
        "drone_class":        t.get("drone_class"),
        "class_label":        t.get("class_label"),
        "recommended_action": t.get("recommended_action", ""),
    }


@app.get("/api/v1/drone/profiles")
def drone_profiles():
    """Return the full custom drone acoustic profile catalogue."""
    from .engines.drone_classifier import DRONE_PROFILES
    return {"profiles": DRONE_PROFILES, "count": len(DRONE_PROFILES)}


@app.post("/api/v1/audio/analyze-chunk")
async def analyze_chunk(file: UploadFile = File(...), post_id: str = Form(default=settings.default_post), sector: str = Form(default=settings.default_sector)):
    data = await file.read()
    ctx = SensorContext(post_id=post_id, sector=sector)
    return pipeline.analyze_bytes(data, ctx, filename=file.filename or "chunk.webm")


@app.websocket("/ws/ops")
async def ws_ops(ws: WebSocket):
    await ws.accept()
    q: SimpleQueue = SimpleQueue()
    pipeline.subscribers.append(q)
    try:
        await ws.send_json({"type": "hello", "models": pipeline.status()})
        while True:
            drained = False
            while not q.empty():
                msg = q.get()
                await ws.send_json(json.loads(json.dumps(msg, default=str)))
                drained = True
            if not drained:
                await asyncio.sleep(0.25)
    except WebSocketDisconnect:
        pass
    finally:
        if q in pipeline.subscribers:
            pipeline.subscribers.remove(q)


# NOTE: StaticFiles mount is at the end of this file after all API routes.


# ═══════════════════════════════════════════════════════════════════════════
# Camera & YOLO Visual Detection endpoints
# ═══════════════════════════════════════════════════════════════════════════

class CameraAddRequest(BaseModel):
    url:   Optional[str] = None      # None → webcam
    index: int           = 0         # webcam device index
    label: str           = ""


@app.get("/api/v1/camera/sources")
def camera_sources():
    """List all registered camera sources and their current status."""
    return {
        "sources": camera_manager.list_sources(),
        "yolo_ready": vision_engine.ready,
        "yolo_model": vision_engine._model_name,
    }


@app.post("/api/v1/camera/add")
def camera_add(body: CameraAddRequest):
    """
    Register and start a camera source.
    - body.url = None  → webcam at body.index (0 = default webcam)
    - body.url = "rtsp://..." or "http://..." → IP camera
    """
    if body.url:
        source_id = camera_manager.add_ip_camera(body.url, label=body.label)
    else:
        source_id = camera_manager.add_webcam(body.index, label=body.label or f"Webcam {body.index}")
    return {"source_id": source_id, "sources": camera_manager.list_sources()}


@app.delete("/api/v1/camera/{source_id}")
def camera_remove(source_id: str):
    """Stop and remove a camera source."""
    ok = camera_manager.remove_source(source_id)
    return {"ok": ok, "sources": camera_manager.list_sources()}


@app.get("/api/v1/camera/stream/{source_id}")
async def camera_stream_mjpeg(source_id: str):
    """
    MJPEG stream of annotated frames with YOLO bounding boxes.
    Open directly in an <img> tag: src="/api/v1/camera/stream/webcam_0"
    """
    async def frame_generator():
        boundary = b"--bordereye_frame"
        while True:
            frame_bytes = camera_manager.get_frame(source_id)
            if frame_bytes:
                header = (
                    b"\r\n" + boundary + b"\r\n"
                    b"Content-Type: image/jpeg\r\n"
                    b"Content-Length: " + str(len(frame_bytes)).encode() + b"\r\n\r\n"
                )
                yield header + frame_bytes
            await asyncio.sleep(0.067)   # ~15 fps ceiling

    src = camera_manager.get_source(source_id)
    if not src:
        return JSONResponse({"error": "source not found"}, status_code=404)
    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace;boundary=bordereye_frame",
    )


@app.get("/api/v1/camera/snapshot/{source_id}")
async def camera_snapshot(source_id: str, annotated: bool = True):
    """Single JPEG snapshot — annotated (with boxes) or raw."""
    frame_bytes = (
        camera_manager.get_frame(source_id)
        if annotated else
        camera_manager.get_raw_frame(source_id)
    )
    if not frame_bytes:
        return JSONResponse({"error": "no frame available"}, status_code=404)
    return StreamingResponse(io.BytesIO(frame_bytes), media_type="image/jpeg")


@app.get("/api/v1/camera/detect/{source_id}")
def camera_detections(source_id: str):
    """Latest YOLO bounding-box detections for a source."""
    src = camera_manager.get_source(source_id)
    if not src:
        return JSONResponse({"error": "source not found"}, status_code=404)
    dets  = camera_manager.get_detections(source_id)
    score = camera_manager.get_visual_score(source_id)
    return {
        "source_id":     source_id,
        "visual_score":  score,
        "drone_detected": any(d["drone_candidate"] for d in dets),
        "detections":    dets,
        "count":         len(dets),
    }


@app.get("/api/v1/camera/fused-threat/{source_id}")
def camera_fused_threat(source_id: str):
    """
    Fuse visual YOLO threat score with the latest acoustic drone score
    for the selected post.  Returns a combined threat assessment.
    """
    visual_score = camera_manager.get_visual_score(source_id)
    dets         = camera_manager.get_detections(source_id)

    # Latest acoustic score from in-memory track (post defaults to RJ-014 for webcam)
    src  = camera_manager.get_source(source_id)
    post = "BOP-RJ-014"
    tracks = get_tracks(post_id=post, limit=1)
    acoustic_score = tracks[0]["threat_score"] if tracks else 0.0
    acoustic_ew    = tracks[0].get("early_warning_level", "NONE") if tracks else "NONE"

    # Fused: 55% acoustic (proven physics + ML) + 45% visual (YOLO on video)
    fused = float(
        0.55 * acoustic_score
        + 0.45 * visual_score
    )
    threat = fused >= settings.drone_alert_threshold

    ew = "NONE"
    if fused >= 0.65:   ew = "CRITICAL"
    elif fused >= 0.42: ew = "ALERT"
    elif fused >= 0.25: ew = "WATCH"

    return {
        "source_id":       source_id,
        "acoustic_score":  round(acoustic_score, 4),
        "visual_score":    round(visual_score, 4),
        "fused_score":     round(fused, 4),
        "threat":          threat,
        "early_warning":   ew,
        "acoustic_ew":     acoustic_ew,
        "drone_visible":   any(d["drone_candidate"] for d in dets),
        "detections":      dets[:4],
    }


@app.websocket("/ws/camera/{source_id}")
async def ws_camera(ws: WebSocket, source_id: str):
    """
    WebSocket stream for a single camera source.
    Pushes {type:"camera_frame", source_id, ts, visual_score, detections, frame_b64}
    at up to ~10fps (frames dropped if consumer is slow).
    """
    await ws.accept()
    q: SimpleQueue = SimpleQueue()
    camera_manager.subscribe(source_id, q)
    try:
        await ws.send_json({
            "type":      "camera_hello",
            "source_id": source_id,
            "yolo":      vision_engine.ready,
            "sources":   camera_manager.list_sources(),
        })
        while True:
            drained = False
            while not q.empty():
                msg = q.get()
                await ws.send_json(json.loads(json.dumps(msg, default=str)))
                drained = True
            if not drained:
                await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        pass
    finally:
        camera_manager.unsubscribe(source_id, q)


if FRONTEND.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND), html=True), name="ui")
