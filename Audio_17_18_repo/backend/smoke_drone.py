"""
Module 18 smoke test — Acoustic Drone Detection end-to-end.
Tests all new endpoints, DB persistence, classifier pipeline, and WebSocket.
"""
import os, sys, json, time, urllib.request, urllib.error
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL']  = '3'
sys.path.insert(0, '.')

BASE = "http://127.0.0.1:8080"
PASS = 0
FAIL = 0

def check(name, ok, detail=""):
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f"  PASS  {name}")
    else:
        FAIL += 1
        print(f"  FAIL  {name}" + (f" — {detail}" if detail else ""))

def get(path):
    req = urllib.request.Request(BASE + path, headers={"Accept":"application/json"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read()), r.status

def post(path, data=b"", content_type="application/json"):
    req = urllib.request.Request(BASE + path, data=data, method="POST",
                                  headers={"Content-Type": content_type})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read()), r.status

print("\n" + "="*60)
print("  MODULE 18 SMOKE TEST — Acoustic Drone Detection")
print("="*60)

# ── 1. Health check ─────────────────────────────────────────────────────────
print("\n[1] Health & model status")
h, status = get("/api/v1/health")
check("HTTP 200",         status == 200)
check("operational",      h.get("status") == "operational")
check("drone_classifier in models", "drone_classifier" in h.get("models", {}))
m = h.get("models", {})
check("drone_classifier ready",   m.get("drone_classifier", {}).get("ready") == True)
check("drone_physics ready",      m.get("drone_physics",    {}).get("ready") == True)
check("profiles=7",               m.get("drone_classifier", {}).get("profiles") == 7)

# ── 2. Drone profiles endpoint ──────────────────────────────────────────────
print("\n[2] GET /api/v1/drone/profiles")
p, _ = get("/api/v1/drone/profiles")
check("profiles key present",        "profiles" in p)
check("count=7",                     p.get("count") == 7)
check("dji_phantom_mavic present",   "dji_phantom_mavic"   in p["profiles"])
check("hexarotor_heavy present",     "hexarotor_heavy"     in p["profiles"])
check("military_octorotor present",  "military_octorotor"  in p["profiles"])
check("fixed_wing_electric present", "fixed_wing_electric" in p["profiles"])
prof = p["profiles"]["dji_phantom_mavic"]
check("DJI bpf_lo=140",    prof.get("bpf_lo") == 140)
check("DJI bpf_hi=220",    prof.get("bpf_hi") == 220)
check("DJI frame=quadrotor", prof.get("frame") == "quadrotor")
check("DJI threat_tier HIGH", prof.get("threat_tier") == "HIGH")
check("DJI hindi label present", bool(prof.get("hindi")))

# ── 3. Drone status endpoint ─────────────────────────────────────────────────
print("\n[3] GET /api/v1/drone/status")
ds, _ = get("/api/v1/drone/status")
check("system_warning_level present",  "system_warning_level" in ds)
check("highest_threat_score present",  "highest_threat_score" in ds)
check("posts_monitored present",       "posts_monitored" in ds)
check("total_detections present",      "total_detections" in ds)
check("drone_classes list len=7",      len(ds.get("drone_classes", [])) == 7)
check("threshold=0.42",                ds.get("threshold") == 0.42)
check("db_stats present",              "db_stats" in ds)

# ── 4. Drone tracks endpoint ────────────────────────────────────────────────
print("\n[4] GET /api/v1/drone/tracks")
dt, _ = get("/api/v1/drone/tracks?limit=10")
check("count key present",  "count" in dt)
check("tracks key present", "tracks" in dt)
check("stats key present",  "stats"  in dt)
check("stats.total present", "total" in dt.get("stats", {}))

# ── 5. Active threats endpoint ──────────────────────────────────────────────
print("\n[5] GET /api/v1/drone/active-threats")
at, _ = get("/api/v1/drone/active-threats")
check("threats key present", "threats" in at)
check("status key present",  "status"  in at)

