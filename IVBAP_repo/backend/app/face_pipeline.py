# BorderEye AI — CAM06 live webcam facial-recognition pipeline
#
# A fully separate pipeline for the laptop webcam:
#   Webcam -> Face Detection (RetinaFace) -> ArcFace embedding
#           -> Watchlist match (Daniel / Unknown) -> MJPEG + WebSocket
#
# The module owns no FastAPI routes (those live in main.py); it exposes the
# camera loop plus a shared "latest annotated frame" buffer that the /faces/*
# endpoints read from.
import json
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

from app.face_detector import FaceDetector
from app.face_recognizer import FaceRecognizer
from app.watchlist_manager import WatchlistManager

BASE_DIR = Path(__file__).resolve().parent.parent
ALERT_LOG = BASE_DIR / "data" / "face_alerts.json"

CAMERA_ID = "cam-06"
MATCH_THRESHOLD = 0.45
MIN_DET_SCORE = 0.4
MAX_FACES = 4
PROCESS_EVERY_S = 0.14          # ~7 recognition frames/sec on CPU
CAMERA_REOPEN_S = 5.0           # retry cadence when the webcam isn't available
KEEP_ALERTS = 40

WL_COLOR = (34, 197, 94)        # BGR green  — watchlist match
UNK_COLOR = (74, 68, 239)       # BGR red    — unknown


# ── state ─────────────────────────────────────────────────────────────────────
@dataclass
class FacePipelineState:
    camera_id: str = CAMERA_ID
    kind: str = "webcam"
    stop: bool = False
    seq: int = 0
    t0: float = 0.0
    efps: float = 0.0
    webcam: bool = False                 # last open attempt succeeded
    frames_read: int = 0
    last_process_at: float = 0.0
    objects: list[dict] = field(default_factory=list)
    counts: dict = field(default_factory=dict)
    alerts: list[dict] = field(default_factory=list)
    annotated: np.ndarray | None = field(default=None, repr=False)
    annotated_dims: tuple[int, int] = (640, 480)
    lock: threading.RLock = field(default_factory=threading.RLock)
    tracker: dict[int, dict] = field(default_factory=dict)  # id -> last {cx,cy,w,h,label,watchlist,conf,ts}
    next_id: int = 1


FACE_PIPELINE = FacePipelineState()

# Broadcast callback injected by main.py (avoids a circular import with the hub).
_broadcast = None
_broadcast_lock = threading.Lock()


def set_broadcaster(fn) -> None:
    global _broadcast
    with _broadcast_lock:
        _broadcast = fn


def _emit(payload: dict) -> None:
    with _broadcast_lock:
        fn = _broadcast
    if fn:
        try:
            fn(payload)
        except Exception:
            pass


# ── face association (simple IoU track) ───────────────────────────────────────
def _iou_px(a: tuple, b: tuple) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0.0:
        return 0.0
    a_area = (ax2 - ax1) * (ay2 - ay1)
    b_area = (bx2 - bx1) * (by2 - by1)
    return inter / (a_area + b_area - inter)


def _track(faces: list[dict], prev: dict[int, dict], now: float) -> list[tuple[int, list, float]]:
    """Greedy IoU association. Returns [(face_id, bbox_px, det_score), ...]."""
    results: list[tuple[int, list, float]] = []
    taken: set[int] = set()
    for f in faces:
        fb = f["bbox"]
        best_id, best_iou, best_box = None, 0.3, None
        for tid, rec in prev.items():
            if tid in taken:
                continue
            if now - rec["ts"] > 2.5:
                continue
            pb = (rec["cx"] - rec["w"] / 2, rec["cy"] - rec["h"] / 2,
                  rec["cx"] + rec["w"] / 2, rec["cy"] + rec["h"] / 2)
            iou = _iou_px(fb, pb)
            if iou > best_iou:
                best_iou, best_id, best_box = iou, tid, pb
        fid = best_id
        if fid is None:
            fid = FACE_PIPELINE.next_id
            FACE_PIPELINE.next_id += 1
        else:
            taken.add(fid)
        results.append((fid, fb, f["det_score"]))
    return results


