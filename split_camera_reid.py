import os
import sys
import time
import cv2
import datetime
import numpy as np

# Ensure UTF-8 output encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.db_session import SessionLocal, init_db
from database.models import Camera, GlobalPerson, PersonSighting
from reid_engine.pipeline import MultiCameraReIDPipeline
from reid_engine.tracker import TrajectoryReconstructor
from nl_query_engine.llm_client import UnifiedLLMClient

def run_split_camera_reid():
    """
    Splits the user's webcam feed into two distinct surveillance camera zones:
    - Left Half: CAM_01_GATE_NORTH (Zone A: Perimeter Gate)
    - Right Half: CAM_02_LOBBY (Zone B: Reception Lobby)
    
    Tests Feature 13 Multi-Camera Re-ID:
    When you appear on the left side, you are registered as a person at Gate North.
    When you move to the right side, the Re-ID engine matches your appearance features
    and links your cross-camera trajectory (Gate -> Lobby) in real-time!
    """
    print("=" * 75)
    print(" FEATURE 13: SPLIT-CAMERA MULTI-ZONE PERSON RE-IDENTIFICATION")
    print(" Zone A (Left Half):  CAM_01_GATE_NORTH (Perimeter Gate)")
    print(" Zone B (Right Half): CAM_02_LOBBY (Reception Lobby)")
    print(" (Move from Left to Right in front of your camera to trigger cross-camera Re-ID)")
    print("=" * 75)

    init_db()
    db = SessionLocal()
    pipeline = MultiCameraReIDPipeline()
    llm = UnifiedLLMClient()

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[Error] Could not open camera device 0.")
        return

    frame_count = 0
    last_reported_path = ""

    try:
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                time.sleep(0.1)
                continue

            frame_count += 1
            h, w = frame.shape[:2]
            mid_x = w // 2

            # Split frame into Left (Cam 1) and Right (Cam 2)
            cam1_frame = frame[:, :mid_x].copy()
            cam2_frame = frame[:, mid_x:].copy()

            now = datetime.datetime.utcnow()

            # Process every 4th frame for high performance
            if frame_count % 4 == 0:
                # 1. Ingest into Camera 1 (Left / Gate)
                res1 = pipeline.process_frame(db=db, frame=cam1_frame, camera_id="CAM_01_GATE_NORTH", timestamp=now)
                
                # 2. Ingest into Camera 2 (Right / Lobby)
                res2 = pipeline.process_frame(db=db, frame=cam2_frame, camera_id="CAM_02_LOBBY", timestamp=now)

                all_detections = res1 + res2
                if all_detections:
                    active_pids = set([d["global_person_id"] for d in all_detections])
                    for pid in active_pids:
                        traj = TrajectoryReconstructor.get_person_trajectory(db, pid)
                        path_str = traj.get("zone_path_summary", "")
                        
                        timestamp_str = datetime.datetime.now().strftime("%H:%M:%S")
                        print(f"[{timestamp_str}] 👤 Identity: {pid} | Sightings: {traj.get('total_sightings')}")
                        print(f"   -> Re-ID Zone Trajectory: {path_str}")

                        # Trigger LLM report if person traversed between both camera zones
                        if "->" in path_str and path_str != last_reported_path:
                            last_reported_path = path_str
                            sys_prompt = "You are an AI CCTV operator. Describe the person moving between camera zones in 1 concise, direct sentence."
                            user_prompt = f"Subject {pid} was just re-identified across cameras. Path: {path_str}. Appearance: {traj.get('appearance_description')}."
                            try:
                                alert = llm.generate(sys_prompt, user_prompt)
                                print(f"\n🚨 [CROSS-CAMERA RE-ID ALERT]: {alert.strip()}\n")
                            except Exception:
                                pass

            time.sleep(0.2)

    except KeyboardInterrupt:
        print("\n[Split-Camera Surveillance Stopped]")
    finally:
        cap.release()
        db.close()

if __name__ == "__main__":
    run_split_camera_reid()
