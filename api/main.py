import datetime
import os
import time
from typing import Optional

import pandas as pd
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from src.advisory import crop_rules as rules
from src.data import store
from src.data.api_utils import invalidate
from src.data.geocode import reverse_geocode
from src.data.market import get_market_price, using_sample_key
from src.data.nasa_power import get_monthly_climatology
from src.data.open_meteo import get_weather_bundle
from src.data import hwsd
from src.data.hwsd import get_soil_properties
from src.models.crop_ml import load_classifiers
from src.models.yield_service import estimate_yield, historical_yields, model_info
from src.services.farm_summary import VERSION, build_summary

app = FastAPI(title="KRISHIMITRA API", description="Backend API for KRISHIMITRA ADSS", version=VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

IRRIGATION_TYPES = {"Rainfed", "Drip", "Sprinkler", "Flood/Surface"}


def _summary_args(lat, lon, area, irrigation_type, current_crop, n, p, k, ph, temp=None, rainfall=None):
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise HTTPException(status_code=422, detail="Coordinates out of range")
    return dict(
        lat=round(lat, 4), lon=round(lon, 4), area=area,
        irrigation_type=irrigation_type if irrigation_type in IRRIGATION_TYPES else "Rainfed",
        current_crop=current_crop or None,
        soil_test={"N": n, "P": p, "K": k, "ph": ph},
        overrides={k2: v for k2, v in {"temperature": temp, "rainfall": rainfall}.items() if v is not None},
    )


@app.get("/api/health")
async def health_check():
    return {"status": "online", "version": VERSION, "time": datetime.datetime.now(datetime.timezone.utc).isoformat()}


@app.get("/api/farm/summary")
async def farm_summary(
    lat: float = Query(...), lon: float = Query(...), area: float = Query(1.0, gt=0),
    irrigation_type: str = Query("Rainfed"), current_crop: Optional[str] = Query(None),
    n: Optional[float] = Query(None), p: Optional[float] = Query(None), k: Optional[float] = Query(None),
    ph: Optional[float] = Query(None),
):
    s = await build_summary(**_summary_args(lat, lon, area, irrigation_type, current_crop, n, p, k, ph))
    # Same registry-derived provider health as /api/sources, read after this summary's requests were recorded.
    return {**s, "provider_status": {e["id"]: {k2: e[k2] for k2 in ("status", "kind", "last_attempt", "last_success", "last_error")}
                                     for e in provider_statuses()}}


app.get("/api/dashboard/summary")(farm_summary)


@app.get("/api/advisory/crop")
async def crop_advisory(
    lat: float = Query(...), lon: float = Query(...), area: float = Query(1.0, gt=0),
    irrigation_type: str = Query("Rainfed"), current_crop: Optional[str] = Query(None),
    n: Optional[float] = Query(None), p: Optional[float] = Query(None), k: Optional[float] = Query(None),
    ph: Optional[float] = Query(None), temp: Optional[float] = Query(None), rainfall: Optional[float] = Query(None),
):
    s = await build_summary(**_summary_args(lat, lon, area, irrigation_type, current_crop, n, p, k, ph, temp, rainfall))
    return {"_meta": s["_meta"], "request": s["request"], "crops": s["crops"], "recommendation": s["recommendation"]}


@app.get("/api/advisory/yield")
async def yield_detail(
    crop: str = Query(...), lat: float = Query(...), lon: float = Query(...), area: float = Query(1.0, gt=0),
    irrigation_type: str = Query("Rainfed"), current_crop: Optional[str] = Query(None),
    n: Optional[float] = Query(None), p: Optional[float] = Query(None), k: Optional[float] = Query(None),
    ph: Optional[float] = Query(None),
):
    if crop not in rules.CROP_KNOWLEDGE:
        raise HTTPException(status_code=404, detail=f"Unknown crop {crop}")
    s = await build_summary(**_summary_args(lat, lon, area, irrigation_type, current_crop, n, p, k, ph))
    c = next(x for x in s["crops"] if x["crop"] == crop)
    est = estimate_yield(crop, c["agronomic_score"], with_shap=True)

    sensitivity = None
    if est["method"] == "reference":
        ref = est["reference_t_ha"]
        sensitivity = [{"suitability": pct, "yield_t_ha": round(ref * pct / 100, 2)} for pct in (40, 50, 60, 70, 80, 90, 100)]

    return {
        "_meta": s["_meta"],
        "request": s["request"],
        "crop": crop,
        "estimate": est,
        "production_t": round(est["value_t_ha"] * s["request"]["area"], 2) if est.get("value_t_ha") is not None else None,
        "agronomic": {k2: c[k2] for k2 in ("agronomic_score", "confidence", "coverage", "positives", "constraints", "attribution", "excluded_factors", "sowing")},
        "features": c["features"],
        "feature_sources": c["feature_sources"],
        "financials": c["financials"],
        "historical": historical_yields(crop),
        "model": model_info(),
        "sensitivity": sensitivity,
        "sources": s["sources"],
    }


@app.get("/api/weather/forecast")
async def fetch_weather(lat: float = Query(...), lon: float = Query(...)):
    return await get_weather_bundle(round(lat, 4), round(lon, 4))


@app.get("/api/soil/properties")
async def fetch_soil(lat: float = Query(...), lon: float = Query(...)):
    return await get_soil_properties(round(lat, 4), round(lon, 4))


def _file_info(path):
    try:
        st = os.stat(path)
        return {"path": path, "modified": datetime.datetime.fromtimestamp(st.st_mtime, datetime.timezone.utc).isoformat()}
    except OSError:
        return {"path": path, "modified": None}


def _catalogue():
    crop_df, fao_df = None, None
    try:
        crop_df = pd.read_csv("data/crop_recommendation.csv")
    except Exception:
        pass
    try:
        fao_df = pd.read_csv("data/faostat_sample.csv")
    except Exception:
        pass
    this_year = datetime.date.today().year
    ym = model_info()
    cm = load_classifiers()[1]
    return [
        {"id": "open_meteo", "name": "Open-Meteo", "kind": "remote", "category": "Weather & forecast",
         "purpose": "Current conditions, 7-day forecast, FAO-56 reference ET₀ and modelled soil moisture.",
         "resolution": "Best-available NWP model per location (≈1–11 km grid)", "coverage": "Global",
         "variables": ["temperature_2m_max/min", "precipitation_sum", "precipitation_probability_max",
                       "et0_fao_evapotranspiration", "relative_humidity_2m_mean", "wind_speed_10m_max",
                       "weather_code", "soil_moisture_9_to_27cm"],
         "cache_ttl": "15 min", "url": "https://open-meteo.com/", "used_by": ["Dashboard", "Weather", "Irrigation", "AI Insights", "Crop Advisor"]},
        {"id": "nasa_power", "name": "NASA POWER", "kind": "remote", "category": "Historical agro-climatology",
         "purpose": "Five-year monthly climatology used for crop-specific growing-season temperature, rainfall and humidity.",
         "resolution": "0.5° × 0.625° (MERRA-2 meteorology)", "coverage": "Global, monthly",
         "variables": ["T2M", "PRECTOTCORR", "RH2M"], "cache_ttl": "7 days",
         "url": "https://power.larc.nasa.gov/", "used_by": ["Crop Advisor", "Yield Prediction", "Weather"]},
        {"id": "hwsd", "name": "FAO/IIASA HWSD v2.0", "kind": "local", "category": "Soil properties",
         "purpose": "Topsoil pH, USDA texture, sand/silt/clay, organic carbon, total nitrogen, CEC, bulk density, "
                    "available water capacity and rooting depth for the dominant soil of the ~1 km map unit.",
         "resolution": "~1 km (30 arc-second), " + "–".join(map(str, hwsd.LAYER_DEPTHS[hwsd.LAYER])) + " cm layer",
         "coverage": "Global",
         "variables": ["PH_WATER", "SAND", "SILT", "CLAY", "TEXTURE_USDA", "ORG_CARBON", "TOTAL_N", "CEC_SOIL", "BULK", "AWC", "ROOT_DEPTH", "DRAINAGE"],
         "dataset": f"Local dataset v{hwsd.DATASET_VERSION}: HWSD2.bil raster + HWSD2.mdb attributes (layer {hwsd.LAYER})",
         "notes": ["Static dataset: values are regional estimates for the dominant soil of the map unit, not field measurements.",
                   f"Cells HWSD maps as water, glacier, urban or no-data use the nearest soil cell within {hwsd.FALLBACK_RADIUS_KM:g} km.",
                   "ISRIC SoilGrids is no longer queried at runtime."],
         "file": _file_info(hwsd.DATABASE), "available": hwsd.dataset_available(),
         "url": "https://www.fao.org/land-water/resources/tools/databases/hwsd/en",
         "used_by": ["Soil", "Crop Advisor", "Irrigation", "AI Insights"]},
        {"id": "agmarknet", "name": "Agmarknet mandi prices", "kind": "remote", "category": "Market prices",
         "purpose": "Current daily modal prices from regulated markets, matched to the farm's district or the nearest reporting market.",
         "resolution": "Market (mandi) level, INR/quintal", "coverage": "India, current day's arrivals",
         "variables": ["commodity", "market", "district", "state", "arrival_date", "min/max/modal price"],
         "cache_ttl": "3 h", "url": "https://data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi",
         "notes": ["Public sample API key: at most 10 records per request, so nearest-market search is limited."] if using_sample_key() else [],
         "used_by": ["Crop Advisor", "Reports", "AI Insights"]},
        {"id": "faostat", "name": "FAOSTAT (local sample)", "kind": "local", "category": "Agricultural statistics",
         "purpose": "Historical national yields; training data for the yield model.",
         "resolution": "India, national, annual",
         "coverage": (f"{int(fao_df['Year'][fao_df['Year'] <= this_year].min())}–{int(fao_df['Year'][fao_df['Year'] <= this_year].max())}; crops: "
                      + ", ".join(sorted(fao_df['Crop'].unique()))) if fao_df is not None else None,
         "dataset": f"{len(fao_df)} rows in data/faostat_sample.csv" if fao_df is not None else None,
         "notes": [f"{int((fao_df['Year'] > this_year).sum())} rows carry future years and are ignored.",
                   "Several rows repeat identical values (27,000 hg/ha), so treat them as placeholder sample data."] if fao_df is not None else [],
         "file": _file_info("data/faostat_sample.csv"), "available": fao_df is not None,
         "used_by": ["Yield Prediction"]},
        {"id": "crop_dataset", "name": "Crop recommendation dataset", "kind": "local", "category": "ML training data",
         "purpose": "Training data for the crop_xgb classifier (the ML opinion shown beside the rules-based ranking).",
         "dataset": f"{len(crop_df)} rows, {crop_df['label'].nunique()} class(es): {', '.join(sorted(crop_df['label'].unique()))}" if crop_df is not None else None,
         "features": ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"],
         "notes": ["The classifier trained on this file has a single class, so it cannot rank crops. It is excluded from recommendations."]
         if crop_df is not None and crop_df["label"].nunique() < 2 else
         ["Public benchmark dataset, not specific to this region; its rainfall column is on a monthly scale.",
          "The ML opinion is reported separately and never changes the rules-based recommendation."] if crop_df is not None else [],
         "file": _file_info("data/crop_recommendation.csv"), "available": crop_df is not None,
         "used_by": ["Crop Advisor"]},
        {"id": "yield_model", "name": "Yield model (yield_xgb)", "kind": "local", "category": "ML model",
         "purpose": "Year + crop regression on FAOSTAT sample.",
         "dataset": f"Supports: {', '.join(ym.get('supported_crops', []))}" if ym.get("available") else None,
         "notes": [f"Hold-out R² = {ym['r2']:.2f} (low reliability).",
                   "Used only for supported crops; others use the labelled reference-yield method."] if ym.get("available") else [],
         "file": _file_info("models/yield_xgb.pkl"), "available": ym.get("available", False),
         "used_by": ["Yield Prediction"]},
        {"id": "crop_model", "name": "Crop classifier (crop_xgb)", "kind": "local", "category": "ML model",
         "purpose": "XGBoost classifier over 22 crops; its ranking is shown as a separate ML opinion in Crop Advisor.",
         "dataset": ", ".join(f"{n}: {', '.join(v['features'])} (hold-out accuracy {v['accuracy']:.1%})"
                              for n, v in cm["variants"].items()) if cm else None,
         "notes": ["The 'full' variant needs a soil test (N, P, K); otherwise the 'climate' variant runs on temperature, humidity, pH and rainfall.",
                   "Never used to rank or recommend crops."] if cm else [],
         "file": _file_info("models/crop_xgb.pkl"), "available": cm is not None,
         "used_by": ["Crop Advisor"]},
        {"id": "rules", "name": "Agronomic rules engine", "kind": "local", "category": "Crop constraints & thresholds",
         "purpose": "Crop climate/soil ranges, Indian sowing calendar, FAO-56 Kc, IMD rainfall categories, soil interpretation.",
         "dataset": f"{rules.RULES_VERSION}: {len(rules.CROP_KNOWLEDGE)} crops",
         "rule_version": rules.RULES_VERSION, "rule_updated": rules.RULES_UPDATED,
         "notes": ["Production costs and fallback prices are static national reference values, not itemised and not location-specific."],
         "available": True, "used_by": ["Crop Advisor", "Irrigation", "Soil", "AI Insights"]},
        {"id": "nominatim", "name": "OpenStreetMap Nominatim", "kind": "remote", "category": "Geocoding",
         "purpose": "Resolves coordinates to district and state for market matching and location labels.",
         "resolution": "Administrative boundaries", "coverage": "Global", "cache_ttl": "30 days",
         "url": "https://nominatim.openstreetmap.org/", "used_by": ["Location", "Crop Advisor"]},
    ]


def _status_for(entry, reg):
    if entry["kind"] == "local":
        return "available" if entry.get("available") else "unavailable"
    r = reg.get(entry["id"])
    if not r:
        return "not_queried"
    recent = r["last_success"] and (time.time() - r["last_success"] < 24 * 3600)
    if r["last_status"] == "ok":
        return "connected"
    return "degraded" if recent else "unavailable"


def provider_statuses():
    """Canonical provider health: catalogue entries + the persisted outcome of their most recent real request."""
    reg = store.get_source_statuses()
    out = []
    for entry in _catalogue():
        r = reg.get(entry["id"], {})
        out.append({**entry, "status": _status_for(entry, reg), "last_attempt": r.get("last_attempt"),
                    "last_success": r.get("last_success"), "last_error": r.get("last_error")})
    return out


@app.get("/api/sources")
async def list_sources():
    return {"sources": provider_statuses(), "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}


CACHE_PREFIXES = {"open_meteo": "openmeteo:", "nasa_power": "nasapower:",
                  "agmarknet": "agmarknet:", "nominatim": "nominatim:"}


async def _fetch_source(source_id, lat, lon, crop=None):
    if source_id == "open_meteo":
        return await get_weather_bundle(lat, lon)
    if source_id == "nasa_power":
        return await get_monthly_climatology(lat, lon)
    if source_id == "hwsd":
        return await get_soil_properties(lat, lon)
    if source_id == "nominatim":
        return await reverse_geocode(lat, lon)
    if source_id == "agmarknet":
        g = await reverse_geocode(lat, lon)
        name = rules.AGMARKNET_NAMES[crop] if crop and crop in rules.AGMARKNET_NAMES else None
        return await get_market_price(name, lat, lon, g.get("state"), g.get("district"))
    raise HTTPException(status_code=404, detail="Source cannot be fetched remotely")


@app.post("/api/sources/{source_id}/refresh")
async def refresh_source(source_id: str, lat: float = Query(...), lon: float = Query(...)):
    if source_id == "hwsd":
        # Static local dataset: nothing to re-download; re-open the files and repeat the lookup.
        dropped = hwsd.clear_cache()
        data = await get_soil_properties(round(lat, 4), round(lon, 4))
        return {"source_id": source_id, "cache_entries_dropped": dropped, "last_status": data.get("status"),
                "last_success": None, "last_error": data.get("error"), "result_status": data.get("status")}
    if source_id not in CACHE_PREFIXES:
        raise HTTPException(status_code=404, detail="Unknown or local source")
    dropped = invalidate(CACHE_PREFIXES[source_id])
    data = await _fetch_source(source_id, round(lat, 4), round(lon, 4))
    reg = store.get_source_statuses().get(source_id, {})
    return {"source_id": source_id, "cache_entries_dropped": dropped, "last_status": reg.get("last_status"),
            "last_success": reg.get("last_success"), "last_error": reg.get("last_error"),
            "result_status": data.get("status")}


@app.get("/api/sources/{source_id}/raw")
async def raw_source(source_id: str, lat: float = Query(...), lon: float = Query(...), crop: Optional[str] = Query(None)):
    return {"source_id": source_id, "lat": lat, "lon": lon,
            "data": await _fetch_source(source_id, round(lat, 4), round(lon, 4), crop)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
