# Bharat Border Audio Intelligence System (Modules 17 & 18)

Operational Acoustic Sentry, Multilingual Speech Intelligence, and Acoustic UAV Detection System developed for border surveillance, remote listening posts, and defense operations.

---

## 1. Executive Summary

The **Bharat Border Audio Intelligence System** is an edge-deployable acoustic and sensor intelligence platform engineered for continuous border monitoring, intrusion detection, and airspace surveillance. The system delivers low-latency threat identification through multi-tier deep neural acoustic classification, multilingual automated speech recognition (ASR) covering all 22 Scheduled Indian Languages, acoustic drone signature analysis based on rotor harmonic physics, and optical sensor fusion.

### Core Modules

* **Module 17: Multimodal Audio Intelligence & Multilingual Speech ASR**
  * Real-time acoustic event detection (AED) covering small arms gunfire, artillery detonations, perimeter intrusions, crowd movements, emergency sirens, and vehicle engines.
  * Faster-Whisper ASR engine (large-v3 architecture) optimized for Indian regional accents and border dialects with automatic CPU/GPU quantization fallbacks.
  * Unicode script classification spanning 10 native writing scripts with automatic primary language identification.
  * Multilingual distress and tactical threat keyword extraction engine with contextual risk escalation.
* **Module 18: Acoustic UAV / Drone Detection Engine**
  * Passive acoustic detection and tracking of micro-quadrotors, commercial UAVs, and fixed-wing drones.
  * Harmonic Blade-Pass Frequency (BPF) analysis and spectral peak tracking in sub-kilohertz bands.
  * Acoustic signature matching across 7 drone profiles (DJI Mavic, Phantom, Matrice, Autel EVO, Skydio, FPV racewings, and fixed-wing surveillance drones).
  * PTZ camera cueing with YOLOv8 visual verification and cross-modal risk fusion.

---

## 2. System Architecture

The platform operates on a layered pipeline architecture designed for asynchronous ingestion, parallel neural inference, and risk fusion.

```
                                  ACOUSTIC & SENSOR INPUTS
                           (Microphone / WAV / RTSP Camera Feeds)
                                            |
                                            v
                 +-----------------------------------------------------+
                 |           INTELLIGENCE INGESTION PIPELINE           |
                 |      (Resampling 16kHz, Normalization, Framing)     |
                 +-----------------------------------------------------+
                                            |
         +--------------------+-------------+-------------+--------------------+
         |                    |                           |                    |
         v                    v                           v                    v
  +--------------+     +--------------+           +---------------+    +---------------+
  | YAMNet Model |     | PANNs CNN14  |           | UAV Physics   |    | Faster-Whisper|
  | (521 Events) |     | (527 Events) |           | & BPF Engine  |    | (large-v3)    |
  +--------------+     +--------------+           +---------------+    +---------------+
         |                    |                           |                    |
         +--------------------+-------------+-------------+--------------------+
                                            |
                                            v
                             +-----------------------------+
                             |   SPECIALIST DSP ENGINES    |
                             | (Impulse, Siren, Harmonics) |
                             +-----------------------------+
                                            |
                                            v
                             +-----------------------------+
                             | MULTI-SENSOR FUSION ENGINE  |
                             |  - Acoustic Risk Weighting  |
                             |  - Speech Keyword Override  |
                             |  - YOLOv8 Visual Validation |
                             +-----------------------------+
                                            |
                                            v
                             +-----------------------------+
                             | SECURE EVIDENCE LEDGER (DB) |
                             |  - SHA-256 Audio Signatures |
                             |  - Incident Classification  |
                             +-----------------------------+
                                            |
                                            v
                             +-----------------------------+
                             |   TACTICAL C2 OPERATIONS    |
                             | (FastAPI + WebSocket Stream)|
                             +-----------------------------+
```

---

## 3. Technology Stack

