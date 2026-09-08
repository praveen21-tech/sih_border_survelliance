import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from config import settings
from database.db_session import init_db
from database.seed_data import seed_surveillance_database
from api.routes_reid import router as reid_router
from api.routes_query import router as query_router
from api.routes_video import router as video_router

# Initialize FastAPI App
app = FastAPI(
    title="AI-Powered CCTV Surveillance System",
    description="Backend API for Feature 12 (Natural Language Surveillance Query Engine) and Feature 13 (Multi-Camera Person Re-Identification)",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auto-initialize database & seed initial records on startup
@app.on_event("startup")
def on_startup():
    settings.ensure_directories()
    init_db()
    seed_surveillance_database()
    print("[CCTV System] Database & Surveillance intelligence ready.")

# Mount Routers
app.include_router(query_router)
app.include_router(reid_router)
app.include_router(video_router)

# Mount Static Files & Crops Directory for Evidence Viewing
static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

crops_dir = settings.DATA_DIR / "crops"
if crops_dir.exists():
    app.mount("/data/crops", StaticFiles(directory=str(crops_dir)), name="crops")

# Mount base recordings directory for video playback
app.mount("/recordings", StaticFiles(directory=str(settings.BASE_DIR)), name="recordings")

@app.get("/", response_class=FileResponse)
def serve_dashboard():
    """Serves the interactive surveillance command dashboard."""
    index_file = Path(__file__).parent.parent / "static" / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "AI Surveillance Engine Active. Visit /docs for Swagger API specification."}

@app.get("/api/v1/health")
def health_check():
    """System health check & active LLM configuration."""
    return {
        "status": "healthy",
        "llm_provider": settings.LLM_PROVIDER,
        "llm_model": settings.LLM_MODEL,
        "api_key_configured": bool(settings.GROQ_API_KEY or settings.OPENAI_API_KEY or settings.GEMINI_API_KEY),
        "reid_backbone": settings.REID_BACKBONE,
        "reid_threshold": settings.REID_SIMILARITY_THRESHOLD,
        "device": settings.DEVICE
    }
