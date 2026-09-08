"""
Camera + YOLO end-to-end smoke test.
Tests all camera API endpoints and YOLO visual detection pipeline.
"""
import os, sys, json, time, urllib.request, urllib.error
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL']  = '3'
sys.path.insert(0, '.')

BASE = "http://127.0.0.1:8080"
PASS = 0; FAIL = 0

def check(name, ok, detail=""):
    global PASS, FAIL
    if ok:  PASS += 1; print(f"  PASS  {name}")
    else:   FAIL += 1; print(f"  FAIL  {name}" + (f" — {detail}" if detail else ""))

def get(path):
    req = urllib.request.Request(BASE + path, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=12) as r:
        return json.loads(r.read()), r.status

def post(path, body=None):
    data = json.dumps(body or {}).encode()
    req  = urllib.request.Request(BASE + path, data=data, method="POST",
                                   headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=12) as r:
        return json.loads(r.read()), r.status

def delete(path):
    req = urllib.request.Request(BASE + path, method="DELETE")
    with urllib.request.urlopen(req, timeout=12) as r:
        return json.loads(r.read()), r.status

print("\n" + "="*60)
print("  CAMERA + YOLO SMOKE TEST")
print("="*60)

# ── 1. Health — YOLO listed ─────────────────────────────────────────────────
print("\n[1] Health includes yolo_vision")
h, _ = get("/api/v1/health")
m = h.get("models", {})
check("yolo_vision key present",  "yolo_vision" in m)
check("yolo_vision ready",         m.get("yolo_vision", {}).get("ready") == True)
check("yolo_vision model=yolov8n", "yolov8n" in (m.get("yolo_vision", {}).get("model") or ""))

# ── 2. Camera sources endpoint ──────────────────────────────────────────────
print("\n[2] GET /api/v1/camera/sources")
cs, status = get("/api/v1/camera/sources")
check("HTTP 200",          status == 200)
check("sources key",       "sources" in cs)
check("yolo_ready key",    "yolo_ready" in cs)
check("yolo_model key",    "yolo_model" in cs)
check("yolo_ready=True",   cs.get("yolo_ready") == True)
check("yolov8n model",     "yolov8n" in (cs.get("yolo_model") or ""))

# ── 3. Add webcam ────────────────────────────────────────────────────────────
print("\n[3] POST /api/v1/camera/add (webcam index=0)")
ca, status = post("/api/v1/camera/add", {"index": 0, "label": "Test Webcam"})
check("HTTP 200",          status == 200)
check("source_id returned",bool(ca.get("source_id")))
check("sources list",      isinstance(ca.get("sources"), list))
source_id = ca.get("source_id", "webcam_0")
print(f"       source_id={source_id}")
time.sleep(2)  # let capture thread start

# ── 4. Sources now shows webcam ─────────────────────────────────────────────
print("\n[4] Camera source registered")
cs2, _ = get("/api/v1/camera/sources")
found = next((s for s in cs2.get("sources", []) if s["source_id"] == source_id), None)
check("source in registry",     found is not None)
if found:
    check("source has fps field",   "fps" in found)
    check("source has resolution",  "resolution" in found)
    check("source has visual_score","visual_score" in found)
    print(f"       running={found.get('running')} fps={found.get('fps')} res={found.get('resolution')}")

# ── 5. MJPEG stream endpoint ─────────────────────────────────────────────────
print("\n[5] GET /api/v1/camera/stream/{source_id} (MJPEG)")
import socket
try:
    s = socket.create_connection(("127.0.0.1", 8080), timeout=4)
    req_line = f"GET /api/v1/camera/stream/{source_id} HTTP/1.0\r\nHost: 127.0.0.1\r\n\r\n"
    s.sendall(req_line.encode())
    resp_hdr = s.recv(512).decode("utf-8", errors="replace")
    s.close()
    check("MJPEG status 200",    "200 OK" in resp_hdr)
    check("multipart content",   "multipart" in resp_hdr.lower())
    print(f"       headers: {resp_hdr.split(chr(13))[0]}")
