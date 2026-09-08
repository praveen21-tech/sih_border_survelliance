import cv2
import datetime
import numpy as np
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..database.db_session import get_db
from ..database.models import GlobalPerson, Camera, PersonSighting
from ..vision.reid.pipeline import MultiCameraReIDPipeline
from ..vision.reid.tracker import TrajectoryReconstructor

router = APIRouter(prefix='/api/v1/reid', tags=['Feature 13 - Multi-Camera Re-ID'])
reid_pipeline = MultiCameraReIDPipeline()

@router.get('/cameras')
def list_cameras(db: Session = Depends(get_db)):
    cameras = db.query(Camera).all()
    return [{'id': c.id, 'name': c.name, 'location': c.location, 'zone': c.zone, 'is_active': c.is_active} for c in cameras]

@router.get('/persons')
def list_global_persons(limit: int = 50, db: Session = Depends(get_db)):
    persons = db.query(GlobalPerson).order_by(GlobalPerson.last_seen.desc()).limit(limit).all()
    return [{
        'id': p.id,
        'first_seen': p.first_seen.isoformat() if p.first_seen else None,
        'last_seen': p.last_seen.isoformat() if p.last_seen else None,
        'appearance_description': p.appearance_description,
        'best_crop_path': p.best_crop_path,
        'total_sightings': p.total_sightings,
        'status': p.status
    } for p in persons]

@router.get('/trajectory/{person_id}')
def get_trajectory(person_id: str, db: Session = Depends(get_db)):
    trajectory = TrajectoryReconstructor.get_person_trajectory(db, person_id)
    if 'error' in trajectory:
        raise HTTPException(status_code=404, detail=trajectory['error'])
    return trajectory

@router.get('/crossings/{person_id}')
def get_person_crossings(person_id: str, db: Session = Depends(get_db)):
    traj = TrajectoryReconstructor.get_person_trajectory(db, person_id)
    if 'error' in traj:
        raise HTTPException(status_code=404, detail=traj['error'])
    return {
        'person_id': traj['person_id'],
        'appearance_description': traj.get('appearance_description'),
        'total_camera_crossings': traj.get('total_camera_crossings', 0),
        'total_duration': traj.get('total_duration'),
        'crossing_summary_text': traj.get('crossing_summary_text'),
        'camera_crossings': traj.get('camera_crossings', [])
    }

@router.get('/trajectories')
def get_all_trajectories(limit: int = 25, db: Session = Depends(get_db)):
    return TrajectoryReconstructor.get_all_active_trajectories(db, limit=limit)

@router.post('/verify-cross-camera')
async def verify_new_person_cross_camera(
    camera_id: str = Form('CAM_01_PLAZA'),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail='Invalid image file.')

    detections = reid_pipeline.detector.detect_and_crop(img)
    crop = detections[0]['crop'] if detections else img
    emb = reid_pipeline.extractor.extract(crop)
    now = datetime.datetime.utcnow()

    return TrajectoryReconstructor.compare_and_cross_match(
        db=db,
        query_embedding=emb,
        current_camera_id=camera_id,
        current_timestamp=now
    )
