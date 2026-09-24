import asyncio
import datetime
import time
from typing import Optional

from src.advisory import crop_rules as rules
from src.advisory.irrigation import compute_water_balance
from src.advisory.risk import assess
from src.advisory.soil import interpret_soil
from src.data.geocode import reverse_geocode
from src.data.market import get_market_price
from src.data.nasa_power import get_monthly_climatology
from src.data.open_meteo import get_weather_bundle
from src.data.hwsd import get_soil_properties, haversine_distance
from src.models.yield_service import estimate_yield

VERSION = "2.1"
MIN_AGRONOMIC = 0.4
MIN_FACTORS = 2


def _mean(vals):
    vals = [v for v in vals if v is not None]
    return round(sum(vals) / len(vals), 1) if vals else None


def _crop_features(crop, climatology, weather, soil, soil_test, overrides, today):
    feats, srcs = {}, {}
    sow = rules.sowing_status(crop, today)
    seasonal = rules.seasonal_climate(climatology.get("monthly", []), sow.get("growing_months") or [])
    daily = weather.get("daily", [])

    if seasonal:
        period = climatology.get("period")
        feats["temperature"], srcs["temperature"] = seasonal["temperature"], f"NASA POWER {period} mean over growing months"
        feats["rainfall"], srcs["rainfall"] = seasonal["rainfall"], f"NASA POWER {period} total over growing months"
        if seasonal.get("humidity") is not None:
            feats["humidity"], srcs["humidity"] = seasonal["humidity"], f"NASA POWER {period} mean over growing months"
        if seasonal.get("solar") is not None:
            feats["solar"], srcs["solar"] = seasonal["solar"], f"NASA POWER {period} mean over growing months (reported, not scored)"
    if feats.get("temperature") is None and daily:
        t = _mean([(d["tmax"] + d["tmin"]) / 2 for d in daily if d.get("tmax") is not None and d.get("tmin") is not None])
        if t is not None:
            feats["temperature"], srcs["temperature"] = t, "Open-Meteo 7-day forecast mean (climatology unavailable)"
    if feats.get("humidity") is None and daily:
        h = _mean([d.get("rh_mean") for d in daily])
        if h is not None:
            feats["humidity"], srcs["humidity"] = h, "Open-Meteo 7-day forecast mean (climatology unavailable)"

    if soil_test.get("ph") is not None:
        feats["ph"], srcs["ph"] = soil_test["ph"], "Soil test (entered in Farm Profile)"
    elif soil.get("phh2o") is not None:
        feats["ph"] = soil["phh2o"]
        srcs["ph"] = f"HWSD v2.0 {soil.get('depth', '').replace('-', '–')}" + (" — nearby cell" if soil.get("fallback_used") else "")
    for k in ("N", "P", "K"):
        if soil_test.get(k) is not None:
            feats[k], srcs[k] = soil_test[k], "Soil test (entered in Farm Profile)"

    for k, v in (overrides or {}).items():
        if v is not None:
            feats[k], srcs[k] = v, "What-if scenario value"
    return feats, srcs


WEATHER_FACTORS = ("temperature", "humidity", "rainfall")
SOIL_FACTORS = ("ph", "N", "P", "K")


def _compatibility(ev, factors):
    items = [a for a in ev["attribution"] if a["factor"] in factors]
    if not items:
        return {"status": "not_evaluated", "in_range": 0, "evaluated": 0}
    ok = sum(1 for a in items if a["status"] in ("in_range", "met_by_irrigation"))
    return {"status": "compatible" if ok == len(items) else ("partial" if ok else "incompatible"),
            "in_range": ok, "evaluated": len(items)}


def _crop_profile(crop, ev):
    cal = rules.CROP_CALENDAR.get(crop, {})
    lo, hi = rules.CROP_KNOWLEDGE[crop]["rainfall"]
    return {
        "duration_months": cal.get("duration"),
        "seasons": cal.get("seasons", []),
        "water_requirement_mm": [lo, hi],
        "weather_compatibility": _compatibility(ev, WEATHER_FACTORS),
        "soil_compatibility": _compatibility(ev, SOIL_FACTORS),
    }


