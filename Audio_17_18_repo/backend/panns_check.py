import os, sys
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
sys.path.insert(0, '.')
from app.engines.panns_engine import PannsEngine
from app.audio import load_audio
from pathlib import Path

p_eng = PannsEngine()
p_eng.load()

p = Path('../data/field_samples/airplane_esc50.wav')
y, sr = load_audio(p)
hits, emb = p_eng.infer(y, sr)
print("=== PANNs top 15 for airplane_esc50.wav ===")
for h in hits[:15]:
    label = h["label"]
    score = h["score"]
    cat = h["category"]
    print("  " + label[:45].ljust(45) + " " + str(round(score,4)) + "  cat=" + cat)
