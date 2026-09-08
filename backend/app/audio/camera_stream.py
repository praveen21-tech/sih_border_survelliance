"""
Camera Stream Manager
=====================
Manages multiple camera sources simultaneously:
  • Webcam    — local device index (0, 1, 2…)
  • IP camera — RTSP / HTTP MJPEG / HTTP JPEG snapshot URL

Each source runs in its own daemon thread.
The latest annotated JPEG frame is stored in _frame_store per source_id.
Consumers (MJPEG endpoint, WebSocket) pull frames from _frame_store.

Architecture:
  CameraSource  — represents one camera (local index or URL)
  CameraManager — registry of all active sources, start/stop/add
"""

from __future__ import annotations

import base64
import io
import logging
import threading
import time
from dataclasses import dataclass, field
from typing import Any

import cv2
import numpy as np

from .engines.vision_engine import vision_engine

log = logging.getLogger("border.camera")

# How long to keep a source running with no consumers (seconds)
_IDLE_TIMEOUT   = 120
# Target FPS for inference (YOLO is slow on CPU — 5 fps is fine)
_INFER_FPS      = 5
_CAPTURE_FPS    = 15   # cv2 capture rate (higher = smoother raw feed)


@dataclass
class CameraSource:
    source_id:    str
    uri:          Any           # int (device) or str (URL)
    label:        str = ""
    is_ip:        bool = False
    running:      bool = False
    error:        str | None = None
    last_frame:   bytes | None = None        # latest JPEG bytes (annotated)
    last_raw:     bytes | None = None        # latest JPEG bytes (raw, no boxes)
    last_detections: list[dict] = field(default_factory=list)
    last_visual_score: float = 0.0
    last_ts:      float = 0.0
    frame_count:  int = 0
    fps_actual:   float = 0.0
    resolution:   tuple = (0, 0)
    _thread:      Any = None
    _cap:         Any = None
    _stop_event:  threading.Event = field(default_factory=threading.Event)