def _financials(crop, yield_est, market, area):
    ref = rules.FINANCIAL_KNOWLEDGE.get(crop, {})
    y = yield_est.get("value_t_ha")
    if market.get("status") in ("live", "stale"):
        price_t = market["modal_price"] * 10
        price_basis = "live" if market["status"] == "live" else "last_observed"
    elif ref.get("price_per_t"):
        price_t = ref["price_per_t"]
        price_basis = "reference"
    else:
        price_t, price_basis = None, "unavailable"

    gross = round(y * area * price_t, 0) if y is not None and price_t is not None else None
    cost = round(ref["cost_per_ha"] * area, 0) if ref.get("cost_per_ha") else None
    net = round(gross - cost, 0) if gross is not None and cost is not None else None
    return {
        "yield_t_ha": y,
        "production_t": round(y * area, 2) if y is not None else None,
        "price_per_t": price_t,
        "price_per_kg": round(price_t / 1000, 2) if price_t is not None else None,
        "price_basis": price_basis,
        "gross_revenue": gross,
        "cost_total": cost,
        "cost_per_ha": ref.get("cost_per_ha"),
        "cost_basis": "Reference total production cost (static knowledge base, national, not itemised)" if cost is not None else None,
        "cost_components": {c: None for c in rules.COST_COMPONENTS},
        "net_return": net,
        "net_per_ha": round(net / area, 0) if net is not None and area else None,
    }


async def _soil(lat, lon):
    return await get_soil_properties(lat, lon)


def _measured(soil_test: dict) -> Optional[dict]:
    """Farm soil-test values take priority over HWSD; they are reported separately and never overwritten."""
    return {"sourceType": "FARM_MEASURED", "source": "Soil test (entered in Farm Profile)", "values": soil_test} if soil_test else None


async def _markets(state, district, lat, lon):
    names = list(rules.CROP_KNOWLEDGE.keys())
    results = await asyncio.gather(*[
        get_market_price(rules.AGMARKNET_NAMES.get(c), lat, lon, state, district) for c in names
    ])
    return dict(zip(names, results))


def _resolution(lat, lon, grid):
    if not grid or grid.get("lat") is None:
        return {"resolved_lat": None, "resolved_lon": None, "distance_km": None}
    return {"resolved_lat": grid["lat"], "resolved_lon": grid["lon"],
            "distance_km": round(haversine_distance(lat, lon, grid["lat"], grid["lon"]), 1)}


_inflight: dict = {}


async def build_summary(lat: float, lon: float, area: float = 1.0, irrigation_type: str = "Rainfed",
                        current_crop: Optional[str] = None, soil_test: Optional[dict] = None,
                        overrides: Optional[dict] = None) -> dict:
    key = repr((lat, lon, area, irrigation_type, current_crop, sorted((soil_test or {}).items()), sorted((overrides or {}).items())))
    task = _inflight.get(key)
    if task is None:
        task = asyncio.ensure_future(_build_summary(lat, lon, area, irrigation_type, current_crop, soil_test, overrides))
        _inflight[key] = task
        task.add_done_callback(lambda _t: _inflight.pop(key, None))
    return await asyncio.shield(task)


