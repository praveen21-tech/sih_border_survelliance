from __future__ import annotations
# BorderEye AI — Watchlist & Authorized Personnel Manager (facial recognition)
#
# Persistent storage of authorized personnel with designations and face embeddings.
# Survives backend restarts.
#
# Storage format (backend/data/watchlist.json):
#   {
#     "version": 2,
#     "people": [
#       {
#         "person_id": 1,
#         "name": "Commander Vikram Singh",
#         "designation": "Chief Security Officer",
#         "role": "Authorized Personnel",
#         "photo_url": "data:image/jpeg;base64,...",
#         "created_at": "2026-09-08 10:00:00",
#         "embedding_count": 5,
#         "embeddings": [[...512 floats...]]
#       }
#     ]
#   }

import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_WATCHLIST_PATH = BASE_DIR / "data" / "watchlist.json"

class WatchlistManager:
    def __init__(self, path: Path | str | None = None) -> None:
        self.path = Path(path) if path else DEFAULT_WATCHLIST_PATH
        self._lock = threading.RLock()
        self.people: list[dict] = []
        self._last_mtime = 0.0
        self._next_id = 1
        self._load()

    # ── persistence ────────────────────────────────────────────────────────
    def _load(self) -> None:
        try:
            if self.path.exists():
                mtime = self.path.stat().st_mtime
                if mtime != self._last_mtime:
                    self._last_mtime = mtime
                    data = json.loads(self.path.read_text(encoding="utf-8"))
                    self.people = data.get("people", [])
                    used = [p.get("person_id", 0) for p in self.people]
                    self._next_id = max(used, default=0) + 1
        except Exception as e:
            print(f"[watchlist] failed to load {self.path}: {e}", flush=True)

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._lock:
            tmp = self.path.with_suffix(".json.tmp")
            tmp.write_text(
                json.dumps({"version": 2, "people": self.people}, indent=2),
                encoding="utf-8",
            )
            tmp.replace(self.path)
            try:
                self._last_mtime = self.path.stat().st_mtime
            except Exception:
                pass

    # ── person CRUD ────────────────────────────────────────────────────────
    def add_person(
        self,
        name: str,
        embeddings: list[np.ndarray],
        designation: str = "Authorized Personnel",
        role: str = "Security & Patrol",
        photo_url: str = "",
        replace: bool = True,
    ) -> dict:
        """Register (or update) an authorized person with face embeddings and designation."""
        norm = [e.astype(np.float32, copy=True) / max(float(np.linalg.norm(e)), 1e-9) for e in embeddings]
        with self._lock:
            existing = next((p for p in self.people if p["name"].strip().lower() == name.strip().lower()), None)
            if existing is not None:
                if not replace:
                    existing_embs = [np.array(e, dtype=np.float32) for e in existing.get("embeddings", [])]
                    norm = existing_embs + norm
                existing["designation"] = designation or existing.get("designation", "Authorized Personnel")
                existing["role"] = role or existing.get("role", "Authorized Personnel")
                if photo_url:
                    existing["photo_url"] = photo_url
                existing["embeddings"] = [e.tolist() if isinstance(e, np.ndarray) else e for e in norm]
                existing["embedding_count"] = len(norm)
                existing["updated_at"] = self._now()
                self.save()
                return existing

            person = {
                "person_id": self._next_id,
                "name": name.strip(),
                "designation": designation.strip() or "Authorized Personnel",
                "role": role.strip() or "Security & Patrol",
                "photo_url": photo_url,
                "created_at": self._now(),
                "embedding_count": len(norm),
                "embeddings": [e.tolist() if isinstance(e, np.ndarray) else e for e in norm],
            }
            self._next_id += 1
            self.people.append(person)
            self.save()
            return person

    def delete_person(self, person_id: int) -> bool:
        with self._lock:
            initial_len = len(self.people)
            self.people = [p for p in self.people if p.get("person_id") != int(person_id)]
            if len(self.people) < initial_len:
                self.save()
                return True
            return False

    def get_people(self) -> list[dict]:
        self._load()
        # Return sanitized copy for JSON consumption (excluding heavy raw embeddings)
        sanitized = []
        for p in self.people:
            sanitized.append({
                "person_id": p.get("person_id"),
                "name": p.get("name"),
                "designation": p.get("designation", "Authorized Personnel"),
                "role": p.get("role", "Security & Patrol"),
                "photo_url": p.get("photo_url", ""),
                "created_at": p.get("created_at"),
                "embedding_count": p.get("embedding_count", len(p.get("embeddings", []))),
                "status": "AUTHORIZED",
            })
        return sanitized

    def get_person(self, name: str) -> dict | None:
        self._load()
        return next((p for p in self.people if p["name"].lower() == name.lower()), None)

    def embedding_count(self) -> int:
        self._load()
        return sum(int(p.get("embedding_count", len(p.get("embeddings", [])))) for p in self.people)

    def watchlist_ready(self) -> bool:
        self._load()
        return len(self.people) > 0 and self.embedding_count() > 0

    # ── matching (cosine similarity of L2-normalized embeddings) ───────────
    def best_match(self, embedding: np.ndarray, threshold: float = 0.45):
        """Return ({person, name} | None, max_similarity) across the watchlist."""
        self._load()
        if not self.people:
            return None, 0.0
        emb = embedding.astype(np.float32, copy=True)
        n = np.linalg.norm(emb)
        if n < 1e-9:
            return None, 0.0
        emb = emb / n
        best_person: dict | None = None
        best_sim = -1.0
        for person in self.people:
            for stored in person.get("embeddings", []):
                sim = float(np.dot(emb, np.asarray(stored, dtype=np.float32)))
                if sim > best_sim:
                    best_sim = sim
                    best_person = person
        if best_sim >= threshold and best_person is not None:
            return best_person, best_sim
        return None, best_sim

    @staticmethod
    def _now() -> str:
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
