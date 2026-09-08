# BorderEye AI analytics backend
#
# Real detection pipeline per camera:
#   Video -> YOLO (ultralytics) -> ByteTrack -> plate OCR -> WebSocket -> frontend
#
# Endpoints:
#   ws://host:8000/ws/analytics   (client sends {"camera": "cam-01"} to subscribe)
#   GET http://host:8000/health
#
import asyncio
import itertools
import json
import logging
import math
import os
import threading
import time
import traceback
import warnings
from dataclasses import dataclass, field
from pathlib import Path

warnings.filterwarnings("ignore", message=".*'half'.*deprecated.*")

import cv2
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

from ultralytics import YOLO
from rapidocr_onnxruntime import RapidOCR
import torch

from app import face_pipeline
from app.anpr_util import refine_plate, complies_format
from app.intrusion import FenceEngine

# Keep EasyOCR's model weights on D: (C: is nearly full).
os.environ.setdefault("EASYOCR_MODULE_PATH", r"D:\easyocr-models")

# cam-02 ANPR experiment: adopt the anpr-yolov8 clone's *association* rule
# (get_car: a plate is emitted only while a tracked vehicle fully contains it;
# otherwise it is dropped, exactly like the clone). OCR itself is switched via
# the per-pipeline `anpr_ocr` setting. Gated to cam-02 in the merge path.
ANPR_CLONE_GET_CAR = True
# Stricter cam-02 rule: the containing vehicle must also be the vehicle the
# plate was cropped from (track-follow). Prevents a plate transferring onto a
# different car when the fixed 4s decal drifts under a passing vehicle.
ANPR_CLONE_OWNER_SRC = True

logging.getLogger("ultralytics").setLevel(logging.ERROR)  # silence half-deprecation spam, keep real errors

try:
    from ultralytics.trackers import BYTETracker  # noqa: F401  (import check)
    BYTE_OK = True
except Exception:
    BYTE_OK = False

BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR.parent / "public"
WEIGHTS_PATH = BASE_DIR / "weights" / "yolo11n.pt"

DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
HALF = bool(torch.cuda.is_available())  # fp16 on the dGPU, fp32 elsewhere

# Fallback weight location (already present on this machine).
_FALLBACK_WEIGHTS = [
    Path(r"D:\CCTVBORDERSURVEILLANCE\backend\yolo11n.pt"),
    Path.home() / ".cache" / "ultralytics" / "yolo11n.pt",
]


def resolve_weights() -> Path:
    if WEIGHTS_PATH.exists():
        return WEIGHTS_PATH
    for p in _FALLBACK_WEIGHTS:
        if p.exists():
            return p
    return Path("yolo11n.pt")  # ultralytics will download on first use


# ── Per-camera pipeline settings ─────────────────────────────────────────────
@dataclass
class CameraPipeline:
    camera_id: str
    video: str                # filename inside public/
    classes: list[int]        # COCO class indices
    label_map: dict[int, str] # COCO idx -> display label
    conf: float = 0.3
    imgsz: int = 512
    proc_every: int = 2       # process every Nth frame
    frame_cap: int = 60       # max processed frames / second
    anpr: bool = False        # run plate OCR
    anpr_interval: float = 3.0
    anpr_ocr: str = "rapidocr"  # plate OCR engine: "rapidocr" or "clone" (anpr-yolov8 style EasyOCR)
    fence: bool = False       # virtual-fence intrusion analytics (cam-04)
    fence_threshold: float = 0.07
    low_light_enhance: bool = False  # cam-03: gradual brightness enhancement (mock low-light mode)
    enhance_duration: float = 3.0    # seconds to go from dim to full brightness
    efps: float = 0.0         # sliding estimate of inference throughput (EMA)

    model: YOLO = field(init=False)
    ocr: RapidOCR | None = field(default=None, init=False)
    easy_reader: object | None = field(default=None, init=False)  # lazy EasyOCR reader (clone mode)
    fence_engine: FenceEngine | None = field(default=None, init=False)
    loop_offset: int = field(default=0, init=False)
    max_id: int = field(default=0, init=False)
    stop: bool = field(default=False, init=False)
    last_frame_at: float = field(default=0.0, init=False)
    job: asyncio.Future | None = field(default=None, init=False)
    # OCR decoupled onto its own thread: detection keeps streaming while plates
    # are recognized in the background. A queue of (copy, origin) crops feeds the
    # worker; recognized plates are merged back into frames.
    plate_model: YOLO | None = field(default=None, init=False)
    plate_results: dict = field(default_factory=dict, init=False)
    ocr_queue: list = field(default_factory=list, init=False)
    ocr_target_at: float = field(default=0.0, init=False)
    epoch: int = field(default=0, init=False)  # bumped on every session (loop) restart; drops stale OCR/track state
    reset_requested: bool = field(default=False, init=False)  # Option B: a subscriber asked to re-run from frame 0
    t0: float = field(default=0.0, init=False)  # session-clock anchor (time.time()); set by WS handler at subscribe
    _sync_anchor_set: bool = field(default=False, init=False)  # True when WS handler already set t0 for a subscriber reset
    enhance_start_time: float = field(default=0.0, init=False)  # timestamp when enhancement started
    current_brightness: float = field(default=1.0, init=False)  # current brightness multiplier (0.0 to 1.0)

    def __post_init__(self) -> None:
        # OpenVINO exports are fixed-input and ultralytics requires the folder name
        # to end in "openvino_model"; pick the export matching this pipeline's imgsz.
        ov_name = {416: "yolo11n_416_openvino_model", 512: "yolo11n_openvino_model", 640: "yolo11n_640_openvino_model"}.get(self.imgsz)
        ov_dir = BASE_DIR / "weights" / ov_name if ov_name else None
        if HALF:
            self.model = YOLO(str(resolve_weights()))
            print(f"[{self.camera_id}] using torch CUDA backend (device={DEVICE}, fp16)", flush=True)
        elif ov_dir and ov_dir.exists():
            self.model = YOLO(str(ov_dir))
            print(f"[{self.camera_id}] using openvino backend ({ov_dir.name})", flush=True)
        else:
            self.model = YOLO(str(resolve_weights()))
            print(f"[{self.camera_id}] using torch backend (device={DEVICE})", flush=True)
        if self.anpr:
            # Repo-style dedicated plate detector (optional). Drop
            # backend/models/license_plate_detector.pt in to enable frame-wide
            # plate detection + per-vehicle assignment (see README of
            # anpr-yolov8). Without it we fall back to OCR'ing the largest
            # tracked vehicle's lower band.
            plate_w = BASE_DIR / "models" / "license_plate_detector.pt"
            if plate_w.exists():
                self.plate_model = YOLO(str(plate_w))
                print(f"[{self.camera_id}] using dedicated plate detector", flush=True)
            else:
                print(f"[{self.camera_id}] no plate detector -> largest-vehicle crop fallback", flush=True)
            self.ocr = RapidOCR()
        if self.fence:
            self.fence_engine = FenceEngine(threshold=self.fence_threshold)
            _load_fence(self)


