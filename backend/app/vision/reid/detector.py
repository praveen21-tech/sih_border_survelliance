import os
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple
from config import settings

class PersonDetector:
    """
    Person detector using YOLO11 / YOLOv8 with fallback to OpenCV HOG / Haar Detector.
    Extracts person bounding boxes and localized image crops.
    """

    def __init__(self, model_name: str = None, conf_threshold: float = 0.4):
        self.conf_threshold = conf_threshold
        self.model_name = model_name or settings.YOLO_MODEL_PATH
        self.yolo_model = None
        self.hog_detector = None
        self._init_detector()

    def _init_detector(self):
        """Initializes YOLO if ultralytics is available; else falls back to OpenCV HOG."""
        try:
            from ultralytics import YOLO
            self.yolo_model = YOLO(self.model_name)
            print(f"[PersonDetector] Ultralytics YOLO initialized successfully ({self.model_name}).")
        except Exception as e:
            print(f"[PersonDetector] YOLO unavailable ({e}). Falling back to OpenCV HOG Person Detector.")
            self.hog_detector = cv2.HOGDescriptor()
            self.hog_detector.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

    def detect_and_crop(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detects persons in the frame and extracts normalized crops.
        
        Returns:
            List of dicts: [
                {
                    "bbox": [x1, y1, x2, y2],
                    "confidence": float,
                    "crop": np.ndarray (BGR image),
                    "aspect_ratio": float
                }, ...
            ]
        """
        if frame is None or frame.size == 0:
            return []

        h, w = frame.shape[:2]
        detections = []

        if self.yolo_model is not None:
            try:
                results = self.yolo_model(frame, verbose=False, conf=self.conf_threshold)
                for r in results:
                    boxes = r.boxes
                    for box in boxes:
                        cls_id = int(box.cls[0].item())
                        # Class 0 in COCO is 'person'
                        if cls_id == 0:
                            x1, y1, x2, y2 = box.xyxy[0].tolist()
                            conf = float(box.conf[0].item())
                            
                            # Boundary clamping
                            x1, y1 = max(0, int(x1)), max(0, int(y1))
                            x2, y2 = min(w, int(x2)), min(h, int(y2))

                            if (x2 - x1) > 20 and (y2 - y1) > 35:
                                crop = frame[y1:y2, x1:x2].copy()
                                detections.append({
                                    "bbox": [x1, y1, x2, y2],
                                    "confidence": round(conf, 4),
                                    "crop": crop,
                                    "aspect_ratio": round((y2 - y1) / max(1, (x2 - x1)), 2)
                                })
                return detections
            except Exception as e:
                print(f"[PersonDetector] YOLO detection error ({e}). Using HOG fallback.")

        # OpenCV HOG Fallback
        if self.hog_detector is not None:
            boxes, weights = self.hog_detector.detectMultiScale(
                frame,
                winStride=(8, 8),
                padding=(8, 8),
                scale=1.05
            )
            for (x, y, bw, bh), weight in zip(boxes, weights):
                try:
                    conf = float(np.squeeze(weight))
                except Exception:
                    conf = 0.85
                x1, y1 = max(0, int(x)), max(0, int(y))
                x2, y2 = min(w, int(x + bw)), min(h, int(y + bh))
                
                if (x2 - x1) > 20 and (y2 - y1) > 35:
                    crop = frame[y1:y2, x1:x2].copy()
                    detections.append({
                        "bbox": [x1, y1, x2, y2],
                        "confidence": round(min(0.99, max(0.5, conf)), 4),
                        "crop": crop,
                        "aspect_ratio": round(bh / max(1, bw), 2)
                    })

        return detections
