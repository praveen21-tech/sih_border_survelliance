# AI-Powered CCTV Surveillance System
## Features 12 & 13 Implementation

This repository contains the complete, production-ready implementation of **Feature 12 (Natural Language Surveillance Query Engine)** and **Feature 13 (Multi-Camera Person Re-Identification)** from the AI-Powered CCTV Surveillance System Specification.

---

### Features Overview

#### Feature 12: Natural Language Surveillance Query Engine
- **Operator Natural Language Interface**: Query historical footage, sightings, vehicle records, watchlist matches, and incidents without manual filtering.
- **Hybrid RAG Pipeline**: Combines dynamic Text-to-SQL translation, semantic ChromaDB vector retrieval, and cross-camera trajectory tracking.
- **Multi-LLM Support**: Pluggable integration with Groq (Llama 3.3 70B), OpenAI (GPT-4o/mini), Google Gemini, and Ollama.
- **Automated Intelligence Briefing**: Generates concise, military/security-grade reports highlighting severity, zone violations, and suspect timelines.

#### Feature 13: Multi-Camera Person Re-Identification (Re-ID)
- **Deep Feature Extractor**: Extracts L2-normalized 512-dimensional appearance feature vectors from person crops across different camera views.
- **Cross-Camera Similarity Matching**: Employs Cosine Similarity & ranking against global identities to maintain persistent tracking across non-overlapping CCTV zones.
- **Trajectory & Path Reconstruction**: Chronologically reconstructs an individual's movement path, zone transitions, timestamps, and dwell times (e.g. `Perimeter Gate ➔ Lobby ➔ Executive Wing ➔ Server Room`).
- **Probe Image Search**: Upload any photo or crop to search historical surveillance archives.

---

### Project Structure

```
.
├── config.py                 # Central settings & environment configuration
├── requirements.txt          # Python dependencies
├── .env.example              # Sample environment configuration file
├── database/
│   ├── models.py             # SQLAlchemy models (Cameras, Persons, Sightings, Events, Vehicles, Watchlist)
│   ├── db_session.py         # Database engine & session dependency
│   └── seed_data.py          # Realistic multi-camera CCTV dataset generator
├── reid_engine/
│   ├── detector.py           # YOLO / OpenCV Person Detector
│   ├── extractor.py          # 512-d Deep Re-ID Appearance Feature Extractor
│   ├── matcher.py            # Cross-Camera Similarity Matching Engine
│   ├── tracker.py            # Multi-Camera Trajectory & Timeline Reconstructor
│   └── pipeline.py           # End-to-end multi-camera frame processing pipeline
├── nl_query_engine/
│   ├── llm_client.py         # Unified LLM provider client (Groq, OpenAI, Gemini, Ollama)
│   ├── query_parser.py       # Intent classification & entity extraction
│   ├── text_to_sql.py        # Natural language to safe read-only SQL engine
│   ├── vector_retriever.py   # Semantic ChromaDB vector intelligence retriever
│   └── rag_engine.py         # Hybrid RAG intelligence synthesis orchestrator
├── api/
│   ├── app.py                # FastAPI main application & middleware
│   ├── routes_reid.py        # Re-ID, trajectory, and camera endpoints
│   └── routes_query.py       # Natural language query endpoints & stats
├── static/
│   └── index.html            # Web Surveillance Command Dashboard
└── demo.py                   # Standalone CLI test & verification suite
```

---

### Quick Start Guide

#### 1. Configure Environment / API Keys
Copy `.env.example` to `.env` and configure your preferred LLM provider:

```bash
# Example for Groq:
LLM_PROVIDER=groq
LLM_MODEL=llama-3.3-70b-versatile
GROQ_API_KEY=your_groq_api_key_here

# Or for OpenAI:
# LLM_PROVIDER=openai
# OPENAI_API_KEY=your_openai_api_key_here

# Or for Gemini:
# LLM_PROVIDER=gemini
# GEMINI_API_KEY=your_gemini_api_key_here
```

*(Note: The system also includes an automated heuristic fallback so it runs out-of-the-box even before API keys are configured).*

#### 2. Run the Standalone Verification Suite
```bash
python demo.py
```

#### 3. Start the FastAPI Surveillance Command Center
```bash
uvicorn api.app:app --reload --port 8000
```

#### 4. Open the Interactive Dashboard & API Docs
- **Web Command Dashboard**: [http://localhost:8000/](http://localhost:8000/)
- **Swagger Interactive API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### REST API Reference

| Endpoint | Method | Description |
|---|---|---|
| `POST /api/v1/query` | `POST` | Execute Natural Language surveillance query with LLM synthesis |
| `GET /api/v1/query/templates` | `GET` | Retrieve ready-to-use scenario query templates |
| `GET /api/v1/query/stats` | `GET` | Real-time surveillance database metrics |
| `GET /api/v1/reid/trajectory/{person_id}` | `GET` | Reconstruct cross-camera trajectory & zone path for a person |
| `GET /api/v1/reid/persons` | `GET` | List all tracked global person identities |
| `GET /api/v1/reid/cameras` | `GET` | List all surveillance camera nodes |
| `POST /api/v1/reid/process-frame` | `POST` | Ingest video frame for real-time detection & Re-ID |
| `POST /api/v1/reid/search-image` | `POST` | Upload person crop to match across camera history |