| Layer | Component | Implementation |
| :--- | :--- | :--- |
| **Runtime & Framework** | Backend Core | Python 3.10+, FastAPI, Uvicorn (ASGI), Pydantic v2 |
| **Speech Intelligence** | ASR Engine | Faster-Whisper (CTranslate2 backend), Whisper large-v3 |
| **Acoustic Neural Models** | General Audio Tagging | YAMNet (TensorFlow / TF-Hub), PANNs CNN14 (PyTorch) |
| **Signal Processing** | DSP & Feature Extraction | Librosa, SciPy Signal, NumPy, PyDub |
| **Computer Vision** | Optical Threat Verification | Ultralytics YOLOv8, OpenCV (cv2) |
| **Data & Persistence** | Evidence Ledger | SQLite3 WAL mode, SHA-256 cryptographic verification |
| **Tactical Dashboard** | Command & Control UI | Vanilla HTML5/CSS3/JavaScript (No external runtime dependencies) |
| **Communication** | Telemetry & Events | WebSocket (RFC 6455), RESTful JSON APIs |

---

## 4. Detailed Technical Capabilities

### 4.1 Multilingual Speech Intelligence (`whisper_engine.py`)

* **Model Backend**: CTranslate2-accelerated Whisper large-v3 with float16 precision on CUDA GPUs and INT8 compute fallback on multi-core CPUs.
* **Dialect & Language Coverage**: Full decoding support for all 22 Scheduled Indian Languages:
  * Hindi (`hi`), Marathi (`mr`), Punjabi (`pa`), Bengali (`bn`), Gujarati (`gu`), Tamil (`ta`), Telugu (`te`), Kannada (`kn`), Malayalam (`ml`), Odia (`or`), Urdu (`ur`), Nepali (`ne`), Assamese (`as`), Sanskrit (`sa`), Kashmiri (`ks`), Sindhi (`sd`), Maithili (`mai`), Dogri (`doi`), Konkani (`kok`), Bodo (`brx`), Santhali (`sat`), Manipuri (`mni`).
* **Script Identification**: Automatic Unicode script classification mapping Devanagari, Bengali, Gurmukhi, Gujarati, Tamil, Telugu, Kannada, Malayalam, Perso-Arabic, and Latin character distributions.

### 4.2 Threat & Distress Lexicon Taxonomy (`ontology.py`)

The system maps detected spoken words against structured operational threat categories:

| Threat Category | Operational Meaning | Native Script Keyword Coverage |
| :--- | :--- | :--- |
| `Bachat / Pachao` | Distress / Rescue / Help | Bachao, Madad, Sahayata, Kaapaathunga, Kaapadi, Bachawa, Bachao-Bachao |
| `Goli / Aakraman` | Kinetic Attack / Gunfire / Ambush | Goli, Bandook, Hamla, Aakraman, Vedippu, Kalpvettu, Fire, Shoot, Attack |
| `Bomb / Dhamaka` | Explosive Device / IED / Mine | Bomb, Dhamaka, Visphot, Surang, Gundasu, Veedichu, Blast, Explosion |
| `Sema / Border` | Infiltration / Border Breach | Border, Seema, Ghuspeth, Taar, Kaval, Eliya, Intruder, Fence |
| `Dron / Drone` | Airborne Threat / Drone Delivery | Drone, UAV, Viman, Paravai, Hexacopter, Quadcopter |

### 4.3 Acoustic UAV Physics Engine (`drone_engine.py` & `drone_classifier.py`)

Drones generate acoustic signatures characterized by narrow-band harmonic peaks caused by rotor blade passages through the air:

$$\text{BPF} = \frac{\text{RPM}}{60} \times N_{\text{blades}}$$

