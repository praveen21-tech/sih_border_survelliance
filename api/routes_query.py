from typing import Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from database.db_session import get_db
from database.models import Camera, GlobalPerson, SurveillanceEvent, VehicleRecord, WatchlistHit
from nl_query_engine.llm_client import UnifiedLLMClient
from nl_query_engine.rag_engine import SurveillanceRAGEngine

router = APIRouter(prefix="/api/v1/query", tags=["Feature 12 - NL Surveillance Query Engine"])

class SurveillanceQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language surveillance query from security operator")
    provider: Optional[str] = Field(None, description="LLM provider: groq, openai, gemini, ollama")
    model: Optional[str] = Field(None, description="Specific model name")
    api_key: Optional[str] = Field(None, description="LLM API Key (optional override)")

@router.post("")
def execute_natural_query(
    request: SurveillanceQueryRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Execute a natural language surveillance query.
    Translates operator question via Text-to-SQL + Vector RAG + Re-ID trajectory lookup,
    and returns a structured response with an intelligence report.
    """
    # Extract API key from request body, Authorization header, or environment
    api_key = request.api_key
    if not api_key and authorization and authorization.startswith("Bearer "):
        api_key = authorization.split(" ")[1]

    # Initialize client & RAG engine
    llm_client = UnifiedLLMClient(
        provider=request.provider,
        model=request.model,
        api_key=api_key
    )
    rag_engine = SurveillanceRAGEngine(llm_client=llm_client)

    result = rag_engine.process_query(db=db, user_query=request.query)
    return result

@router.get("/templates")
def get_query_templates():
    """Returns sample operator questions across various surveillance scenarios."""
    return {
        "templates": [
            {
                "category": "Cross-Camera Trajectory & Tracking (Feature 13)",
                "query": "Where was PERSON_001 seen and show their full movement path across cameras?"
            },
            {
                "category": "Intrusion & Security Incidents",
                "query": "Show all critical security events and server room intrusions in the last 24 hours."
            },
            {
                "category": "Criminal Watchlist Intelligence",
                "query": "Were any watchlist suspects detected near restricted zones today?"
            },
            {
                "category": "ANPR & Vehicle Monitoring",
                "query": "List all SUV and truck license plates captured at the perimeter gates."
            },
            {
                "category": "Behavior & Loitering Analytics",
                "query": "Show all loitering and fence breach incidents with evidence details."
            }
        ]
    }

@router.get("/stats")
def get_surveillance_stats(db: Session = Depends(get_db)):
    """Returns real-time surveillance database metrics."""
    return {
        "total_cameras": db.query(Camera).count(),
        "active_cameras": db.query(Camera).filter(Camera.is_active == True).count(),
        "tracked_persons": db.query(GlobalPerson).count(),
        "total_events": db.query(SurveillanceEvent).count(),
        "unresolved_events": db.query(SurveillanceEvent).filter(SurveillanceEvent.is_resolved == False).count(),
        "total_vehicles": db.query(VehicleRecord).count(),
        "watchlist_hits": db.query(WatchlistHit).count()
    }
