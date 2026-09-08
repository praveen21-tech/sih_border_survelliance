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
from database.models import Camera, GlobalPerson, PersonSighting, SurveillanceEvent
from reid_engine.pipeline import MultiCameraReIDPipeline
from realtime_threat_engine import RealTimeThreatAndExpressionEngine
from nl_query_engine.llm_client import UnifiedLLMClient

def run_continuous_live_surveillance(camera_id: str = "CAM_01_GATE_NORTH"):
    """
    Runs continuous, non-stop surveillance on the live camera feed.
    Tracks facial expressions, actions (e.g. taking a gun, angry, gestures), and identity.
    Does not stop until interrupted by user.
    """
    print("=" * 70)
    print(" CONTINUOUS LIVE AI SURVEILLANCE & THREAT DETECTION STREAM")
    print(" Monitoring: Face Expressions, Hostility, Weapon/Gun Gestures, Actions")
    print(" (Runs continuously. Press Ctrl+C in terminal to stop)")
    print("=" * 70)

    init_db()
    db = SessionLocal()
    pipeline = MultiCameraReIDPipeline()
    threat_engine = RealTimeThreatAndExpressionEngine()
    llm = UnifiedLLMClient()

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[Error] Cannot connect to camera device 0.")
        return

    prev_gray = None
    frame_counter = 0
    last_llm_time = 0
    last_state = ""

    try:
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                time.sleep(0.1)
                continue

            frame_counter += 1

            # 1. Analyze Frame for Expressions and Threats
            analysis = threat_engine.analyze_frame(frame, prev_gray=prev_gray)
            prev_gray = analysis.get("current_gray")

            expression = analysis["expression"]
            threat_action = analysis["threat_action"]
            threat_level = analysis["threat_level"]
            person_detected = analysis["person_detected"]

            # Current state summary string
            current_state = f"Person: {person_detected} | Expr: {expression} | Action: {threat_action} | Threat: {threat_level}"

            # 2. Process through Re-ID Pipeline every 10 frames
            global_person_id = "N/A"
            if person_detected and frame_counter % 10 == 0:
                results = pipeline.process_frame(db=db, frame=frame, camera_id=camera_id)
                if results:
                    global_person_id = results[0]["global_person_id"]

            # 3. Print Live Real-Time Console Status
            timestamp_str = datetime.datetime.now().strftime("%H:%M:%S")
            alert_prefix = "🚨 [CRITICAL ALERT]" if threat_level == "CRITICAL" else ("⚠️ [WARNING]" if threat_level in ("HIGH", "MEDIUM") else "🟢 [NORMAL]")
            print(f"[{timestamp_str}] {alert_prefix} Expression: {expression} | Action: {threat_action} | Threat: {threat_level}")

            # 4. Trigger Groq LLM Human-Language Description when state changes or on threat
            now_time = time.time()
            if (current_state != last_state and (now_time - last_llm_time) > 4.0) or threat_level in ("CRITICAL", "HIGH"):
                last_state = current_state
                last_llm_time = now_time

                system_prompt = """
You are a live security surveillance analyst watching a CCTV camera feed.
Describe what the person in front of the camera is doing in 1-2 concise, clear sentences of natural human language.
Highlight their expression (e.g. angry, calm, smiling), and any notable actions or gestures (e.g. taking out/pointing a gun, raising hands, staring intently at the camera).
"""
                user_prompt = f"""
Current Live Camera Telemetry:
- Person in View: {person_detected}
- Facial Expression: {expression}
- Detected Action / Posture: {threat_action}
- Threat Level: {threat_level}
- Details: {analysis.get('threat_details', [])}
- Motion Score: {analysis['motion_intensity']}

Tell the operator what is happening right now in plain, direct human language:
"""
                try:
                    human_narrative = llm.generate(system_prompt, user_prompt).strip()
                    print("\n" + "-" * 60)
                    print(f"🤖 [AI LIVE OBSERVATION]: {human_narrative}")
                    print("-" * 60 + "\n")
                except Exception as e:
                    print(f"LLM synthesis notice: {e}")

            time.sleep(0.3)

    except KeyboardInterrupt:
        print("\n[Surveillance Stream Stopped by Operator]")
    finally:
        cap.release()
        db.close()

if __name__ == "__main__":
    run_continuous_live_surveillance()
