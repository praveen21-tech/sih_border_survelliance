# BorderEye AI — Watchlist manager (facial recognition)
#
# Persistent storage of person face embeddings. Survives backend restarts.
#
# Storage format (backend/data/watchlist.json):
#   {
#     "version": 1,
#     "people": [
#       {
#         "person_id": 1,
#         "name": "Daniel",
#         "created_at": "2026-09-07 10:00:00",
#         "embedding_count": 42,
#         "embeddings": [[0.001, -0.002, ...512 floats...], ...]
#       }
#     ]
#   }
import json
import threading
from datetime import datetime
from pathlib import Path

import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_WATCHLIST_PATH = BASE_DIR / "data" / "watchlist.json"


class WatchlistManager:
    def __init__(self, path: Path | str | None = None) -> None:
        self.path = Path(path) if path else DEFAULT_WATCHLIST_PATH
        # RLock: add_person -> save() acquires it again within the same thread.
        self._lock = threading.RLock()
        self.people: list[dict] = []
        self._next_id = 1
        self._load()

    # ── persistence ────────────────────────────────────────────────────────
    def _load(self) -> None:
        try:
            if self.path.exists():
                data = json.loads(self.path.read_text(encoding="utf-8"))
                self.people = data.get("people", [])
                used = [p.get("person_id", 0) for p in self.people]
                self._next_id = max(used, default=0) + 1
        except Exception as e:
            print(f"[watchlist] failed to load {self.path}: {e}", flush=True)
            self.people = []

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._lock:
            tmp = self.path.with_suffix(".json.tmp")
            tmp.write_text(
                json.dumps({"version": 1, "people": self.people}, indent=2),
                encoding="utf-8",
            )
            tmp.replace(self.path)

    # ── person CRUD ────────────────────────────────────────────────────────
    def add_person(self, name: str, embeddings: list[np.ndarray], replace: bool = True) -> dict:
        """Register (or retrain) a person with a set of face embeddings.

        Returns the stored person record.
        """
        norm = [e.astype(np.float32, copy=True) / max(np.linalg.norm(e), 1e-9) for e in embeddings]
        with self._lock:
            existing = next((p for p in self.people if p["name"].lower() == name.lower()), None)
            if existing is not None:
                if not replace:
                    norm = existing.get("embeddings", []) + norm
                existing["embeddings"] = [e.tolist() for e in norm]
                existing["embedding_count"] = len(norm)
                existing["created_at"] = existing.get("created_at") or self._now()
                self.save()
                return existing
            person = {
                "person_id": self._next_id,
                "name": name,
                "created_at": self._now(),
                "embedding_count": len(norm),
                "embeddings": [e.tolist() for e in norm],
            }
            self._next_id += 1
            self.people.append(person)
            self.save()
            return person

    def get_people(self) -> list[dict]:
        return self.people

    def get_person(self, name: str) -> dict | None:
        return next((p for p in self.people if p["name"].lower() == name.lower()), None)

    def embedding_count(self) -> int:
        return sum(int(p.get("embedding_count", len(p.get("embeddings", [])))) for p in self.people)

    def watchlist_ready(self) -> bool:
        return self.embedding_count() > 0

    # ── matching (cosine similarity of L2-normalized embeddings) ───────────
    def best_match(self, embedding: np.ndarray, threshold: float = 0.45):
        """Return ({person, name} | None, max_similarity) across the watchlist."""
        if not self.people:
            return None, 0.0
        emb = embedding.astype(np.float32, copy=True)
        n = np.linalg.norm(emb)
        if n < 1e-9:
            return None, 0.0
        emb = emb / n
        best_name: str | None = None
        best_person: dict | None = None
        best_sim = -1.0
        for person in self.people:
            for stored in person.get("embeddings", []):
                sim = float(np.dot(emb, np.asarray(stored, dtype=np.float32)))
                if sim > best_sim:
                    best_sim = sim
                    best_name = person["name"]
                    best_person = person
        if best_sim >= threshold:
            return best_person, best_sim
        return None, best_sim

    @staticmethod
    def _now() -> str:
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")