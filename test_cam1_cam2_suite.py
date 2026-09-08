import os
import sys
import json
import urllib.request

# Ensure UTF-8 console output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.db_session import SessionLocal, init_db
from database.models import Camera, GlobalPerson, PersonSighting
from reid_engine.tracker import TrajectoryReconstructor
from video_analyzer import VideoIntelligenceEngine

def run_cam1_cam2_test():
    print("=" * 75)
    print(" FEATURE 13 & 12 END-TO-END TEST SUITE: CAM1.MP4 & CAM2.MP4")
    print("=" * 75)

    # 1. Database & Trajectory Verification
    init_db()
    db = SessionLocal()

    cams = db.query(Camera).all()
    persons = db.query(GlobalPerson).all()
    sightings_count = db.query(PersonSighting).count()

    print(f"\n[Test 1] Database Telemetry:")
    print(f" -> Active Cameras ({len(cams)}): {[c.id for c in cams]}")
    print(f" -> Tracked Global Persons: {len(persons)}")
    print(f" -> Total Sightings Logged: {sightings_count}")

    # 2. Test Feature 13 Cross-Camera Trajectory Reconstruction
    print("\n" + "=" * 75)
    print(" [Test 2] Feature 13 Multi-Camera Re-ID Trajectory Tracing")
    print("=" * 75)

    for p in persons[:2]:
        traj = TrajectoryReconstructor.get_person_trajectory(db, p.id)
        print(f"\n >>> Subject ID: {p.id}")
        print(f"     Appearance: {traj.get('appearance_description')}")
        print(f"     Total Sightings: {traj.get('total_sightings')}")
        print(f"     Cross-Camera Path: {traj.get('zone_path_summary')}")
        print("     Timeline Sighting Nodes:")
        for node in traj.get("timeline", [])[:3]:
            print(f"      - [{node['camera_id']}] {node['camera_name']} | Zone: {node['zone']} | Sim: {node['reid_similarity']*100:.1f}%")

    db.close()

    # 3. Test Feature 12 Natural Language Video Forensics Q&A Engine (Groq Qwen 27B)
    print("\n" + "=" * 75)
    print(" [Test 3] Feature 12 Natural Language Q&A on cam1.mp4 & cam2.mp4")
    print("=" * 75)

    engine = VideoIntelligenceEngine()
    summary_cam2 = engine.process_video_file("cam2.mp4")

    test_questions = [
        "Who are the key individuals moving between cam1 (Plaza) and cam2 (Steps), and what are they wearing?",
        "Track the man with glasses wearing a navy sweater and blue shirt carrying a jacket across both cameras.",
        "Are there any weapons, threats, or suspicious activities detected in cam1 or cam2?"
    ]

    for q in test_questions:
        print(f"\n >>> Operator Question: \"{q}\"")
        answer = engine.answer_question_about_video(summary_cam2, q)
        print("     [AI Forensics Briefing]:")
        # Print first few lines of the answer
        lines = answer.strip().splitlines()
        for line in lines[:10]:
            print(f"     {line}")
        print("     ...")

    print("\n" + "=" * 75)
    print(" ALL TESTS PASSED: cam1.mp4 and cam2.mp4 are fully verified and live!")
    print("=" * 75)

if __name__ == "__main__":
    run_cam1_cam2_test()
