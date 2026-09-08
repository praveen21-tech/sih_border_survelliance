import os
import cv2
import numpy as np

def inspect_cam1_cam2():
    os.makedirs("data/cam_samples", exist_ok=True)
    
    for vname in ["cam1.mp4", "cam2.mp4"]:
        cap = cv2.VideoCapture(vname)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_sec = total_frames / fps
        print("=" * 60)
        print(f"File: {vname} | Duration: {duration_sec/60:.2f} mins ({duration_sec:.1f}s) | FPS: {fps:.2f}")

        # Sample at 1s, 10s, 30s, 60s, 120s, 300s
        test_seconds = [1.0, 10.0, 30.0, 60.0, 120.0, 180.0]
        for sec in test_seconds:
            frame_no = int(sec * fps)
            if frame_no < total_frames:
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
                ret, frame = cap.read()
                if ret and frame is not None:
                    out_path = f"data/cam_samples/{vname}_at_{int(sec)}s.jpg"
                    # Resize thumbnail to save space
                    thumb = cv2.resize(frame, (960, 540))
                    cv2.imwrite(out_path, thumb)
                    print(f"  -> Saved frame at {sec}s to {out_path}")
        cap.release()

if __name__ == "__main__":
    inspect_cam1_cam2()
