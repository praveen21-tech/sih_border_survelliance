"""
Vision Engine — YOLO object detection for drone/aerial threat classification.
Uses YOLOv8n (nano) from Ultralytics — downloads ~6 MB on first run.

Detection strategy:
  - Primary: COCO classes that correspond to aerial objects (airplane=4, bird=14)
  - Secondary: A curated label-remapping that promotes high-altitude small objects
    to "drone_candidate" when bounding-box area < 2% of frame and aspect ratio
    is roughly square (multirotors) or elongated (fixed-wing).
  - Confidence threshold: 0.25 (low to catch distant/small UAVs)
  - NMS IoU: 0.45

Each detected box returns:
  {
    "x1","y1","x2","y2"  : pixel coords (int)
    "cx","cy"            : centre pixel
    "w","h"              : box width/height
    "conf"               : float 0-1
    "class_id"           : int (COCO or custom)
    "label"              : str  e.g. "drone_candidate", "airplane", "bird"
    "drone_candidate"    : bool  — True when heuristics flag it as a UAV
    "threat_score"       : float 0-1  fused visual threat
    "colour"             : [R,G,B]   for overlay rendering
  }
"""

from __future__ import annotations

import logging
import threading
from pathlib import Path
from typing import Any

import numpy as np

from ..config import settings

log = logging.getLogger("border.vision")

# COCO class IDs relevant to aerial surveillance
_AERIAL_COCO = {4: "airplane", 14: "bird"}
_DRONE_LIKE  = {"airplane", "kite", "frisbee", "sports ball"}  # proxies when model lacks drone class

# YOLOv8 model weights — nano is fast enough for real-time on CPU
_MODEL_NAME  = "yolov8n.pt"
_MODEL_PATH  = Path(settings.models_dir) / _MODEL_NAME

# Colour palette per threat level  (BGR for cv2, RGB for canvas)
_COLOURS = {
    "drone_candidate": (220, 30,  30),   # red
    "airplane":        (200, 100, 20),   # amber
    "bird":            (60,  120, 200),  # blue
    "default":         (80,  180, 80),   # green
}