COCO_LABELS = {
    0: "person",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}

# ── Virtual-fence persistence ────────────────────────────────────────────────
def _fence_file(p: CameraPipeline) -> Path:
    return BASE_DIR / "data" / f"{p.camera_id}_fence.json"


def _save_fence(p: CameraPipeline) -> None:
    try:
        _fence_file(p).parent.mkdir(parents=True, exist_ok=True)
        _fence_file(p).write_text(
            json.dumps({"camera": p.camera_id, "polygon": p.fence_engine.polygon}, indent=2),
            encoding="utf-8",
        )
    except Exception:
        pass


def _load_fence(p: CameraPipeline) -> None:
    try:
        if _fence_file(p).exists():
            data = json.loads(_fence_file(p).read_text(encoding="utf-8"))
            p.fence_engine.set_polygon(data.get("polygon"))
    except Exception:
        pass


PIPELINES = [
CameraPipeline(
        camera_id="cam-01",
        video="cam01.mp4",
        classes=[0],
        label_map={0: "person"},
        conf=0.25,
        imgsz=512,  # person-only; 416 tanked recall on cam-04, keep 512 everywhere
        proc_every=1,
        frame_cap=30,  # Process at the video's native fps (cam01 = 30fps)
    ),
    CameraPipeline(
        camera_id="cam-02",
        video="vehicledetectionanprclass.mp4",
        classes=[2, 3, 5, 7],
        label_map={2: "Car", 3: "Motorcycle", 5: "Bus", 7: "Truck"},
        conf=0.3,
        imgsz=512,  # 640 was capping throughput <30fps; 512 keeps ~30fps
        proc_every=1,
        frame_cap=30,  # Match video FPS
        anpr=True,
        anpr_interval=2.5,  # rotate OCR across vehicles, but keep CPU free for detection
        anpr_ocr="clone",  # anpr-yolov8 style: EasyOCR + binarization + get_car containment
    ),
    CameraPipeline(
        camera_id="cam-03",
        video="nightvision.mp4",
        classes=[0, 2, 3, 5, 7],  # persons + vehicles
        label_map={0: "person", 2: "car", 3: "motorcycle", 5: "bus", 7: "truck"},
        conf=0.25,
        imgsz=512,
        proc_every=1,
        frame_cap=30,
        low_light_enhance=True,  # Enable gradual brightness enhancement
        enhance_duration=3.0,    # 3 seconds from dim to bright
    ),
    CameraPipeline(
        camera_id="cam-04",
        video="cam04.mp4",
        classes=[0],
        label_map={0: "person"},
        conf=0.25,
        imgsz=512,  # person-only; 416 broke recall (people are smaller in this scene)
        proc_every=1,
        frame_cap=30,  # Match video FPS
        fence=True,
    ),
]


# ── WebSocket hub ────────────────────────────────────────────────────────────
class Hub:
    def __init__(self) -> None:
        self._subs: dict[str, set[WebSocket]] = {}
        self._locks: dict[str, asyncio.Lock] = {}

    async def subscribe(self, camera: str, ws: WebSocket) -> None:
        self._subs.setdefault(camera, set()).add(ws)
        self._locks.setdefault(camera, asyncio.Lock())

    def count(self, camera: str) -> int:
        """Live subscriber count for a camera (used to detect the first viewer)."""
        return len(self._subs.get(camera, ()))

    async def unsubscribe(self, camera: str, ws: WebSocket) -> None:
        subs = self._subs.get(camera)
        if subs:
            subs.discard(ws)

    async def broadcast(self, camera: str, payload: dict) -> None:
        subs = list(self._subs.get(camera, ()))
        if not subs:
            return
        lock = self._locks.setdefault(camera, asyncio.Lock())
        async with lock:
            for ws in subs:
                try:
                    await ws.send_json(payload)
                except Exception:
                    pass


hub = Hub()


VEHICLE_CLS = ("car", "truck", "bus", "motorcycle")


# ── Detection + tracking loop ────────────────────────────────────────────────
def _normalize(bb_xyxyn, frame_w: int, frame_h: int, class_id: int, label: str, track_id: int, conf: float) -> dict:
    x1, y1, x2, y2 = bb_xyxyn  # already normalized [0..1]
    return {
        "id": int(track_id),
        "cls": COCO_LABELS.get(int(class_id), "object"),
        "label": label,
        "confidence": round(float(conf), 2),
        "bbox": [round(float(x1), 4), round(float(y1), 4), round(float(x2 - x1), 4), round(float(y2 - y1), 4)],
    }


