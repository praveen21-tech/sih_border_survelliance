# BorderEye AI - 10 Core Files You Must Understand

## Critical Files (Ranked by Importance)

### 1. **backend/app/main.py**
- **Purpose:** Backend entry point, FastAPI app, camera pipeline orchestrator, WebSocket hub
- **Why Important:** 
  - Contains ALL camera configurations (cam-01, cam-02, cam-04)
  - Defines `CameraPipeline` class (core detection loop)
  - Implements `Hub` class (WebSocket broadcaster)
  - Contains `run_pipeline()` - main detection loop
  - Defines all API endpoints (`/health`, `/ws/analytics`, `/faces/stream`)
  - Startup/shutdown lifecycle
- **Lines of Code:** ~1080 lines
- **Key Classes/Functions:**
  - `CameraPipeline` - Per-camera configuration & state
  - `Hub` - WebSocket connection manager
  - `run_pipeline()` - Detection loop (YOLO → ByteTrack → Analytics → WebSocket)
  - `ws_analytics()` - WebSocket endpoint handler
  - `PIPELINES` list - cam-01, cam-02, cam-04 configurations

---

### 2. **backend/app/face_pipeline.py**
- **Purpose:** CAM06 webcam facial recognition pipeline (separate from other cameras)
- **Why Important:**
  - Complete facial recognition implementation
  - Webcam capture loop
  - Face detection → recognition → watchlist matching → alerts
  - Separate thread running parallel to video cameras
  - Generates alerts when watchlist faces detected
- **Lines of Code:** ~325 lines
- **Key Classes/Functions:**
  - `FacePipelineState` - Webcam pipeline state
  - `run_webcam_pipeline()` - Main webcam loop
  - `_track()` - Simple IoU face tracking
  - `_append_alert()` - Alert generation
  - `latest_annotated()` - Returns annotated frame for MJPEG stream

---

### 3. **backend/app/face_detector.py**
- **Purpose:** InsightFace wrapper (RetinaFace detection + ArcFace embeddings)
- **Why Important:**
  - Core AI model for face detection
  - Generates 512-dimensional face embeddings
  - Pretrained model (no training needed)
  - Used by `face_pipeline.py`
- **Lines of Code:** ~65 lines
- **Key Classes/Functions:**
  - `FaceDetector` class
  - `recognize()` - Detect faces + generate embeddings in one call
  - Returns: `[{"bbox": [x1,y1,x2,y2], "det_score": float, "embedding": 512-d array}]`

---

### 4. **backend/app/watchlist_manager.py**
- **Purpose:** Persistent face database (JSON storage)
- **Why Important:**
  - Stores person face embeddings
  - Loads/saves watchlist to `backend/data/watchlist.json`
  - Matching logic (cosine similarity)
  - Thread-safe operations
- **Lines of Code:** ~140 lines
- **Key Classes/Functions:**
  - `WatchlistManager` class
  - `add_person()` - Store face embeddings
  - `best_match()` - Find closest match via cosine similarity
  - `get_people()` - List all watchlist entries
  - Storage: `backend/data/watchlist.json`

---

### 5. **backend/app/face_recognizer.py**
- **Purpose:** Face recognition verdict (Daniel vs Unknown)
- **Why Important:**
  - Bridges detector + watchlist manager
  - Returns recognition result with confidence
  - Simple threshold-based matching (similarity >= 0.45)
- **Lines of Code:** ~25 lines
- **Key Classes/Functions:**
  - `FaceRecognizer` class
  - `identify()` - Returns `{"label": "Daniel"|"Unknown", "watchlist": bool, "confidence": float}`

---

### 6. **src/app/layout.tsx**
- **Purpose:** Frontend root layout (Next.js App Router)
- **Why Important:**
  - Entry point for entire frontend
  - Defines HTML structure
  - Loads global CSS
  - Sets dark mode theme
- **Lines of Code:** ~20 lines
- **Key Elements:**
  - Metadata (title, description)
  - Root `<html>` and `<body>` structure

---

### 7. **src/app/page.tsx**
- **Purpose:** Landing page (loading screen → dashboard redirect)
- **Why Important:**
  - First page user sees
  - Shows loading animation
  - Auto-redirects to `/dashboard`
