import os
import sys
import glob

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from video_analyzer import VideoIntelligenceEngine

def ingest_existing_videos():
    engine = VideoIntelligenceEngine()
    video_files = sorted(glob.glob("*.mp4"))

    print("=" * 70)
    print(f" BATCH INGESTING {len(video_files)} VIDEO RECORDINGS FOR FEATURE 13 RE-ID")
    print("=" * 70)

    camera_map = [
        "CAM_01_GATE_NORTH",
        "CAM_02_LOBBY",
        "CAM_03_CORRIDOR_1F",
        "CAM_04_SERVER_ROOM",
        "CAM_05_PARKING_WEST"
    ]

    summaries = []
    for idx, vfile in enumerate(video_files):
        cam_id = camera_map[idx % len(camera_map)]
        print(f"\nProcessing [{idx+1}/{len(video_files)}]: '{vfile}' -> Assigned to Camera: {cam_id}")
        summary = engine.process_video_file(vfile, camera_id=cam_id, sample_rate_sec=0.8)
        summaries.append(summary)

    print("\n" + "=" * 70)
    print(" ALL VIDEO RECORDINGS SUCCESSFULLY INGESTED & INDEXED!")
    print(" You can now drag any video file in the UI or ask questions about them!")
    print("=" * 70)

if __name__ == "__main__":
    ingest_existing_videos()