def _enhance_plate(crop_bgr):
    """Grayscale + CLAHE + upscale to make small plates OCR-able.
    Scales 2x for large crops (saves CPU), 3x for small ones."""
    gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
    fx = 2.0 if gray.shape[1] >= 360 else 3.0
    gray = cv2.resize(gray, None, fx=fx, fy=fx, interpolation=cv2.INTER_CUBIC)
    gray = cv2.createCLAHE(3.0, (8, 8)).apply(gray)
    return cv2.medianBlur(gray, 3)


def _plate_score(ref: str, ocr_conf: float) -> float:
    """Rank a plate candidate: prefer clean 7-char LL-DD-LLL reads, then OCR confidence."""
    s = float(ocr_conf)
    if len(ref) == 7 and complies_format(ref):
        return 100.0 + s
    if len(ref) == 7:
        return 60.0 + s
    return 20.0 + s


def _ocr_plate_crop(ocr, crop_bgr) -> dict | None:
    """OCR a vehicle crop's lower bands and keep the best candidate.
    Bottom 40% is tried first; a clean 7-char LL-DD-LLL read short-circuits.
    Otherwise the bottom 30% band is checked too and the best of both is kept."""
    ch, cw = crop_bgr.shape[:2]
    if ch < 20 or cw < 30:
        return None
    best: tuple[float, str, list] | None = None
    best_band: float = 0.6

    def scan(band_frac: float) -> bool:
        nonlocal best, best_band
        band = crop_bgr[int(ch * band_frac):, :]
        if band.shape[0] < 14 or band.shape[1] < 24:
            return False
        try:
            result, _ = ocr(_enhance_plate(band))
        except Exception:
            return False
        if not result:
            return False
        found = False
        for bx, text, score in result:
            raw = "".join(c2 for c2 in text.upper() if c2.isalnum())
            if len(raw) < 6 or len(raw) > 12:
                continue
            ref = refine_plate(raw)
            if ref is None:
                continue
            pts = _plate_score(ref, score)
            if best is None or pts > best[0]:
                best = (pts, ref, bx)
                best_band = band_frac
            found = True
        return found

    if scan(0.6) and best and best[0] >= 100.0:
        pass  # clean 7-char plate found in bottom 40% — enough
    else:
        scan(0.7)
    if best is None:
        return None
    _, label, bx = best
    xs = [int(p[0]) for p in bx]
    ys = [int(p[1]) for p in bx]
    return {
        "cls": "plate",
        "label": label,
        "confidence": 0.9,
        "bbox_crop": [min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)],
        "band": best_band,  # which crop band (0.6/0.7) the winning OCR box came from
    }


def _get_easy_reader(p: CameraPipeline):
    """Lazy EasyOCR reader for clone mode; None until the weights are warmed up."""
    if p.easy_reader is not None:
        return p.easy_reader
    try:
        import easyocr

        p.easy_reader = easyocr.Reader(["en"], gpu=True, verbose=False)
    except Exception as e:
        print(f"[{p.camera_id}] easyocr unavailable: {e}", flush=True)
        return None
    return p.easy_reader


def _ocr_plate_crop_clone(reader, crop_bgr) -> dict | None:
    """Clone-method OCR: enhance + threshold-binarize the band (anpr-yolov8's
    noise handling: THRESH_BINARY_INV @ 64) then readtext with EasyOCR.

    Same return contract as `_ocr_plate_crop`: bbox_crop in *up-scaled band
    image* coordinates + the winning band, so `_plate_frame_box` inverts it
    identically.
    """
    ch, cw = crop_bgr.shape[:2]
    if ch < 20 or cw < 30:
        return None
    best: tuple[float, str, list] | None = None
    best_band: float = 0.6

    def scan(band_frac: float) -> bool:
        nonlocal best, best_band
        band = crop_bgr[int(ch * band_frac):, :]
        if band.shape[0] < 14 or band.shape[1] < 24:
            return False
        try:
            gray = _enhance_plate(band)
            _, binary = cv2.threshold(gray, 64, 255, cv2.THRESH_BINARY_INV)
            result = reader.readtext(binary)
        except Exception:
            return False
        if not result:
            return False
        found = False
        for bx, text, score in result:
            raw = "".join(c2 for c2 in text.upper() if c2.isalnum())
            if len(raw) < 6 or len(raw) > 12:
                continue
            ref = refine_plate(raw)
            if ref is None:
                continue
            pts = _plate_score(ref, score)
            if best is None or pts > best[0]:
                best = (pts, ref, bx)
                best_band = band_frac
            found = True
        return found

    if scan(0.6) and best and best[0] >= 100.0:
        pass  # clean 7-char plate found in bottom 40% — enough
    else:
        scan(0.7)
    if best is None:
        return None
    _, label, bx = best
    xs = [int(p[0]) for p in bx]
    ys = [int(p[1]) for p in bx]
    return {
        "cls": "plate",
        "label": label,
        "confidence": 0.9,
        "bbox_crop": [min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)],
        "band": best_band,
    }


def ocr_worker(p: CameraPipeline) -> None:
    """Background loop: recognize plates from crops queued by the detection thread."""
    pending = None
    while not p.stop:
        if pending is None and p.ocr_queue:
            pending = p.ocr_queue.pop(0)
        if pending is not None:
            try:
                if p.anpr_ocr == "clone":
                    reader = _get_easy_reader(p)
                    res = _ocr_plate_crop_clone(reader, pending["crop"]) if reader else _ocr_plate_crop(p.ocr, pending["crop"])
                else:
                    res = _ocr_plate_crop(p.ocr, pending["crop"])
            except Exception:
                res = None
            if res and pending.get("epoch") == p.epoch:
                p.plate_results[pending["origin"]] = {
                    "res": res,
                    "at": time.time(),
                    "ox": pending["ox"],
                    "oy": pending["oy"],
                    "epoch": p.epoch,
                    "src_id": pending.get("src_id"),
                    "src_cls": pending.get("src_cls"),
                    "src_bbox": pending.get("src_bbox"),
                }
            pending = None
        time.sleep(0.05)