class CameraManager:
    """Thread-safe registry of camera sources."""

    def __init__(self) -> None:
        self._sources: dict[str, CameraSource] = {}
        self._lock = threading.Lock()
        # Subscribers: source_id → list of queues waiting for new frames
        self._subs: dict[str, list] = {}

    # ── Public API ────────────────────────────────────────────────────────
    def add_webcam(self, device_index: int = 0, label: str = "") -> str:
        source_id = f"webcam_{device_index}"
        label = label or f"Webcam {device_index}"
        return self._add_source(source_id, device_index, label, is_ip=False)

    def add_ip_camera(self, url: str, label: str = "") -> str:
        # Derive a stable ID from the URL
        import hashlib
        h = hashlib.md5(url.encode()).hexdigest()[:8]
        source_id = f"ipcam_{h}"
        label = label or f"IP Camera ({url[:40]})"
        return self._add_source(source_id, url, label, is_ip=True)

    def remove_source(self, source_id: str) -> bool:
        with self._lock:
            src = self._sources.get(source_id)
        if not src:
            return False
        src._stop_event.set()
        if src._thread and src._thread.is_alive():
            src._thread.join(timeout=4)
        with self._lock:
            self._sources.pop(source_id, None)
        log.info("Camera source removed: %s", source_id)
        return True

    def list_sources(self) -> list[dict[str, Any]]:
        with self._lock:
            return [_src_info(s) for s in self._sources.values()]

    def get_source(self, source_id: str) -> CameraSource | None:
        with self._lock:
            return self._sources.get(source_id)

    def get_frame(self, source_id: str) -> bytes | None:
        """Latest annotated JPEG frame for MJPEG streaming."""
        with self._lock:
            src = self._sources.get(source_id)
        return src.last_frame if src else None

    def get_raw_frame(self, source_id: str) -> bytes | None:
        with self._lock:
            src = self._sources.get(source_id)
        return src.last_raw if src else None

    def get_detections(self, source_id: str) -> list[dict]:
        with self._lock:
            src = self._sources.get(source_id)
        return src.last_detections if src else []

    def get_visual_score(self, source_id: str) -> float:
        with self._lock:
            src = self._sources.get(source_id)
        return src.last_visual_score if src else 0.0

    def get_all_visual_score(self) -> float:
        """Max visual threat score across all active sources."""
        with self._lock:
            sources = list(self._sources.values())
        if not sources:
            return 0.0
        return max((s.last_visual_score for s in sources), default=0.0)

    # ── Internal ─────────────────────────────────────────────────────────
    def _add_source(self, source_id: str, uri: Any, label: str, is_ip: bool) -> str:
        with self._lock:
            if source_id in self._sources:
                existing = self._sources[source_id]
                if existing.running:
                    return source_id          # already running
                # Restart stopped source
                existing._stop_event.clear()
                src = existing
            else:
                src = CameraSource(
                    source_id=source_id, uri=uri, label=label, is_ip=is_ip
                )
                self._sources[source_id] = src

        t = threading.Thread(
            target=self._run_source,
            args=(src,),
            name=f"cam-{source_id}",
            daemon=True,
        )
        src._thread = t
        src.running = True
        t.start()
        log.info("Camera source started: %s  uri=%s", source_id, uri)
        return source_id

    def _run_source(self, src: CameraSource) -> None:
        """Capture loop running in a daemon thread."""
        cap = cv2.VideoCapture(src.uri)
        if not cap.isOpened():
            src.error   = f"Cannot open camera: {src.uri}"
            src.running = False
            log.error(src.error)
            return

        src._cap = cap
        cap.set(cv2.CAP_PROP_FPS, _CAPTURE_FPS)
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        src.resolution = (w, h)
        log.info("Camera opened %s  %dx%d", src.source_id, w, h)

        infer_interval = 1.0 / _INFER_FPS
        last_infer_ts  = 0.0
        t0 = time.time()
        frames = 0

        while not src._stop_event.is_set():
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.05)
                # For IP cams, try to reconnect
                if src.is_ip:
                    log.warning("IP cam %s: frame read failed, reconnecting…", src.source_id)
                    cap.release()
                    time.sleep(1.0)
                    cap = cv2.VideoCapture(src.uri)
                    src._cap = cap
                continue

            frames += 1
            now = time.time()
            elapsed = now - t0
            src.fps_actual = round(frames / elapsed if elapsed > 0 else 0, 1)

            # Encode raw frame to JPEG
            _, raw_jpg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            src.last_raw = raw_jpg.tobytes()

            # Run YOLO at inference FPS
            if (now - last_infer_ts) >= infer_interval and vision_engine.ready:
                try:
                    dets = vision_engine.infer(frame)
                    src.last_detections  = dets
                    src.last_visual_score = vision_engine.visual_threat_score(dets)
                    annotated = vision_engine.draw_boxes(frame, dets)
                except Exception as exc:
                    log.debug("YOLO infer error: %s", exc)
                    annotated = frame
                last_infer_ts = now
            else:
                # Use previous detections, redraw boxes on new frame
                try:
                    annotated = vision_engine.draw_boxes(frame, src.last_detections)
                except Exception:
                    annotated = frame

            _, ann_jpg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 75])
            src.last_frame  = ann_jpg.tobytes()
            src.last_ts     = now
            src.frame_count = frames

            # Notify WebSocket subscribers
            self._notify_subs(src)

        cap.release()
        src.running = False
        src._cap    = None
        log.info("Camera source stopped: %s", src.source_id)

    def _notify_subs(self, src: CameraSource) -> None:
        """Push a compact frame notification to registered subscriber queues."""
        with self._lock:
            queues = list(self._subs.get(src.source_id, []))
        dead = []
        msg = {
            "type":          "camera_frame",
            "source_id":     src.source_id,
            "ts":            src.last_ts,
            "visual_score":  src.last_visual_score,
            "detections":    src.last_detections[:6],   # top 6 only
            "frame_b64":     base64.b64encode(src.last_frame).decode() if src.last_frame else "",
        }
        for q in queues:
            try:
                # Non-blocking — drop frames if consumer is slow
                if q.qsize() < 3:
                    q.put_nowait(msg)
            except Exception:
                dead.append(q)
        if dead:
            with self._lock:
                cur = self._subs.get(src.source_id, [])
                self._subs[src.source_id] = [q for q in cur if q not in dead]

    def subscribe(self, source_id: str, queue) -> None:
        with self._lock:
            self._subs.setdefault(source_id, []).append(queue)

    def unsubscribe(self, source_id: str, queue) -> None:
        with self._lock:
            subs = self._subs.get(source_id, [])
            if queue in subs:
                subs.remove(queue)


def _src_info(src: CameraSource) -> dict[str, Any]:
    return {
        "source_id":    src.source_id,
        "label":        src.label,
        "uri":          str(src.uri),
        "is_ip":        src.is_ip,
        "running":      src.running,
        "error":        src.error,
        "fps":          src.fps_actual,
        "resolution":   list(src.resolution),
        "frame_count":  src.frame_count,
        "visual_score": src.last_visual_score,
        "detections":   len(src.last_detections),
        "last_ts":      src.last_ts,
    }


# ── Singleton ─────────────────────────────────────────────────────────────────
camera_manager = CameraManager()
