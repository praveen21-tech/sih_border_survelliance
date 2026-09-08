from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database.db_session import get_db
from ..database.models import Camera, GlobalPerson, PersonSighting, SurveillanceEvent, VehicleRecord, AudioAlertRecord, DroneTrackRecord
from ..config import settings

router = APIRouter(prefix='/api/v1/system', tags=['System Intelligence'])

@router.get('/health')
def health(db: Session = Depends(get_db)):
    cam_count = db.query(Camera).count()
    person_count = db.query(GlobalPerson).count()
    audio_alerts_count = db.query(AudioAlertRecord).count()
    drone_tracks_count = db.query(DroneTrackRecord).count()
    return {
        'status': 'operational',
        'classification': settings.CLASSIFICATION,
        'organisation': settings.ORGANISATION,
        'modules': {
            'vision_cctv': {'status': 'active', 'cameras': cam_count},
            'feature_12_nl_query': {'status': 'active', 'provider': settings.LLM_PROVIDER, 'model': settings.LLM_MODEL},
            'feature_13_reid': {'status': 'active', 'tracked_identities': person_count},
            'feature_17_audio_intelligence': {'status': 'active', 'alerts': audio_alerts_count},
            'feature_18_drone_sentry': {'status': 'active', 'tracks': drone_tracks_count}
        }
    }

@router.get('/kpis')
def get_system_kpis(db: Session = Depends(get_db)):
    return {
        'total_cameras': db.query(Camera).count(),
        'active_persons_tracked': db.query(GlobalPerson).count(),
        'total_sightings_logged': db.query(PersonSighting).count(),
        'security_events': db.query(SurveillanceEvent).count(),
        'vehicles_scanned': db.query(VehicleRecord).count(),
        'acoustic_threats_detected': db.query(AudioAlertRecord).count(),
        'drone_intrusions': db.query(DroneTrackRecord).count()
    }