def _iou(a: list, b: list) -> float:
    """IoU of two normalized [x1,y1,w,h] boxes."""
    ax1, ay1, aw, ah = a
    bx1, by1, bw, bh = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax1 + aw, bx1 + bw), min(ay1 + ah, by1 + bh)
    inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
    if inter <= 0:
        return 0.0
    uni = aw * ah + bw * bh - inter
    return inter / uni if uni > 0 else 0.0


def _plate_frame_box(entry: dict, frame_w: int, frame_h: int) -> dict:
    """Invert the band up-scale: map an OCR bbox back into original frame pixels.

    `_ocr_plate_crop` reads the plate from a bottom band cropped out of the
    vehicle and up-scaled by `fx` (2x for wide crops, 3x for small). Its
    `bbox_crop` therefore lives in the *up-scaled band image* coordinate space.
    This translates it to frame pixels by 1) dividing by `fx`, 2) adding the
    band's vertical start (`int(ch * band)`), then 3) adding the crop origin.
    """
    bx = entry["res"]["bbox_crop"]
    band = entry["res"].get("band", 0.6)
    cw = entry.get("cw")
    ch = entry.get("ch")
    src = entry.get("src_bbox")
    if cw is None and src is not None:
        cw = round(src[2] * frame_w)
    if ch is None and src is not None:
        ch = round(src[3] * frame_h)
    fx = 1.0
    band_y = 0
    if cw and ch:
        fx = 2.0 if cw >= 360 else 3.0
        band_y = int(ch * band)
    return {
        "x": entry["ox"] + bx[0] / fx,
        "y": entry["oy"] + band_y + bx[1] / fx,
        "w": bx[2] / fx,
        "h": bx[3] / fx,
        "fx": fx,
        "band": band,
        "cw": cw,
        "ch": ch,
    }


def _get_car_owner(plate_box_norm: list, objects: list[dict]) -> dict | None:
    """anpr-yolov8 clone's association rule (util.get_car): the plate belongs to
    the first tracked vehicle whose box strictly contains the plate box."""
    x1, y1, w, h = plate_box_norm
    x2, y2 = x1 + w, y1 + h
    for o in objects:
        if o["cls"] not in VEHICLE_CLS:
            continue
        vb = o["bbox"]
        if x1 > vb[0] and y1 > vb[1] and x2 < vb[0] + vb[2] and y2 < vb[1] + vb[3]:
            return o
    return None


def _cam02_anpr_diag(p: CameraPipeline, entry: dict, objects: list[dict], frame_w: int, frame_h: int) -> None:
    """Diagnostic only: per-plate association audit on cam-02. No behavior change.

    Prints the raw OCR bbox, the up-scale factor, the coordinate-corrected
    plate box (and whether it stays inside the source vehicle), then for every
    vehicle currently tracked: IoU with the plate box, whether the plate center
    is inside it, full containment, and centroid distance. Verdict flags
    SRC_MATCH / MISMATCH / STALE-DECAL.
    """
    if p.camera_id != "cam-02":
        return
    cb = _plate_frame_box(entry, frame_w, frame_h)
    pb = [round(cb["x"] / frame_w, 4), round(cb["y"] / frame_h, 4), round(cb["w"] / frame_w, 4), round(cb["h"] / frame_h, 4)]
    pcx, pcy = pb[0] + pb[2] / 2.0, pb[1] + pb[3] / 2.0
    src_id = entry.get("src_id")
    src_bbox = entry.get("src_bbox")
    vehs = [o for o in objects if o["cls"] in VEHICLE_CLS]
    verdict = "STALE-DECAL: no vehicle currently under the plate"
    rows: list[tuple] = []
    for v in vehs:
        iou = _iou(pb, v["bbox"])
        vb = v["bbox"]
        center_in = vb[0] <= pcx <= vb[0] + vb[2] and vb[1] <= pcy <= vb[1] + vb[3]
        fully_in = vb[0] <= pb[0] and vb[1] <= pb[1] and pb[0] + pb[2] <= vb[0] + vb[2] and pb[1] + pb[3] <= vb[1] + vb[3]
        vc = (vb[0] + vb[2] / 2.0, vb[1] + vb[3] / 2.0)
        dist_px = math.hypot((pcx - vc[0]) * frame_w, (pcy - vc[1]) * frame_h)
        rows.append((v, iou, center_in, fully_in, dist_px))
    owner = next((r for r in rows if r[2]), None)  # plate-center inside
    best_iou = max(rows, key=lambda r: r[1]) if rows else None
    src_veh_now = next((r for r in rows if r[0]["id"] == src_id), None)
    if owner and src_id is not None:
        verdict = "SRC-MATCH" if owner[0]["id"] == src_id else "MISMATCH"
    elif owner:
        verdict = "owner-has-no-src-tracked"
    contained = None
    if src_bbox:
        sx1, sy1 = src_bbox[0] * frame_w, src_bbox[1] * frame_h
        sx2, sy2 = sx1 + src_bbox[2] * frame_w, sy1 + src_bbox[3] * frame_h
        contained = sx1 <= cb["x"] and sy1 <= cb["y"] and cb["x"] + cb["w"] <= sx2 and cb["y"] + cb["h"] <= sy2
    p._diag_last = getattr(p, "_diag_last", {})
    sig = f"{src_id}|{owner[0]['id'] if owner else '-'}"
    if p._diag_last.get(tuple(entry["res"]["bbox_crop"])) == sig:
        return  # identical association state already printed for this decal
    p._diag_last[tuple(entry["res"]["bbox_crop"])] = sig
    print(
        f"[cam-02][ANPR] PLATE '{entry['res']['label']}' raw_ocr_bbox={entry['res']['bbox_crop']} "
        f"fx={cb['fx']} crop={cb['cw']}x{cb['ch']} band={cb['band']} "
        f"corrected_px=[{int(round(cb['x']))},{int(round(cb['y']))},{int(round(cb['w']))},{int(round(cb['h']))}] "
        f"corrected_norm={pb} contained_in_src={contained} crop_origin=({entry['ox']},{entry['oy']})",
        flush=True,
    )
    if not contained:
        print(
            f"[cam-02][ANPR]   WARN corrected plate box escapes source vehicle bbox={src_bbox}",
            flush=True,
        )
    if src_bbox:
        print(
            f"[cam-02][ANPR]   SRC(cropped) veh id={src_id} cls={entry.get('src_cls')} bbox={src_bbox}",
            flush=True,
        )
    for v, iou, center_in, fully_in, dist_px in rows:
        print(
            f"[cam-02][ANPR]   veh id={v['id']} {v['cls']} bbox={v['bbox']} "
            f"IoU={iou:.3f} center_in={center_in} fully_contains={fully_in} centroid_px={dist_px:.0f}",
            flush=True,
        )
    print(
        f"[cam-02][ANPR]   VERDICT: {verdict}"
        + (f"  best-IoU veh id={best_iou[0]['id']} IoU={best_iou[1]:.3f}" if best_iou else "")
        + (f"  src-veh-now IoU={src_veh_now[1]:.3f} dist_px={src_veh_now[4]:.0f}" if src_veh_now else "")
        + (f"  src id={src_id} not tracked in current frame" if src_id is not None and not src_veh_now else ""),
        flush=True,
    )