# ── 6. Full pipeline — helicopter clip ──────────────────────────────────────
print("\n[6] Full pipeline — helicopter_esc50.wav (expect DRONE THREAT)")
from pathlib import Path
from app.pipeline import pipeline
from app.schemas  import SensorContext
from app.audio    import load_audio

pipeline.warmup()
p_clip = Path("../data/field_samples/helicopter_esc50.wav")
y, sr = load_audio(p_clip)
ctx = SensorContext(post_id="BOP-RJ-014", sector="Barmer-Jaisalmer Sector",
                    state="Rajasthan", force="BSF")
result = pipeline.analyze_array(y, sr, ctx, filename="helicopter_esc50.wav")
drone = result.get("drone", {})

check("threat=True",                       drone.get("threat") == True)
check("threat_score > 0.42",               drone.get("threat_score", 0) > 0.42)
check("early_warning_level != NONE",       drone.get("early_warning_level") != "NONE")
check("drone_class not none",              drone.get("drone_class") not in (None, "none"))
check("class_label present",               bool(drone.get("class_label")))
check("model_votes.yamnet_aerial > 0",     drone.get("model_votes", {}).get("yamnet_aerial", 0) > 0)
check("model_votes.panns_aerial > 0",      drone.get("model_votes", {}).get("panns_aerial",  0) > 0)
check("model_votes.physics > 0",           drone.get("model_votes", {}).get("physics",       0) > 0)
check("model_votes.profile_match present", "profile_match" in drone.get("model_votes", {}))
check("timeline len > 0",                  len(drone.get("timeline", [])) > 0)
check("camera_cue present",                "camera_cue" in drone)
check("recommended_action non-empty",      bool(drone.get("recommended_action")))
check("physics_detail.bpf_hz > 0",        drone.get("physics_detail", {}).get("bpf_hz", 0) > 0)
print(f"       threat_score={drone.get('threat_score'):.4f}  "
      f"class={drone.get('drone_class')}  "
      f"EW={drone.get('early_warning_level')}")
cue = drone.get("camera_cue", {})
print(f"       camera_cue: pan={cue.get('pan_deg')}° tilt={cue.get('tilt_deg')}° "
      f"zoom=x{cue.get('zoom_level')} priority={cue.get('priority')}")
tl = drone.get("timeline", [])
print(f"       timeline frames={len(tl)}  max_score={max((f['score'] for f in tl), default=0):.4f}")

# ── 7. Full pipeline — UAV calibration (physics-dominant) ───────────────────
print("\n[7] Full pipeline — uav_bpf_calibration.wav (expect physics-dominant)")
p_uav = Path("../data/field_samples/uav_bpf_calibration.wav")
y2, sr2 = load_audio(p_uav)
ctx2 = SensorContext(post_id="BOP-RJ-014", sector="Barmer-Jaisalmer Sector",
                     state="Rajasthan", force="BSF")
r2   = pipeline.analyze_array(y2, sr2, ctx2, filename="uav_bpf_calibration.wav")
d2   = r2.get("drone", {})
check("UAV cal threat=True",               d2.get("threat") == True)
check("UAV cal threat_score > 0.42",       d2.get("threat_score", 0) > 0.42)
check("UAV cal physics > 0.5",             d2.get("model_votes", {}).get("physics", 0) > 0.5)
check("UAV cal bpf near 180 Hz",           abs(d2.get("physics_detail", {}).get("bpf_hz", 0) - 180) < 30)
print(f"       threat_score={d2.get('threat_score'):.4f}  "
      f"physics={d2.get('model_votes',{}).get('physics'):.4f}  "
      f"bpf={d2.get('physics_detail',{}).get('bpf_hz'):.1f} Hz")

# ── 8. Full pipeline — non-drone clip ───────────────────────────────────────
print("\n[8] Full pipeline — fireworks_esc50.wav (expect NO drone threat)")
p_fw = Path("../data/field_samples/fireworks_esc50.wav")
y3, sr3 = load_audio(p_fw)
ctx3 = SensorContext(post_id="BOP-JK-003", sector="Jammu-Kathua Belt",
                     state="Jammu & Kashmir", force="BSF")
