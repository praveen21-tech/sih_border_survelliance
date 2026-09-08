# BorderEye AI - Setup Instructions

## Prerequisites

- **Node.js** 18+ 
- **Python** 3.10+
- **Git**
- **GPU** (Optional): NVIDIA GPU with CUDA for 3-4x faster processing

---

## 📥 Installation

### 1. Clone Repository

```powershell
git clone https://github.com/DanielSebastin/IVBAP.git
cd IVBAP/bordereye-ai
```

### 2. Download Required Files

#### A. YOLO Model Weights (~6MB)

Download from: https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n.pt

Place in: `backend/weights/yolo11n.pt`

#### B. Video Files (Large - not in repo)

You need to provide your own video files:

- `public/cam01.mp4` - Person detection video
- `public/cam04.mp4` - Virtual fence video  
- `public/vehicledetectionanprclass.mp4` - Vehicle ANPR video
- `public/nightvision.mp4` - Low-light enhancement video

Or use test videos from your source.

### 3. Install Frontend Dependencies

```powershell
npm install
```

### 4. Install Backend Dependencies

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

---

## 🚀 Running the Application

### Terminal 1 - Backend

```powershell
.\run-backend.ps1
```

Or manually:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

### Terminal 2 - Frontend

```powershell
npm run dev
```

### Access Application

Open: http://localhost:3000

---

## 📂 Directory Structure

```
bordereye-ai/
├── backend/
│   ├── app/                    # Python source code
│   ├── data/                   # Runtime data (gitignored)
│   ├── weights/                # YOLO models (download separately)
│   ├── models/                 # Optional models
│   └── requirements.txt
├── src/
│   ├── app/                    # Next.js pages
│   └── components/             # React components
├── public/                     # Video files (download separately)
├── package.json
└── README.md
```

---

## 🎯 First-Time Setup Checklist

- [ ] Clone repository
- [ ] Download yolo11n.pt → backend/weights/
- [ ] Add video files → public/
- [ ] Run `npm install`
- [ ] Create Python venv
- [ ] Run `pip install -r requirements.txt`
- [ ] Start backend (port 8000)
- [ ] Start frontend (port 3000)
- [ ] Open http://localhost:3000

---

## 📝 Notes

### Why are videos not in the repo?

Video files are large (100MB+) and make the repository huge. Download or provide your own test videos.

### Why are model weights not included?

YOLO weights (~6MB) should be downloaded from official sources to ensure you have the latest version.

### GPU Not Working?

If you see "using torch backend (device=cpu)" instead of CUDA:

1. Check CUDA installation: `nvidia-smi`
2. Reinstall PyTorch with CUDA: 
   ```
   pip uninstall torch torchvision
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
   ```

---

## 🆘 Troubleshooting

**Port 8000 already in use:**
```powershell
Get-NetTCPConnection -LocalPort 8000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

**ModuleNotFoundError:**
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Frontend won't start:**
```powershell
rm -rf node_modules package-lock.json
npm install
```

---

For detailed documentation, see:
- **README.md** - Project overview
- **CODEBASE_STUDY.md** - Architecture deep dive
- **CORE_FILES.md** - Critical files reference
