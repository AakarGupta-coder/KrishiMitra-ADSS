from .api_utils import data_fetcher, logger, fetched_at

SOURCE_ID = "open_meteo"

DAILY_VARS = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_sum",
    "precipitation_probability_max",
    "et0_fao_evapotranspiration",
    "relative_humidity_2m_mean",
    "wind_speed_10m_max",
]
CURRENT_VARS = ["temperature_2m", "relative_humidity_2m", "precipitation", "wind_speed_10m", "weather_code"]
HOURLY_VARS = ["soil_moisture_9_to_27cm"]

DAILY_RENAME = {
    "time": "date",
    "weather_code": "weather_code",
    "temperature_2m_max": "tmax",
    "temperature_2m_min": "tmin",
    "precipitation_sum": "precip",
    "precipitation_probability_max": "precip_prob",
    "et0_fao_evapotranspiration": "et0",
    "relative_humidity_2m_mean": "rh_mean",
    "wind_speed_10m_max": "wind_max",
}


def _cache_key(lat: float, lon: float) -> str:
    return f"openmeteo:{round(lat, 4)}:{round(lon, 4)}"


async def get_weather_bundle(lat: float, lon: float, days: int = 7) -> dict:
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&daily={','.join(DAILY_VARS)}"
        f"&current={','.join(CURRENT_VARS)}"
        f"&hourly={','.join(HOURLY_VARS)}"
        f"&timezone=auto&forecast_days={days}&past_days=0"
    )
    key = _cache_key(lat, lon)
    try:
        data = await data_fetcher.fetch_json(
            url, cache_key=key, ttl_success=900, ttl_error=60,
            timeout_connect=3.0, timeout_read=8.0, source_id=SOURCE_ID,
        )
        if not data or "daily" not in data:
            raise ValueError("Invalid response format from Open-Meteo")

        daily_raw = data["daily"]
        n = len(daily_raw.get("time", []))
        daily = []
        for i in range(n):
            row = {}
            for src, dst in DAILY_RENAME.items():
                series = daily_raw.get(src)
                row[dst] = series[i] if series is not None and i < len(series) else None
            daily.append(row)

        current = data.get("current") or {}
        current_out = {
            "time": current.get("time"),
            "temperature": current.get("temperature_2m"),
            "humidity": current.get("relative_humidity_2m"),
            "precipitation": current.get("precipitation"),
            "wind_speed": current.get("wind_speed_10m"),
            "weather_code": current.get("weather_code"),
        } if current else None

        soil_moisture = None
        hourly = data.get("hourly") or {}
        times = hourly.get("time") or []
        values = hourly.get("soil_moisture_9_to_27cm") or []
        if times and values and current_out and current_out.get("time"):
            now_hour = current_out["time"][:13]
            for t, v in zip(times, values):
                if t[:13] == now_hour and v is not None:
                    soil_moisture = {"value": v, "time": t, "depth": "9–27 cm", "unit": "m³/m³"}
                    break

        return {
            "status": "ok",
            "source": "Open-Meteo Forecast API",
            "fetched_at": fetched_at(key),
            "timezone": data.get("timezone"),
            "grid": {"lat": data.get("latitude"), "lon": data.get("longitude"), "elevation": data.get("elevation")},
            "current": current_out,
            "daily": daily,
            "soil_moisture": soil_moisture,
        }
    except Exception as e:
        logger.error(f"Open-Meteo extraction failed: {e}")
        return {
            "status": "unavailable",
            "source": "Open-Meteo Forecast API",
            "error": str(e),
            "fetched_at": None,
            "current": None,
            "daily": [],
            "soil_moisture": None,
        }
