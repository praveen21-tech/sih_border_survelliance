import re
from typing import Dict, Any, Optional

class QueryIntentParser:
    """
    Parses operator natural language requests into structured surveillance query intents.
    Identifies:
    - Target Intent: 'person_tracking', 'security_events', 'vehicle_anpr', 'watchlist_alerts', 'camera_status', 'general'
    - Target IDs: e.g. 'PERSON_001', 'CAM_01', 'DL-01-AB-1234'
    - Time Range / Urgency / Filters
    """

    INTENT_KEYWORDS = {
        "person_tracking": ["person", "who", "movement", "trajectory", "where did", "where was", "track", "path", "route", "seen", "appearance", "hoodie", "jacket"],
        "security_events": ["event", "incident", "intrusion", "loitering", "breach", "fence", "alarm", "suspicious", "night movement", "violation", "unauthorized"],
        "vehicle_anpr": ["vehicle", "car", "plate", "license", "anpr", "truck", "motorcycle", "parking"],
        "watchlist_alerts": ["watchlist", "wanted", "suspect", "criminal", "hit", "match", "alert", "vikram", "marcus"],
        "camera_status": ["camera", "stream", "feed", "zone", "sector", "cctv", "location"]
    }

    @classmethod
    def parse_query(cls, query: str) -> Dict[str, Any]:
        """
        Extracts key entities, parameters, and intent classification.
        """
        q_lower = query.lower()

        # 1. Classify Intent
        intent_scores = {}
        for intent, kws in cls.INTENT_KEYWORDS.items():
            score = sum(1 for kw in kws if kw in q_lower)
            intent_scores[intent] = score

        best_intent = max(intent_scores, key=intent_scores.get)
        if intent_scores[best_intent] == 0:
            best_intent = "general"

        # 2. Extract Person ID pattern (e.g. PERSON_001, person 1, p1)
        person_match = re.search(r'\b(person[-_\s]*\d{1,4})\b', q_lower)
        extracted_person = None
        if person_match:
            digits = re.findall(r'\d+', person_match.group(1))
            if digits:
                extracted_person = f"PERSON_{int(digits[0]):03d}"

        # 3. Extract Camera ID pattern (e.g. CAM_01, camera 2)
        cam_match = re.search(r'\b(cam[-_\s]*\d{1,2}|camera[-_\s]*\d{1,2})\b', q_lower)
        extracted_camera = None
        if cam_match:
            digits = re.findall(r'\d+', cam_match.group(1))
            if digits:
                extracted_camera = f"CAM_{int(digits[0]):02d}"

        # 4. Extract Plate Pattern
        plate_match = re.search(r'\b([a-zA-Z]{2}[-\s]?\d{2}[-\s]?[a-zA-Z]{1,2}[-\s]?\d{4})\b', query)
        extracted_plate = plate_match.group(1).upper() if plate_match else None

        return {
            "raw_query": query,
            "intent": best_intent,
            "target_person_id": extracted_person,
            "target_camera_id": extracted_camera,
            "target_plate_number": extracted_plate,
            "is_urgent": any(w in q_lower for w in ["urgent", "critical", "immediately", "emergency", "breach"])
        }
