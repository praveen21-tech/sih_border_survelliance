from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

from .config import settings


SCHEMA = """
CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    post_id TEXT,
    sector TEXT,
    duration_sec REAL,
    evidence_sha256 TEXT,
    evidence_path TEXT,
    payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id TEXT,
    alert_type TEXT,
    severity TEXT,
    title TEXT,
    title_hi TEXT,
    detail TEXT,
    score REAL,
    post_id TEXT,
    sector TEXT,
    acknowledged INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    metadata_json TEXT
);
CREATE TABLE IF NOT EXISTS drone_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id TEXT,
    post_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    threat INTEGER DEFAULT 0,
    threat_score REAL,
    early_warning_level TEXT,
    drone_class TEXT,
    class_label TEXT,
    class_label_hi TEXT,
    bearing_deg REAL,
    bpf_hz REAL,
    physics_score REAL,
    camera_cue_json TEXT,
    model_votes_json TEXT,
    physics_detail_json TEXT,
    recommended_action TEXT
);
CREATE INDEX IF NOT EXISTS idx_alerts_created    ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drone_post_ts     ON drone_tracks(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drone_threat      ON drone_tracks(threat, created_at DESC);
"""


def connect() -> sqlite3.Connection:
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


DB = connect()


def save_analysis(analysis_id: str, created_at: datetime, payload: dict[str, Any]) -> None:
    ctx = payload.get("context") or {}
    DB.execute(
        """INSERT OR REPLACE INTO analyses
        (id, created_at, post_id, sector, duration_sec, evidence_sha256, evidence_path, payload_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            analysis_id,
            created_at.isoformat(),
            ctx.get("post_id"),
            ctx.get("sector"),
            payload.get("duration_sec"),
            payload.get("evidence_sha256"),
            payload.get("evidence_path"),
            json.dumps(payload, default=str),
        ),
    )
    DB.commit()


def save_alerts(analysis_id: str, created_at: datetime, alerts: list[dict[str, Any]], ctx: dict[str, Any]) -> list[int]:
    ids = []
    for alert in alerts:
        cur = DB.execute(
            """INSERT INTO alerts
            (analysis_id, alert_type, severity, title, title_hi, detail, score, post_id, sector, acknowledged, created_at, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)""",
            (
                analysis_id,
                alert.get("alert_type"),
                alert.get("severity"),
                alert.get("title"),
                alert.get("title_hi"),
                alert.get("detail"),
                float(alert.get("score") or 0),
                ctx.get("post_id"),
                ctx.get("sector"),
                created_at.isoformat(),
                json.dumps(alert.get("metadata") or {}, default=str),
            ),
        )
        ids.append(cur.lastrowid)
    DB.commit()
    return ids


def list_alerts(limit: int = 100, acknowledged: int | None = None) -> list[dict[str, Any]]:
    sql = "SELECT * FROM alerts"
    args: list[Any] = []
    if acknowledged is not None:
        sql += " WHERE acknowledged = ?"
        args.append(acknowledged)
    sql += " ORDER BY id DESC LIMIT ?"
    args.append(limit)
    rows = DB.execute(sql, args).fetchall()
    return [dict(r) for r in rows]


def ack_alert(alert_id: int) -> bool:
    cur = DB.execute("UPDATE alerts SET acknowledged = 1 WHERE id = ?", (alert_id,))
    DB.commit()
    return cur.rowcount > 0


def list_analyses(limit: int = 50) -> list[dict[str, Any]]:
    rows = DB.execute(
        "SELECT id, created_at, post_id, sector, duration_sec, evidence_sha256 FROM analyses ORDER BY created_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
    return [dict(r) for r in rows]


def get_analysis(analysis_id: str) -> dict[str, Any] | None:
    row = DB.execute("SELECT payload_json FROM analyses WHERE id = ?", (analysis_id,)).fetchone()
    if not row:
        return None
    return json.loads(row["payload_json"])


def save_drone_track(
    analysis_id: str,
    post_id: str,
    created_at: datetime,
    drone: dict[str, Any],
) -> int:
    """Persist a drone detection result to drone_tracks table."""
    import json as _json
    cur = DB.execute(
        """INSERT INTO drone_tracks
           (analysis_id, post_id, created_at, threat, threat_score,
            early_warning_level, drone_class, class_label, class_label_hi,
            bearing_deg, bpf_hz, physics_score,
            camera_cue_json, model_votes_json, physics_detail_json,
            recommended_action)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            analysis_id,
            post_id,
            created_at.isoformat(),
            1 if drone.get("threat") else 0,
            float(drone.get("threat_score") or 0),
            drone.get("early_warning_level", "NONE"),
            drone.get("drone_class") or drone.get("class_name", "none"),
            drone.get("class_label", ""),
            drone.get("class_label_hi", ""),
            drone.get("bearing_deg"),
            float((drone.get("physics_detail") or drone.get("signature") or {}).get("bpf_hz") or 0),
            float((drone.get("physics_detail") or drone.get("signature") or {}).get("physics_score") or 0),
            _json.dumps(drone.get("camera_cue") or {}, default=str),
            _json.dumps(drone.get("model_votes") or {}, default=str),
            _json.dumps(drone.get("physics_detail") or drone.get("signature") or {}, default=str),
            drone.get("recommended_action", ""),
        ),
    )
    DB.commit()
    return cur.lastrowid


def list_drone_tracks(
    post_id: str | None = None,
    limit: int = 50,
    threat_only: bool = False,
) -> list[dict[str, Any]]:
    """Fetch recent drone track records from SQLite."""
    import json as _json
    clauses = []
    args: list[Any] = []
    if post_id:
        clauses.append("post_id = ?")
        args.append(post_id)
    if threat_only:
        clauses.append("threat = 1")
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    sql = f"SELECT * FROM drone_tracks {where} ORDER BY id DESC LIMIT ?"
    args.append(limit)
    rows = DB.execute(sql, args).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        for col in ("camera_cue_json", "model_votes_json", "physics_detail_json"):
            key = col.replace("_json", "")
            try:
                d[key] = _json.loads(d.pop(col) or "{}")
            except Exception:
                d[key] = {}
                d.pop(col, None)
        out.append(d)
    return out


def get_drone_stats(post_id: str | None = None) -> dict[str, Any]:
    """Aggregate threat stats for the dashboard."""
    where = "WHERE post_id = ?" if post_id else ""
    args  = [post_id] if post_id else []
    total = DB.execute(f"SELECT COUNT(*) FROM drone_tracks {where}", args).fetchone()[0]
    threats = DB.execute(
        f"SELECT COUNT(*) FROM drone_tracks {where}{'AND' if where else 'WHERE'} threat = 1",
        args + [] if not post_id else args,
    ).fetchone()[0] if not post_id else DB.execute(
        "SELECT COUNT(*) FROM drone_tracks WHERE post_id = ? AND threat = 1", [post_id]
    ).fetchone()[0]
    max_sc_row = DB.execute(
        f"SELECT MAX(threat_score) FROM drone_tracks {where}", args
    ).fetchone()
    max_sc = float(max_sc_row[0] or 0)
    return {"total": total, "threats": threats, "max_score": round(max_sc, 4)}