- **Lines of Code:** ~30 lines
- **Flow:** LoadingScreen → wait → redirect to /dashboard

---

### 8. **src/app/live-monitoring/page.tsx**
- **Purpose:** Main live monitoring UI (6-camera grid)
- **Why Important:**
  - Primary user interface for surveillance
  - Displays all camera feeds
  - Real-time detection overlays
  - Analytics panel
  - Detection events table
- **Lines of Code:** ~160 lines
- **Key Components:**
  - `CameraFeedCard` - Individual camera display (connects to WebSocket)
  - `LiveAnalyticsPanel` - Real-time metrics
  - `DetectionEventsTable` - Event log
  - Grid layout: 3×2 cameras + analytics sidebar

---

### 9. **src/components/CameraFeedCard.tsx**
- **Purpose:** Individual camera feed component (WebSocket consumer)
- **Why Important:**
  - **THIS IS WHERE FRONTEND CONNECTS TO BACKEND**
  - Opens WebSocket to `ws://localhost:8000/ws/analytics`
  - Receives detection frames
  - Renders bounding boxes
  - Displays object counts
- **Estimated Lines:** ~200-300 lines
- **WebSocket Protocol:**
  ```javascript
  // Connect
  ws = new WebSocket('ws://localhost:8000/ws/analytics');
  
  // Subscribe to camera
  ws.send(JSON.stringify({ camera: "cam-01" }));
  
  // Receive frames
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // data.objects - detections
    // data.counts - statistics
    // data.events - fence alerts
  };
  ```

---

### 10. **backend/app/intrusion.py**
- **Purpose:** Virtual fence system (cam-04 intrusion detection)
- **Why Important:**
  - State machine for person tracking (normal → approaching → intrusion)
  - Point-in-polygon geometry
  - Event generation (approach, intrusion, exit alerts)
  - Polygon configuration persistence
- **Lines of Code:** ~145 lines
- **Key Classes/Functions:**
  - `FenceEngine` class
  - `evaluate()` - Check person positions vs fence
  - `point_in_polygon()` - Geometry test
  - `dist_to_fence()` - Distance calculation
  - States: `normal`, `approaching`, `intrusion`

---

## Files NOT Listed (But You Asked About)

**Where are cameras initialized?**
→ In `main.py` line ~186-221 (`PIPELINES` list)

**Where are alerts generated?**
→ `face_pipeline.py` line ~146-158 (`_append_alert()`)

**Where are routes/APIs defined?**
→ `main.py` line ~980+ (FastAPI decorators: `@app.get()`, `@app.websocket()`)

**Where is camera analytics configured?**
→ `main.py` line ~87-141 (`CameraPipeline` dataclass + `PIPELINES` list)

---

# Dependency Chain (Data Flow)

```
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND STARTUP                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │    main.py       │ ◄──── ENTRY POINT (backend)
                    │  @app.startup    │
                    └────────┬─────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    ┌──────────────────┐      ┌──────────────────┐
    │  Video Cameras   │      │  CAM06 Webcam    │
    │  (cam-01/02/04)  │      │  Face Pipeline   │
    └────────┬─────────┘      └────────┬─────────┘
             │                         │
             │                         │
    ┌────────▼─────────┐      ┌────────▼─────────┐
    │  run_pipeline()  │      │ run_webcam_      │
    │  (main.py #663)  │      │  pipeline()      │
    │                  │      │ (face_pipeline)  │
    │  Loop:           │      └────────┬─────────┘
    │  1. Read frame   │               │
    │  2. YOLO detect  │               │
    │  3. ByteTrack    │      ┌────────▼─────────┐
    │  4. ANPR/Fence   │      │  FaceDetector    │
    │  5. Broadcast    │      │ (InsightFace)    │
    └────────┬─────────┘      └────────┬─────────┘
             │                         │
             │                         │
             │                ┌────────▼─────────┐
             │                │ FaceRecognizer   │
             │                │  (cosine match)  │
             │                └────────┬─────────┘
             │                         │
             │                ┌────────▼─────────┐
             │                │ WatchlistManager │
             │                │ (JSON storage)   │
             │                └────────┬─────────┘
             │                         │
             │                         │ (if match)
             │                ┌────────▼─────────┐
             │                │ _append_alert()  │
             │                │ (alert generation)│
             │                └────────┬─────────┘
             │                         │
    ┌────────▼─────────────────────────▼─────────┐
    │              Hub.broadcast()                │
    │         (WebSocket broadcaster)             │
    │         Sends JSON to all subscribers       │
    └────────┬───────────────────────────────────┘
             │
             │ WebSocket: ws://localhost:8000/ws/analytics
             │
    ┌────────▼───────────────────────────────────┐
    │                 FRONTEND                    │
    └─────────────────────────────────────────────┘
             │
             ▼
    ┌──────────────────┐
    │   layout.tsx     │ ◄──── ENTRY POINT (frontend)
    │  (root layout)   │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │    page.tsx      │
    │ (loading screen) │
    └────────┬─────────┘
             │
             │ (auto redirect)
             ▼
    ┌──────────────────┐
    │  /dashboard      │
    │  page.tsx        │
    └──────────────────┘
             │
             │ (user clicks)
             ▼
    ┌──────────────────┐
    │ /live-monitoring │ ◄──── MAIN UI
    │   page.tsx       │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ CameraFeedCard   │ ◄──── WebSocket Consumer
    │   (component)    │
    │                  │
    │  1. Connect WS   │
    │  2. Subscribe    │
    │  3. Receive      │
    │  4. Render boxes │
    └──────────────────┘
```

