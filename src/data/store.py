import json
import os
import sqlite3
import threading
import time
from typing import Any, Optional

DB_PATH = os.environ.get("KRISHIMITRA_STATE_DB", os.path.join("data", "krishimitra_state.sqlite"))

_lock = threading.Lock()


def _connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=5)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _lock, _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS source_status (
                source_id TEXT PRIMARY KEY,
                last_attempt REAL,
                last_success REAL,
                last_status TEXT,
                last_error TEXT,
                detail TEXT
            );
            CREATE TABLE IF NOT EXISTS market_observations (
                commodity TEXT,
                state TEXT,
                district TEXT,
                market TEXT,
                arrival_date TEXT,
                modal_price REAL,
                min_price REAL,
                max_price REAL,
                observed_at REAL,
                PRIMARY KEY (commodity, market, arrival_date)
            );
            CREATE TABLE IF NOT EXISTS geocode_cache (
                key TEXT PRIMARY KEY,
                value TEXT,
                created_at REAL
            );
            """
        )


def record_source(source_id: str, ok: bool, error: Optional[str] = None, detail: Optional[dict] = None) -> None:
    now = time.time()
    with _lock, _connect() as conn:
        row = conn.execute("SELECT last_success FROM source_status WHERE source_id = ?", (source_id,)).fetchone()
        last_success = now if ok else (row["last_success"] if row else None)
        conn.execute(
            """INSERT INTO source_status (source_id, last_attempt, last_success, last_status, last_error, detail)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(source_id) DO UPDATE SET
                 last_attempt = excluded.last_attempt,
                 last_success = excluded.last_success,
                 last_status = excluded.last_status,
                 last_error = excluded.last_error,
                 detail = COALESCE(excluded.detail, source_status.detail)""",
            (source_id, now, last_success, "ok" if ok else "error", None if ok else (error or "Unknown error")[:500],
             json.dumps(detail) if detail is not None else None),
        )


def get_source_statuses() -> dict:
    with _lock, _connect() as conn:
        rows = conn.execute("SELECT * FROM source_status").fetchall()
    out = {}
    for r in rows:
        out[r["source_id"]] = {
            "last_attempt": r["last_attempt"],
            "last_success": r["last_success"],
            "last_status": r["last_status"],
            "last_error": r["last_error"],
            "detail": json.loads(r["detail"]) if r["detail"] else None,
        }
    return out


def save_market_observation(rec: dict) -> None:
    with _lock, _connect() as conn:
        conn.execute(
            """INSERT OR IGNORE INTO market_observations
               (commodity, state, district, market, arrival_date, modal_price, min_price, max_price, observed_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (rec["commodity"], rec.get("state"), rec.get("district"), rec["market"], rec["arrival_date"],
             rec.get("modal_price"), rec.get("min_price"), rec.get("max_price"), time.time()),
        )


def previous_market_observation(commodity: str, market: str, before_arrival_date: str) -> Optional[dict]:
    with _lock, _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM market_observations WHERE commodity = ? AND market = ?",
            (commodity, market),
        ).fetchall()

    def key(d: str):
        try:
            dd, mm, yy = d.split("/")
            return (int(yy), int(mm), int(dd))
        except Exception:
            return (0, 0, 0)

    target = key(before_arrival_date)
    earlier = [dict(r) for r in rows if key(r["arrival_date"]) < target]
    if not earlier:
        return None
    earlier.sort(key=lambda r: key(r["arrival_date"]), reverse=True)
    return earlier[0]


def latest_market_observation(commodity: str, state: Optional[str], district: Optional[str]) -> Optional[dict]:
    with _lock, _connect() as conn:
        rows = [dict(r) for r in conn.execute(
            "SELECT * FROM market_observations WHERE commodity = ? ORDER BY observed_at DESC", (commodity,)).fetchall()]
    if not rows:
        return None
    d = (district or "").lower().replace(" district", "").strip()
    for r in rows:
        rd = (r["district"] or "").lower()
        if d and (rd == d or d.startswith(rd + " ") or rd.startswith(d + " ")):
            return r
    for r in rows:
        if state and r["state"] == state:
            return r
    return None


def cache_get(key: str, max_age: Optional[float] = None) -> Optional[Any]:
    with _lock, _connect() as conn:
        row = conn.execute("SELECT value, created_at FROM geocode_cache WHERE key = ?", (key,)).fetchone()
    if not row:
        return None
    if max_age is not None and time.time() - row["created_at"] > max_age:
        return None
    return json.loads(row["value"])


def cache_set(key: str, value: Any) -> None:
    with _lock, _connect() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO geocode_cache (key, value, created_at) VALUES (?, ?, ?)",
            (key, json.dumps(value), time.time()),
        )


init_db()
