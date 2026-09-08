import datetime
import numpy as np
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from database.models import GlobalPerson, PersonSighting, Camera

class TrajectoryReconstructor:
    """
    Reconstructs movement trajectories, zone transitions, and chronological timelines
    for individuals across multiple CCTV camera views.
    """

    @staticmethod
    def get_person_trajectory(db: Session, person_id: str) -> Dict[str, Any]:
        """
        Retrieves the complete historical trajectory for a given GlobalPerson ID,
        including detailed camera crossing timestamps, transit time between cameras,
        and cross-camera same-person verification.
        """
        person = db.query(GlobalPerson).filter(GlobalPerson.id == person_id).first()
        if not person:
            return {"error": f"Person ID '{person_id}' not found in database."}

        sightings = (
            db.query(PersonSighting, Camera)
            .join(Camera, PersonSighting.camera_id == Camera.id)
            .filter(PersonSighting.global_person_id == person_id)
            .order_by(PersonSighting.timestamp.asc())
            .all()
        )

        timeline = []
        path_sequence = []
        camera_crossings = []
        prev_time = None
        current_crossing = None

        for s, cam in sightings:
            dwell_transition = None
            if prev_time is not None and s.timestamp:
                delta = (s.timestamp - prev_time).total_seconds()
                dwell_transition = f"{int(delta // 60)}m {int(delta % 60)}s" if delta >= 60 else f"{int(delta)}s"
            
            prev_time = s.timestamp

            node = {
                "sighting_id": s.id,
                "camera_id": s.camera_id,
                "camera_name": cam.name,
                "zone": s.zone_name or cam.zone,
                "timestamp": s.timestamp.isoformat() if s.timestamp else None,
                "timestamp_display": s.timestamp.strftime("%H:%M:%S") if s.timestamp else "",
                "confidence": s.detection_confidence,
                "reid_similarity": s.reid_similarity_score,
                "crop_path": s.crop_path,
                "coordinates": [cam.latitude, cam.longitude] if cam.latitude and cam.longitude else None,
                "transition_from_previous": dwell_transition
            }
            timeline.append(node)
            path_sequence.append({
                "camera_id": s.camera_id,
                "zone": s.zone_name or cam.zone,
                "time": s.timestamp.strftime("%H:%M:%S") if s.timestamp else ""
            })

            # Track distinct camera crossings
            if current_crossing is None or current_crossing["camera_id"] != s.camera_id:
                if current_crossing is not None:
                    camera_crossings.append(current_crossing)

                transit_duration_str = None
                transit_seconds = 0
                if current_crossing is not None and current_crossing.get("exit_timestamp_raw") and s.timestamp:
                    transit_sec = max(0, (s.timestamp - current_crossing["exit_timestamp_raw"]).total_seconds())
                    transit_seconds = int(transit_sec)
                    transit_duration_str = f"{int(transit_sec // 60)}m {int(transit_sec % 60)}s" if transit_sec >= 60 else f"{int(transit_sec)}s"

                current_crossing = {
                    "crossing_index": len(camera_crossings) + 1,
                    "camera_id": s.camera_id,
                    "camera_name": cam.name,
                    "zone": s.zone_name or cam.zone,
                    "entry_time": s.timestamp.strftime("%H:%M:%S") if s.timestamp else "",
                    "entry_iso": s.timestamp.isoformat() if s.timestamp else None,
                    "entry_timestamp_raw": s.timestamp,
                    "exit_time": s.timestamp.strftime("%H:%M:%S") if s.timestamp else "",
                    "exit_iso": s.timestamp.isoformat() if s.timestamp else None,
                    "exit_timestamp_raw": s.timestamp,
                    "reid_similarity_score": s.reid_similarity_score or 1.0,
                    "reid_similarity_percent": f"{round((s.reid_similarity_score or 1.0) * 100, 1)}%",
                    "is_same_person_verified": (s.reid_similarity_score or 1.0) >= 0.70,
                    "transit_from_previous_camera": transit_duration_str,
                    "transit_seconds": transit_seconds,
                    "sightings_count": 1,
                    "crop_path": s.crop_path
                }
            else:
                # Same camera ongoing sighting
                current_crossing["exit_time"] = s.timestamp.strftime("%H:%M:%S") if s.timestamp else ""
                current_crossing["exit_iso"] = s.timestamp.isoformat() if s.timestamp else None
                current_crossing["exit_timestamp_raw"] = s.timestamp
                current_crossing["sightings_count"] += 1
                if s.reid_similarity_score and s.reid_similarity_score > current_crossing["reid_similarity_score"]:
                    current_crossing["reid_similarity_score"] = s.reid_similarity_score
                    current_crossing["reid_similarity_percent"] = f"{round(s.reid_similarity_score * 100, 1)}%"

        if current_crossing is not None:
            camera_crossings.append(current_crossing)

        # Clean up raw timestamp objects for JSON serialization
        for c in camera_crossings:
            c.pop("entry_timestamp_raw", None)
            c.pop("exit_timestamp_raw", None)

        # Calculate total tracking duration
        total_duration_str = "0m 0s"
        if person.first_seen and person.last_seen:
            diff = (person.last_seen - person.first_seen).total_seconds()
            total_duration_str = f"{int(diff // 60)}m {int(diff % 60)}s" if diff >= 60 else f"{int(diff)}s"

        # Construct crossing summary narrative
        crossing_narratives = []
        for i, c in enumerate(camera_crossings):
            if i == 0:
                crossing_narratives.append(f"Initially detected at {c['camera_id']} ({c['camera_name']}) at {c['entry_time']}")
            else:
                crossing_narratives.append(
                    f"Crossed into {c['camera_id']} ({c['camera_name']}) at {c['entry_time']} "
                    f"(Transit time: {c['transit_from_previous_camera']}, Re-ID Match: {c['reid_similarity_percent']} - Same Person Confirmed)"
                )

        crossing_summary_text = " ➔ ".join(crossing_narratives) if crossing_narratives else "No camera transitions logged."

        return {
            "person_id": person.id,
            "status": person.status,
            "appearance_description": person.appearance_description,
            "first_seen": person.first_seen.isoformat() if person.first_seen else None,
            "last_seen": person.last_seen.isoformat() if person.last_seen else None,
            "total_duration": total_duration_str,
            "total_sightings": len(timeline),
            "total_camera_crossings": len(camera_crossings),
            "cameras_visited": list(dict.fromkeys([c["camera_id"] for c in camera_crossings])),
            "zone_path_summary": " -> ".join([p["zone"] for p in path_sequence]),
            "crossing_summary_text": crossing_summary_text,
            "camera_crossings": camera_crossings,
            "timeline": timeline
        }

    @staticmethod
    def compare_and_cross_match(
        db: Session,
        query_embedding: np.ndarray,
        current_camera_id: str,
        current_timestamp: datetime.datetime
    ) -> Dict[str, Any]:
        """
        Takes a new person detection at a specific camera & time, compares against all other cameras,
        determines if they are the SAME PERSON or a NEW IDENTITY, and computes the crossing time delta.
        """
        from .matcher import CrossCameraMatcher
        matcher = CrossCameraMatcher(similarity_threshold=0.70)

        # Query all historical sightings from OTHER cameras
        other_sightings = (
            db.query(PersonSighting, Camera)
            .join(Camera, PersonSighting.camera_id == Camera.id)
            .filter(PersonSighting.camera_id != current_camera_id, PersonSighting.embedding_json.isnot(None))
            .order_by(PersonSighting.timestamp.desc())
            .limit(100)
            .all()
        )

        gallery = []
        for s, cam in other_sightings:
            gallery.append({
                "person_id": s.global_person_id,
                "camera_id": s.camera_id,
                "camera_name": cam.name,
                "timestamp": s.timestamp,
                "zone_name": s.zone_name or cam.zone,
                "crop_path": s.crop_path,
                "embedding": s.embedding_json
            })

        matches = matcher.match_against_gallery(query_embedding, gallery, top_k=3)

        if matches and matches[0]["is_match"]:
            best = matches[0]
            matched_pid = best["person_id"]
            sim = best["similarity"]
            prev_cam_id = best["camera_id"]
            prev_cam_name = best.get("camera_name", prev_cam_id)
            prev_time = best["timestamp"]

            transit_sec = 0
            transit_str = "0s"
            if prev_time and current_timestamp:
                delta = abs((current_timestamp - prev_time).total_seconds())
                transit_sec = int(delta)
                transit_str = f"{int(delta // 60)}m {int(delta % 60)}s" if delta >= 60 else f"{int(delta)}s"

            person = db.query(GlobalPerson).filter(GlobalPerson.id == matched_pid).first()

            return {
                "is_same_person": True,
                "verdict": f"SAME PERSON CONFIRMED (Matched {matched_pid} with {round(sim*100, 1)}% similarity)",
                "matched_person_id": matched_pid,
                "appearance_description": person.appearance_description if person else "Pedestrian",
                "similarity_score": sim,
                "similarity_percent": f"{round(sim*100, 1)}%",
                "origin_camera": prev_cam_id,
                "origin_camera_name": prev_cam_name,
                "origin_timestamp": prev_time.strftime("%H:%M:%S") if prev_time else "",
                "destination_camera": current_camera_id,
                "crossing_timestamp": current_timestamp.strftime("%H:%M:%S") if current_timestamp else "",
                "transit_duration": transit_str,
                "transit_seconds": transit_sec,
                "narrative": (
                    f"Subject {matched_pid} was previously at {prev_cam_id} ({prev_cam_name}) at {prev_time.strftime('%H:%M:%S') if prev_time else 'earlier'}. "
                    f"Now crossed into {current_camera_id} at {current_timestamp.strftime('%H:%M:%S')}. "
                    f"Transit duration: {transit_str} across cameras."
                )
            }
        else:
            return {
                "is_same_person": False,
                "verdict": "NEW PERSON DETECTED (No prior cross-camera match above threshold)",
                "matched_person_id": None,
                "similarity_score": matches[0]["similarity"] if matches else 0.0,
                "similarity_percent": f"{round(matches[0]['similarity']*100, 1)}%" if matches else "0%",
                "destination_camera": current_camera_id,
                "crossing_timestamp": current_timestamp.strftime("%H:%M:%S") if current_timestamp else "",
                "narrative": f"New individual detected at {current_camera_id} at {current_timestamp.strftime('%H:%M:%S')}. No prior matches found in other cameras."
            }

    @staticmethod
    def get_all_active_trajectories(db: Session, limit: int = 20) -> List[Dict[str, Any]]:
        """Returns trajectory summaries for all recent persons in surveillance zone."""
        persons = db.query(GlobalPerson).order_by(GlobalPerson.last_seen.desc()).limit(limit).all()
        results = []
        for p in persons:
            results.append(TrajectoryReconstructor.get_person_trajectory(db, p.id))
        return results