---

# Simplified Call Chain

## Video Camera Pipeline (cam-01, cam-02, cam-04)

```
main.py
  ├─ _startup()                          # FastAPI startup
  │   ├─ Create asyncio tasks for each PIPELINE
  │   └─ Start ocr_worker() threads (cam-02)
  │
  └─ run_pipeline(pipeline)              # Line 663 (blocking loop)
      ├─ Open video with cv2.VideoCapture
      ├─ Loop forever:
      │   ├─ Read frame
      │   ├─ model.track() → YOLO + ByteTrack
      │   ├─ _normalize() → Convert to JSON
      │   ├─ if ANPR:
      │   │   ├─ _queue_plate_crop() → Queue for OCR
      │   │   └─ _merge_plates() → Attach recognized plates
      │   ├─ if Fence:
      │   │   └─ fence_engine.evaluate() → Check intrusions
      │   └─ hub.broadcast(frame_state) → Send to WebSocket
      └─ Loop restarts at video end
```

## Face Recognition Pipeline (cam-06)

```
main.py
  └─ _startup()
      └─ Start face_pipeline thread

face_pipeline.py
  └─ run_webcam_pipeline()               # Line 172 (blocking loop)
      ├─ Open webcam with cv2.VideoCapture(0)
      ├─ Initialize:
      │   ├─ FaceDetector (InsightFace)
      │   ├─ WatchlistManager (load JSON)
      │   └─ FaceRecognizer
      ├─ Loop forever:
      │   ├─ Read frame
      │   ├─ detector.recognize() → faces + embeddings
      │   ├─ _track() → Match to previous frames (IoU)
      │   ├─ For each face:
      │   │   ├─ recognizer.identify(embedding)
      │   │   │   └─ face_recognizer.py
      │   │   │       └─ watchlist_manager.best_match()
      │   │   │           └─ Cosine similarity across all stored embeddings
      │   │   ├─ If watchlist match:
      │   │   │   └─ _append_alert()
      │   │   └─ Annotate frame
      │   └─ hub.broadcast(payload)
      └─ Loop restarts if webcam disconnects
```

## WebSocket Flow

```
Frontend (CameraFeedCard.tsx)
  │
  │ ws = new WebSocket('ws://localhost:8000/ws/analytics')
  │ ws.send({ camera: "cam-01" })
  │
  ▼
Backend (main.py)
  │
  ├─ ws_analytics() handler              # Line 980
  │   ├─ await ws.accept()
  │   ├─ Receive { camera: "cam-01" }
  │   ├─ hub.subscribe(camera, ws)
  │   └─ If first subscriber:
  │       └─ pipeline.reset_requested = True  # Sync video to 0s
  │
  └─ run_pipeline() continuously sends:
      │
      └─ hub.broadcast(camera, payload)  # Line 893
          │
          └─ For each subscribed WebSocket:
              └─ ws.send_json(payload)
                  │
                  ▼
          ┌───────────────────┐
          │  Frontend receives│
          │  {                │
          │    objects: [...],│
          │    counts: {...}, │
          │    events: [...]  │
          │  }                │
          └───────────────────┘
```