def _merge_plates(p: CameraPipeline, objects: list[dict], frame_w: int, frame_h: int) -> None:
    """Attach a recognized plate to the current frame, in video-frame coordinates."""
    now_t = time.time()
    for key, entry in list(p.plate_results.items()):
        if now_t - entry["at"] > 4.0 or entry.get("epoch") != p.epoch:
            p.plate_results.pop(key, None)
            continue
        cb = _plate_frame_box(entry, frame_w, frame_h)
        pb = [cb["x"] / frame_w, cb["y"] / frame_h, cb["w"] / frame_w, cb["h"] / frame_h]
        owner = _get_car_owner(pb, objects) if p.camera_id == "cam-02" else None
        src_id = entry.get("src_id")
        if p.camera_id == "cam-02" and ANPR_CLONE_GET_CAR:
            # clone rule (get_car) + stricter OWNER==SRC track-follow: the plate
            # is only shown while its own source vehicle contains it. This kills
            # both the floating decal and the transfer of a plate onto another
            # car (the fixed 4s decal drifting under a passing vehicle).
            if owner is None or (src_id is not None and ANPR_CLONE_OWNER_SRC and owner["id"] != src_id):
                _cam02_anpr_diag(p, entry, objects, frame_w, frame_h)
                continue
        objects.append(
            {
                "cls": "plate",
                "label": entry["res"]["label"],
                "confidence": 0.9,
                "bbox": [
                    round(cb["x"] / frame_w, 4),
                    round(cb["y"] / frame_h, 4),
                    round(cb["w"] / frame_w, 4),
                    round(cb["h"] / frame_h, 4),
                ],
            }
        )
        if p.camera_id == "cam-02":
            # Diagnostic trace only: expose the crop's source vehicle + the clone's
            # get_car owner so the association path can be audited (frontend ignores).
            objects[-1]["src_id"] = entry.get("src_id")
            objects[-1]["src_cls"] = entry.get("src_cls")
            objects[-1]["src_bbox"] = entry.get("src_bbox")
            objects[-1]["owner_id"] = owner["id"] if owner else None
            _cam02_anpr_diag(p, entry, objects, frame_w, frame_h)


def _queue_plate_crop(p: CameraPipeline, frame, x1p: int, y1p: int, x2p: int, y2p: int, now2: float, veh: dict | None = None) -> None:
    crop = frame[y1p:y2p, x1p:x2p]
    if crop.shape[0] < 12 or crop.shape[1] < 24:
        return
    if len(p.ocr_queue) >= 3:
        return
    payload = {"crop": crop.copy(), "ox": x1p, "oy": y1p, "origin": (x1p, y1p), "epoch": p.epoch}
    payload["cw"] = crop.shape[1]  # inversion of the band up-scale needs the crop size
    payload["ch"] = crop.shape[0]
    if veh is not None:
        # Diagnostic trace only (cam-02): remember which vehicle this crop came from.
        payload["src_id"] = veh["id"]
        payload["src_cls"] = veh["cls"]
        payload["src_bbox"] = veh["bbox"]
    p.ocr_queue.append(payload)
    p.ocr_target_at = now2


def _recent_plate_near(p: CameraPipeline, veh: dict, frame_w: int, frame_h: int) -> bool:
    """True if a plate was recently read near this vehicle's top-left corner."""
    now_t = time.time()
    vx, vy = veh["bbox"][0] * frame_w, veh["bbox"][1] * frame_h
    for entry in p.plate_results.values():
        if now_t - entry["at"] > 4.0:
            continue
        if (entry["ox"] - vx) ** 2 + (entry["oy"] - vy) ** 2 < 120 * 120:
            return True
    return False