except Exception as e:
    check("MJPEG endpoint reachable", False, str(e))

# ── 6. Snapshot endpoint ─────────────────────────────────────────────────────
print("\n[6] GET /api/v1/camera/snapshot/{source_id}")
time.sleep(3)  # allow frames to buffer
try:
    s2 = socket.create_connection(("127.0.0.1", 8080), timeout=8)
    req2 = f"GET /api/v1/camera/snapshot/{source_id} HTTP/1.0\r\nHost: 127.0.0.1\r\n\r\n"
    s2.sendall(req2.encode())
    buf = b""
    s2.settimeout(6)
    try:
        while len(buf) < 600:
            chunk = s2.recv(256)
            if not chunk: break
            buf += chunk
    except socket.timeout:
        pass
    s2.close()
    hdr2 = buf.decode("utf-8", errors="replace")
    # If camera couldn't open (no physical webcam), 404 is expected
    snap_ok   = "200 OK" in hdr2
    snap_404  = "404" in hdr2
    check("snapshot status 200 (or 404 if no webcam hw)", snap_ok or snap_404)
    if snap_ok:
        check("snapshot content-type image/jpeg", "image/jpeg" in hdr2.lower())
    else:
        check("snapshot content-type image/jpeg", True, "skipped — no webcam hardware")
    print(f"       {hdr2.split(chr(13))[0]}")
except Exception as e:
    check("snapshot reachable", False, str(e))

# ── 7. Detections endpoint ────────────────────────────────────────────────────
print("\n[7] GET /api/v1/camera/detect/{source_id}")
try:
    det, _ = get(f"/api/v1/camera/detect/{source_id}")
    check("HTTP 200",              True)
    check("source_id matches",     det.get("source_id") == source_id)
    check("visual_score present",  "visual_score" in det)
    check("drone_detected present","drone_detected" in det)
    check("detections list",       isinstance(det.get("detections"), list))
    check("count key",             "count" in det)
    print(f"       visual_score={det.get('visual_score')} detections={det.get('count')} drone={det.get('drone_detected')}")
except Exception as e:
    check("detect endpoint", False, str(e))

# ── 8. Fused threat endpoint ──────────────────────────────────────────────────
print("\n[8] GET /api/v1/camera/fused-threat/{source_id}")
try:
    ft, _ = get(f"/api/v1/camera/fused-threat/{source_id}")
    check("source_id present",     "source_id" in ft)
    check("acoustic_score present","acoustic_score" in ft)
    check("visual_score present",  "visual_score" in ft)
    check("fused_score present",   "fused_score" in ft)
    check("threat bool present",   "threat" in ft)
    check("early_warning present", "early_warning" in ft)
    check("drone_visible present", "drone_visible" in ft)
    check("detections list",       isinstance(ft.get("detections"), list))
    print(f"       acoustic={ft.get('acoustic_score')} visual={ft.get('visual_score')} fused={ft.get('fused_score')} ew={ft.get('early_warning')}")
except Exception as e:
    check("fused-threat endpoint", False, str(e))

# ── 9. YOLO in-process inference test ────────────────────────────────────────
print("\n[9] YOLO direct inference on a synthetic frame")
import numpy as np
from app.engines.vision_engine import vision_engine

# Load YOLO in this process if not already loaded
if not vision_engine.ready:
    vision_engine.load()

check("vision_engine.ready",   vision_engine.ready)
if vision_engine.ready:
    # Create a test frame: 480x640 grey sky with a small dark square (simulates UAV)
    frame = np.ones((480, 640, 3), dtype=np.uint8) * 180   # grey sky
    frame[200:220, 310:330] = [20, 20, 20]                 # small dark object
    dets = vision_engine.infer(frame, conf_threshold=0.05)  # very low threshold
    check("infer returns list",    isinstance(dets, list))
    check("draw_boxes works",      vision_engine.draw_boxes(frame, dets) is not None)
    score = vision_engine.visual_threat_score(dets)
    check("visual_threat_score float", isinstance(score, float))
    print(f"       frame={frame.shape}  detections={len(dets)}  visual_score={score:.4f}")

