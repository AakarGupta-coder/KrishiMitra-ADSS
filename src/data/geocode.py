import asyncio
import urllib.parse
from typing import Optional

from . import store
from .api_utils import data_fetcher, logger

SOURCE_ID = "nominatim"

STATE_ALIASES = {
    "kerala": "Keralam",
    "odisha": "Odisha",
    "orissa": "Odisha",
    "puducherry": "Pondicherry",
    "national capital territory of delhi": "NCT of Delhi",
    "delhi": "NCT of Delhi",
    "jammu and kashmir": "Jammu and Kashmir",
}


def to_agmarknet_state(state: Optional[str]) -> Optional[str]:
    if not state:
        return None
    return STATE_ALIASES.get(state.strip().lower(), state.strip())


async def reverse_geocode(lat: float, lon: float) -> dict:
    key = f"rev:{round(lat, 3)}:{round(lon, 3)}"
    cached = store.cache_get(key, max_age=30 * 86400)
    if cached:
        return cached
    url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lon}&zoom=10&addressdetails=1&accept-language=en"
    try:
        data = await data_fetcher.fetch_json(
            url, cache_key=f"nominatim:{key}", ttl_success=86400, ttl_error=60,
            timeout_connect=3.0, timeout_read=8.0, max_retries=1, source_id=SOURCE_ID,
        )
        addr = data.get("address", {}) or {}
        out = {
            "status": "ok",
            "place": addr.get("city") or addr.get("town") or addr.get("village") or addr.get("suburb") or addr.get("county"),
            "district": addr.get("state_district") or addr.get("county") or addr.get("city_district"),
            "state": addr.get("state"),
            "country": addr.get("country"),
            "country_code": (addr.get("country_code") or "").upper() or None,
            "display_name": data.get("display_name"),
        }
        store.cache_set(key, out)
        return out
    except Exception as e:
        logger.warning(f"Reverse geocoding failed: {e}")
        return {"status": "unavailable", "place": None, "district": None, "state": None,
                "country": None, "country_code": None, "display_name": None, "error": str(e)}


def _clean_district(name: str) -> str:
    return name.split("(")[0].strip()


_nominatim_lock = asyncio.Lock()


async def _nominatim_search(query: str, key: str) -> Optional[dict]:
    async with _nominatim_lock:
        try:
            url = f"https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q={urllib.parse.quote(query)}"
            data = await data_fetcher.fetch_json(
                url, cache_key=f"nominatim:search:{key}", ttl_success=86400, ttl_error=300,
                timeout_connect=3.0, timeout_read=8.0, max_retries=1, source_id=SOURCE_ID,
            )
            await asyncio.sleep(1.1)
            if data:
                return {"lat": float(data[0]["lat"]), "lon": float(data[0]["lon"])}
        except Exception as e:
            logger.warning(f"Nominatim search failed for {query}: {e}")
    return None


async def locate_district(district: str, state: str) -> Optional[dict]:
    key = f"dist:{district.lower()}:{(state or '').lower()}"
    cached = store.cache_get(key)
    if cached is not None:
        return cached or None
    name = _clean_district(district)
    st = (state or "").lower().replace("keralam", "kerala")
    out, answered = None, False
    url = f"https://geocoding-api.open-meteo.com/v1/search?name={urllib.parse.quote(name)}&count=10&language=en&format=json&countryCode=IN"
    try:
        data = await data_fetcher.fetch_json(
            url, cache_key=f"omgeo:{key}", ttl_success=86400, ttl_error=300,
            timeout_connect=3.0, timeout_read=6.0, max_retries=1,
        )
        answered = True
        for r in data.get("results") or []:
            if not st or st in (r.get("admin1") or "").lower():
                out = {"lat": r["latitude"], "lon": r["longitude"]}
                break
    except Exception as e:
        logger.warning(f"Open-Meteo geocoding failed for {district}, {state}: {e}")

    if out is None:
        out = await _nominatim_search(f"{name} district, {state or ''}, India", key)
        answered = answered or out is not None
    if answered:
        store.cache_set(key, out or {})
    return out
