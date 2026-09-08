# BorderEye AI — Face recognizer (ArcFace cosine matching)
#
# The stored watchlist embeddings are L2-normalized; matching is pure cosine
# similarity against every stored embedding, keeping the best hit.
import numpy as np

from app.watchlist_manager import WatchlistManager

DEFAULT_THRESHOLD = 0.45  # buffalo_l ArcFace; lower = more permissive


class FaceRecognizer:
    def __init__(self, manager: WatchlistManager, threshold: float = DEFAULT_THRESHOLD) -> None:
        self.manager = manager
        self.threshold = threshold

    def identify(self, embedding: np.ndarray) -> dict:
        """Map a face embedding to a recognition verdict.

        Returns the spec's per-object identity fields:
          {"label": "Daniel" | "Unknown", "watchlist": bool, "confidence": float}
        The confidence is the best cosine similarity (0..1) achieved across the
        whole watchlist; unknown faces simply report a below-threshold score.
        """
        person, sim = self.manager.best_match(embedding, threshold=self.threshold)
        if person is None:
            return {"label": "Unknown", "watchlist": False, "confidence": round(max(sim, 0.0), 3)}
        return {"label": person["name"], "watchlist": True, "confidence": round(sim, 3)}