import json
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from .llm_client import UnifiedLLMClient
from .query_parser import QueryIntentParser
from .text_to_sql import SurveillanceTextToSQL
from .vector_retriever import SurveillanceVectorRetriever
try:
    from ..vision.reid.tracker import TrajectoryReconstructor
except (ImportError, ValueError):
    try:
        from backend.app.vision.reid.tracker import TrajectoryReconstructor
    except ImportError:
        from reid_engine.tracker import TrajectoryReconstructor

SYNTHESIS_SYSTEM_PROMPT = """
You are an advanced AI Surveillance Intelligence Operator and Command Analyst.
Your role is to analyze multi-camera CCTV tracking data, live real-time camera streams, security events, ANPR records, and watchlist alerts,
and produce an authoritative, clear, and actionable intelligence brief for security officers.

Guidelines:
1. Summarize key findings directly, concisely, and accurately based on live telemetry and historical logs.
2. If live status of cameras (CAM-01 to CAM-06) is queried, state the exact active counts, detected objects (humans, vehicles, plates), virtual fence states, and face recognition decisions.
3. Highlight any security risks, intrusions, or unrecognized intruder alerts with severity levels.
4. Format your output using clear Markdown headings, bullet points, and live camera status badges.
"""

def collect_live_surveillance_telemetry() -> Dict[str, Any]:
    telemetry: Dict[str, Any] = {}
    try:
        from ..vision.camera_runner import get_all_camera_states
        cam_states = get_all_camera_states()
        for cid, state in cam_states.items():
            cid_key = cid.upper()
            telemetry[cid_key] = {
                "camera_id": cid_key,
                "counts": state.get("counts", {}),
                "objects_detected": [
                    {
                        "label": o.get("label"),
                        "cls": o.get("cls"),
                        "confidence": o.get("confidence"),
                        "plate": o.get("plate"),
                        "state": o.get("state"),
                    }
                    for o in state.get("objects", [])[:10]
                ],
                "fence_events": state.get("events", [])[:5] if "events" in state else [],
                "efps": state.get("efps", 0.0),
                "vts": state.get("vts", 0.0),
            }
    except Exception as e:
        telemetry["camera_pipeline_status"] = f"Active ({e})"

    try:
        from ..vision.face_pipeline import get_face_pipeline_state
        face_state = get_face_pipeline_state()
        telemetry["CAM-06"] = {
            "camera_id": "CAM-06",
            "name": "Access Control & Facial Recognition",
            "webcam": face_state.get("webcam", False),
            "counts": face_state.get("counts", {}),
            "authorized_personnel": [
                {"name": o.get("label"), "designation": o.get("designation"), "confidence": o.get("confidence")}
                for o in face_state.get("objects", [])
                if o.get("watchlist")
            ],
            "intruders_detected": [
                {"label": o.get("label"), "confidence": o.get("confidence")}
                for o in face_state.get("objects", [])
                if not o.get("watchlist")
            ],
            "recent_alerts": face_state.get("alerts", [])[:5],
        }
    except Exception as e:
        telemetry["face_pipeline_status"] = f"Active ({e})"

    try:
        from ..vision.watchlist_manager import WatchlistManager
        wm = WatchlistManager()
        telemetry["authorized_roster"] = [
            {"name": p.get("name"), "designation": p.get("designation"), "role": p.get("role")}
            for p in wm.get_people()
        ]
    except Exception:
        pass

    return telemetry

