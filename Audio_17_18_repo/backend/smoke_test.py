"""Quick smoke test — verifies all real models fire on field samples."""
import os, sys
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
sys.path.insert(0, '.')

from app.pipeline import pipeline
from app.schemas import SensorContext
from app.audio import load_audio
from pathlib import Path

print("=== Warming up real models ===")
st = pipeline.warmup()
for k, v in st.items():
    if isinstance(v, dict):
        print(f"  {k}: ready={v.get('ready')} error={v.get('error')}")

SAMPLES_DIR = Path("data/field_samples") if Path("data/field_samples").exists() else Path("../data/field_samples")
TESTS = [
    ("helicopter_esc50.wav",      "BOP-RJ-014", "Barmer-Jaisalmer Sector", "Rajasthan",       "BSF"),
    ("fireworks_esc50.wav",       "BOP-JK-003", "Jammu-Kathua Belt",       "Jammu & Kashmir", "BSF"),
    ("siren_esc50.wav",           "BOP-PB-011", "Amritsar-Ferozepur",      "Punjab",          "BSF"),
    ("airplane_esc50.wav",        "BOP-RJ-014", "Barmer-Jaisalmer Sector", "Rajasthan",       "BSF"),
    ("crowd_clapping_esc50.wav",  "BOP-WB-021", "North 24 Parganas",       "West Bengal",     "BSF"),
    ("distress_crying_esc50.wav", "BOP-PB-011", "Amritsar-Ferozepur",      "Punjab",          "BSF"),
    ("speech_jfk.flac",           "BOP-JK-003", "Jammu-Kathua Belt",       "Jammu & Kashmir", "BSF"),
    ("uav_bpf_calibration.wav",   "BOP-RJ-014", "Barmer-Jaisalmer Sector", "Rajasthan",       "BSF"),
    ("gunshot_fireworks_impulse.wav","BOP-JK-003","Jammu-Kathua Belt",      "Jammu & Kashmir", "BSF"),
]

PASS = 0
FAIL = 0
print()
print("=== Running inference on field samples ===")
for fname, post_id, sector, state, force in TESTS:
    p = SAMPLES_DIR / fname
    if not p.exists():
        print(f"  SKIP {fname} (not found)")
        continue
    y, sr = load_audio(p)
    ctx = SensorContext(post_id=post_id, sector=sector, state=state, force=force)
    result = pipeline.analyze_array(y, sr, ctx, filename=fname)
    top = result['events'][0] if result['events'] else {}
    drone = result['drone']
    alerts = [a['title'] for a in result['alerts']]
    tr_text = result.get('transcript', {}).get('text', '')[:60]
    print(f"\n  [{fname}]")
    print(f"    Top event  : {top.get('label','?')} ({top.get('score',0):.3f}) via {top.get('source_model','?')}")
    print(f"    Category   : {top.get('category','?')}")
    print(f"    Drone      : threat={drone['threat']} score={drone['threat_score']:.3f} class={drone['class_name']}")
    print(f"    Alerts     : {alerts}")
    if tr_text:
        print(f"    Transcript : {tr_text}")

    # Acceptance criteria
    ok = True
    if fname == "helicopter_esc50.wav" and not drone['threat']:
        print("    FAIL: helicopter should trigger drone threat"); ok=False
    if fname == "fireworks_esc50.wav" and not any("Explosion" in a or "explosion" in a.lower() for a in alerts):
        print("    FAIL: fireworks should trigger explosion alert"); ok=False
    if fname == "siren_esc50.wav" and not any("Alarm" in a or "alarm" in a.lower() for a in alerts):
        print("    FAIL: siren should trigger alarm alert"); ok=False
    if fname == "airplane_esc50.wav" and top.get('category') == 'vehicle':
        print("    FAIL: airplane top category should not be vehicle"); ok=False
    if fname == "uav_bpf_calibration.wav" and not drone['threat']:
        print("    FAIL: UAV calibration tone should trigger drone threat"); ok=False
    if fname == "gunshot_fireworks_impulse.wav" and not (
        any("gun" in a.lower() or "explosion" in a.lower() or "lethal" in a.lower() for a in alerts)
        or top.get('category') in ('gunshot','explosion')
    ):
        print("    WARN: gunshot clip alerts:", alerts); ok=False

    if ok:
        PASS += 1
        print("    PASS")
    else:
        FAIL += 1

print()
print(f"=== Results: {PASS} PASS / {FAIL} FAIL ===")
