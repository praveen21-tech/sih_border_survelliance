import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from database.models import GlobalPerson, PersonSighting
from config import settings

class CrossCameraMatcher:
    """
    Cross-Camera Similarity Matching Engine.
    Matches newly extracted Re-ID feature embeddings against known person identities
    across all CCTV camera nodes using Cosine Similarity and ranking.
    """

    def __init__(self, similarity_threshold: float = None):
        self.similarity_threshold = similarity_threshold or settings.REID_SIMILARITY_THRESHOLD

    @staticmethod
    def compute_cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Computes cosine similarity between two 1D normalized feature vectors."""
        v1 = np.asarray(vec1, dtype=np.float32)
        v2 = np.asarray(vec2, dtype=np.float32)
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 < 1e-6 or norm2 < 1e-6:
            return 0.0
        return float(np.dot(v1, v2) / (norm1 * norm2))

    def match_against_gallery(
        self,
        query_embedding: np.ndarray,
        gallery: List[Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Matches a query embedding against a list of candidate gallery embeddings.
        
        Args:
            query_embedding: 1D np.ndarray (512-d)
            gallery: List of dicts with keys: {'person_id', 'camera_id', 'timestamp', 'embedding', ...}
            top_k: Maximum number of top matches to return
            
        Returns:
            Ranked list of match results with similarity scores.
        """
        if not gallery or query_embedding is None or len(query_embedding) == 0:
            return []

        results = []
        q_norm = query_embedding / max(1e-6, np.linalg.norm(query_embedding))

        for item in gallery:
            target_emb = item.get("embedding")
            if target_emb is None:
                continue
            t_vec = np.asarray(target_emb, dtype=np.float32)
            sim = self.compute_cosine_similarity(q_norm, t_vec)
            
            results.append({
                "person_id": item.get("person_id"),
                "camera_id": item.get("camera_id"),
                "timestamp": item.get("timestamp"),
                "zone_name": item.get("zone_name"),
                "crop_path": item.get("crop_path"),
                "similarity": round(sim, 4),
                "is_match": sim >= self.similarity_threshold
            })

        # Sort by similarity descending
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:top_k]

    def find_or_create_global_person(
        self,
        db: Session,
        query_embedding: np.ndarray,
        camera_id: str,
        crop_path: Optional[str] = None,
        zone_name: Optional[str] = None
    ) -> Tuple[str, float, bool]:
        """
        Identifies whether a detection matches an existing GlobalPerson across cameras.
        If matched (sim >= threshold), associates with the existing ID.
        Otherwise, registers a new GlobalPerson identity.

        Returns:
            (global_person_id, best_similarity, is_new_person)
        """
        # Load recent active sightings with embeddings from DB
        recent_sightings = db.query(PersonSighting).filter(
            PersonSighting.embedding_json.isnot(None)
        ).order_by(PersonSighting.timestamp.desc()).limit(200).all()

        gallery = []
        for s in recent_sightings:
            if s.embedding_json:
                gallery.append({
                    "person_id": s.global_person_id,
                    "camera_id": s.camera_id,
                    "timestamp": s.timestamp,
                    "zone_name": s.zone_name,
                    "crop_path": s.crop_path,
                    "embedding": s.embedding_json
                })

        matches = self.match_against_gallery(query_embedding, gallery, top_k=1)

        if matches and matches[0]["similarity"] >= self.similarity_threshold:
            matched_person_id = matches[0]["person_id"]
            best_sim = matches[0]["similarity"]
            
            # Update last seen timestamp & total sightings on GlobalPerson
            person = db.query(GlobalPerson).filter(GlobalPerson.id == matched_person_id).first()
            if person:
                import datetime
                person.last_seen = datetime.datetime.utcnow()
                person.total_sightings = (person.total_sightings or 0) + 1
                db.commit()

            return matched_person_id, best_sim, False
        else:
            # Create new GlobalPerson
            count = db.query(GlobalPerson).count() + 1
            new_id = f"PERSON_{count:03d}"
            
            import datetime
            new_person = GlobalPerson(
                id=new_id,
                first_seen=datetime.datetime.utcnow(),
                last_seen=datetime.datetime.utcnow(),
                best_crop_path=crop_path,
                total_sightings=1,
                status="active"
            )
            db.add(new_person)
            db.commit()

            return new_id, 1.0, True
