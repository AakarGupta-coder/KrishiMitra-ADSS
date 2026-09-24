import asyncio
import os
import statistics
import time
import urllib.parse
from typing import Optional

from . import store
from .api_utils import data_fetcher, logger, fetched_at
from .geocode import locate_district, to_agmarknet_state
from .soilgrids import haversine_distance

SOURCE_ID = "agmarknet"
RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"
SAMPLE_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"

_sem = asyncio.Semaphore(2)
RATE_LIMIT_BACKOFF_S = 900
_rate_limited_until = 0.0


def api_key() -> str:
    return os.environ.get("DATA_GOV_IN_API_KEY") or SAMPLE_KEY


def using_sample_key() -> bool:
    return api_key() == SAMPLE_KEY


def _validate(data) -> Optional[str]:
    if not isinstance(data, dict):
        return "Unexpected response"
    if data.get("error"):
        return f"data.gov.in: {data['error']}"
    if "records" not in data:
        return "data.gov.in response has no records field"
    return None


async def _query(commodity: Optional[str], state: Optional[str], district: Optional[str] = None) -> tuple[list, Optional[float]]:
    params = {"api-key": api_key(), "format": "json", "limit": "10"}
    if commodity:
        params["filters[commodity]"] = commodity
    if state:
        params["filters[state.keyword]"] = state
    if district:
        params["filters[district]"] = district
    url = f"https://api.data.gov.in/resource/{RESOURCE_ID}?{urllib.parse.urlencode(params)}"
    key = f"agmarknet:{commodity or '*'}:{state or 'IN'}:{district or '*'}"
    global _rate_limited_until
    async with _sem:
        cached = fetched_at(key)
        if cached is None and time.time() < _rate_limited_until:
            raise Exception("Rate limit exceeded (backing off)")
        try:
            data = await data_fetcher.fetch_json(
                url, cache_key=key, ttl_success=6 * 3600, ttl_error=180,
                timeout_connect=4.0, timeout_read=12.0, max_retries=2, source_id=SOURCE_ID,
                validate=_validate,
            )
        except Exception as e:
            if "rate limit" in str(e).lower():
                _rate_limited_until = time.time() + RATE_LIMIT_BACKOFF_S
            raise
    records = []
    for r in data.get("records", []) or []:
        try:
            modal = float(r.get("modal_price"))
        except (TypeError, ValueError):
            continue
        if modal <= 0:
            continue
        clean = lambda k: (r.get(k) or "").strip() or None
        records.append({
            "commodity": clean("commodity"),
            "state": clean("state"),
            "district": clean("district"),
            "market": clean("market"),
            "variety": clean("variety"),
            "grade": clean("grade"),
            "arrival_date": r.get("arrival_date"),
            "min_price": _num(r.get("min_price")),
            "max_price": _num(r.get("max_price")),
            "modal_price": modal,
        })
    return records, fetched_at(key)


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _norm(s: Optional[str]) -> str:
    return (s or "").split("(")[0].strip().lower()


def _district_candidates(district: str) -> list:
    base = district.split("(")[0].strip()
    for suffix in (" District", " district"):
        if base.endswith(suffix):
            base = base[: -len(suffix)]
    out = [base]
    first = base.split(" ")[0]
    if first != base and len(first) > 3:
        out.append(first)
    return out


def _same_district(a: Optional[str], b: Optional[str]) -> bool:
    x, y = _norm(a), _norm(b)
    if not x or not y:
        return False
    return x == y or x.startswith(y + " ") or y.startswith(x + " ")


GEOCODE_BUDGET_S = 8.0


async def _nearest(records: list, lat: float, lon: float) -> tuple[Optional[dict], Optional[float]]:
    districts = {}
    for r in records:
        districts.setdefault((r["district"], r["state"]), []).append(r)
    tasks = [asyncio.ensure_future(locate_district(d, s)) for (d, s) in districts]
    await asyncio.wait(tasks, timeout=GEOCODE_BUDGET_S)
    locs = [t.result() if t.done() and not t.exception() else None for t in tasks]
    best, best_d = None, None
    for (key, recs), loc in zip(districts.items(), locs):
        if not loc:
            continue
        d = haversine_distance(lat, lon, loc["lat"], loc["lon"])
        if best_d is None or d < best_d:
            best, best_d = recs, d
    if best is None:
        return None, None
    return _representative(best), best_d