async def _build_summary(lat: float, lon: float, area: float = 1.0, irrigation_type: str = "Rainfed",
                        current_crop: Optional[str] = None, soil_test: Optional[dict] = None,
                        overrides: Optional[dict] = None) -> dict:
    started = time.time()
    today = datetime.date.today()
    soil_test = {k: v for k, v in (soil_test or {}).items() if v is not None}
    area = area if area and area > 0 else 1.0

    async def geo_then_markets():
        g = await reverse_geocode(lat, lon)
        m = await _markets(g.get("state"), g.get("district"), lat, lon)
        return g, m

    weather, climatology, soil, (geo, markets) = await asyncio.gather(
        get_weather_bundle(lat, lon),
        get_monthly_climatology(lat, lon),
        _soil(lat, lon),
        geo_then_markets(),
    )

    season = rules.season_context(today)
    soil_interp = interpret_soil(soil) if soil.get("status") in ("ok", "fallback") else {
        "texture": None, "ph_class": None, "organic_carbon_pct": None, "constraints": [], "implications": [], "amendments": []}
    irrigated = irrigation_type not in (None, "", "Rainfed")

    crops = []
    for crop in rules.CROP_KNOWLEDGE:
        feats, srcs = _crop_features(crop, climatology, weather, soil, soil_test, overrides, today)
        ev = rules.evaluate_crop(crop, feats, srcs, irrigated, season)
        y = estimate_yield(crop, ev["agronomic_score"])
        mk = markets.get(crop) or {"status": "unavailable"}
        fin = _financials(crop, y, mk, area)
        crops.append({**ev, "features": feats, "feature_sources": srcs, "yield": y, "market": mk, "financials": fin,
                      "profile": _crop_profile(crop, ev)})

    for c in crops:
        reasons = []
        evaluated = len(rules.FACTOR_LABELS) - len(c["excluded_factors"])
        c["scorable"] = evaluated >= MIN_FACTORS
        if not c["scorable"]:
            reasons.append(f"insufficient data ({evaluated} of {len(rules.FACTOR_LABELS)} factors evaluated)")
        if c["sowing"].get("in_season") is False:
            reasons.append(f"off-season (next sowing {c['sowing']['window_label']})")
        if c["agronomic_score"] < MIN_AGRONOMIC:
            reasons.append(f"agronomic suitability below {int(MIN_AGRONOMIC * 100)} %")
        c["eligible"] = not reasons
        c["ineligible_reasons"] = reasons

    for c in crops:
        basis = c["financials"]["price_basis"]
        c["economic"] = {
            "confidence": {"live": "Medium", "last_observed": "Low"}.get(basis, "Unavailable"),
            "observed_price": basis in ("live", "last_observed"),
            "basis": {
                "live": "Live mandi price; production cost is a static reference total",
                "last_observed": "Last observed mandi price; production cost is a static reference total",
                "reference": "No observed price: static reference price and cost, so the economic outlook cannot be assessed",
            }.get(basis, "No price available"),
        }

    crops.sort(key=lambda c: (c["eligible"], c["agronomic_score"],
                              c["financials"]["net_per_ha"] if c["economic"]["observed_price"] and c["financials"]["net_per_ha"] is not None else float("-inf")),
               reverse=True)
    for i, c in enumerate(crops):
        c["rank"] = i + 1
    pool = [c for c in crops if c["eligible"]] or [c for c in crops if c["scorable"]]
    canonical = crops[0] if crops[0]["scorable"] else None
    priced = [c for c in pool if c["economic"]["observed_price"] and c["financials"]["net_per_ha"] is not None]
    top_econ = max(priced, key=lambda c: c["financials"]["net_per_ha"]) if priced else None

    if canonical is None:
        explanation = ["Recommendation unavailable: weather, climate and soil data are all missing for this location, "
                       "so no crop can be evaluated. Retry the data sources from Settings or enter a soil test."]
    else:
        explanation = _explain(canonical, pool, top_econ, crops, irrigated)

    irrigation = compute_water_balance(weather.get("daily", []), current_crop, irrigation_type,
                                       soil_interp.get("texture"), weather.get("soil_moisture"), area)
    risk = assess(weather.get("daily", []), irrigation, irrigation_type, canonical, soil, soil_interp)
    return _assemble(locals())


