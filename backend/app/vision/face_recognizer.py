from __future__ import annotations
# BorderEye AI — Face recognizer (ArcFace cosine matching & Access Control)

import numpy as np
from .watchlist_manager import WatchlistManager

DEFAULT_THRESHOLD = 0.46

class FaceRecognizer:
    def __init__(self, manager: WatchlistManager, threshold: float = DEFAULT_THRESHOLD) -> None:
        self.manager = manager
        self.threshold = threshold

    def identify(self, embedding: np.ndarray) -> dict:
        """Map a face embedding to an access control decision.
        
        Returns:
          - Authorized: {"label": "Name", "designation": "Title", "status": "AUTHORIZED", "watchlist": True, "confidence": float}
          - Intruder:   {"label": "INTRUDER", "designation": "Unauthorized Entity", "status": "INTRUDER", "watchlist": False, "confidence": float}
        """
        person, sim = self.manager.best_match(embedding, threshold=self.threshold)
        if person is None:
            return {
                "label": "INTRUDER",
                "designation": "Unauthorized Access",
                "status": "INTRUDER",
                "watchlist": False,
                "confidence": round(max(sim, 0.0), 3),
            }
        return {
            "label": person["name"],
            "designation": person.get("designation", "Authorized Personnel"),
            "status": "AUTHORIZED",
            "watchlist": True,
            "confidence": round(sim, 3),
        }