# ── alerts ────────────────────────────────────────────────────────────────────
def _append_alert(name: str, confidence: float) -> dict:
    now = time.time()
    alert = {
        "ts": int(now * 1000),
        "time": datetime.now().strftime("%H:%M:%S"),
        "camera": "CAM 06",
        "name": name,
        "confidence": round(confidence, 3),
    }
    FACE_PIPELINE.alerts.insert(0, alert)
    del FACE_PIPELINE.alerts[KEEP_ALERTS:]
    print(f"ALERT WATCHLIST MATCH | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | "
          f"camera=CAM06 name={name} confidence={confidence:.3f}", flush=True)
    _persist_alerts()
    return alert


def _persist_alerts() -> None:
    try:
        ALERT_LOG.parent.mkdir(parents=True, exist_ok=True)
        ALERT_LOG.write_text(json.dumps(FACE_PIPELINE.alerts, indent=2), encoding="utf-8")
    except Exception:
        pass


def _load_alerts() -> None:
    try:
        if ALERT_LOG.exists():
            FACE_PIPELINE.alerts = json.loads(ALERT_LOG.read_text(encoding="utf-8"))
    except Exception:
        FACE_PIPELINE.alerts = []


# ── camera ────────────────────────────────────────────────────────────────────
def _open_camera():
    for backend in (cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY):
        cap = cv2.VideoCapture(0, backend)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret and frame is not None:
                return cap, frame.shape[:2]
    return None, None


# ── pipeline loop ─────────────────────────────────────────────────────────────
def run_webcam_pipeline(state: FacePipelineState = FACE_PIPELINE) -> None:
    """Blocking loop; run on its own daemon thread (see main.py startup)."""
    detector = FaceDetector(min_det_score=MIN_DET_SCORE)
    manager = WatchlistManager()
    recognizer = FaceRecognizer(manager, threshold=MATCH_THRESHOLD)
    if manager.watchlist_ready():
        print(f"[cam-06] watchlist loaded: {manager.embedding_count()} embedding(s) "
              f"for {[p['name'] for p in manager.get_people()]}", flush=True)
    else:
        print("[cam-06] WARNING: watchlist is EMPTY — run `python -m app.train_watchlist`", flush=True)
    _load_alerts()
    state.t0 = time.time()

    while not state.stop:
        cap, dims = _open_camera()
        if cap is None:
            state.webcam = False
            print(f"[cam-06] webcam unavailable — retrying in {CAMERA_REOPEN_S}s", flush=True)
            time.sleep(CAMERA_REOPEN_S)
            continue
        state.webcam = True
        state.annotated_dims = dims
        print(f"[cam-06] webcam online ({dims[1]}x{dims[0]})", flush=True)
        try:
            while not state.stop:
                ret, frame = cap.read()
                if not ret:
                    break
                state.frames_read += 1
                now = time.time()
                if now - state.last_process_at < PROCESS_EVERY_S:
                    continue
                state.last_process_at = now

                t0 = time.time()
                faces = detector.recognize(frame, max_num=MAX_FACES)
                dt = time.time() - t0
                state.efps = (state.efps * 0.85 + (1.0 / dt) * 0.15) if state.efps else 1.0 / dt

                tracked_ids = _track(faces, state.tracker, now)
                new_tracker: dict[int, dict] = {}
                annotated = frame.copy()
                objects: list[dict] = []
                n_wl = n_unk = 0

                for idx, (face_id, bbox_px, det_score) in enumerate(tracked_ids):
                    x1, y1, x2, y2 = bbox_px
                    fh, fw = frame.shape[:2]
                    bx, by = max(0.0, x1), max(0.0, y1)
                    bw, bh = min(fw - bx, x2 - x1), min(fh - by, y2 - y1)
                    rec = recognizer.identify(faces[idx]["embedding"])
                    prev = state.tracker.get(face_id)
                    if prev is None or (prev.get("label") != rec["label"]):
                        if rec["watchlist"]:
                            _append_alert(rec["label"], rec["confidence"])
                    new_tracker[face_id] = {
                        "cx": bx + bw / 2, "cy": by + bh / 2,
                        "w": bw, "h": bh,
                        "label": rec["label"], "watchlist": rec["watchlist"],
                        "conf": rec["confidence"], "ts": now,
                    }
                    objects.append({
                        "id": face_id,
                        "cls": "face",
                        "label": rec["label"],
                        "confidence": rec["confidence"],
                        "watchlist": rec["watchlist"],
                        "bbox": [round(bx / fw, 4), round(by / fh, 4),
                                 round(bw / fw, 4), round(bh / fh, 4)],
                    })
                    if rec["watchlist"]:
                        n_wl += 1
                    else:
                        n_unk += 1
                    # annotate this face
                    _annotate_single(annotated, {
                        "bbox_px": (bx, by, bw, bh),
                        "watchlist": rec["watchlist"],
                        "label": rec["label"],
                        "confidence": rec["confidence"],
                    })
                state.tracker = new_tracker
                state.objects = objects
                state.counts = {"faces": len(objects), "watchlist": n_wl, "unknowns": n_unk}

                with state.lock:
                    state.annotated = annotated

                payload = {
                    "type": "frame",
                    "camera": state.camera_id,
                    "seq": state.seq,
                    "ts": int(time.time() * 1000),
                    "vts": round(time.time() - state.t0, 3),
                    "vfps": round(1.0 / PROCESS_EVERY_S, 2),
                    "efps": round(state.efps, 2),
                    "tracking": True,
                    "first": False,
                    "objects": objects,
                    "counts": dict(state.counts),
                }
                state.seq += 1
                _emit(payload)
        finally:
            cap.release()
        print("[cam-06] webcam stream ended — reopening", flush=True)