def _explain(canonical, pool, top_econ, crops, irrigated):
    explanation = [
        f"{canonical['crop']} has the highest agronomic suitability ({round(canonical['agronomic_score'] * 100)} %) "
        f"among {len(pool)} crop(s) that can be sown in the planning window.",
    ]
    if top_econ and top_econ["crop"] != canonical["crop"]:
        explanation.append(
            f"Economic trade-off: {top_econ['crop']} has the highest estimated net return at observed prices "
            f"({round(top_econ['financials']['net_per_ha']):,} INR/ha) with {round(top_econ['agronomic_score'] * 100)} % agronomic suitability.")
    elif top_econ:
        explanation.append(f"{canonical['crop']} also has the highest estimated net return among crops with observed prices.")
    else:
        explanation.append("No eligible crop has an observed mandi price, so the economic outlook cannot be compared.")
    skipped = [c for c in crops if not c["eligible"] and c["agronomic_score"] > canonical["agronomic_score"]]
    for c in skipped[:2]:
        explanation.append(f"{c['crop']} scores {round(c['agronomic_score'] * 100)} % but is not eligible: "
                           + "; ".join(c["ineligible_reasons"]) + ".")
    rain_limited = [c for c in crops if any(a["factor"] == "rainfall" and a["status"] == "low" for a in c["attribution"])]
    if not irrigated and len(rain_limited) >= len(crops) / 2:
        explanation.append(f"Seasonal rainfall is below the requirement of {len(rain_limited)} of {len(crops)} crops and the farm is "
                           "recorded as rainfed. If the field is irrigated, set the irrigation system in Farm Profile: "
                           "irrigation removes the rainfall penalty.")
    if not canonical["eligible"]:
        explanation.append("No crop meets the in-season and minimum-suitability rules; the best available option is shown.")
    return explanation


def _assemble(v):
    lat, lon, area, irrigation_type, current_crop = v["lat"], v["lon"], v["area"], v["irrigation_type"], v["current_crop"]
    soil_test, overrides, weather, climatology, soil = v["soil_test"], v["overrides"], v["weather"], v["climatology"], v["soil"]
    geo, markets, season, soil_interp, crops = v["geo"], v["markets"], v["season"], v["soil_interp"], v["crops"]
    canonical, top_econ, explanation, irrigation, risk, started = v["canonical"], v["top_econ"], v["explanation"], v["irrigation"], v["risk"], v["started"]

    live_markets = sum(1 for m in markets.values() if m.get("status") == "live")
    sources = {
        "open_meteo": {"status": "ok" if weather["status"] == "ok" else "unavailable", "fetched_at": weather.get("fetched_at"),
                       "error": weather.get("error"), **_resolution(lat, lon, weather.get("grid"))},
        "nasa_power": {"status": "ok" if climatology["status"] == "ok" else "unavailable", "fetched_at": climatology.get("fetched_at"),
                       "period": climatology.get("period"), "error": climatology.get("error"), **_resolution(lat, lon, climatology.get("grid"))},
        "hwsd": {"status": soil["status"], "result_code": soil.get("result_code"), "fetched_at": soil.get("fetched_at"),
                 "fallback_reason": soil.get("fallback_reason"), "distance_km": soil.get("distance_km"),
                 "resolved_lat": soil.get("resolved_lat"), "resolved_lon": soil.get("resolved_lon"), "error": soil.get("error"),
                 "depth": soil.get("depth"), "resolution": soil.get("resolution"), "dataset_version": soil.get("dataset_version")},
        "agmarknet": {"status": "ok" if live_markets == len(markets) else ("partial" if live_markets else "unavailable"),
                      "live": live_markets, "total": len(markets),
                      "fetched_at": max((m.get("fetched_at") or 0 for m in markets.values()), default=None) or None,
                      "state": geo.get("state"), "district": geo.get("district")},
        "nominatim": {"status": geo.get("status"), "error": geo.get("error")},
    }

    return {
        "_meta": {
            "version": VERSION,
            "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "build_ms": int((time.time() - started) * 1000),
            "rules_version": rules.RULES_VERSION,
            "min_agronomic": MIN_AGRONOMIC,
        },
        "request": {"lat": lat, "lon": lon, "area": area, "irrigation_type": irrigation_type,
                    "current_crop": current_crop, "soil_test": soil_test, "overrides": overrides or {}},
        "location": {"lat": lat, "lon": lon, "timezone": weather.get("timezone"),
                     **{k: geo.get(k) for k in ("place", "district", "state", "country", "country_code", "display_name", "status")}},
        "season": season,
        "weather": weather,
        "climate": climatology,
        "soil": {**soil, "interpretation": soil_interp, "measured": _measured(soil_test)},
        "crops": crops,
        "recommendation": {
            "canonical": canonical["crop"] if canonical else None,
            "top_agronomic": canonical["crop"] if canonical else None,
            "top_economic": top_econ["crop"] if top_econ else None,
            "explanation": explanation,
        },
        "irrigation": irrigation,
        "risk": risk,
        "sources": sources,
    }
