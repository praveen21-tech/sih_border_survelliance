from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from sqlalchemy.orm import Session
from ..database.db_session import get_db
from ..database.models import AudioAlertRecord, DroneTrackRecord
from ..audio.pipeline import pipeline, SECTORS
from ..audio.engines.drone_engine import get_drone_status, get_tracks, get_active_threats
from ..audio.field_samples import FIELD_SAMPLES

router = APIRouter(prefix='/api/v1/audio', tags=['Features 17 & 18 - Audio Intelligence & Drone Sentry'])

@router.get('/sectors')
def get_sectors():
    return {'sectors': SECTORS}

@router.get('/alerts')
def list_audio_alerts(limit: int = 100, db: Session = Depends(get_db)):
    alerts = db.query(AudioAlertRecord).order_by(AudioAlertRecord.timestamp.desc()).limit(limit).all()
    return [{'id': a.id, 'sector': a.sector, 'category': a.category, 'event_label': a.event_label, 'threat_level': a.threat_level, 'confidence': a.confidence, 'transcript': a.transcript, 'acknowledged': a.acknowledged} for a in alerts]

@router.get('/drone/status')
def drone_status():
    return get_drone_status()

@router.get('/drone/tracks')
def drone_tracks():
    return {'tracks': get_tracks()}

@router.get('/drone/threats')
def drone_threats():
    return {'threats': get_active_threats()}

@router.get('/field-samples')
def get_field_samples():
    return {'samples': FIELD_SAMPLES}

@router.post('/analyze')
async def analyze_audio_file(
    file: UploadFile = File(...),
    sector: str = Form('WESTERN-THAR-SECTOR-4'),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    from ..audio.schemas import SensorContext
    context = SensorContext(sector=sector, post_id=f"BOP-{sector[:2]}-001")
    res = pipeline.analyze_bytes(contents, context, filename=file.filename or "capture.mp3")
    
    # Save to db
    alert = AudioAlertRecord(
        sector=sector,
        category=res.get('category', 'Acoustic Threat'),
        event_label=res.get('event_label', res.get('top_event', 'Detected Audio Event')),
        threat_level=res.get('threat_level', 'MEDIUM'),
        confidence=res.get('confidence', 0.88),
        transcript=res.get('speech_transcript', res.get('transcript', {}).get('text', ''))
    )
    db.add(alert)
    db.commit()
    return res

