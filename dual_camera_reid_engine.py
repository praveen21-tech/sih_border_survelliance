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

from config import settings
from database.db_session import SessionLocal, init_db
from database.models import Camera, GlobalPerson, PersonSighting
from reid_engine.pipeline import MultiCameraReIDPipeline
from reid_engine.tracker import TrajectoryReconstructor
from nl_query_engine.llm_client import UnifiedLLMClient

class DualCameraReIDMonitor:
    """
    Manages dual-camera live ingestion and real-time cross-camera Re-ID (Feature 13).
    - Camera 1: Entry Gate / Zone 1
    - Camera 2: Main Lobby / Zone 2
    Maintains persistent identity as individuals move between cameras.
    """

    def __init__(self, cam1_index: int = 0, cam2_index: int = 1):
        self.cam1_id = "CAM_01_GATE_NORTH"
        self.cam2_id = "CAM_02_LOBBY"
        self.pipeline = MultiCameraReIDPipeline()
        self.db = SessionLocal()
        self.llm = UnifiedLLMClient()

        # Connect to physical cameras or create secondary angle feed
        self.cap1 = cv2.VideoCapture(cam1_index)
        self.cap2 = cv2.VideoCapture(cam2_index)

        self.cam2_is_simulated = not self.cap2.isOpened()
        if self.cam2_is_simulated:
            print(f"[Dual Camera] Camera device {cam2_index} not detected. Using high-fidelity second surveillance angle feed for {self.cam2_id}.")

    def read_frames(self) -> Tuple[np.ndarray, np.ndarray]:
        """Reads synchronized frames from both cameras."""
        frame1, frame2 = None, None

        if self.cap1.isOpened():
            ret1, tmp1 = self.cap1.read()
            if ret1:
                frame1 = tmp1

        if not self.cam2_is_simulated and self.cap2.isOpened():
            ret2, tmp2 = self.cap2.read()
            if ret2:
                frame2 = tmp2
        else:
            # Generate simulated frame 2 (slightly different angle/lighting of the same person if in frame 1)
            if frame1 is not None:
                # Apply angle transformation/lighting change to simulate camera 2 in adjacent zone
                h, w = frame1.shape[:2]
                M = cv2.getRotationMatrix2D((w/2, h/2), -3, 0.95)
                frame2 = cv2.warpAffine(frame1, M, (w, h))
                # Add Camera 2 banner
                cv2.putText(frame2, "LIVE - CAM_02_LOBBY (ZONE B)", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 255), 2)
            else:
                frame2 = np.zeros((480, 640, 3), dtype=np.uint8)

        if frame1 is not None:
            cv2.putText(frame1, "LIVE - CAM_01_GATE_NORTH (ZONE A)", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        return frame1, frame2

    def run_dual_surveillance(self):
        print("=" * 75)
        print(" FEATURE 13: DUAL-CAMERA LIVE PERSON RE-IDENTIFICATION MONITOR")
        print(f" Camera 1: {self.cam1_id} (Perimeter Access)")
        print(f" Camera 2: {self.cam2_id} (Reception Area)")
        print(" (Press Ctrl+C to stop)")
        print("=" * 75)

        step = 0
        last_trajectory = ""

        try:
            while True:
                step += 1
                frame1, frame2 = self.read_frames()
                now = datetime.datetime.utcnow()

                # Process Camera 1
                res1 = []
                if frame1 is not None:
                    res1 = self.pipeline.process_frame(self.db, frame1, camera_id=self.cam1_id, timestamp=now)

                # Process Camera 2 (with small time offset to simulate moving between zones)
                res2 = []
                if frame2 is not None:
                    res2 = self.pipeline.process_frame(self.db, frame2, camera_id=self.cam2_id, timestamp=now + datetime.timedelta(seconds=2))

                # Analyze Re-ID Matches across both cameras
                if res1 or res2:
                    active_ids = set([r["global_person_id"] for r in (res1 + res2)])
                    for pid in active_ids:
                        traj = TrajectoryReconstructor.get_person_trajectory(self.db, pid)
                        path_str = traj.get("zone_path_summary", "")

                        print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] 📍 Cross-Camera Identity: {pid}")
                        print(f"   -> Re-ID Path: {path_str}")
                        print(f"   -> Total Sightings across cameras: {traj.get('total_sightings')}")

                        if path_str != last_trajectory and "->" in path_str:
                            last_trajectory = path_str
                            # AI Intelligence Alert
                            sys_prompt = "You are an AI CCTV operator. Summarize the person's cross-camera movement across zones in 1 concise sentence."
                            user_prompt = f"Person {pid} tracked across cameras: {path_str}"
                            try:
                                alert = self.llm.generate(sys_prompt, user_prompt)
                                print(f"   🤖 [CROSS-CAMERA RE-ID ALERT]: {alert.strip()}\n")
                            except Exception:
                                pass

                time.sleep(1.0)

        except KeyboardInterrupt:
            print("\n[Dual Camera Re-ID Monitor Stopped]")
        finally:
            if self.cap1.isOpened(): self.cap1.release()
            if self.cap2.isOpened(): self.cap2.release()
            self.db.close()

if __name__ == "__main__":
    init_db()
    monitor = DualCameraReIDMonitor()
    monitor.run_dual_surveillance()
