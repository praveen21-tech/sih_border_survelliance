import json
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from .llm_client import UnifiedLLMClient
from .query_parser import QueryIntentParser
from .text_to_sql import SurveillanceTextToSQL
from .vector_retriever import SurveillanceVectorRetriever
from reid_engine.tracker import TrajectoryReconstructor

SYNTHESIS_SYSTEM_PROMPT = """
You are an advanced AI Surveillance Intelligence Operator and Command Analyst.
Your role is to analyze multi-camera CCTV tracking data, security events, ANPR records, and watchlist alerts,
and produce an authoritative, clear, and actionable intelligence brief for security officers.

Guidelines:
1. Summarize key findings directly and concisely.
2. If person movements are queried, detail the chronological path across cameras/zones with timestamps.
3. Highlight any security risks, watchlist matches, or unauthorized intrusions with severity levels.
4. Format your output using clear Markdown headings, bullet points, and timeline callouts.
"""

class SurveillanceRAGEngine:
    """
    Hybrid RAG Engine (Feature 12) combining:
    - Intent parsing
    - Text-to-SQL structured query execution
    - Semantic vector retrieval (ChromaDB)
    - Cross-Camera Re-ID trajectory lookups (Feature 13)
    - LLM-powered multi-source intelligence synthesis.
    """

    def __init__(self, llm_client: Optional[UnifiedLLMClient] = None):
        self.llm = llm_client or UnifiedLLMClient()
        self.sql_engine = SurveillanceTextToSQL(self.llm)
        self.vector_engine = SurveillanceVectorRetriever()

    def process_query(self, db: Session, user_query: str) -> Dict[str, Any]:
        """
        Processes an operator's natural language surveillance query through the full pipeline.
        
        Returns:
            Dict containing:
            - response_markdown: Final synthesis from LLM
            - intent: Classified intent
            - generated_sql: SQL executed
            - structured_results: Direct database rows
            - vector_documents: Semantic vector hits
            - trajectory: Associated movement trajectory (if applicable)
        """
        # 1. Parse Query Intent & Entities
        parsed = QueryIntentParser.parse_query(user_query)
        intent = parsed["intent"]
        target_person = parsed["target_person_id"]

        # 2. Structured SQL Search
        generated_sql, sql_records = self.sql_engine.generate_and_execute(db, user_query)

        # 3. Unstructured Vector Retrieval
        vector_hits = self.vector_engine.query(db, user_query, n_results=3)

        # 4. Trajectory Lookup if Person ID is identified or referenced
        trajectory_data = None
        if target_person:
            trajectory_data = TrajectoryReconstructor.get_person_trajectory(db, target_person)
        elif sql_records and "global_person_id" in sql_records[0] and sql_records[0]["global_person_id"]:
            pid = sql_records[0]["global_person_id"]
            trajectory_data = TrajectoryReconstructor.get_person_trajectory(db, pid)

        # 5. LLM Intelligence Synthesis
        synthesis_prompt = f"""
Operator Query: "{user_query}"
Query Intent: {intent}

Structured Database Records:
{json.dumps(sql_records[:10], indent=2)}

Semantic Incident Context:
{json.dumps([v['document'] for v in vector_hits], indent=2)}

Cross-Camera Movement Trajectory:
{json.dumps(trajectory_data, indent=2) if trajectory_data else 'None'}

Please provide a comprehensive, actionable surveillance report answering the operator's query.
"""
        response_text = self.llm.generate(SYNTHESIS_SYSTEM_PROMPT, synthesis_prompt)

        return {
            "query": user_query,
            "intent": intent,
            "llm_provider": self.llm.provider,
            "response": response_text,
            "generated_sql": generated_sql,
            "sql_results_count": len(sql_records),
            "sql_records": sql_records,
            "vector_hits": vector_hits,
            "trajectory": trajectory_data
        }