def run_pipeline(p: CameraPipeline) -> None:
    """Blocking detection loop; run inside a worker thread per camera."""
    video_path = PUBLIC_DIR / p.video
    if not video_path.exists():
        print(f"[{p.camera_id}] video not found: {video_path}", flush=True)
        return

    tracker_mode = str(BASE_DIR / "bytetrack_custom.yaml")
    print(f"[{p.camera_id}] pipeline started -> {p.video} (byte-tracker={'yes' if BYTE_OK else 'yolo-internal'})", flush=True)

    while not p.stop:
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            print(f"[{p.camera_id}] failed to open {video_path}", flush=True)
            return
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 22.0
        frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        loop_start_id = p.loop_offset
        frame_index = -1
        seq = 0
        if p.fence:
            p.fence_engine.clear_tracks()
        # Fresh shared-origin session: anchor the session clock, drop all state
        # from the previous loop (subscribe sync-reset or natural EOF wrap).
        # The WS handler already set t0 for subscriber resets; only set it
        # here for natural video wraps (no subscriber triggered the reopen).
        if not p._sync_anchor_set:
            p.t0 = time.time()
        else:
            p._sync_anchor_set = False
        p.epoch += 1
        p.plate_results.clear()
        p.ocr_queue.clear()
        p.ocr_target_at = 0.0
        p.efps = 0.0
        p.last_frame_at = 0.0
        # Low-light enhancement: start dimmed, will gradually brighten
        if p.low_light_enhance:
            p.enhance_start_time = time.time()
            p.current_brightness = 0.2  # Start at 20% brightness (dim)
            print(f"[{p.camera_id}] low-light enhancement enabled: {p.enhance_duration}s gradual flash", flush=True)
        first_after_open = True
        session_first_sent = False  # first broadcast frame becomes the client's shared origin

        try:
            while not p.stop:
                # Option B sync-reset: a subscriber (re)opening this camera restarts
                # the session from frame 0, together with the frontend <video>. Both
                # sides then share an origin, so no playbackRate correction is needed.
                if p.reset_requested:
                    p.reset_requested = False
                    p.loop_offset = 0
                    p.max_id = 0
                    print(f"[{p.camera_id}] sync-reset -> start frame=0 vts=0.000 (subscriber opened feed)", flush=True)
                    break
                ret, frame = cap.read()
                if not ret:
                    break
                frame_index += 1
                if frame_index % p.proc_every != 0:
                    continue

                # ── Session-clock A/V sync (shared origin, video fixed at 1x) ──
                # The frontend plays its copy of the same MP4 at 1.0x starting at 0s
                # when it subscribes, so the frame on screen is (now - p.t0) * fps.
                # Drive the read cursor to that exact frame: discard the backlog when
                # inference trails the video and pace when it runs ahead, so every
                # analyzed frame's vts matches the frame the user is seeing.
                session_time = time.time() - p.t0
                desired = min(int(session_time * fps), total - 1)
                if desired > frame_index:
                    while frame_index < desired and not p.reset_requested:
                        ret, frame = cap.read()
                        if not ret:
                            break
                        frame_index += 1
                    if p.reset_requested:
                        p.reset_requested = False
                        print(f"[{p.camera_id}] sync-reset -> start frame=0 vts=0.000 (subscriber opened feed)", flush=True)
                        break
                    if not ret:
                        break
                elif desired < frame_index:
                    wait = frame_index / fps - session_time
                    if wait > 0:
                        time.sleep(wait)

                # ── Low-light enhancement (cam-03) ───────────────────────────
                # Mock gradual brightness increase from dim to normal over enhance_duration seconds
                if p.low_light_enhance:
                    elapsed = time.time() - p.enhance_start_time
                    if elapsed < p.enhance_duration:
                        # Smooth brightness curve from 0.2 (dim) to 1.0 (normal)
                        # Using ease-out cubic for smooth gradual flash effect
                        progress = elapsed / p.enhance_duration
                        # Ease-out cubic: 1 - (1-t)^3
                        eased = 1.0 - pow(1.0 - progress, 3)
                        p.current_brightness = 0.2 + (0.8 * eased)  # 0.2 -> 1.0
                    else:
                        p.current_brightness = 1.0  # fully bright
                    
                    # Apply brightness adjustment to frame
                    if p.current_brightness < 1.0:
                        frame = cv2.convertScaleAbs(frame, alpha=p.current_brightness, beta=0)

                t0 = time.time()
                results = p.model.track(
                    source=frame,
                    persist=not first_after_open,
                    verbose=False,
                    conf=p.conf,
                    iou=0.7,  # Increased from 0.5 - stricter NMS prevents duplicates
                    classes=p.classes,
                    imgsz=p.imgsz,
                    tracker=tracker_mode,
                    device=DEVICE,
                    half=HALF,
                    max_det=50,  # Limit max detections per frame
                )[0]
                first_after_open = False  # tracker state now persists again (persist=False above reset it)
                # If a subscriber reset arrived during inference, skip this frame's
                # broadcast and re-sync immediately — shaves ~one frame of latency.
                if p.reset_requested:
                    break
                dt = time.time() - t0
                inst = (1.0 / dt) if dt > 0 else 0.0
                p.efps = (p.efps * 0.85 + inst * 0.15) if p.efps else inst

                objects: list[dict] = []
                boxes = results.boxes
                if boxes is not None and boxes.xyxyn is not None and len(boxes) > 0:
                    for xyxy_n, t_id, c_id, score in zip(
                        boxes.xyxyn.tolist(),
                        boxes.id.tolist() if boxes.id is not None else [0] * len(boxes),
                        boxes.cls.tolist(),
                        boxes.conf.tolist(),
                    ):
                        tid = int(t_id) if t_id else 0
                        if tid:
                            p.max_id = max(p.max_id, tid)
                        label = p.label_map.get(int(c_id), COCO_LABELS.get(int(c_id), "object"))
                        objects.append(
                            _normalize(
                                xyxy_n,
                                frame_w,
                                frame_h,
                                c_id,
                                label,
                                loop_start_id + (tid if tid else objects.__len__() + 1),
                                score,
                            )
                        )

                if p.anpr:
                    now2 = time.time()
                    if p.plate_model is not None:
                        # Repo-style: plate detector over the full frame; each plate
                        # box must sit inside a tracked vehicle before OCR is queued.
                        if len(p.ocr_queue) < 4 and (now2 - p.ocr_target_at) >= p.anpr_interval:
                            try:
                                pre = p.plate_model.predict(source=frame, verbose=False, conf=0.25, device=DEVICE, half=HALF)[0]
                            except Exception:
                                pre = None
                            if pre is not None and pre.boxes is not None:
                                for box in pre.boxes.xyxy.tolist():
                                    x1p, y1p, x2p, y2p = (int(v) for v in box)
                                    if x2p - x1p < 30 or y2p - y1p < 10:
                                        continue
                                    inside = any(
                                        o["cls"] in VEHICLE_CLS
                                        and x1p >= o["bbox"][0] * frame_w
                                        and y1p >= o["bbox"][1] * frame_h
                                        and x2p <= (o["bbox"][0] + o["bbox"][2]) * frame_w
                                        and y2p <= (o["bbox"][1] + o["bbox"][3]) * frame_h
                                        for o in objects
                                    )
                                    if inside:
                                        _queue_plate_crop(p, frame, x1p, y1p, x2p, y2p, now2)
                    else:
                        # No plate detector: OCR the largest vehicles' lower bands,
                        # one per interval, rotating so every visible vehicle gets
                        # a read instead of only the single biggest one.
                        if (now2 - p.ocr_target_at) >= p.anpr_interval:
                            vehs = [
                                o
                                for o in objects
                                if o["cls"] in VEHICLE_CLS and o["bbox"][2] > 0.07  # big enough that the plate is readable
                            ]
                            vehs.sort(key=lambda o: o["bbox"][2] * o["bbox"][3], reverse=True)
                            for veh in vehs[:3]:
                                if _recent_plate_near(p, veh, frame_w, frame_h):
                                    if p.camera_id == "cam-02":
                                        print(
                                            f"[cam-02][ANPR] SKIP crop veh id={veh['id']} {veh['cls']} "
                                            f"(a live plate decal is still near its top-left)",
                                            flush=True,
                                        )
                                    continue
                                x1, y1, w, h = veh["bbox"]
                                ox, oy = int(x1 * frame_w), int(y1 * frame_h)
                                if p.camera_id == "cam-02":
                                    print(
                                        f"[cam-02][ANPR] SELECT crop veh id={veh['id']} {veh['cls']} "
                                        f"area_norm={w * h:.4f} veh_bbox_px=[{ox},{oy},"
                                        f"{int((x1 + w) * frame_w)},{int((y1 + h) * frame_h)}] "
                                        f"origin=({ox},{oy}) crop_ts={now2:.3f}",
                                        flush=True,
                                    )
                                _queue_plate_crop(
                                    p,
                                    frame,
                                    ox,
                                    oy,
                                    int((x1 + w) * frame_w),
                                    int((y1 + h) * frame_h),
                                    now2,
                                    veh=veh,
                                )
                                break
                            p.ocr_target_at = now2
                    _merge_plates(p, objects, frame_w, frame_h)

                frame_state = {
                    "type": "frame",
                    "camera": p.camera_id,
                    "seq": seq,
                    "ts": int(time.time() * 1000),
                    "vts": round(frame_index / fps, 3),  # video timestamp from frame index (more reliable than CAP_PROP_POS_MSEC)
                    "vfps": round(fps, 2),                                    # source video fps
                    "efps": round(p.efps, 2),                                 # sliding inference fps (video should play at this rate)
                    "tracking": True,
                    "first": not session_first_sent,  # first frame of a session: client re-anchors to 0 here
                    "objects": objects,
                    "counts": _counts(p.camera_id, objects),
                }
                # The first broadcast frame of a session (re)defines the shared origin:
                # the client restarts its <video> at 0s on seeing `first:true`, so both
                # clocks depart from the exact same frame. t0 is set just before send so
                # vts tracks the clock the client starts on.
                if not session_first_sent:
                    p.t0 = time.time() - frame_index / fps
                    session_first_sent = True
                if seq and seq % 75 == 0:
                    print(f"[{p.camera_id}] sync-note frame={frame_index} vts={frame_state['vts']:.3f}s", flush=True)
                if p.fence and p.fence_engine is not None:
                    entries = [
                        (
                            [
                                o["bbox"][0],
                                o["bbox"][1],
                                o["bbox"][0] + o["bbox"][2],
                                o["bbox"][1] + o["bbox"][3],
                            ],
                            o["id"],
                        )
                        for o in objects
                        if o["cls"] == "person"
                    ]
                    persons, new_events = p.fence_engine.evaluate(entries)
                    frame_state["persons"] = persons
                    frame_state["events"] = new_events
                    frame_state["fence"] = p.fence_engine.polygon
                    frame_state["counts"] = {
                        "persons": len(persons),
                        "approaching": sum(1 for x in persons if x["state"] == "approaching"),
                        "intrusion": sum(1 for x in persons if x["state"] == "intrusion"),
                    }
                seq += 1
                asyncio.run_coroutine_threadsafe(hub.broadcast(p.camera_id, frame_state), _loop)
        finally:
            cap.release()

        p.loop_offset = loop_start_id + p.max_id