class VisionEngine:
    """
    Wraps YOLOv8n for real-time drone/aerial object detection.
    Thread-safe: model is loaded once, infer() can be called from any thread.
    """

    def __init__(self) -> None:
        self._model   = None
        self._lock    = threading.Lock()
        self.ready    = False
        self.error: str | None = None
        self._model_name = _MODEL_NAME

    # ── Loading ───────────────────────────────────────────────────────────
    def load(self) -> None:
        try:
            from ultralytics import YOLO
            log.info("Loading YOLOv8n for visual drone detection…")
            # Ultralytics auto-downloads to ~/.cache/ultralytics/ if not present
            self._model = YOLO(_MODEL_NAME)
            # Warm-up pass with a blank frame to pre-compile any graph ops
            dummy = np.zeros((320, 320, 3), dtype=np.uint8)
            self._model(dummy, verbose=False, conf=0.25)
            self.ready = True
            self.error = None
            log.info("YOLOv8n ready — visual detection active")
        except Exception as exc:
            self.error = str(exc)
            self.ready = False
            log.error("YOLOv8n load failed: %s", exc)

    # ── Inference ─────────────────────────────────────────────────────────
    def infer(
        self,
        frame: np.ndarray,
        conf_threshold: float = 0.25,
        iou_threshold:  float = 0.45,
    ) -> list[dict[str, Any]]:
        """
        Run YOLO on a BGR numpy frame (from cv2.VideoCapture).
        Returns list of detection dicts; empty list if model not ready.
        """
        if not self.ready or self._model is None:
            return []

        h, w = frame.shape[:2]
        frame_area = h * w

        with self._lock:
            results = self._model(
                frame,
                verbose=False,
                conf=conf_threshold,
                iou=iou_threshold,
                stream=False,
            )

        detections: list[dict[str, Any]] = []
        for r in results:
            if r.boxes is None:
                continue
            for box in r.boxes:
                cls_id = int(box.cls[0])
                conf   = float(box.conf[0])
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
                bw, bh = x2 - x1, y2 - y1
                cx, cy = x1 + bw // 2, y1 + bh // 2
                box_area = bw * bh
                area_ratio = box_area / (frame_area + 1)

                # Label resolution
                raw_label = (
                    r.names.get(cls_id)
                    if r.names else
                    _AERIAL_COCO.get(cls_id, f"class_{cls_id}")
                )

                # Drone heuristics:
                # 1. Any COCO airplane/kite at any size
                # 2. Small object (<3% frame area) with squarish/compact bbox
                aspect = bw / (bh + 1e-6)
                is_drone = (
                    raw_label in _DRONE_LIKE
                    or (area_ratio < 0.03 and 0.5 < aspect < 2.0 and conf > 0.30)
                    or (raw_label == "bird" and area_ratio < 0.005)
                )

                label = "drone_candidate" if is_drone and raw_label not in ("airplane",) else raw_label

                # Visual threat score
                # Combines YOLO confidence with small-object penalty
                size_boost = float(np.clip(1.0 - area_ratio * 20, 0, 0.3))
                threat_score = float(np.clip(conf + size_boost, 0, 1.0))
                if label == "drone_candidate":
                    threat_score = min(1.0, threat_score * 1.25)

                colour = _COLOURS.get(label, _COLOURS["default"])

                detections.append({
                    "x1":             x1, "y1": y1,
                    "x2":             x2, "y2": y2,
                    "cx":             cx, "cy": cy,
                    "w":              bw, "h": bh,
                    "conf":           round(conf, 4),
                    "class_id":       cls_id,
                    "label":          label,
                    "raw_label":      raw_label,
                    "drone_candidate": is_drone,
                    "threat_score":   round(threat_score, 4),
                    "area_ratio":     round(area_ratio, 6),
                    "colour":         list(colour),
                    "frame_w":        w,
                    "frame_h":        h,
                })

        # Sort by threat score descending
        detections.sort(key=lambda d: d["threat_score"], reverse=True)
        return detections

    # ── Draw bounding boxes onto a frame copy ─────────────────────────────
    def draw_boxes(
        self,
        frame: np.ndarray,
        detections: list[dict[str, Any]],
    ) -> np.ndarray:
        """
        Draw YOLO bounding boxes + labels onto a copy of the frame.
        Returns annotated BGR frame.
        """
        import cv2
        out = frame.copy()
        for d in detections:
            x1, y1, x2, y2 = d["x1"], d["y1"], d["x2"], d["y2"]
            # cv2 uses BGR
            b, g, r = d["colour"][2], d["colour"][1], d["colour"][0]
            colour_bgr = (b, g, r)
            thick = 2 if d["drone_candidate"] else 1

            cv2.rectangle(out, (x1, y1), (x2, y2), colour_bgr, thick)

            # Label tag
            tag = f"{d['label']} {d['conf']:.2f}"
            (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            ty = max(y1 - 4, th + 4)
            cv2.rectangle(out, (x1, ty - th - 4), (x1 + tw + 4, ty), colour_bgr, -1)
            cv2.putText(out, tag, (x1 + 2, ty - 2),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

            # Threat score bar (bottom of box)
            bar_w = int((x2 - x1) * d["threat_score"])
            cv2.rectangle(out, (x1, y2 + 1), (x1 + bar_w, y2 + 4), colour_bgr, -1)

        # Timestamp overlay
        import time
        ts = time.strftime("%H:%M:%S IST", time.localtime())
        cv2.putText(out, f"BorderEye Visual  {ts}", (8, 18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 220, 255), 1, cv2.LINE_AA)
        return out

    # ── Aggregate visual threat from detections ───────────────────────────
    def visual_threat_score(self, detections: list[dict]) -> float:
        """Max threat score across all current detections (0 if none)."""
        if not detections:
            return 0.0
        return max(d["threat_score"] for d in detections)


# Singleton
vision_engine = VisionEngine()
