from __future__ import annotations
# BorderEye AI — Face Detector & Biometric Feature Extractor (FaceNet VGGFace2)

import logging
import warnings
import cv2
import numpy as np
import torch

warnings.filterwarnings("ignore")
logger = logging.getLogger("bordereye.face_detector")

_FACENET_MODEL = None
_DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

def get_facenet_model():
    global _FACENET_MODEL
    if _FACENET_MODEL is None:
        try:
            from facenet_pytorch import InceptionResnetV1
            _FACENET_MODEL = InceptionResnetV1(pretrained="vggface2").eval().to(_DEVICE)
            logger.info(f"FaceNet (InceptionResnetV1 VGGFace2) loaded on {_DEVICE}.")
        except Exception as e:
            logger.error(f"Failed to load FaceNet: {e}")
    return _FACENET_MODEL


class FaceDetector:
    def __init__(self, det_size: int = 640, min_det_score: float = 0.3) -> None:
        self.min_det_score = min_det_score
        c1 = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        c2 = cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml"
        self.cascades = [cv2.CascadeClassifier(c1), cv2.CascadeClassifier(c2)]
        self.facenet = get_facenet_model()

    def _extract_tensor_embedding(self, face_bgr: np.ndarray) -> np.ndarray:
        """Extract a 512-d L2-normalized FaceNet embedding from a cropped BGR face image."""
        if face_bgr is None or face_bgr.size == 0:
            return np.zeros((512,), dtype=np.float32)
        try:
            rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
            resized = cv2.resize(rgb, (160, 160))
            tensor = torch.tensor(resized, dtype=torch.float32).permute(2, 0, 1).unsqueeze(0)
            tensor = (tensor - 127.5) / 128.0
            tensor = tensor.to(_DEVICE)
            
            with torch.no_grad():
                if self.facenet is None:
                    self.facenet = get_facenet_model()
                emb = self.facenet(tensor).squeeze(0).cpu().numpy()
            
            norm = float(np.linalg.norm(emb))
            return (emb / norm).astype(np.float32) if norm > 1e-9 else emb.astype(np.float32)
        except Exception as e:
            logger.warning(f"FaceNet extraction error: {e}")
            gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
            feat = cv2.resize(gray, (32, 16)).flatten().astype(np.float32)
            n = float(np.linalg.norm(feat))
            return feat / (n + 1e-6)

    def _detect_rects(self, gray: np.ndarray) -> list[tuple[int, int, int, int]]:
        rects = []
        for cascade in self.cascades:
            found = cascade.detectMultiScale(
                gray,
                scaleFactor=1.08,
                minNeighbors=3,
                minSize=(28, 28)
            )
            if len(found) > 0:
                for r in found:
                    rects.append(tuple(r))
                break
        return rects

    def extract_face_embeddings(self, img_bgr: np.ndarray) -> list[np.ndarray]:
        """Extract rich multi-scale face embeddings for an enrollment image."""
        if img_bgr is None or img_bgr.size == 0:
            return []
            
        h, w = img_bgr.shape[:2]
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        rects = self._detect_rects(gray)
        
        embeddings = []
        if len(rects) > 0:
            rects = sorted(rects, key=lambda r: r[2] * r[3], reverse=True)
            for (x, y, fw, fh) in rects[:2]:
                for pad_ratio in [0.05, 0.15, 0.25]:
                    pad_x = int(fw * pad_ratio)
                    pad_y = int(fh * pad_ratio)
                    x1 = max(0, x - pad_x)
                    y1 = max(0, y - pad_y)
                    x2 = min(w, x + fw + pad_x)
                    y2 = min(h, y + fh + pad_y)
                    
                    face_crop = img_bgr[y1:y2, x1:x2]
                    if face_crop.size > 0:
                        emb = self._extract_tensor_embedding(face_crop)
                        embeddings.append(emb)
                        flip = cv2.flip(face_crop, 1)
                        embeddings.append(self._extract_tensor_embedding(flip))
            
        return embeddings

    def recognize(self, img_bgr: np.ndarray, max_num: int = 6) -> list[dict]:
        """Detect faces in frame and return bounding boxes + 512-d FaceNet embeddings."""
        if img_bgr is None or img_bgr.size == 0:
            return []
            
        h, w = img_bgr.shape[:2]
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        rects = self._detect_rects(gray)
        
        results = []
        for (x, y, fw, fh) in rects[:max_num]:
            pad_x = int(fw * 0.12)
            pad_y = int(fh * 0.12)
            x1 = max(0, x - pad_x)
            y1 = max(0, y - pad_y)
            x2 = min(w, x + fw + pad_x)
            y2 = min(h, y + fh + pad_y)
            
            face_roi = img_bgr[y1:y2, x1:x2]
            if face_roi.size == 0:
                continue
                
            emb = self._extract_tensor_embedding(face_roi)
            results.append({
                "bbox": [float(x), float(y), float(x + fw), float(y + fh)],
                "det_score": 0.94,
                "kps": None,
                "embedding": emb,
            })
            
        return results