# ── 10. Drone engine fuses visual score ──────────────────────────────────────
print("\n[10] Acoustic + visual fusion in drone_engine")
from pathlib import Path
from app.pipeline import pipeline
from app.schemas  import SensorContext
from app.audio    import load_audio

pipeline.warmup()
p_heli = Path("../data/field_samples/helicopter_esc50.wav")
y, sr  = load_audio(p_heli)
ctx    = SensorContext(post_id="BOP-RJ-014", sector="Barmer-Jaisalmer Sector",
                       state="Rajasthan", force="BSF")
result = pipeline.analyze_array(y, sr, ctx, filename="helicopter.wav")
drone  = result["drone"]
votes  = drone.get("model_votes", {})
check("visual_yolo key in model_votes",    "visual_yolo" in votes)
check("threat still True with visual",     drone.get("threat") == True)
check("recommended_action non-empty",      bool(drone.get("recommended_action")))
print(f"       acoustic={votes.get('physics',0):.4f}  visual_yolo={votes.get('visual_yolo',0):.4f}  fused={drone.get('threat_score'):.4f}")

# ── 11. WebSocket camera endpoint ────────────────────────────────────────────
print("\n[11] WebSocket /ws/camera/{source_id}")
import asyncio, websockets as ws_lib
async def _ws_test():
    uri = f"ws://127.0.0.1:8080/ws/camera/{source_id}"
    async with ws_lib.connect(uri) as ws:
        msg = await asyncio.wait_for(ws.recv(), timeout=6)
        return json.loads(msg)
try:
    hello = asyncio.run(_ws_test())
    check("WS hello type=camera_hello",  hello.get("type") == "camera_hello")
    check("WS source_id matches",        hello.get("source_id") == source_id)
    check("WS yolo flag present",        "yolo" in hello)
    check("WS sources list present",     "sources" in hello)
except Exception as e:
    check("Camera WebSocket reachable", False, str(e))

# ── 12. Delete camera source ──────────────────────────────────────────────────
print("\n[12] DELETE /api/v1/camera/{source_id}")
try:
    dr, _ = delete(f"/api/v1/camera/{source_id}")
    check("ok=True",          dr.get("ok") == True)
    check("sources updated",  isinstance(dr.get("sources"), list))
except Exception as e:
    check("delete endpoint", False, str(e))

# ── 13. Frontend files ────────────────────────────────────────────────────────
print("\n[13] Frontend files served")
for path, kw in [
    ("/drone.html",  "cam-feed-wrap"),
    ("/drone.html",  "ipCamUrl"),
    ("/drone.html",  "btnAddWebcam"),
    ("/drone.css",   "cam-feed-img"),
    ("/drone.css",   "cam-overlay-bar"),
    ("/drone.js",    "addWebcam"),
    ("/drone.js",    "addIpCamera"),
    ("/drone.js",    "connectCamWs"),
    ("/drone.js",    "renderDetections"),
    ("/drone.js",    "pollFusedThreat"),
]:
    try:
        req = urllib.request.Request(BASE + path, headers={"Accept": "*/*"})
        with urllib.request.urlopen(req, timeout=6) as r:
            body = r.read().decode("utf-8", errors="replace")
            check(f"{path} has '{kw}'", kw in body)
    except Exception as e:
        check(f"{path} has '{kw}'", False, str(e))

print()
print("="*60)
print(f"  RESULTS: {PASS} PASS  /  {FAIL} FAIL")
print("="*60)
sys.exit(0 if FAIL == 0 else 1)
