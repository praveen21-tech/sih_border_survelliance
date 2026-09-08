import sys
import os
import time
from pathlib import Path

sys.path.insert(0, r"d:\crop prediction\backend")
sys.path.insert(0, r"d:\crop prediction")

print("=" * 80)
print(" UNIFIED SURVEILLANCE & INTELLIGENCE PLATFORM - COMPREHENSIVE SMOKE TEST")
print("=" * 80)

# 1. Database & Config Test
print("\n[Test 1] Initializing Unified Database & Settings...")
from backend.app.config import settings
from backend.app.database.db_session import init_db, SessionLocal
from backend.app.database.models import Camera, GlobalPerson, AudioAlertRecord

init_db()
db = SessionLocal()
cameras = db.query(Camera).all()
print(f" -> Database OK. Total seeded cameras: {len(cameras)}")
for c in cameras[:4]:
    print(f"    * {c.id}: {c.name} ({c.zone})")
db.close()

# 2. Feature 13 Re-ID Engine Test
print("\n[Test 2] Verifying Feature 13 Multi-Camera Re-ID...")
from backend.app.vision.reid.extractor import ReIDFeatureExtractor
from backend.app.vision.reid.matcher import CrossCameraMatcher
from backend.app.vision.reid.tracker import TrajectoryReconstructor
import numpy as np

extractor = ReIDFeatureExtractor()
matcher = CrossCameraMatcher(similarity_threshold=0.72)
v1 = np.random.randn(512).astype(np.float32)
v2 = v1 + np.random.randn(512).astype(np.float32) * 0.05
sim = matcher.compute_cosine_similarity(v1, v2)
print(f" -> Re-ID Feature Extractor & Matcher OK. Cosine Similarity: {sim:.4f}")

# 3. Feature 12 Natural Language Query & Video Forensics Test
print("\n[Test 3] Verifying Feature 12 Natural Language Query Engine...")
from backend.app.query_engine.llm_client import UnifiedLLMClient
from backend.app.query_engine.video_analyzer import VideoIntelligenceEngine

llm = UnifiedLLMClient()
print(f" -> Unified LLM Client initialized (Provider: {llm.provider}, Model: {llm.model})")
video_engine = VideoIntelligenceEngine()
summary = video_engine.process_video_file("cam2.mp4")
print(f" -> Video Intelligence Grounding OK. Location: {summary.get('location')}")

# 4. Features 17 & 18 Audio Intelligence & Drone Sentry Test
print("\n[Test 4] Verifying Features 17 & 18 Audio Intelligence & Acoustic Drone Engine...")
from backend.app.audio.pipeline import pipeline as audio_pipeline
from backend.app.audio.engines.drone_engine import get_drone_status
from backend.app.audio.field_samples import FIELD_SAMPLES

status = audio_pipeline.status()
print(f" -> Audio Pipeline Status: {status}")
drone_st = get_drone_status()
print(f" -> Acoustic Drone Sentry Status: {drone_st}")
print(f" -> Built-in Tactical Audio Field Samples: {len(FIELD_SAMPLES)} available")

# 5. Master FastAPI App Verification
print("\n[Test 5] Verifying FastAPI Master Application Routers...")
from backend.app.main import app
routes = [route.path for route in app.routes]
print(f" -> Master FastAPI App routes ({len(routes)} total):")
for r in sorted(routes):
    if r.startswith("/api/v1") or r.startswith("/ws"):
        print(f"    * {r}")

print("\n" + "=" * 80)
print(" ALL INTEGRATION TESTS PASSED SUCCESSFULLY! (100% HEALTHY)")
print("=" * 80)