def _counts(camera_id: str, objects: list[dict]) -> dict:
    counts: dict = {"total": len(objects)}
    if camera_id == "cam-01":
        counts["humans"] = sum(1 for o in objects if o["cls"] == "person")
    else:
        counts["vehicles"] = sum(1 for o in objects if o["cls"] in ("car", "truck", "bus", "motorcycle"))
        counts["plates"] = sum(1 for o in objects if o["cls"] == "plate")
    return counts


# ── FastAPI app ──────────────────────────────────────────────────────────────
_loop: asyncio.AbstractEventLoop


class WsCommand(BaseModel):
    camera: str | None = None
    type: str | None = None
    polygon: list[list[float]] | None = None


app = FastAPI(title="BorderEye Analytics", version="1.0.0")


async def _camera_worker(cam_id: str):
    """Bridge between blocking pipeline thread and the asyncio loop."""
    pipeline = next(p for p in PIPELINES if p.camera_id == cam_id)
    await asyncio.to_thread(run_pipeline, pipeline)


@app.on_event("startup")
async def _startup() -> None:
    global _loop
    _loop = asyncio.get_running_loop()
    for pipeline in PIPELINES:
        cam = pipeline.camera_id
        if pipeline.anpr:
            threading.Thread(target=ocr_worker, args=(pipeline,), daemon=True).start()
        task = asyncio.create_task(_camera_worker(cam))
        task.add_done_callback(lambda t: print(f"[{cam}] pipeline task ended", flush=True))

    # CAM06 — separate live-webcam facial-recognition pipeline on its own thread.
    face_pipeline.set_broadcaster(
        lambda payload: asyncio.run_coroutine_threadsafe(
            hub.broadcast(face_pipeline.CAMERA_ID, payload), _loop
        )
    )
    threading.Thread(
        target=face_pipeline.run_webcam_pipeline,
        args=(face_pipeline.FACE_PIPELINE,),
        daemon=True,
        name="cam-06-webcam",
    ).start()
    print("[cam-06] facial-recognition webcam pipeline started", flush=True)


