from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from ..database.db_session import get_db
from ..query_engine.rag_engine import SurveillanceRAGEngine
from ..query_engine.video_analyzer import VideoIntelligenceEngine

router = APIRouter(prefix='/api/v1', tags=['Feature 12 - Natural Language Query & Forensics'])
rag_engine = SurveillanceRAGEngine()
video_engine = VideoIntelligenceEngine()

class QueryRequest(BaseModel):
    query: str
    limit: Optional[int] = 10

class VideoAskRequest(BaseModel):
    video_filename: str = 'cam2.mp4'
    question: str

@router.get('/query/live')
def get_live_surveillance_telemetry():
    return rag_engine.get_live_telemetry()

@router.post('/query/ask')
def ask_surveillance_query(req: QueryRequest, db: Session = Depends(get_db)):
    return rag_engine.process_query(db=db, user_query=req.query)

@router.post('/video/ask')
def ask_video_forensics(req: VideoAskRequest):
    video_summary = video_engine.process_video_file(req.video_filename)
    if 'error' in video_summary:
        raise HTTPException(status_code=404, detail=video_summary['error'])
    answer = video_engine.answer_question_about_video(video_summary, req.question)
    return {
        'video_filename': req.video_filename,
        'question': req.question,
        'ai_answer': answer,
        'visual_telemetry': video_summary.get('visual_facts', {})
    }

