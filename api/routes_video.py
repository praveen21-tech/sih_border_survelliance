import os
import shutil
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from database.db_session import get_db
from config import settings
from video_analyzer import VideoIntelligenceEngine

router = APIRouter(prefix="/api/v1/video", tags=["Video Recording Intelligence & Re-ID"])

# Singleton engine
video_engine = VideoIntelligenceEngine()

class VideoQuestionRequest(BaseModel):
    video_filename: str
    question: str

@router.get("/recordings")
def list_available_recordings():
    """Returns all available video recording files in the system."""
    import glob
    videos_dir = settings.BASE_DIR
    files = glob.glob(str(videos_dir / "*.mp4"))
    
    records = []
    for f in sorted(files):
        fname = os.path.basename(f)
        size_mb = round(os.path.getsize(f) / (1024 * 1024), 2)
        records.append({
            "filename": fname,
            "size_mb": size_mb,
            "url": f"/recordings/{fname}"
        })
    return {"total_recordings": len(records), "recordings": records}

@router.post("/upload-and-analyze")
async def upload_and_analyze_video(
    file: UploadFile = File(...),
    question: Optional[str] = Form(None),
    camera_id: str = Form("CAM_01_GATE_NORTH")
):
    """
    Drag & Drop video file upload endpoint:
    - Ingests video file
    - Extracts Feature 13 Re-ID appearance features & tracks persons across cameras
    - Evaluates expressions & threats
    - Answers the operator's natural language question about the video
    """
    save_path = settings.BASE_DIR / file.filename
    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {e}")

    # Process through Video Intelligence Engine
    summary = video_engine.process_video_file(
        video_path=str(save_path),
        camera_id=camera_id,
        sample_rate_sec=0.8
    )

    answer = None
    if question:
        answer = video_engine.answer_question_about_video(summary, question)
    else:
        # Default AI summary
        default_q = "Summarize who appeared in this video, their facial expressions, activities, any suspicious behavior, and their cross-camera tracking path."
        answer = video_engine.answer_question_about_video(summary, default_q)

    return {
        "status": "success",
        "video_filename": file.filename,
        "summary": summary,
        "ai_answer": answer
    }

@router.post("/ask")
def ask_question_about_recording(
    request: VideoQuestionRequest
):
    """
    Ask any natural language question about a specific video recording file.
    """
    video_path = settings.BASE_DIR / request.video_filename
    if not video_path.exists():
        raise HTTPException(status_code=404, detail=f"Video file '{request.video_filename}' not found.")

    # Ingest / retrieve metadata
    summary = video_engine.process_video_file(str(video_path), sample_rate_sec=1.0)
    answer = video_engine.answer_question_about_video(summary, request.question)

    return {
        "video_filename": request.video_filename,
        "question": request.question,
        "ai_answer": answer,
        "summary": summary
    }