@app.on_event("shutdown")
async def _shutdown() -> None:
    for pipeline in PIPELINES:
        pipeline.stop = True
    face_pipeline.FACE_PIPELINE.stop = True


@app.websocket("/ws/analytics")
async def ws_analytics(ws: WebSocket):
    await ws.accept()
    camera = None
    try:
        while True:
            raw = await ws.receive_json()
            cmd = WsCommand(**raw)
            if cmd.camera and cmd.type is None:
                camera = cmd.camera
                before = hub.count(camera)
                await hub.subscribe(camera, ws)
                resetted = False
                pipeline = next((p for p in PIPELINES if p.camera_id == camera), None)
                if pipeline is not None and before == 0:
                    # First live subscriber for this camera -> re-run analytics from
                    # frame 0 so backend vts matches the client <video>, which also
                    # restarts at 0s at the same moment (Option B shared origin).
                    resetted = True
                    pipeline.t0 = time.time()       # anchor session clock at the instant the ack is sent
                    pipeline._sync_anchor_set = True  # tell pipeline: don't overwrite t0 on reopen
                    pipeline.reset_requested = True
                    print(f"[{camera}] subscriber-0 sync: resetting to frame 0 (vts 0.000)", flush=True)
                await ws.send_json({"type": "subscribed", "camera": camera, "resetted": resetted, "start_vts": 0.0})
                if pipeline is not None and getattr(pipeline, "fence_engine", None) is not None:
                    await ws.send_json({"type": "fence", "camera": camera, "polygon": pipeline.fence_engine.polygon})
                    await ws.send_json({"type": "timeline", "camera": camera, "events": list(pipeline.fence_engine.events)})
            elif cmd.type in ("set_fence", "clear_fence") and camera:
                pipeline = next((p for p in PIPELINES if p.camera_id == camera), None)
                if pipeline is not None and getattr(pipeline, "fence_engine", None) is not None:
                    pipeline.fence_engine.set_polygon(cmd.polygon if cmd.type == "set_fence" else None)
                    _save_fence(pipeline)
                    await ws.send_json(
                        {"type": "fence_set", "camera": camera, "polygon": pipeline.fence_engine.polygon}
                    )
    except WebSocketDisconnect:
        pass
    except Exception:
        traceback.print_exc()
    finally:
        if camera:
            await hub.unsubscribe(camera, ws)


# ── CAM06 HTTP endpoints (MJPEG live feed + JPEG snapshot + alert log) ────────
def _jpeg_bytes() -> tuple[bytes, bool]:
    frame = face_pipeline.latest_annotated()
    if frame is None:
        frame = face_pipeline.placeholder_frame("waiting for webcam")
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
    return (buf.tobytes() if ok else b""), face_pipeline.FACE_PIPELINE.webcam


@app.get("/faces/stream")
async def faces_stream():
    def gen():
        while not face_pipeline.FACE_PIPELINE.stop:
            data, webcam_ok = _jpeg_bytes()
            yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + data + b"\r\n")
            time.sleep(0.12 if webcam_ok else 0.5)
    return StreamingResponse(
        gen(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


@app.get("/faces/snapshot.jpg")
async def faces_snapshot():
    data, _ = _jpeg_bytes()
    return Response(content=data, media_type="image/jpeg", headers={"Cache-Control": "no-store"})


@app.get("/faces/alerts")
async def faces_alerts():
    return {"camera": "cam-06", "alerts": list(face_pipeline.FACE_PIPELINE.alerts)}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "pipelines": {
            p.camera_id: {"video": p.video, "anpr": p.anpr, "fence": p.fence, "stop": p.stop}
            for p in PIPELINES
        },
        "cam06": {
            "webcam": face_pipeline.FACE_PIPELINE.webcam,
            "faces": face_pipeline.FACE_PIPELINE.counts.get("faces", 0),
            "watchlist_matches": face_pipeline.FACE_PIPELINE.counts.get("watchlist", 0),
            "watchlist_embeddings": face_pipeline.watchlist_embedding_count(),
            "stop": face_pipeline.FACE_PIPELINE.stop,
        },
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)