* **Frequency Range Analyzed**: 100 Hz to 6,000 Hz.
* **Harmonic Tracking**: Detects fundamental frequencies ($f_0$) and integer multiples ($2f_0, 3f_0, 4f_0$).
* **Profile Classification**: Compares observed spectral envelopes against known UAV acoustic profiles (Micro Quadrotor, DJI Mavic 3, DJI Phantom 4, DJI Matrice 300, Heavy Hexacopter, FPV Racing Quad, Fixed-Wing Surveillance).

### 4.4 Multi-Sensor Risk Fusion (`fusion.py`)

The fusion module computes a composite tactical risk score $R \in [0, 1.0]$:

$$R = \alpha \cdot S_{\text{acoustic}} + \beta \cdot S_{\text{visual}} + \gamma \cdot S_{\text{speech}}$$

Where weights are dynamically calibrated based on sensor confidence. Threat levels are mapped as follows:
* **CRITICAL ($R \ge 0.75$)**: Immediate tactical threat (e.g. Gunfire detected with confirmed visual weapon or spoken distress).
* **WARNING ($0.45 \le R < 0.75$)**: Potential threat or elevated activity (e.g. High acoustic engine signature near fence).
* **INFO ($R < 0.45$)**: Routine ambient logging and background operational classification.

---

## 5. Repository Structure

```
border-audio-intelligence/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI application entrypoint & routing
│   │   ├── config.py                 # System configurations and model parameters
│   │   ├── pipeline.py               # Multimodal audio analysis pipeline
│   │   ├── ontology.py               # Security taxonomy and multilingual keyword lexicon
│   │   ├── db.py                     # SQLite evidence ledger & audit trail
│   │   ├── audio.py                  # Audio preprocessing, chunking, and spectrograms
│   │   ├── camera_stream.py          # RTSP camera feed management & PTZ tracking
│   │   ├── field_samples.py          # Field test audio fixtures
│   │   ├── schemas.py                # Pydantic data models & request/response schemas
│   │   └── engines/
│   │       ├── __init__.py
│   │       ├── whisper_engine.py     # Faster-Whisper ASR & script detection
│   │       ├── fusion.py             # Multi-sensor risk fusion & alert generator
│   │       ├── drone_engine.py       # Acoustic UAV physics & tracking engine
│   │       ├── drone_classifier.py   # UAV profile classifier & harmonic analysis
│   │       ├── panns_engine.py       # PANNs CNN14 audio tagging wrapper
│   │       ├── yamnet_engine.py      # YAMNet audio event classifier wrapper
│   │       ├── specialist.py         # DSP impulse & siren detector
│   │       ├── vision_engine.py      # YOLOv8 visual detection wrapper
│   │       └── assets.py             # Asset paths and model discovery
│   ├── dsp_test.py                   # DSP engine validation script
│   ├── panns_check.py                # PANNs model loading verification
│   ├── requirements.txt              # Production Python package dependencies
│   ├── run.py                        # Uvicorn server launcher
│   ├── run_battery.py                # Batch benchmark runner
│   ├── smoke_camera.py               # Camera & RTSP verification script
│   ├── smoke_drone.py                # Acoustic drone detector verification
│   ├── smoke_test.py                 # End-to-end integration test suite
│   └── test_multilingual_whisper.py  # Multilingual ASR & script detection tests
├── data/
│   ├── real_samples/                 # Standard environmental test audio clips
│   ├── evidence/                     # Cryptographically hashed evidence storage
│   └── models/                       # Local model storage directory (excluded from git)
├── frontend/
│   ├── index.html                    # Module 17 Tactical Audio Intelligence Console
│   ├── styles.css                    # Tactical UI stylesheet (Dark theme / C2 layout)
│   ├── app.js                        # Module 17 Console application logic & WebSocket
│   ├── drone.html                    # Module 18 Acoustic Drone Sentry Console
│   ├── drone.css                     # Drone radar and spectrum UI stylesheet
│   └── drone.js                      # Drone telemetry visualization & radar canvas
├── scripts/
│   ├── analyze_file.py               # CLI tool for audio file analysis
│   └── fetch_real_samples.py         # Test sample downloader
├── start_ops_console.bat             # Windows one-click tactical console startup script
└── README.md
```

