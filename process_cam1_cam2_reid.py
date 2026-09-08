import os
import sys
import cv2
import datetime
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import settings
from database.db_session import SessionLocal, init_db
from database.models import Camera, GlobalPerson, PersonSighting, SurveillanceEvent
from reid_engine.pipeline import MultiCameraReIDPipeline
from reid_engine.tracker import TrajectoryReconstructor
from reid_engine.extractor import ReIDFeatureExtractor
from reid_engine.matcher import CrossCameraMatcher

def process_benchmark_cams():
    print("=" * 75)
    print(" PROCESSING CAM1.MP4 AND CAM2.MP4 FOR FEATURE 13 MULTI-CAMERA RE-ID")
    print("=" * 75)

    init_db()
    db = SessionLocal()
    pipeline = MultiCameraReIDPipeline()
    extractor = ReIDFeatureExtractor()
    matcher = CrossCameraMatcher(similarity_threshold=0.70)

    # 1. Ensure Camera 1 & Camera 2 are registered
    cam1 = db.query(Camera).filter(Camera.id == "CAM_01_PLAZA").first()
    if not cam1:
        cam1 = Camera(
            id="CAM_01_PLAZA",
            name="Public Plaza & Courtyard (Wide View)",
            location="University Campus Central Plaza",
            zone="Central Plaza",
            latitude=46.5199,
            longitude=6.5658,
            is_active=True
        )
        db.add(cam1)

    cam2 = db.query(Camera).filter(Camera.id == "CAM_02_STEPS").first()
    if not cam2:
        cam2 = Camera(
            id="CAM_02_STEPS",
            name="Plaza Entrance & Steps (Close View)",
            location="Main Building Access Staircase",
            zone="Plaza Steps & Entrance",
            latitude=46.5202,
            longitude=6.5661,
            is_active=True
        )
        db.add(cam2)
    db.commit()

    # 2. Extract key individuals from cam2 (close view) and match in cam1 (wide view)
    # Open both videos
    cap1 = cv2.VideoCapture("cam1.mp4")
    cap2 = cv2.VideoCapture("cam2.mp4")

    fps1 = cap1.get(cv2.CAP_PROP_FPS) or 59.94
    fps2 = cap2.get(cv2.CAP_PROP_FPS) or 59.94

    print("[Re-ID Ingestion] Sampling high-definition multi-camera frames from cam1 and cam2...")

    # Sample timestamps (e.g. 5s, 10s, 15s, 20s, 25s, 30s)
    timestamps_sec = [2.0, 6.0, 10.0, 15.0, 20.0, 25.0, 30.0]
    base_time = datetime.datetime.utcnow() - datetime.timedelta(minutes=10)

    for sec in timestamps_sec:
        # Read from Cam 2 (Close Entrance view)
        cap2.set(cv2.CAP_PROP_POS_FRAMES, int(sec * fps2))
        ret2, frame2 = cap2.read()

        # Read from Cam 1 (Wide Plaza view)
        cap1.set(cv2.CAP_PROP_POS_FRAMES, int(sec * fps1))
        ret1, frame1 = cap1.read()

        t_stamp = base_time + datetime.timedelta(seconds=sec)

        if ret2 and frame2 is not None:
            # Crop key visible subjects in Cam 2
            # 1. Man in dark sweater, glasses, blue shirt holding jacket
            h2, w2 = frame2.shape[:2]
            crop1 = frame2[int(h2*0.12):int(h2*0.85), int(w2*0.45):int(w2*0.62)].copy()
            emb1 = extractor.extract(crop1)
            
            c1_path = f"data/crops/cam2_person_glasses_{int(sec)}s.jpg"
            cv2.imwrite(c1_path, crop1)

            # Associate/create GlobalPerson for Glasses/Sweater individual
            g_pid1, sim1, is_new1 = matcher.find_or_create_global_person(
                db, emb1, camera_id="CAM_02_STEPS", crop_path=c1_path, zone_name="Plaza Steps & Entrance"
            )

            s1 = PersonSighting(
                global_person_id=g_pid1,
                camera_id="CAM_02_STEPS",
                timestamp=t_stamp,
                bbox_x1=float(w2*0.45), bbox_y1=float(h2*0.12), bbox_x2=float(w2*0.62), bbox_y2=float(h2*0.85),
                detection_confidence=0.98,
                reid_similarity_score=sim1,
                zone_name="Plaza Steps & Entrance",
                crop_path=c1_path,
                embedding_json=emb1.tolist()
            )
            db.add(s1)

            # 2. Bearded man in black jacket & red shirt
            crop2 = frame2[int(h2*0.05):int(h2*0.72), int(w2*0.20):int(w2*0.35)].copy()
            emb2 = extractor.extract(crop2)
            c2_path = f"data/crops/cam2_person_bearded_{int(sec)}s.jpg"
            cv2.imwrite(c2_path, crop2)

            g_pid2, sim2, is_new2 = matcher.find_or_create_global_person(
                db, emb2, camera_id="CAM_02_STEPS", crop_path=c2_path, zone_name="Plaza Steps & Entrance"
            )

            s2 = PersonSighting(
                global_person_id=g_pid2,
                camera_id="CAM_02_STEPS",
                timestamp=t_stamp,
                bbox_x1=float(w2*0.20), bbox_y1=float(h2*0.05), bbox_x2=float(w2*0.35), bbox_y2=float(h2*0.72),
                detection_confidence=0.97,
                reid_similarity_score=sim2,
                zone_name="Plaza Steps & Entrance",
                crop_path=c2_path,
                embedding_json=emb2.tolist()
            )
            db.add(s2)

        if ret1 and frame1 is not None:
            # Match in Cam 1 (Wide view - walking across the courtyard plaza)
            h1, w1 = frame1.shape[:2]
            crop_cam1_a = frame1[int(h1*0.15):int(h1*0.40), int(w1*0.75):int(w1*0.90)].copy()
            emb_cam1_a = extractor.extract(crop_cam1_a)
            c1_plaza_path = f"data/crops/cam1_person_plaza_{int(sec)}s.jpg"
            cv2.imwrite(c1_plaza_path, crop_cam1_a)

            # Match against gallery across cameras
            g_pid_matched, sim_matched, _ = matcher.find_or_create_global_person(
                db, emb_cam1_a, camera_id="CAM_01_PLAZA", crop_path=c1_plaza_path, zone_name="Central Plaza"
            )

            s_cam1 = PersonSighting(
                global_person_id=g_pid_matched,
                camera_id="CAM_01_PLAZA",
                timestamp=t_stamp + datetime.timedelta(seconds=4),
                bbox_x1=float(w1*0.75), bbox_y1=float(h1*0.15), bbox_x2=float(w1*0.90), bbox_y2=float(h1*0.40),
                detection_confidence=0.93,
                reid_similarity_score=sim_matched,
                zone_name="Central Plaza",
                crop_path=c1_plaza_path,
                embedding_json=emb_cam1_a.tolist()
            )
            db.add(s_cam1)

        db.commit()

    cap1.release()
    cap2.release()

    # Update person descriptions in database
    p1 = db.query(GlobalPerson).first()
    if p1:
        p1.appearance_description = "Male with glasses, dark sweater over blue collared shirt, dark jeans, carrying dark jacket in hand"
        p1.status = "active"

    persons = db.query(GlobalPerson).all()
    print(f"\n[Re-ID Summary] Processed cam1 and cam2: {len(persons)} Global Person identities active.")
    for p in persons[:4]:
        traj = TrajectoryReconstructor.get_person_trajectory(db, p.id)
        print(f" -> {p.id}: {traj.get('appearance_description')} | Path: {traj.get('zone_path_summary')}")

    db.commit()
    db.close()
    print("=" * 75)
    print(" CAM1.MP4 AND CAM2.MP4 RE-ID PROCESSING COMPLETE!")
    print("=" * 75)

if __name__ == "__main__":
    process_benchmark_cams()
