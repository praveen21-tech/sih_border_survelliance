import os
import sys
import time
import cv2
import datetime
import numpy as np
from pathlib import Path

# Ensure UTF-8 output encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import settings
from database.db_session import SessionLocal, init_db
from database.seed_data import seed_surveillance_database
from database.models import Camera, GlobalPerson, PersonSighting, SurveillanceEvent
from reid_engine.pipeline import MultiCameraReIDPipeline
from nl_query_engine.llm_client import UnifiedLLMClient
from nl_query_engine.rag_engine import SurveillanceRAGEngine

def capture_from_camera(camera_index: int = 0, timeout_frames: int = 15):
    """
    Attempts to capture a live frame from local webcam/camera device.
    Falls back to generating a realistic synthetic CCTV test frame if no physical camera is attached.
    """
    print(f"\n[Live Capture] Connecting to Camera Device index {camera_index}...")
    cap = cv2.VideoCapture(camera_index)
    
    frame = None
    if cap.isOpened():
        # Read a few frames to let camera auto-exposure adjust
        for _ in range(timeout_frames):
            ret, tmp = cap.read()
            if ret and tmp is not None:
                frame = tmp
            time.sleep(0.05)
        cap.release()

    if frame is not None and frame.size > 0:
        print(f"[Live Capture] Successfully captured live frame from camera: resolution {frame.shape[1]}x{frame.shape[0]}")
        return frame, "physical_webcam"
    else:
        print("[Live Capture] Physical camera device not accessible or not connected. Creating simulated surveillance camera frame with person...")
        # Create simulated realistic frame with a person figure
        h, w = 480, 640
        sim_frame = np.zeros((h, w, 3), dtype=np.uint8)
        sim_frame[:] = (35, 30, 25) # Dark surveillance background
        
        # Add room details
        cv2.rectangle(sim_frame, (50, 50), (590, 430), (50, 45, 40), -1)
        cv2.putText(sim_frame, "LIVE SURVEILLANCE FEED - CAM_01_GATE", (60, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        # Draw a synthetic human figure (head, body, legs)
        # Head
        cv2.circle(sim_frame, (320, 160), 30, (200, 180, 160), -1)
        # Torso (Blue jacket)
        cv2.rectangle(sim_frame, (280, 190), (360, 320), (180, 100, 40), -1)
        # Legs (Dark trousers)
        cv2.rectangle(sim_frame, (285, 320), (315, 410), (60, 50, 50), -1)
        cv2.rectangle(sim_frame, (325, 320), (355, 410), (60, 50, 50), -1)

        return sim_frame, "simulated_cctv_frame"

def capture_and_analyze_live(camera_id: str = "CAM_01_GATE_NORTH", custom_query: str = None):
    """
    1. Captures live frame from camera.
    2. Runs Feature 13: Detects persons, extracts 512-d Re-ID embedding, assigns/matches GlobalPerson ID.
    3. Runs Feature 12: Performs Natural Language Intelligence analysis on the newly ingested sighting.
    """
    settings.ensure_directories()
    init_db()
    seed_surveillance_database()
    db = SessionLocal()

    # 1. Capture live frame
    frame, source_type = capture_from_camera()

    # Ensure camera node exists in DB
    cam = db.query(Camera).filter(Camera.id == camera_id).first()
    if not cam:
        cam = Camera(
            id=camera_id,
            name="Live Captured Feed Node",
            location="Building Main Entry",
            zone="Perimeter Access",
            is_active=True
        )
        db.add(cam)
        db.commit()

    # 2. Ingest into Multi-Camera Re-ID Pipeline (Feature 13)
    print(f"\n[Feature 13] Running Multi-Camera Person Detection & Re-ID on live frame...")
    pipeline = MultiCameraReIDPipeline()
    now = datetime.datetime.utcnow()
    detections = pipeline.process_frame(db=db, frame=frame, camera_id=camera_id, timestamp=now)

    print(f" -> Detections Processed: {len(detections)}")
    for d in detections:
        print(f"    * Assigned Global Person ID: {d['global_person_id']} (New Identity: {d['is_new_identity']})")
        print(f"    * Re-ID Similarity Score: {d['reid_similarity']*100:.1f}%")
        print(f"    * Detection Confidence: {d['confidence']*100:.1f}%")
        print(f"    * Trajectory Path: {d['trajectory_summary']}")
        print(f"    * Saved Evidence Crop: {d['crop_path']}")

    # 3. Analyze with Natural Language Query Engine (Feature 12)
    print(f"\n[Feature 12] Running AI Surveillance Intelligence Analysis on live sighting...")
    llm = UnifiedLLMClient()
    rag_engine = SurveillanceRAGEngine(llm_client=llm)

    if not custom_query:
        if detections:
            person_id = detections[0]["global_person_id"]
            query = f"A person was just detected on camera {camera_id}. Identify who this is ({person_id}), summarize their movement path across all CCTV zones, and assess any security risk."
        else:
            query = f"Analyze all recent surveillance events and camera activity on {camera_id}."
    else:
        query = custom_query

    print(f" -> Operator Query: \"{query}\"")
    result = rag_engine.process_query(db=db, user_query=query)

    print("\n" + "=" * 75)
    print(" LIVE SURVEILLANCE INTELLIGENCE REPORT")
    print("=" * 75)
    print(f"Intent Classified: {result['intent']}")
    print(f"Generated SQL: {result['generated_sql']}")
    print(f"Records Found: {result['sql_results_count']}")
    if result.get("trajectory"):
        print(f"Movement Trajectory: {result['trajectory'].get('zone_path_summary')}")
    print("\n[AI Intelligence Brief]:")
    print(result['response'])
    print("=" * 75)

    db.close()
    return result

if __name__ == "__main__":
    query_arg = sys.argv[1] if len(sys.argv) > 1 else None
    capture_and_analyze_live(custom_query=query_arg)