---

## 6. Installation & Deployment

### 6.1 Prerequisites

* **Operating System**: Linux (Ubuntu 22.04 LTS recommended), Windows Server 2019+, or macOS
* **Python**: Version 3.10 or 3.11
* **System Packages**: `ffmpeg` (required for audio stream decoding)
* **Hardware Requirements**:
  * Minimum: 4-Core CPU, 8 GB RAM (CPU INT8 inference mode)
  * Recommended: 8-Core CPU, 16 GB RAM, NVIDIA GPU with 8 GB VRAM (CUDA 11.8 / 12.x)

### 6.2 Setup Procedure

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/VaishalMalu/Bharat-Border-Audio-Intelligence-Modules-17-18-.git
   cd Bharat-Border-Audio-Intelligence-Modules-17-18-
   ```

2. **Configure Virtual Environment**:
   ```bash
   cd backend
   python -m venv .venv
   
   # Windows:
   .venv\Scripts\activate
   
   # Linux / macOS:
   source .venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Launch Application Server**:
   ```bash
   python run.py
   ```
   The application initializes the models and binds to `http://0.0.0.0:8080`.

---

## 7. Operational Consoles

* **Module 17 Tactical Sentry Console**: `http://localhost:8080/`
  * Real-time acoustic spectrogram waterfall display
  * Event timeline and threat classification gauges
  * Live multilingual speech transcription with script identification
  * Tactical alert ledger with SHA-256 evidence integrity links

* **Module 18 Drone Defense Sentry**: `http://localhost:8080/drone.html`
  * 360-degree acoustic radar sweep display
  * Blade-Pass Frequency harmonic spectrum visualizer
  * Real-time UAV classification confidence meters
  * PTZ camera tracking cueing interface

---

## 8. REST & WebSocket API Specification

### 8.1 REST Endpoints

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Returns system operational status, memory usage, and loaded engine health. |
| `GET` | `/api/v1/sectors` | Lists active border listening posts and geographic sector metadata. |
| `POST` | `/api/v1/audio/analyze` | Ingests WAV/MP3 audio payload for full multi-engine neural inference. |
| `GET` | `/api/v1/alerts` | Queries persistent alert ledger with severity, sector, and time filters. |
| `GET` | `/api/v1/drone/status` | Returns active acoustic UAV tracking status and harmonic analysis. |
| `GET` | `/api/v1/drone/tracks` | Retrieves historical acoustic drone tracking trajectories. |
| `GET` | `/api/v1/camera/sources` | Lists active optical camera streams and YOLOv8 inference status. |

### 8.2 WebSocket Telemetry Stream

* **Endpoint**: `ws://localhost:8080/ws/ops`
* **Protocol**: Real-time JSON telemetry stream transmitting live audio energy levels, acoustic event probabilities, speech transcript tokens, and threat alert notices at 10 Hz.

---

## 9. Verification & Automated Test Suites

Execute the following test scripts to validate model pipelines and inference integrity:

```bash
# Verify Multilingual ASR & 10-Script Keyword Detection
python backend/test_multilingual_whisper.py

# Verify Acoustic Drone Physics & Harmonic BPF Classifier
python backend/smoke_drone.py

# Execute Full Multimodal Integration Test Suite
python backend/smoke_test.py
```

---

## 10. Operational Security & Governance

* **Data Integrity**: Audio evidence captures are hashed using SHA-256 upon arrival and stored in an immutable operational ledger.
* **Data Sovereignty**: All neural inference (ASR, Acoustic Event Detection, Computer Vision) executes entirely on-premise / on-edge without external network dependencies or external API calls.
* **Access Classification**: RESTRICTED — Engineered for national border defense infrastructure, security command centers, and authorized surveillance operations.
