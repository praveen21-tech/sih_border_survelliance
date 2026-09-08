import re
from typing import List, Dict, Any, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session
from .llm_client import UnifiedLLMClient

DATABASE_SCHEMA_PROMPT = """
You are a senior database engineer and surveillance system analyst.
Convert the natural language query into a valid, safe, read-only SQL query for SQLite/PostgreSQL.

Database Schema:
1. cameras (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    location VARCHAR(150),
    zone VARCHAR(100),
    latitude FLOAT,
    longitude FLOAT,
    is_active BOOLEAN
)

2. global_persons (
    id VARCHAR(50) PRIMARY KEY,
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    appearance_description TEXT,
    total_sightings INT,
    status VARCHAR(50)
)

3. person_sightings (
    id INT PRIMARY KEY,
    global_person_id VARCHAR(50) REFERENCES global_persons(id),
    camera_id VARCHAR(50) REFERENCES cameras(id),
    timestamp TIMESTAMP,
    detection_confidence FLOAT,
    reid_similarity_score FLOAT,
    zone_name VARCHAR(100),
    crop_path VARCHAR(255)
)

4. surveillance_events (
    id INT PRIMARY KEY,
    event_type VARCHAR(50), -- ('intrusion', 'loitering', 'fence_breach', 'suspicious_activity', 'night_movement')
    camera_id VARCHAR(50) REFERENCES cameras(id),
    timestamp TIMESTAMP,
    severity VARCHAR(20),   -- ('low', 'medium', 'high', 'critical')
    description TEXT,
    global_person_id VARCHAR(50),
    is_resolved BOOLEAN
)

5. vehicle_records (
    id INT PRIMARY KEY,
    plate_number VARCHAR(50),
    vehicle_type VARCHAR(50), -- ('car', 'truck', 'bus', 'motorcycle', 'suv')
    color VARCHAR(50),
    camera_id VARCHAR(50) REFERENCES cameras(id),
    timestamp TIMESTAMP,
    confidence FLOAT
)

6. watchlist_records (
    id VARCHAR(50) PRIMARY KEY,
    person_name VARCHAR(100),
    aliases VARCHAR(200),
    reason TEXT,
    risk_level VARCHAR(20),
    is_active BOOLEAN
)

7. watchlist_hits (
    id INT PRIMARY KEY,
    watchlist_id VARCHAR(50) REFERENCES watchlist_records(id),
    global_person_id VARCHAR(50),
    camera_id VARCHAR(50) REFERENCES cameras(id),
    timestamp TIMESTAMP,
    match_confidence FLOAT,
    alert_status VARCHAR(50)
)

RULES:
- Return ONLY the SQL query inside ```sql ... ``` code block or as plain text.
- Do NOT use INSERT, UPDATE, DELETE, DROP, ALTER. Read-only SELECT statements only.
- Prefer joining with `cameras` to get human-readable camera names and zones.
- Use standard SQL syntax compatible with SQLite & PostgreSQL:
  * Use LIKE instead of ILIKE (or LOWER(col) LIKE '%text%').
  * For timestamps, use simple date filters or datetime('now', '-1 day') / CURRENT_TIMESTAMP.

"""

class SurveillanceTextToSQL:
    """
    Translates operator natural language inquiries into secure, optimized SQL queries,
    executes them against the surveillance database, and returns structured results.
    """

    def __init__(self, llm_client: UnifiedLLMClient):
        self.llm = llm_client

    def generate_and_execute(self, db: Session, user_query: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Generates a SQL query from natural language, verifies safety, and executes it.
        
        Returns:
            (generated_sql_query, list_of_result_rows_as_dicts)
        """
        system_prompt = DATABASE_SCHEMA_PROMPT
        user_prompt = f"User Request: {user_query}\n\nGenerate the optimal SQL query:"

        llm_response = self.llm.generate(system_prompt, user_prompt)
        sql_query = self._clean_sql(llm_response)

        # Safety Check: Prevent destructive queries
        forbidden = ["drop ", "delete ", "update ", "insert ", "truncate ", "alter ", "create "]
        if any(f in sql_query.lower() for f in forbidden):
            sql_query = "SELECT * FROM surveillance_events ORDER BY timestamp DESC LIMIT 5;"

        # Execute Query
        try:
            result = db.execute(text(sql_query))
            keys = result.keys()
            rows = [dict(zip(keys, row)) for row in result.fetchall()]
            
            # Format datetime objects for JSON serialization
            serialized_rows = []
            for row in rows:
                new_row = {}
                for k, v in row.items():
                    if hasattr(v, "isoformat"):
                        new_row[k] = v.isoformat()
                    else:
                        new_row[k] = v
                serialized_rows.append(new_row)

            return sql_query, serialized_rows
        except Exception as e:
            print(f"[TextToSQL] Execution error ({e}) on SQL: {sql_query}")
            # Fallback query
            fallback_sql = "SELECT id, event_type, camera_id, timestamp, severity, description FROM surveillance_events ORDER BY timestamp DESC LIMIT 5;"
            res = db.execute(text(fallback_sql))
            keys = res.keys()
            rows = [dict(zip(keys, row)) for row in res.fetchall()]
            return fallback_sql, rows

    def _clean_sql(self, raw_text: str) -> str:
        """Extracts SQL statement from markdown fences or text."""
        match = re.search(r'```(?:sql)?\s*(.*?)\s*```', raw_text, re.DOTALL | re.IGNORECASE)
        if match:
            clean = match.group(1).strip()
        else:
            clean = raw_text.strip()
        
        # Remove any leading conversational text if present
        lines = clean.splitlines()
        sql_lines = [l for l in lines if not l.startswith("--") and not l.lower().startswith("here")]
        clean = " ".join(sql_lines).strip()
        return clean