r3   = pipeline.analyze_array(y3, sr3, ctx3, filename="fireworks_esc50.wav")
d3   = r3.get("drone", {})
check("fireworks threat=False",            d3.get("threat") == False)
check("fireworks EW level=NONE or WATCH",  d3.get("early_warning_level") in ("NONE", "WATCH"))
print(f"       threat_score={d3.get('threat_score'):.4f}  "
      f"EW={d3.get('early_warning_level')}")

# ── 9. DB persistence — drone track saved ───────────────────────────────────
print("\n[9] DB persistence — drone_tracks table")
dt2, _ = get("/api/v1/drone/tracks?limit=5")
tracks = dt2.get("tracks", [])
check("at least 3 tracks in DB",  len(tracks) >= 3)
if tracks:
    t0 = tracks[0]
    check("track.post_id present",      bool(t0.get("post_id")))
    check("track.threat_score present", t0.get("threat_score") is not None)
    check("track.drone_class present",  t0.get("drone_class") is not None)
    check("track.camera_cue dict",      isinstance(t0.get("camera_cue"), dict))
    check("track.model_votes dict",     isinstance(t0.get("model_votes"), dict))
    check("track.physics_detail dict",  isinstance(t0.get("physics_detail"), dict))
print(f"       {len(tracks)} tracks retrieved from SQLite")

# ── 10. Camera cue endpoint ──────────────────────────────────────────────────
print("\n[10] GET /api/v1/drone/camera-cue/BOP-RJ-014")
try:
    cc, _ = post("/api/v1/drone/camera-cue/BOP-RJ-014")
    check("camera_cue key present",  "camera_cue" in cc)
    check("post_id matches",         cc.get("post_id") == "BOP-RJ-014")
    check("early_warning present",   "early_warning" in cc)
    check("drone_class present",     "drone_class" in cc)
    cue2 = cc.get("camera_cue", {})
    check("pan_deg present",         "pan_deg"    in cue2)
    check("tilt_deg present",        "tilt_deg"   in cue2)
    check("zoom_level present",      "zoom_level" in cue2)
    check("priority present",        "priority"   in cue2)
    print(f"       pan={cue2.get('pan_deg')}° tilt={cue2.get('tilt_deg')}° "
          f"zoom=x{cue2.get('zoom_level')} priority={cue2.get('priority')}")
except urllib.error.HTTPError as e:
    check("camera-cue endpoint accessible", False, str(e))

# ── 11. Track summary ────────────────────────────────────────────────────────
print("\n[11] Track summary in pipeline result")
check("track_summary in heli result",   "track_summary" in result.get("drone", {}))
ts = result["drone"].get("track_summary", {})
check("track_summary.count > 0",        ts.get("count", 0) > 0)
check("track_summary.max_score > 0",    ts.get("max_score", 0) > 0)
check("track_summary.trend present",    "trend" in ts)
print(f"       count={ts.get('count')} max={ts.get('max_score'):.4f} trend={ts.get('trend')}")

# ── 12. Frontend files served ────────────────────────────────────────────────
print("\n[12] Frontend files")
for path, keyword in [
    ("/",                    "BorderEye"),
    ("/drone.html",          "Module 18"),
    ("/drone.css",           "drone-grid"),
    ("/drone.js",            "renderCameraCue"),
    ("/styles.css",          "tricolor-bar"),
    ("/app.js",              "uploadBlob"),
]:
    try:
        req = urllib.request.Request(BASE + path, headers={"Accept":"text/html,text/css,application/javascript,*/*"})
        with urllib.request.urlopen(req, timeout=10) as r:
            body = r.read().decode("utf-8", errors="replace")
            check(f"GET {path} contains '{keyword}'", keyword in body)
    except Exception as e:
        check(f"GET {path}", False, str(e))

# ── Summary ──────────────────────────────────────────────────────────────────
print()
print("="*60)
print(f"  RESULTS: {PASS} PASS  /  {FAIL} FAIL")
print("="*60)
sys.exit(0 if FAIL == 0 else 1)
