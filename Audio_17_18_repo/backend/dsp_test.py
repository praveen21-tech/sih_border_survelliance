import os, sys
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
sys.path.insert(0, '.')
from app.audio import load_audio
from app.engines.specialist import _impulse_blast, specialist_detect
from pathlib import Path
import numpy as np

for fname in ['gunshot_fireworks_impulse.wav', 'fireworks_esc50.wav']:
    p = Path('../data/field_samples') / fname
    y, sr = load_audio(p)
    y = y.astype('float32') - y.mean()
    imp = _impulse_blast(y, sr)
    print(fname)
    print('  impulse_blast:', imp)
    hits = specialist_detect(y, sr)
    print('  specialist hits:', [(h['label'], round(h['score'],3)) for h in hits])

# UAV physics
from app.audio import acoustic_drone_signature
for fname in ['uav_bpf_calibration.wav', 'helicopter_esc50.wav', 'airplane_esc50.wav']:
    p = Path('../data/field_samples') / fname
    y, sr = load_audio(p)
    sig = acoustic_drone_signature(y, sr)
    print(fname)
    print('  drone_sig:', sig)
