import os
import cv2
import glob
import numpy as np

def inspect_all_videos():
    videos = sorted(glob.glob("WhatsApp Video*.mp4"))
    os.makedirs("data/video_samples", exist_ok=True)

    for vidx, vpath in enumerate(videos):
        cap = cv2.VideoCapture(vpath)
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps
        print("=" * 60)
        print(f"[{vidx+1}/{len(videos)}] File: {vpath}")
        print(f"Duration: {duration:.2f}s, Total Frames: {total_frames}, FPS: {fps}")

        # Sample 5 keyframes evenly
        sample_indices = np.linspace(0, total_frames - 1, 5, dtype=int)
        for s_idx, f_num in enumerate(sample_indices):
            cap.set(cv2.CAP_PROP_POS_FRAMES, f_num)
            ret, frame = cap.read()
            if ret and frame is not None:
                sec = f_num / fps
                h, w = frame.shape[:2]
                mean_bgr = np.mean(frame, axis=(0,1))
                
                # Check face cascade
                face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = face_cascade.detectMultiScale(gray, 1.1, 3)
                
                # Check upperbody
                ub_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_upperbody.xml')
                ubs = ub_cascade.detectMultiScale(gray, 1.1, 2)

                # Save sample image
                sample_filename = f"data/video_samples/v{vidx+1}_sample_{s_idx}_{sec:.1f}s.jpg"
                cv2.imwrite(sample_filename, frame)

                print(f"  Frame at {sec:.1f}s: Size={w}x{h}, Faces={len(faces)}, UpperBodies={len(ubs)}, Mean BGR=({mean_bgr[0]:.0f},{mean_bgr[1]:.0f},{mean_bgr[2]:.0f}) -> Saved {sample_filename}")

        cap.release()

if __name__ == "__main__":
    inspect_all_videos()
