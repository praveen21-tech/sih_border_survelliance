import os
import sys
import time
import cv2
import datetime
import numpy as np

# Ensure UTF-8 output encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from nl_query_engine.llm_client import UnifiedLLMClient

def analyze_live_webcam_activity():
    print("[Webcam Analyzer] Connecting to camera device 0...")
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("[Webcam Analyzer] Camera device could not be opened.")
        return None

    # Load Haar Cascades for face, eyes, and upper body
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    upper_body_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_upperbody.xml')

    frames = []
    # Capture multiple frames over 1-2 seconds to analyze motion & gaze
    for _ in range(15):
        ret, frame = cap.read()
        if ret and frame is not None:
            frames.append(frame)
        time.sleep(0.08)

    cap.release()

    if not frames:
        print("[Webcam Analyzer] No frames captured from camera.")
        return None

    last_frame = frames[-1]
    h, w = last_frame.shape[:2]
    gray = cv2.cvtColor(last_frame, cv2.COLOR_BGR2GRAY)

    # 1. Motion Analysis between frames
    motion_score = 0.0
    if len(frames) >= 2:
        diff = cv2.absdiff(cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY), cv2.cvtColor(frames[-1], cv2.COLOR_BGR2GRAY))
        motion_score = float(np.mean(diff))

    # 2. Lighting Analysis
    brightness = float(np.mean(gray))
    lighting_cond = "Normal well-lit environment" if brightness > 80 else ("Low-light environment" if brightness > 30 else "Very dark room")

    # 3. Face Detection
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(60, 60))
    if len(faces) == 0:
        # Check profile face
        faces = profile_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(60, 60))

    # 4. Upper body detection
    upper_bodies = upper_body_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(100, 100))

    person_detected = len(faces) > 0 or len(upper_bodies) > 0
    looking_at_camera = False
    gaze_details = "Not visible"
    distance_est = "Unknown"
    head_pose = "Frontal"

    if len(faces) > 0:
        (fx, fy, fw, fh) = faces[0]
        face_roi_gray = gray[fy:fy+fh, fx:fx+fw]
        
        # Estimate distance based on face size relative to frame
        face_area_ratio = (fw * fh) / (w * h)
        if face_area_ratio > 0.12:
            distance_est = "Close to the camera (sitting right in front of webcam / laptop)"
        elif face_area_ratio > 0.04:
            distance_est = "Medium distance (at a work desk or seated position)"
        else:
            distance_est = "Farther away in the room"

        # Check eye alignment to determine if looking directly at camera
        eyes = eye_cascade.detectMultiScale(face_roi_gray, scaleFactor=1.1, minNeighbors=3, minSize=(20, 20))
        if len(eyes) >= 1:
            looking_at_camera = True
            gaze_details = "Looking directly toward the screen / camera lens"
        else:
            gaze_details = "Head is facing forward; eyes looking slightly off-center or focused on the display"
    elif person_detected:
        distance_est = "Seated in front of the camera"
        gaze_details = "Body visible in camera view"

    # Motion status
    if motion_score > 15.0:
        activity_movement = "Active movement detected (moving hands, gesturing, or changing posture)"
    elif motion_score > 4.0:
        activity_movement = "Subtle movement (typing, head nodding, or natural breathing/posture adjustments)"
    else:
        activity_movement = "Stationary / attentive (sitting still in front of camera)"

    # Compile Visual Facts
    facts = {
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "resolution": f"{w}x{h}",
        "person_present": person_detected,
        "face_count": len(faces),
        "distance": distance_est,
        "looking_at_camera": looking_at_camera,
        "gaze_and_attention": gaze_details,
        "movement_and_activity": activity_movement,
        "motion_intensity": round(motion_score, 2),
        "lighting_condition": lighting_cond,
        "average_brightness": round(brightness, 1)
    }

    print("\n[Visual Facts Extracted from Live Camera]:")
    for k, v in facts.items():
        print(f" - {k}: {v}")

    # Generate Human-Language Narrative using Groq Qwen
    llm = UnifiedLLMClient()
    system_prompt = """
You are an intelligent visual AI assistant communicating directly with the user.
Explain what is happening in front of their camera right now in warm, conversational, clear human language.
Describe whether a person is there, if they are looking at the camera/screen, their distance, motion, and what they appear to be doing.
Keep it natural, friendly, and accurate to the detected visual facts.
"""
    user_prompt = f"""
Visual observation data from user's live camera:
- Person Detected: {facts['person_present']}
- Face Count: {facts['face_count']}
- Proximity / Distance: {facts['distance']}
- Gaze / Attention: {facts['gaze_and_attention']}
- Direct Eye Contact with Camera: {facts['looking_at_camera']}
- Physical Motion / Activity: {facts['movement_and_activity']}
- Lighting & Environment: {facts['lighting_condition']} (Luminance: {facts['average_brightness']}/255)

Please explain what is happening in the live camera feed right now in simple, clear human language.
"""

    response = llm.generate(system_prompt, user_prompt)
    return response, facts

if __name__ == "__main__":
    resp, facts = analyze_live_webcam_activity()
    print("\n" + "=" * 65)
    print(" LIVE CAMERA ACTIVITY ANALYSIS (HUMAN LANGUAGE)")
    print("=" * 65)
    print(resp)
    print("=" * 65)
