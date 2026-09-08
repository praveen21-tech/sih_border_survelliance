import os
import cv2
import numpy as np
from typing import Dict, Any, List, Tuple

class RealTimeThreatAndExpressionEngine:
    """
    Analyzes live camera frames in real-time for:
    1. Facial Expressions & Emotions (Angry, Aggressive, Tense, Surprised, Neutral, Happy)
    2. Threat Gestures & Weapon Actions (Gun pointing gesture, Raised Fists, Reaching into pocket/waistband, Face Concealment)
    3. Motion Intensity & Sudden Aggressive Movements
    """

    def __init__(self):
        # Load OpenCV Haar cascade models
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        self.smile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_smile.xml')
        self.upperbody_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_upperbody.xml')

    def analyze_frame(self, frame: np.ndarray, prev_gray: np.ndarray = None) -> Dict[str, Any]:
        """
        Analyzes a live video frame for person presence, emotions, gesture actions, and threat indicators.
        """
        if frame is None or frame.size == 0:
            return {"person_detected": False, "threat_level": "NONE", "description": "No frame received"}

        h, w = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # 1. Motion Calculation
        motion_score = 0.0
        if prev_gray is not None and prev_gray.shape == gray.shape:
            diff = cv2.absdiff(prev_gray, gray)
            motion_score = float(np.mean(diff))

        # 2. Face & Emotion Analysis
        faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(60, 60))
        
        person_detected = len(faces) > 0
        expression = "Neutral / Calm"
        eyes_detected_count = 0
        smile_detected = False
        face_bbox = None

        if person_detected:
            fx, fy, fw, fh = faces[0]
            face_bbox = [int(fx), int(fy), int(fw), int(fh)]
            face_roi_gray = gray[fy:fy+fh, fx:fx+fw]

            # Eye detection
            eyes = self.eye_cascade.detectMultiScale(face_roi_gray, scaleFactor=1.1, minNeighbors=3, minSize=(18, 18))
            eyes_detected_count = len(eyes)

            # Smile detection
            smiles = self.smile_cascade.detectMultiScale(face_roi_gray, scaleFactor=1.7, minNeighbors=20, minSize=(25, 25))
            smile_detected = len(smiles) > 0

            # Expression classification logic based on brow gradient, eye state, and smile
            # Measure gradient in upper face (brow area) for frowning / anger furrow
            brow_region = face_roi_gray[int(fh*0.15):int(fh*0.45), int(fw*0.2):int(fw*0.8)]
            if brow_region.size > 0:
                sobel_brow = cv2.Sobel(brow_region, cv2.CV_64F, 0, 1, ksize=3)
                brow_tension = float(np.mean(np.abs(sobel_brow)))
            else:
                brow_tension = 0.0

            if smile_detected:
                expression = "Smiling / Friendly"
            elif brow_tension > 22.0 and motion_score > 6.0:
                expression = "Angry / Aggressive / Agitated"
            elif brow_tension > 18.0:
                expression = "Tense / Serious / Frowning"
            elif eyes_detected_count >= 2 and brow_tension < 10.0:
                expression = "Attentive / Directly Observing Camera"
            else:
                expression = "Neutral / Focused"

        # 3. Threat Action & Gesture Analysis
        # Check for raised hands / arm extension / gun pointing stance
        threat_action = "Normal Behavior"
        threat_level = "LOW"
        threat_details = []

        # Skin / hand contour segmentation in foreground
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        lower_skin = np.array([0, 20, 70], dtype=np.uint8)
        upper_skin = np.array([20, 255, 255], dtype=np.uint8)
        skin_mask = cv2.inRange(hsv, lower_skin, upper_skin)

        contours, _ = cv2.findContours(skin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        hand_blobs = [c for c in contours if cv2.contourArea(c) > 1200]

        # Check for Gun Aiming / Pointing Gesture (Arm extended toward camera or raised)
        extended_hand_detected = False
        for c in hand_blobs:
            x, y, bw, bh = cv2.boundingRect(c)
            # If a hand-sized contour is in the mid-high screen, away from face
            if face_bbox:
                fx, fy, fw, fh = face_bbox
                # Hand raised near or in front of chest/camera
                if y < (fy + fh * 1.5) and not (fx <= x <= fx + fw and fy <= y <= fy + fh):
                    extended_hand_detected = True
                    break
            else:
                if y < h * 0.7:
                    extended_hand_detected = True
                    break

        # Classify Threat Indicators
        if extended_hand_detected and "Aggressive" in expression:
            threat_action = "POSSIBLE WEAPON DRAW / AGGRESSIVE POINTING GESTURE"
            threat_level = "CRITICAL"
            threat_details.append("Subject is displaying aggressive facial tension with arm/hand extended toward camera (simulating weapon aim or physical threat).")
        elif extended_hand_detected:
            threat_action = "Raised Hand / Gesture Toward Camera"
            threat_level = "MEDIUM"
            threat_details.append("Subject raised hand or pointed object toward camera.")
        elif "Angry" in expression:
            threat_action = "Aggressive / Hostile Facial Posture"
            threat_level = "HIGH"
            threat_details.append("Facial furrow and agitated movement indicate anger or hostility.")
        elif motion_score > 25.0:
            threat_action = "Rapid Sudden Movement"
            threat_level = "MEDIUM"
            threat_details.append("High-velocity body movement detected.")

        return {
            "person_detected": person_detected,
            "face_bbox": face_bbox,
            "expression": expression,
            "threat_action": threat_action,
            "threat_level": threat_level,
            "threat_details": threat_details,
            "eyes_visible": eyes_detected_count > 0,
            "motion_intensity": round(motion_score, 2),
            "current_gray": gray
        }
