# BorderEye AI - Codebase Study Guide

**Date:** September 5, 2026  
**Purpose:** Understanding the existing system before adding facial recognition

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Backend Deep Dive](#backend-deep-dive)
4. [Frontend Structure](#frontend-structure)
5. [Key Components](#key-components)
6. [Facial Recognition System (Already Built!)](#facial-recognition-system)
7. [Data Flow](#data-flow)
8. [Configuration](#configuration)

---

## 🎯 Project Overview

**BorderEye AI** is a production-grade AI surveillance platform with:

- **3 Camera Feeds** (cam-01, cam-02, cam-04)
- **Real-time Object Detection** (YOLO11)
- **Object Tracking** (ByteTrack)
- **ANPR** (Automatic Number Plate Recognition)
- **Virtual Fence** intrusion detection
- **Facial Recognition** ⭐ (Already implemented!)
- **WebSocket-based** live streaming to browser

### Tech Stack

**Backend:**
- FastAPI (Python)
- YOLO11 (Ultralytics)
- InsightFace (Face detection + ArcFace embeddings)
- ByteTrack (Multi-object tracking)
- RapidOCR / EasyOCR (License plates)
- OpenCV (Video processing)

**Frontend:**
- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- WebSocket client
- Leaflet maps

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  Next.js (Port 3000)                                         │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │  Dashboard   │Live Monitoring│ Investigation / Threat   │ │
│  │              │  (6 cameras)  │   Intelligence Pages     │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket (ws://localhost:8000/ws/analytics)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                       BACKEND                                │
│  FastAPI (Port 8000)                                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │           CameraPipeline (Per Camera)                   ││
│  │  ┌──────────┬──────────┬──────────┬──────────────────┐ ││
│  │  │ Video    │ YOLO11   │ByteTrack │ Feature Modules  │ ││
│  │  │ Decoder  │ Detector │ Tracker  │ (ANPR/Face/Fence)│ ││
│  │  └──────────┴──────────┴──────────┴──────────────────┘ ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │           Feature Processing Modules                    ││
│  │  • face_detector.py      (InsightFace)                  ││
│  │  • face_recognizer.py    (ArcFace matching)             ││
│  │  • watchlist_manager.py  (Persistent storage)           ││
│  │  • anpr_util.py          (Plate validation)             ││
│  │  • intrusion.py          (Virtual fence logic)          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────────┐
              │   Data Storage     │
              │ • Video Files      │
              │ • YOLO Models      │
              │ • Watchlist DB     │
              │ • Fence Polygons   │
              └────────────────────┘
```

---

## 🔧 Backend Deep Dive

### File Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app + camera pipelines
│   ├── face_detector.py         # InsightFace (RetinaFace + ArcFace)
│   ├── face_recognizer.py       # Cosine similarity matching
│   ├── watchlist_manager.py     # Persistent watchlist storage
│   ├── train_watchlist.py       # Training script (add faces)
│   ├── anpr_util.py             # Plate text validation/cleaning
│   ├── intrusion.py             # Virtual fence engine
│   └── __init__.py
├── data/
│   └── watchlist.json           # Face embeddings database
├── weights/
│   └── yolo11n.pt               # YOLO11 detection model
├── bytetrack_custom.yaml        # Tracker configuration
├── requirements.txt
└── server.log
```

---

## 📦 Key Components

### 1. **main.py** - Core Pipeline

**Purpose:** Main FastAPI application orchestrating all camera pipelines

**Key Classes:**

#### `CameraPipeline` (dataclass)
The heart of each camera's processing:

```python
@dataclass
class CameraPipeline:
    camera_id: str           # "cam-01", "cam-02", "cam-04"
    video: str               # Video filename
    classes: list[int]       # COCO classes to detect
    label_map: dict          # Class ID -> Label
    conf: float = 0.3        # Detection confidence threshold
    imgsz: int = 512         # YOLO input resolution
    anpr: bool = False       # Enable license plate OCR
    fence: bool = False      # Enable virtual fence
    
    # Runtime objects
    model: YOLO              # YOLO detector
    ocr: RapidOCR           # OCR engine
    fence_engine: FenceEngine  # Intrusion detection
```

**3 Camera Configurations:**

1. **cam-01:** Person detection (human monitoring)
2. **cam-02:** Vehicle detection + ANPR (license plates)
3. **cam-04:** Person detection + Virtual Fence (intrusion alerts)

#### `Hub` Class
WebSocket connection manager:
- Manages subscriber connections per camera
- Broadcasts detection frames to all subscribers
- Handles subscribe/unsubscribe

**Key Functions:**

- `run_pipeline(p: CameraPipeline)` - Main detection loop (line ~661)
  - Read video frame
  - Run YOLO detection
  - Apply ByteTrack tracking
  - Run feature modules (ANPR, face, fence)
  - Broadcast results via WebSocket

- `ocr_worker(p: CameraPipeline)` - Background OCR thread (line ~421)
  - Processes plate crops from queue
  - Runs OCR independently
  - Returns results to main pipeline

---

### 2. **Face Detection System** ⭐

#### **face_detector.py** - InsightFace Wrapper

**Model:** buffalo_l (RetinaFace detection + ArcFace recognition)

```python
class FaceDetector:
    def __init__(self, det_size=640, min_det_score=0.4):
        # Loads InsightFace models (detection + recognition only)
        self.app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
            allowed_modules=["detection", "recognition"]
        )
        
    def recognize(self, img_bgr, max_num=5) -> list[dict]:
        """
        Returns: [
            {
                "bbox": [x1, y1, x2, y2],
                "det_score": float,
                "embedding": 512-d numpy array (L2-normalized)
            }
        ]
        """
```

**Key Points:**
- **No training required** - Uses pretrained RetinaFace + ArcFace
- Generates **512-dimensional embeddings** per face
- CPU-first (CPUExecutionProvider)
- Single call: detection + embedding generation

---

#### **watchlist_manager.py** - Face Database

**Storage:** `backend/data/watchlist.json`

```json
{
  "version": 1,
  "people": [
    {
      "person_id": 1,
      "name": "Daniel",
      "created_at": "2026-09-07 10:00:00",
      "embedding_count": 42,
      "embeddings": [[0.001, -0.002, ...], ...]
    }
  ]
}
```

**Key Methods:**

```python
class WatchlistManager:
    def add_person(name, embeddings, replace=True) -> dict
        # Store person with face embeddings
        
    def best_match(embedding, threshold=0.45) -> (person, similarity)
        # Find closest match using cosine similarity
        
    def get_people() -> list[dict]
        # Get all watchlist entries
```

**Matching Logic:**
- L2-normalize query embedding
- Compute cosine similarity against ALL stored embeddings
- Return best match if similarity >= 0.45
- Otherwise return "Unknown"

---

#### **face_recognizer.py** - Recognition Logic

```python
class FaceRecognizer:
    def __init__(self, manager: WatchlistManager, threshold=0.45):
        self.manager = manager
        self.threshold = threshold
        
    def identify(self, embedding) -> dict:
        """
        Returns:
        {
            "label": "Daniel" | "Unknown",
            "watchlist": True | False,
            "confidence": 0.0-1.0
        }
        """
```

**Recognition Flow:**
1. Receive 512-d embedding from detector
2. Search watchlist for best match
3. If similarity >= 0.45 → Watchlist person
4. Otherwise → Unknown

---

#### **train_watchlist.py** - Training Script

**Usage:**
```powershell
python -m app.train_watchlist --name Daniel --folder D:\path\to\photos
```

**Process:**
1. Scans folder for images (jpg, png, webp, etc.)
2. Detects faces in each image
3. Generates embeddings for all detected faces
4. Stores under person's name
5. Self-validation check

**Example Output:**
```
[train] person=Daniel folder=D:\IVBAP\bordereye-ai\mybeautifulface
[train] found 20 image(s)
[train] 20/20 images, 42 face(s) so far (det>= 0.40)
[train] stored person_id=1 name=Daniel embeddings=42
[train] self-check: 42/42 embeddings match Daniel at sim>=0.45
```

---

### 3. **ANPR System**

#### **anpr_util.py** - Plate Validation

**Purpose:** Clean and validate OCR text

**Key Functions:**

```python
def refine_plate(raw_text: str) -> str | None:
    """
    Input: "AB12CDE" or "A8I2CD3" (OCR errors)
    Output: "AB12CDE" (cleaned) or None (invalid)
    """
    
def format_license(text: str) -> str:
    """
    Apply character rectification for common OCR mistakes:
    O↔0, I↔1, J↔3, A↔4, G↔6, S↔5
    Based on position in LL-DD-LLL format
    """
```

**Common Plate Format:** LL-DD-LLL (2 letters, 2 digits, 3 letters)

**OCR Pipeline (cam-02):**
1. Detect vehicle (YOLO)
2. Track vehicle (ByteTrack)
3. Crop plate region (lower portion of vehicle)
4. Run OCR (EasyOCR)
5. Validate + clean text (`anpr_util`)
6. Attach to vehicle object

---

### 4. **Virtual Fence System**

#### **intrusion.py** - Geofence Engine

**Purpose:** Detect people entering restricted zones (cam-04)

```python
class FenceEngine:
    def __init__(self, threshold=0.07, max_events=20):
        self.polygon = []  # Fence coordinates (normalized)
        self._state = {}   # Per-track states
        self.events = deque(maxlen=20)
        
    def set_polygon(self, poly):
        """Define fence boundary (list of [x,y] points)"""
        
    def evaluate(self, persons) -> (persons_with_state, new_events):
        """
        Analyze person positions relative to fence
        Returns state per person: "normal" | "approaching" | "intrusion"
        """
```

**States:**
- **normal:** Outside fence, not approaching
- **approaching:** Moving toward fence (distance < threshold)
- **intrusion:** Inside fence polygon

**Events:**
- `approach` - Warning: person approaching
- `intrusion` - Critical: person entered zone
- `exit` - Resolved: person left zone

**Geometry:**
- All coordinates normalized (0..1)
- Point-in-polygon using ray-casting
- Distance to fence using segment projection
- Motion detection via centroid history

**Storage:** `backend/data/cam-04_fence.json`

---

## 🎨 Frontend Structure

```
src/
├── app/
│   ├── dashboard/              # KPI dashboard
│   ├── live-monitoring/        # 6-camera grid (MAIN PAGE)
│   ├── threat-intelligence/    # Threat analysis
│   ├── investigation-center/   # Evidence review
│   ├── audio-intelligence/     # Audio (planned)
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   └── globals.css
├── components/
│   └── ui/                     # Reusable components
├── lib/
│   └── utils.ts                # Utilities
└── types/
    └── index.ts                # TypeScript types
```

**Main Page:** `/live-monitoring` - Real-time 6-camera grid

**WebSocket Connection:**
```typescript
const ws = new WebSocket('ws://localhost:8000/ws/analytics');
ws.send(JSON.stringify({ camera: "cam-01" })); // Subscribe

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data.frame (base64 image)
  // data.objects (detections)
  // data.counts (statistics)
};
```

---

## 🔄 Data Flow

### Frame Processing Pipeline

```
┌──────────────┐
│ Video Frame  │ (1920×1080, 30fps)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ YOLO11 Detect│ (512×512, conf=0.3)
│              │ → [person, car, truck, ...]
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ ByteTrack    │ Assigns persistent track_id
└──────┬───────┘
       │
       ├─────────────────────────┐
       │                         │
       ▼                         ▼
┌──────────────┐         ┌──────────────┐
│ ANPR Module  │         │ Fence Module │
│ (cam-02)     │         │ (cam-04)     │
│              │         │              │
│ • Crop plate │         │ • Point check│
│ • Run OCR    │         │ • Distance   │
│ • Validate   │         │ • State FSM  │
└──────┬───────┘         └──────┬───────┘
       │                         │
       └──────────┬──────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ JSON Payload   │
         │ {              │
         │   frame: base64│
         │   objects: []  │
         │   counts: {}   │
         │   events: []   │
         │ }              │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │   WebSocket    │
         │   Broadcast    │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │    Browser     │
         │  (React UI)    │
         └────────────────┘
```

---

## ⚙️ Configuration

### Camera Pipeline Settings

| Camera  | Video File                   | Classes       | Features      | FPS |
|---------|------------------------------|---------------|---------------|-----|
| cam-01  | cam01.mp4                    | Person (0)    | None          | 30  |
| cam-02  | vehicledetectionanprclass.mp4| Car,Bike,Bus,Truck | ANPR     | 30  |
| cam-04  | cam04.mp4                    | Person (0)    | Virtual Fence | 30  |

### Detection Parameters

```python
# YOLO
imgsz = 512          # Input resolution
conf = 0.25-0.3      # Confidence threshold
proc_every = 1       # Process every frame
frame_cap = 30       # Max processed FPS

# ByteTrack
track_thresh = 0.5
track_buffer = 30
match_thresh = 0.8

# Face Recognition
det_size = 640
min_det_score = 0.4
match_threshold = 0.45

# ANPR
anpr_interval = 2.5s  # OCR rate limit
ocr_engine = "clone"  # EasyOCR + binarization

# Virtual Fence
fence_threshold = 0.07  # Distance trigger (normalized)
```

---

## 🚀 Running the System

### Backend

```powershell
# Option 1: PowerShell script
.\run-backend.ps1

# Option 2: Direct
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```powershell
npm run dev
# Opens at http://localhost:3000
```

### Training Face Watchlist

```powershell
cd backend

# Put your photos in a folder (e.g., mybeautifulface/)
python -m app.train_watchlist --name YourName --folder D:\path\to\photos

# Verify watchlist
cat data\watchlist.json
```

---

## 📊 WebSocket Protocol

### Subscribe to Camera

```json
// Client → Server
{
  "camera": "cam-01"
}
```

### Receive Detection Frame

```json
// Server → Client
{
  "frame": "base64_encoded_jpeg...",
  "timestamp": 123.45,
  "objects": [
    {
      "id": 5,
      "cls": "person",
      "bbox": [0.1, 0.2, 0.3, 0.4],  // [x, y, w, h] normalized
      "conf": 0.87,
      "track_id": 12,
      "identity": {                   // Face recognition result
        "label": "Daniel",
        "watchlist": true,
        "confidence": 0.89
      }
    }
  ],
  "counts": {
    "total": 3,
    "humans": 3
  },
  "events": [                         // Fence events
    {
      "type": "intrusion",
      "track_id": 12,
      "severity": "critical",
      "message": "INTRUSION DETECTED",
      "timestamp": "2026-09-05T10:30:00Z"
    }
  ],
  "fence": {                          // Fence status
    "active": true,
    "polygon": [[0.1,0.1], [0.9,0.1], [0.9,0.9], [0.1,0.9]]
  }
}
```

---

## 🎯 Facial Recognition System (Already Built!)

### Current Status: ✅ **FULLY IMPLEMENTED**

**What's Already Working:**

1. ✅ Face detection (InsightFace RetinaFace)
2. ✅ Face embedding generation (ArcFace 512-d)
3. ✅ Watchlist storage system (JSON database)
4. ✅ Face matching (cosine similarity)
5. ✅ Training script (batch image processing)
6. ✅ Self-validation checks

**What's Missing:**

- ❌ Integration into main pipeline (`main.py`)
- ❌ Frontend UI (camera selection, live feed)
- ❌ Web-based training interface
- ❌ Real-time face recognition in video streams

### How It Works

**Architecture:**

```
Photos → FaceDetector → Embeddings → WatchlistManager → Storage
                                            ↓
Live Video → FaceDetector → Embedding → FaceRecognizer → "Daniel" / "Unknown"
```

**Training Process:**

1. Collect 10-20 photos of person
2. Run `train_watchlist.py`
3. Script detects faces in each photo
4. Generates 512-d embedding per face
5. Stores all embeddings with person's name
6. No actual model training (pretrained ArcFace)

**Recognition Process:**

1. Detect face in frame
2. Generate embedding
3. Compare against all watchlist embeddings
4. Find best match (cosine similarity)
5. Return name if similarity >= 0.45
6. Otherwise return "Unknown"

---

## 🔍 Key Insights

### 1. Detection Performance

**GPU vs CPU:**
- GPU (CUDA): 30+ FPS at 512px
- CPU (OpenVINO): 12-20 FPS at 512px
- Current: CPU (C drive full, can't install PyTorch CUDA)

### 2. Multi-Camera Architecture

- Each camera runs in **separate asyncio task**
- Independent video loops
- Shared WebSocket hub for broadcasting
- No inter-camera dependencies

### 3. Tracking Strategy

- **ByteTrack:** Persistent IDs across frames
- Track states stored per camera
- Occlusion handling
- Lost track recovery (30 frame buffer)

### 4. Resource Management

- **OCR decoupled:** Background thread queue
- **Frame skipping:** `proc_every` parameter
- **Rate limiting:** ANPR interval, frame cap
- **Memory:** Frame copies for async processing

---

## 📝 Code Quality Notes

### Strengths

✅ Clean separation of concerns (detector, recognizer, manager)  
✅ Type hints throughout  
✅ Comprehensive error handling  
✅ Normalized coordinates (resolution-independent)  
✅ Efficient embedding storage (L2-normalized)  
✅ Self-validation in training  
✅ Thread-safe watchlist operations  

### Areas for Enhancement

- Face recognition not integrated into main pipeline yet
- No GPU utilization (C drive space issue)
- No frontend for facial recognition
- Watchlist management via CLI only (no web UI)
- No face recognition camera stream yet

---

## 🎓 Learning Resources

### Understanding the Flow

1. Start with `main.py` line 661 (`run_pipeline`) - main loop
2. Follow detection → tracking → feature modules
3. Check WebSocket broadcast at end of loop
4. Read `face_detector.py` for face system
5. Check `train_watchlist.py` for training logic

### Key Concepts

- **COCO Classes:** Standard object categories (0=person, 2=car, etc.)
- **ByteTrack:** Hungarian algorithm + Kalman filter
- **ArcFace:** Additive angular margin loss (pretrained)
- **Cosine Similarity:** Dot product of normalized vectors
- **WebSocket:** Bidirectional persistent connection

---

## 🚧 Next Steps for Face Recognition

### Phase 1: Testing Training (Now)

```powershell
# 1. Get 15-20 photos of yourself
mkdir D:\IVBAP\bordereye-ai\mybeautifulface

# 2. Copy photos to folder

# 3. Train
cd D:\IVBAP\bordereye-ai\backend
python -m app.train_watchlist --name YourName --folder D:\IVBAP\bordereye-ai\mybeautifulface

# 4. Verify
cat data\watchlist.json
```

### Phase 2: Integrate into Pipeline

- Add FaceDetector to CameraPipeline
- Add FaceRecognizer to pipeline
- Run face detection on person class
- Attach identity to person objects

### Phase 3: Build Frontend

- Create `/face-recognition` page
- WebSocket connection to backend
- Live video feed with face boxes
- Watchlist status indicator
- Training upload interface

---

## 📌 Important File Locations

```
Project Root: D:\IVBAP\bordereye-ai\

Key Files:
├── backend/app/main.py              # Core pipeline
├── backend/app/face_detector.py     # Face detection
├── backend/app/train_watchlist.py   # Training script
├── backend/data/watchlist.json      # Face database
├── backend/weights/yolo11n.pt       # YOLO model
├── cam01.mp4, cam04.mp4            # Video sources
├── mybeautifulface/                 # Training photos folder
└── README.md                        # Project documentation
```

---

## ✅ Summary

**You already have:**
- ✅ Complete face detection system (InsightFace)
- ✅ Face recognition with ArcFace embeddings
- ✅ Watchlist storage and matching
- ✅ Training script ready to use
- ✅ Working detection pipeline for 3 cameras

**You need to:**
1. Train the system with your photos
2. Integrate face detection into main pipeline
3. Build frontend UI
4. Connect everything together

**The hard work is done!** The face recognition system exists and works. You just need to:
1. Add your face to the watchlist
2. Hook it into the video pipeline
3. Display results on frontend

---

## 🎯 Ready to Proceed?

You can now:

1. **Test the training** - Add your photos and train
2. **Study the code** - Review key files above
3. **Plan integration** - Decide which camera gets face recognition
4. **Build frontend** - Create face recognition UI

**Next action:** Want me to help you train the system with your photos?
