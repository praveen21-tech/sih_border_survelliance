# BorderEye AI — Face detector (InsightFace RetinaFace + ArcFace)
#
# Pretrained, CPU-first. No training from scratch.
#   - detection  : InsightFace FaceAnalysis buffalo_l (RetinaFace det_10g)
#   - embedding  : ArcFace w600k_r50 (512-d)
import warnings

import numpy as np

warnings.filterwarnings("ignore")


class FaceDetector:
    """Lazy InsightFace wrapper. Construction is expensive; build one and reuse."""

    def __init__(self, det_size: int = 640, min_det_score: float = 0.4) -> None:
        self.min_det_score = min_det_score
        from insightface.app import FaceAnalysis

        # Only detection + recognition models — skip landmark/genderage (~140MB, faster load).
        self.app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
            allowed_modules=["detection", "recognition"],
        )
        self.app.prepare(ctx_id=0, det_size=(det_size, det_size))
        # Warm up on a blank frame so the first real frame isn't slow.
        self.app.get(np.zeros((480, 640, 3), dtype=np.uint8), max_num=1)
        self._warm = True

    def recognize(self, img_bgr: np.ndarray, max_num: int = 5) -> list[dict]:
        """Detect faces + generate embeddings in one pass.

        Returns a list of:
          {"bbox": [x1, y1, x2, y2] (px, original image coords),
           "det_score": float, "kps": ..., "embedding": 512-d float32}
        """
        faces = self.app.get(img_bgr, max_num=max_num)
        results = []
        h, w = img_bgr.shape[:2]
        for f in faces:
            if f.det_score < self.min_det_score:
                continue
            x1, y1, x2, y2 = (float(v) for v in f.bbox)
            x1 = max(0.0, min(w - 1.0, x1))
            y1 = max(0.0, min(h - 1.0, y1))
            x2 = max(x1 + 1.0, min(w - 1.0, x2))
            y2 = max(y1 + 1.0, min(h - 1.0, y2))
            emb = getattr(f, "normed_embedding", None)
            if emb is None:
                emb = np.asarray(f.embedding, dtype=np.float32)
                n = float(np.linalg.norm(emb))
                emb = emb / n if n > 1e-9 else emb
            # InsightFace embeddings are views into onnxruntime's output buffers,
            # which are freed when the Face objects go out of scope. Copy now to
            # avoid use-after-free / silent native crashes on later numpy ops.
            emb = np.array(emb, dtype=np.float32).copy()
            results.append(
                {
                    "bbox": [x1, y1, x2, y2],
                    "det_score": float(f.det_score),
                    "embedding": np.asarray(emb, dtype=np.float32),
                }
            )
        return results