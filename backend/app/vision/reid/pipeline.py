import os
import cv2
import datetime
import numpy as np
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from config import settings
from database.models import PersonSighting, Camera
from .detector import PersonDetector
from .extractor import ReIDFeatureExtractor
from .matcher import CrossCameraMatcher
from .tracker import TrajectoryReconstructor

class MultiCameraReIDPipeline:
    """
    End-to-End Multi-Camera Person Re-Identification & Tracking Pipeline.
    1. Ingests video frames from any camera feed.
    2. Detects persons and crops bounding boxes.
    3. Computes 512-d deep Re-ID appearance embeddings.
    4. Matches identity against all active surveillance cameras (CrossCameraMatcher).
    5. Stores sightings, updates cross-camera trajectories, and alerts on watchlist hits.
    """

    def __init__(self):
        self.detector = PersonDetector()
        self.extractor = ReIDFeatureExtractor()
        self.matcher = CrossCameraMatcher()

    def process_frame(
        self,
        db: Session,
        frame: np.ndarray,
        camera_id: str,
        timestamp: Optional[datetime.datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Processes a single camera frame through the entire Re-ID pipeline.
        
        Returns:
            List of processed detections with assigned GlobalPerson IDs and trajectories.
        """
        if frame is None:
            return []

        timestamp = timestamp or datetime.datetime.utcnow()
        cam = db.query(Camera).filter(Camera.id == camera_id).first()
        zone_name = cam.zone if cam else "General Zone"

        # 1. Detect Persons
        detections = self.detector.detect_and_crop(frame)
        processed_results = []

        for idx, det in enumerate(detections):
            crop = det["crop"]
            bbox = det["bbox"]
            conf = det["confidence"]

            # 2. Extract Re-ID Feature Vector
            emb = self.extractor.extract(crop)

            # 3. Save crop to disk for evidence logging
            crop_filename = f"{camera_id}_{timestamp.strftime('%Y%m%d_%H%M%S')}_{idx}.jpg"
            crop_rel_path = f"data/crops/{crop_filename}"
            crop_full_path = settings.DATA_DIR / "crops" / crop_filename
            try:
                cv2.imwrite(str(crop_full_path), crop)
            except Exception as e:
                print(f"[Pipeline] Crop saving error: {e}")

            # 4. Cross-Camera Identity Association
            global_person_id, sim_score, is_new = self.matcher.find_or_create_global_person(
                db=db,
                query_embedding=emb,
                camera_id=camera_id,
                crop_path=crop_rel_path,
                zone_name=zone_name
            )

            # 5. Record Sighting in Database
            sighting = PersonSighting(
                global_person_id=global_person_id,
                camera_id=camera_id,
                timestamp=timestamp,
                bbox_x1=float(bbox[0]),
                bbox_y1=float(bbox[1]),
                bbox_x2=float(bbox[2]),
                bbox_y2=float(bbox[3]),
                detection_confidence=conf,
                reid_similarity_score=sim_score,
                crop_path=crop_rel_path,
                zone_name=zone_name,
                embedding_json=emb.tolist()
            )
            db.add(sighting)
            db.commit()

            # 6. Retrieve Updated Trajectory
            traj = TrajectoryReconstructor.get_person_trajectory(db, global_person_id)

            processed_results.append({
                "global_person_id": global_person_id,
                "is_new_identity": is_new,
                "reid_similarity": sim_score,
                "confidence": conf,
                "bbox": bbox,
                "camera_id": camera_id,
                "zone_name": zone_name,
                "crop_path": crop_rel_path,
                "trajectory_summary": traj.get("zone_path_summary", "")
            })

        return processed_results

    def search_by_image(
        self,
        db: Session,
        query_image: np.ndarray,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for an individual across all historical camera footage using an uploaded image.
        """
        if query_image is None:
            return []

        # Extract features directly from image or detect person crop first
        detections = self.detector.detect_and_crop(query_image)
        if detections:
            crop = detections[0]["crop"]
        else:
            crop = query_image

        query_emb = self.extractor.extract(crop)

        # Build gallery from database sightings
        sightings = db.query(PersonSighting).filter(PersonSighting.embedding_json.isnot(None)).all()
        gallery = []
        for s in sightings:
            gallery.append({
                "person_id": s.global_person_id,
                "camera_id": s.camera_id,
                "timestamp": s.timestamp.isoformat() if s.timestamp else None,
                "zone_name": s.zone_name,
                "crop_path": s.crop_path,
                "embedding": s.embedding_json
            })

        matches = self.matcher.match_against_gallery(query_emb, gallery, top_k=top_k)
        
        # Enrich matches with full trajectory
        for m in matches:
            traj = TrajectoryReconstructor.get_person_trajectory(db, m["person_id"])
            m["trajectory"] = traj

        return matches