---

# What Each Camera Does

| Camera | Video | Detects | Features | WebSocket |
|--------|-------|---------|----------|-----------|
| **cam-01** | cam01.mp4 | Persons | Basic tracking | ✅ |
| **cam-02** | vehicledetectionanprclass.mp4 | Vehicles | ANPR (license plates) | ✅ |
| **cam-04** | cam04.mp4 | Persons | Virtual Fence (intrusion) | ✅ |
| **cam-06** | Webcam (live) | Faces | Face Recognition + Watchlist | ✅ |

---

# Where Things Happen

| Task | File | Function/Class | Line |
|------|------|----------------|------|
| **Backend starts** | `main.py` | `_startup()` | 947 |
| **Camera loops start** | `main.py` | `run_pipeline()` | 663 |
| **YOLO detection** | `main.py` | `model.track()` | 746 |
| **WebSocket endpoint** | `main.py` | `ws_analytics()` | 980 |
| **WebSocket broadcast** | `main.py` | `hub.broadcast()` | 244 |
| **Face detection** | `face_detector.py` | `FaceDetector.recognize()` | 28 |
| **Face recognition** | `face_recognizer.py` | `FaceRecognizer.identify()` | 17 |
| **Watchlist matching** | `watchlist_manager.py` | `best_match()` | 81 |
| **Alert generation** | `face_pipeline.py` | `_append_alert()` | 146 |
| **Frontend entry** | `src/app/layout.tsx` | `RootLayout` | - |
| **Main UI** | `src/app/live-monitoring/page.tsx` | `LiveMonitoringPage` | - |
| **WebSocket consumer** | `src/components/CameraFeedCard.tsx` | Component | - |

---

# Read These Files In This Order

### Day 1: Backend Core
1. **main.py** (lines 1-250) - Understand `CameraPipeline` and `Hub` classes
2. **main.py** (lines 663-915) - Read `run_pipeline()` function completely
3. **main.py** (lines 186-221) - Study `PIPELINES` configuration

### Day 2: Face Recognition
4. **face_pipeline.py** (lines 1-175) - Webcam pipeline
5. **face_detector.py** - InsightFace integration
6. **watchlist_manager.py** - Storage + matching
7. **face_recognizer.py** - Recognition logic

### Day 3: Frontend
8. **src/app/layout.tsx** - Root
9. **src/app/live-monitoring/page.tsx** - Main UI
10. **src/components/CameraFeedCard.tsx** - WebSocket connection

---

# The 3 Most Critical Functions

### 1. `run_pipeline()` - main.py line 663
**What it does:** Main detection loop for video cameras  
**Flow:**
- Opens video file
- Loops through frames
- Runs YOLO detection + ByteTrack tracking
- Processes ANPR (cam-02) or Virtual Fence (cam-04)
- Broadcasts results via WebSocket
- Restarts video at end

### 2. `run_webcam_pipeline()` - face_pipeline.py line 172
**What it does:** Main loop for webcam face recognition  
**Flow:**
- Opens webcam
- Detects faces (InsightFace)
- Generates embeddings (ArcFace)
- Matches against watchlist
- Generates alerts on match
- Broadcasts via WebSocket

### 3. `ws_analytics()` - main.py line 980
**What it does:** WebSocket endpoint handler  
**Flow:**
- Accepts WebSocket connection
- Receives camera subscription request
- Adds client to Hub
- Resets video timeline for sync
- Handles fence configuration commands

---

# Key Insight

**The entire system revolves around 2 main loops:**

1. **Video Loop** (`run_pipeline`) - Processes recorded videos
2. **Webcam Loop** (`run_webcam_pipeline`) - Processes live webcam

Both loops:
- Run in separate threads
- Generate JSON payloads
- Send to `Hub.broadcast()`
- Which forwards to WebSocket clients (frontend)

**Frontend just listens and renders!**

---

# That's It!

You now know the 10 files that matter. Everything else is support code.

**Start with:** `main.py` → `face_pipeline.py` → `CameraFeedCard.tsx`

**Ignore:** Config files, utility helpers, UI styling, data mocks