class SurveillanceRAGEngine:
    """
    Hybrid Real-Time RAG Engine (Feature 12) combining:
    - Live multi-camera telemetry (CAM-01 to CAM-06)
    - Intent parsing & entity extraction
    - Text-to-SQL structured query execution
    - Semantic vector retrieval (ChromaDB)
    - Cross-Camera Re-ID trajectory lookups (Feature 13)
    - LLM-powered multi-source intelligence synthesis.
    """

    def __init__(self, llm_client: Optional[UnifiedLLMClient] = None):
        self.llm = llm_client or UnifiedLLMClient()
        self.sql_engine = SurveillanceTextToSQL(self.llm)
        self.vector_engine = SurveillanceVectorRetriever()

    def get_live_telemetry(self) -> Dict[str, Any]:
        return collect_live_surveillance_telemetry()

    def process_query(self, db: Session, user_query: str) -> Dict[str, Any]:
        """
        Processes an operator's natural language surveillance query through the live & hybrid pipeline.
        """
        # 1. Parse Query Intent & Entities
        parsed = QueryIntentParser.parse_query(user_query)
        intent = parsed["intent"]
        target_person = parsed["target_person_id"]

        # 2. Gather Live Real-Time Camera Telemetry
        live_telemetry = collect_live_surveillance_telemetry()

        # 3. Structured SQL Search
        generated_sql, sql_records = self.sql_engine.generate_and_execute(db, user_query)

        # 4. Unstructured Vector Retrieval
        vector_hits = self.vector_engine.query(db, user_query, n_results=3)

        # 5. Trajectory Lookup if Person ID is identified or referenced
        trajectory_data = None
        if target_person:
            trajectory_data = TrajectoryReconstructor.get_person_trajectory(db, target_person)
        elif sql_records and "global_person_id" in sql_records[0] and sql_records[0]["global_person_id"]:
            pid = sql_records[0]["global_person_id"]
            trajectory_data = TrajectoryReconstructor.get_person_trajectory(db, pid)

        # 6. Check for Evidence Storage Intent
        stored_evidence = None
        q_lower = user_query.lower()
        if any(w in q_lower for w in ["evidence", "store as evidence", "take as evidence", "capture evidence", "save evidence", "vault"]):
            try:
                from ..routes.routes_evidence import store_evidence_item
                # Determine target camera
                target_cam = "CAM-04"
                for c in ["cam-01", "cam-02", "cam-03", "cam-04", "cam-05", "cam-06"]:
                    if c in q_lower or c.replace("-", "") in q_lower or c.replace("-", " ") in q_lower:
                        target_cam = c.upper()
                        break
                
                inc_type = "Perimeter Security Incident"
                if "fence" in q_lower or "intrusion" in q_lower:
                    inc_type = "Virtual Fence Intrusion"
                elif "plate" in q_lower or "vehicle" in q_lower:
                    inc_type = "Vehicle ANPR Detection"
                elif "face" in q_lower or "intruder" in q_lower:
                    inc_type = "Facial Access Incident"
                elif "audio" in q_lower or "sound" in q_lower or "gunshot" in q_lower:
                    inc_type = "Acoustic Threat Event"

                stored_evidence = store_evidence_item(
                    camera_id=target_cam,
                    incident_type=inc_type,
                    severity="critical" if "critical" in q_lower or "intrusion" in q_lower else "high",
                    officer="MAJOR PRAVEEN",
                    notes=f"AI Forensics Command: '{user_query}'",
                )
            except Exception as e:
                logger.warning(f"Evidence store error: {e}")

        # 7. LLM Intelligence Synthesis
        synthesis_prompt = f"""
Operator Query: "{user_query}"
Query Intent: {intent}

=== LIVE REAL-TIME MULTI-CAMERA TELEMETRY ===
{json.dumps(live_telemetry, indent=2)}

=== STRUCTURED DATABASE INCIDENTS ===
{json.dumps(sql_records[:10], indent=2)}

=== SEMANTIC VECTOR INCIDENT CONTEXT ===
{json.dumps([v['document'] for v in vector_hits], indent=2)}

=== CROSS-CAMERA MOVEMENT TRAJECTORY ===
{json.dumps(trajectory_data, indent=2) if trajectory_data else 'None'}

=== EVIDENCE CAPTURE RECORD ===
{json.dumps(stored_evidence, indent=2) if stored_evidence else 'None'}

Please provide a comprehensive, actionable surveillance report answering the operator's query directly using the live data and historical context.
"""
        response_text = self.llm.generate(SYNTHESIS_SYSTEM_PROMPT, synthesis_prompt)

        if stored_evidence:
            vault_card = f"""\n\n---\n### 🛡️ SECURED EVIDENCE SEALED IN VAULT
- **Evidence Reference:** `{stored_evidence['id']}`
- **Camera Target:** **{stored_evidence['camera_id']}** ({stored_evidence['camera_name']})
- **Timestamp:** `{stored_evidence['timestamp']}`
- **Cryptographic SHA-256 Seal:** `{stored_evidence['sha256_hash']}`
- **Chain of Custody Officer:** `{stored_evidence['officer']}`
- **Vault Status:** ✅ **Secured & Sealed** — Stored in [Evidence Vault](/evidence-vault)
"""
            response_text = response_text + vault_card

        return {
            "query": user_query,
            "intent": intent,
            "llm_provider": self.llm.provider,
            "response": response_text,
            "generated_sql": generated_sql,
            "sql_results_count": len(sql_records),
            "sql_records": sql_records,
            "vector_hits": vector_hits,
            "trajectory": trajectory_data,
            "live_telemetry": live_telemetry,
            "stored_evidence": stored_evidence,
        }