def _representative(recs: list) -> dict:
    med = statistics.median(r["modal_price"] for r in recs)
    return min(recs, key=lambda r: abs(r["modal_price"] - med))


async def get_market_price(commodity: Optional[str], lat: float, lon: float,
                           state: Optional[str], district: Optional[str]) -> dict:
    base = {"commodity": commodity, "source": "Agmarknet via data.gov.in", "status": "unavailable",
            "basis": None, "unit": "INR/quintal", "currency": "INR"}
    ag_state = to_agmarknet_state(state)

    if not commodity:
        if ag_state:
            # Refresh local district cache when no commodity is specified
            records, ts = await _query(None, ag_state, district)
            base["status"] = "ok" if records else "unavailable"
            base["reason"] = f"Refreshed {len(records)} arrivals for {district or ag_state}"
            base["fetched_at"] = ts
        else:
            base["reason"] = "No state provided for refresh."
        return base

    try:
        # pool: the arrivals the chosen price was picked from (drives markets_considered and the price spread).
        basis, chosen, distance, records, pool, ts = None, None, None, [], [], None
        if ag_state:
            if district:
                dist_records, dist_ts = await _query(None, ag_state, district)
                local = [r for r in dist_records if _norm(r.get("commodity")) == _norm(commodity)]
                if local:
                    chosen, basis, pool = _representative(local), "local_district", local
                    distance = 0.0
                    ts = dist_ts
            
            if not chosen:
                records, ts = await _query(commodity, ag_state)
                if records:
                    pool = records
                    chosen, distance = await _nearest(records, lat, lon)
                    basis = "nearest_in_state" if chosen else None
                    if chosen is None:
                        chosen, basis = _representative(records), "state_median"

        # National search also covers farms whose state could not be resolved.
        if not chosen and not records:
            records, ts = await _query(commodity, None)
            if records:
                pool = records
                chosen, distance = await _nearest(records, lat, lon)
                basis = "nearest_national" if chosen else None
                if chosen is None:
                    chosen, basis = _representative(records), "national_median"

        if not chosen:
            base["reason"] = f"No {commodity} arrivals reported by Agmarknet today in {ag_state or 'India'}."
            base["fetched_at"] = ts
            return base

        store.save_market_observation(chosen)
        previous = store.previous_market_observation(chosen["commodity"], chosen["market"], chosen["arrival_date"])
        modal = chosen["modal_price"]
        return {
            **base,
            "status": "live",
            "basis": basis,
            "market": chosen["market"],
            "district": chosen["district"],
            "state": chosen["state"],
            "variety": chosen.get("variety"),
            "arrival_date": chosen["arrival_date"],
            "modal_price": modal,
            "min_price": chosen.get("min_price"),
            "max_price": chosen.get("max_price"),
            "price_per_kg": round(modal / 100, 2),
            "distance_km": round(distance, 1) if distance is not None else None,
            "markets_considered": len(pool),
            "pool_min": min(r["modal_price"] for r in pool),
            "pool_max": max(r["modal_price"] for r in pool),
            "previous": {
                "arrival_date": previous["arrival_date"],
                "modal_price": previous["modal_price"],
            } if previous else None,
            "fetched_at": ts,
            "sample_key_limited": using_sample_key(),
        }
    except Exception as e:
        logger.error(f"Agmarknet lookup failed for {commodity}: {e}")
        limited = "rate limit" in str(e).lower()
        base["reason"] = ("data.gov.in rate limit reached; retrying automatically in a few minutes." if limited
                          else "Agmarknet did not respond.")
        base["error"] = str(e)
        last = store.latest_market_observation(commodity, ag_state, district)
        if last:
            return {
                **base,
                "status": "stale",
                "basis": "last_observed",
                "market": last["market"],
                "district": last["district"],
                "state": last["state"],
                "arrival_date": last["arrival_date"],
                "modal_price": last["modal_price"],
                "min_price": last["min_price"],
                "max_price": last["max_price"],
                "price_per_kg": round(last["modal_price"] / 100, 2),
                "distance_km": None,
                "markets_considered": 1,
                "pool_min": last["modal_price"],
                "pool_max": last["modal_price"],
                "previous": None,
                "fetched_at": last["observed_at"],
            }
        return base