def _annotate_single(frame: np.ndarray, t: dict) -> None:
    # Shared with _annotate (kept here so live && still-listed faces match).
    x, y = t["bbox_px"][0], t["bbox_px"][1]
    w, h = t["bbox_px"][2], t["bbox_px"][3]
    color = WL_COLOR if t["watchlist"] else UNK_COLOR
    cv2.rectangle(frame, (int(x), int(y)), (int(x + w), int(y + h)), color, 2)
    conf = int(round(t["confidence"] * 100))
    tag = "WATCHLIST" if t["watchlist"] else "UNKNOWN"
    bar = f"{tag} {conf}%"
    (tw, th), _ = cv2.getTextSize(bar, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
    by = int(max(0, y - 19))
    cv2.rectangle(frame, (int(x), by), (int(x) + tw + 6, by + 16), color, -1)
    cv2.putText(frame, bar, (int(x) + 3, by + 12), cv2.FONT_HERSHEY_SIMPLEX,
                0.5, (3, 8, 20), 1, cv2.LINE_AA)
    if t["watchlist"]:
        name = t["label"]
        (nw, nh), _ = cv2.getTextSize(name, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
        ny = int(y) + int(h) + 18
        cv2.rectangle(frame, (int(x), ny - 16), (int(x) + nw + 6, ny), color, -1)
        cv2.putText(frame, name, (int(x) + 3, ny - 4), cv2.FONT_HERSHEY_SIMPLEX,
                    0.55, (3, 8, 20), 1, cv2.LINE_AA)


# ── frame read helpers for the /faces endpoints ───────────────────────────────
def watchlist_embedding_count() -> int:
    try:
        return WatchlistManager().embedding_count()
    except Exception:
        return 0


def latest_annotated() -> np.ndarray | None:
    with FACE_PIPELINE.lock:
        f = FACE_PIPELINE.annotated
        return None if f is None else f.copy()


def placeholder_frame(text: str) -> np.ndarray:
    w, h = FACE_PIPELINE.annotated_dims
    frame = np.zeros((h, w, 3), dtype=np.uint8)
    cv2.putText(frame, "NO WEBCAM", (int(w * 0.28), int(h * 0.5)), cv2.FONT_HERSHEY_SIMPLEX,
                0.9, (74, 68, 239), 2, cv2.LINE_AA)
    cv2.putText(frame, text, (int(w * 0.2), int(h * 0.56)), cv2.FONT_HERSHEY_SIMPLEX,
                0.4, (180, 180, 180), 1, cv2.LINE_AA)
    return frame