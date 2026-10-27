"""
persistence.py — SQLite-based storage for research results
Ensures data survives server crashes, restarts, and failures.
"""
import json
import os
import sqlite3
from datetime import datetime

_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "scout_results.db")
_conn = None


def _get_conn():
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(_DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _init_db(_conn)
    return _conn


def _init_db(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS results (
            id TEXT PRIMARY KEY,
            mode TEXT,
            query TEXT,
            companies TEXT,
            data_points TEXT,
            instruction TEXT,
            data TEXT,
            sources TEXT,
            summary TEXT,
            status TEXT DEFAULT 'complete',
            raw_response TEXT,
            error TEXT,
            created_at TEXT,
            updated_at TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS partial_results (
            stream_id TEXT,
            company TEXT,
            data TEXT,
            sources TEXT,
            success INTEGER,
            error TEXT,
            created_at TEXT,
            PRIMARY KEY (stream_id, company)
        )
    """)
    conn.commit()


def save_result(result_id: str, result: dict):
    """Save a complete research result."""
    conn = _get_conn()
    now = datetime.now().isoformat()
    conn.execute("""
        INSERT OR REPLACE INTO results 
        (id, mode, query, companies, data_points, instruction, data, sources, summary, status, raw_response, error, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        result_id,
        result.get("mode", ""),
        result.get("query", ""),
        json.dumps(result.get("companies", []), default=str),
        json.dumps(result.get("data_points", []), default=str),
        result.get("instruction", ""),
        json.dumps(result.get("data") or result.get("merged_data"), default=str),
        json.dumps(result.get("sources", []), default=str),
        result.get("summary", ""),
        result.get("status", "complete"),
        result.get("raw_response", "")[:5000],  # limit raw
        result.get("error"),
        result.get("timestamp", now),
        now
    ))
    conn.commit()


def save_partial(stream_id: str, company: str, company_data: dict):
    """Save partial result for a single company during streaming."""
    conn = _get_conn()
    now = datetime.now().isoformat()
    conn.execute("""
        INSERT OR REPLACE INTO partial_results 
        (stream_id, company, data, sources, success, error, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        stream_id, company,
        json.dumps(company_data.get("data"), default=str),
        json.dumps(company_data.get("sources", []), default=str),
        1 if company_data.get("success") else 0,
        company_data.get("error"),
        now
    ))
    conn.commit()


def get_partials(stream_id: str) -> list[dict]:
    """Get all partial results for a stream."""
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM partial_results WHERE stream_id = ? ORDER BY created_at", 
        (stream_id,)
    ).fetchall()
    results = []
    for r in rows:
        results.append({
            "company": r["company"],
            "data": json.loads(r["data"]) if r["data"] else None,
            "sources": json.loads(r["sources"]) if r["sources"] else [],
            "success": bool(r["success"]),
            "error": r["error"],
        })
    return results


def get_result(result_id: str) -> dict | None:
    """Get a single result by ID."""
    conn = _get_conn()
    row = conn.execute("SELECT * FROM results WHERE id = ?", (result_id,)).fetchone()
    if not row:
        return None
    return _row_to_dict(row)


def get_all_results() -> list[dict]:
    """Get all saved results, newest first."""
    conn = _get_conn()
    rows = conn.execute("SELECT * FROM results ORDER BY created_at DESC").fetchall()
    return [_row_to_dict(r) for r in rows]


def delete_result(result_id: str) -> bool:
    """Delete a result by ID."""
    conn = _get_conn()
    cur = conn.execute("DELETE FROM results WHERE id = ?", (result_id,))
    conn.commit()
    return cur.rowcount > 0


def cleanup_partials(stream_id: str):
    """Remove partial results after a stream completes successfully."""
    conn = _get_conn()
    conn.execute("DELETE FROM partial_results WHERE stream_id = ?", (stream_id,))
    conn.commit()


def _row_to_dict(row) -> dict:
    d = dict(row)
    for key in ["data", "sources", "companies", "data_points"]:
        if d.get(key):
            try:
                d[key] = json.loads(d[key])
            except (json.JSONDecodeError, TypeError):
                pass
    d["merged_data"] = d.get("data")
    d["timestamp"] = d.get("created_at", "")
    return d
