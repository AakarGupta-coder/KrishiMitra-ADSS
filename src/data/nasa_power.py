import calendar
import datetime

from .api_utils import data_fetcher, logger, fetched_at

SOURCE_ID = "nasa_power"
FILL = -999.0


async def get_monthly_climatology(lat: float, lon: float, years: int = 5) -> dict:
    end_year = datetime.date.today().year - 1
    last_error = None
    for end in (end_year, end_year - 1):
        start = end - years + 1
        url = (
            "https://power.larc.nasa.gov/api/temporal/monthly/point"
            f"?parameters=T2M,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN&community=AG&longitude={lon}&latitude={lat}"
            f"&start={start}&end={end}&format=JSON"
        )
        key = f"nasapower:monthly:{round(lat, 3)}:{round(lon, 3)}:{start}:{end}"
        try:
            data = await data_fetcher.fetch_json(
                url, cache_key=key, ttl_success=7 * 86400, ttl_error=120,
                timeout_connect=3.0, timeout_read=20.0, max_retries=1, source_id=SOURCE_ID,
            )
            params = data["properties"]["parameter"]
            coords = (data.get("geometry") or {}).get("coordinates")
            buckets = {m: {"t2m": [], "rh2m": [], "precip_mm": [], "solar": []} for m in range(1, 13)}
            for code, val in params.get("T2M", {}).items():
                m = int(code[4:])
                if 1 <= m <= 12 and val != FILL:
                    buckets[m]["t2m"].append(val)
            for code, val in params.get("RH2M", {}).items():
                m = int(code[4:])
                if 1 <= m <= 12 and val != FILL:
                    buckets[m]["rh2m"].append(val)
            for code, val in params.get("ALLSKY_SFC_SW_DWN", {}).items():
                m = int(code[4:])
                if 1 <= m <= 12 and val != FILL:
                    buckets[m]["solar"].append(val)
            for code, val in params.get("PRECTOTCORR", {}).items():
                y, m = int(code[:4]), int(code[4:])
                if 1 <= m <= 12 and val != FILL:
                    buckets[m]["precip_mm"].append(val * calendar.monthrange(y, m)[1])

            monthly = []
            for m in range(1, 13):
                b = buckets[m]
                monthly.append({
                    "month": m,
                    "t2m": round(sum(b["t2m"]) / len(b["t2m"]), 2) if b["t2m"] else None,
                    "rh2m": round(sum(b["rh2m"]) / len(b["rh2m"]), 1) if b["rh2m"] else None,
                    "precip_mm": round(sum(b["precip_mm"]) / len(b["precip_mm"]), 1) if b["precip_mm"] else None,
                    "solar_mj_m2_day": round(sum(b["solar"]) / len(b["solar"]), 2) if b["solar"] else None,
                    "n_years": len(b["t2m"]),
                })
            if not any(r["t2m"] is not None for r in monthly):
                raise ValueError("NASA POWER returned no valid monthly values")
            return {
                "status": "ok",
                "source": "NASA POWER (AG community, monthly)",
                "period": f"{start}–{end}",
                "fetched_at": fetched_at(key),
                "monthly": monthly,
                "grid": {"lat": coords[1], "lon": coords[0]} if coords else None,
            }
        except Exception as e:
            last_error = str(e)
            logger.warning(f"NASA POWER climatology {start}-{end} failed: {e}")

    return {"status": "unavailable", "source": "NASA POWER (AG community, monthly)", "error": last_error,
            "period": None, "fetched_at": None, "monthly": []}
