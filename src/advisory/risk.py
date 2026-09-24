from typing import Optional

LEVEL_ORDER = {"unavailable": -1, "low": 0, "moderate": 1, "high": 2}

IMD_HEAVY = 64.5
IMD_VERY_HEAVY = 115.6


def _cat(cid, label, level, evidence, why, watch, action, data_used, module):
    return {"id": cid, "label": label, "level": level, "evidence": evidence, "why": why,
            "watch": watch, "action": action, "data_used": data_used, "module": module}


def climate_risk(daily: list) -> dict:
    days = [d for d in daily if d.get("tmax") is not None]
    if not days:
        return _cat("climate", "Climate", "unavailable", [], "Forecast unavailable.", None, None,
                    ["Open-Meteo 7-day forecast"], "/weather-intelligence")
    evidence, level = [], "low"
    hot40 = [d for d in days if d["tmax"] >= 40]
    hot35 = [d for d in days if 35 <= d["tmax"] < 40]
    cold = [d for d in days if d.get("tmin") is not None and d["tmin"] <= 4]
    heavy = [d for d in daily if (d.get("precip") or 0) >= IMD_HEAVY]
    very_heavy = [d for d in daily if (d.get("precip") or 0) >= IMD_VERY_HEAVY]
    windy = [d for d in daily if (d.get("wind_max") or 0) >= 40]
    if hot40:
        level = "high"
        evidence.append(f"{len(hot40)} day(s) with maximum ≥ 40 °C (peak {max(d['tmax'] for d in hot40):.1f} °C on {hot40[0]['date']}).")
    if hot35:
        level = max(level, "moderate", key=LEVEL_ORDER.get)
        evidence.append(f"{len(hot35)} day(s) with maximum 35–40 °C.")
    if cold:
        level = "high"
        evidence.append(f"Minimum temperature ≤ 4 °C on {len(cold)} day(s): frost risk.")
    if very_heavy:
        level = "high"
        evidence.append(f"Very heavy rain (≥ {IMD_VERY_HEAVY} mm, IMD) forecast on {very_heavy[0]['date']}.")
    elif heavy:
        level = max(level, "moderate", key=LEVEL_ORDER.get)
        evidence.append(f"Heavy rain (≥ {IMD_HEAVY} mm, IMD) forecast on {heavy[0]['date']} ({heavy[0]['precip']:.0f} mm).")
    if windy:
        level = max(level, "moderate", key=LEVEL_ORDER.get)
        evidence.append(f"Wind gusts up to {max(d['wind_max'] for d in windy):.0f} km/h forecast.")
    if not evidence:
        tmax = max(d["tmax"] for d in days)
        tmin = min(d["tmin"] for d in days if d.get("tmin") is not None) if any(d.get("tmin") is not None for d in days) else None
        evidence.append(f"No heat, frost, heavy-rain or wind thresholds crossed (7-day range {tmin:.0f}–{tmax:.0f} °C)." if tmin is not None
                        else "No heat, frost, heavy-rain or wind thresholds crossed.")
    return _cat(
        "climate", "Climate", level, evidence,
        "Heat above 35 °C at flowering cuts grain set; heavy rain causes waterlogging and nutrient loss.",
        "Daily maximum temperature and rainfall totals over the next 7 days.",
        "Schedule field operations around the flagged days; ensure drainage before heavy-rain days." if level != "low"
        else "No weather-driven intervention needed this week.",
        ["Open-Meteo 7-day forecast (tmax, tmin, rain, wind)", "IMD rainfall categories"], "/weather-intelligence")


def water_risk(irr: dict, irrigation_type: str) -> dict:
    if not irr or irr.get("status") == "unavailable":
        return _cat("water", "Water", "unavailable", [], "ET₀ forecast unavailable.", None, None,
                    ["Open-Meteo ET₀"], "/irrigation-advisor")
    deficit = irr["deficit_mm"]
    status = irr["status"]
    rainfed = irrigation_type == "Rainfed"
    evidence = [f"7-day crop water use {irr['totals']['etc']:.1f} mm vs effective rain {irr['totals']['eff_rain']:.1f} mm (deficit {deficit:.1f} mm)."]
    if irr.get("next_irrigation"):
        evidence.append(f"Root-zone depletion exceeds readily available water on {irr['next_irrigation']['date']}.")
    if status == "irrigate_now":
        level = "high"
    elif status == "irrigate_soon":
        level = "high" if rainfed else "moderate"
    elif status == "scheduled":
        level = "moderate" if rainfed else "low"
    else:
        level = "low"
        if deficit > 0:
            evidence.append(f"Stored soil water covers the deficit: depletion stays below the {irr['raw_mm']:.1f} mm threshold.")
    return _cat(
        "water", "Water", level, evidence,
        "Once root-zone depletion passes the readily available water, crops close stomata and growth slows.",
        "Cumulative deficit and the forecast day irrigation becomes necessary.",
        ("No irrigation system on record: prioritise mulching and moisture conservation." if rainfed and level != "low"
         else f"Plan irrigation for {irr['next_irrigation']['date']}." if irr.get("next_irrigation")
         else "No irrigation required in the forecast window."),
        ["Open-Meteo ET₀ and rainfall", irr["kc_basis"]], "/irrigation-advisor")


def suitability_risk(canonical: Optional[dict]) -> dict:
    if not canonical:
        return _cat("suitability", "Crop suitability", "unavailable", [], "No recommendation available.", None, None,
                    ["KRISHIMITRA rules engine"], "/crop-advisor")
    s = canonical["agronomic_score"]
    level = "low" if s >= 0.75 else ("moderate" if s >= 0.5 else "high")
    evidence = [f"{canonical['crop']} agronomic suitability {round(s * 100)} % ({canonical['confidence']} confidence, "
                f"{round(canonical['coverage'] * 100)} % of rule inputs available)."]
    evidence += [c["text"] for c in canonical["constraints"] if c["severity"] != "info"][:3]
    if canonical["excluded_factors"]:
        evidence.append("Not evaluated (no data): " + ", ".join(canonical["excluded_factors"]) + ".")
    return _cat(
        "suitability", "Crop suitability", level, evidence,
        "A crop grown outside its preferred climate/soil band yields less for the same input cost.",
        "Constraints flagged for the recommended crop and any factor not yet evaluated.",
        "Add soil-test N, P, K and pH in Farm Profile to evaluate every factor." if canonical["excluded_factors"]
        else "Recommendation is based on the complete rule set.",
        ["NASA POWER seasonal climatology", "Soil pH (HWSD v2.0 or soil test)", "KRISHIMITRA rules engine"], "/crop-advisor")


def disease_risk(daily: list) -> dict:
    days = [d for d in daily if d.get("rh_mean") is not None and d.get("tmax") is not None and d.get("tmin") is not None]
    if not days:
        return _cat("pest", "Pest & disease", "unavailable", [], "Humidity forecast unavailable.", None, None,
                    ["Open-Meteo humidity & temperature"], "/ai-insights")
    fav = [d for d in days if d["rh_mean"] >= 80 and 20 <= (d["tmax"] + d["tmin"]) / 2 <= 30]
    level = "high" if len(fav) >= 5 else ("moderate" if len(fav) >= 3 else "low")
    evidence = [f"{len(fav)} of {len(days)} forecast days combine mean humidity ≥ 80 % with mean temperature 20–30 °C."]
    return _cat(
        "pest", "Pest & disease", level, evidence,
        "Prolonged leaf wetness in warm weather favours fungal diseases (blights, mildews, leaf spots).",
        "Runs of humid, warm days; scout for early lesions after them.",
        "Scout fields after the humid spell and keep canopies ventilated." if level != "low" else "Routine scouting is enough.",
        ["Open-Meteo humidity & temperature", "Generic fungal-favourability rule (not crop-specific surveillance)"], "/ai-insights")


def soil_risk(soil: dict, interp: dict) -> dict:
    if soil.get("status") not in ("ok", "fallback"):
        return _cat("soil", "Soil", "unavailable", [soil.get("fallback_reason") or "HWSD v2.0 soil data unavailable."],
                    "Soil data is unavailable.", "Check the HWSD v2.0 dataset in Settings → Data Sources.",
                    "Enter soil-test values in Farm Profile.", ["FAO/IIASA HWSD v2.0"], "/soil-intelligence")
    cons = interp.get("constraints", [])
    level = "high" if any(c["severity"] == "critical" for c in cons) else ("moderate" if cons else "low")
    evidence = [c["text"] for c in cons] or ["No pH, texture, organic-carbon or CEC constraint detected."]
    if soil.get("fallback_used"):
        evidence.append(soil.get("fallback_reason"))
    return _cat(
        "soil", "Soil", level, evidence,
        "Soil pH and texture control nutrient availability and drainage for every crop.",
        "pH extremes, organic carbon and drainage-limiting texture.",
        (interp["amendments"][0] if interp.get("amendments") else "Maintain current soil management."),
        [f"FAO/IIASA HWSD v2.0 {soil.get('depth', '').replace('-', '–')}, ~1 km"
         + (" (nearby cell)" if soil.get("fallback_used") else "")], "/soil-intelligence")


def market_risk(canonical: Optional[dict]) -> dict:
    mk = (canonical or {}).get("market") or {}
    if not canonical or mk.get("status") != "live":
        return _cat("market", "Market", "unavailable",
                    [mk.get("reason") or "No live mandi price for the recommended crop."],
                    "Without a live price the revenue estimate relies on a static reference price.",
                    "Agmarknet arrivals for the crop in your state.", "Treat revenue figures as indicative only.",
                    ["Agmarknet via data.gov.in"], "/crop-advisor")
    evidence = [f"{canonical['crop']} modal price ₹{mk['modal_price']:,.0f}/qtl at {mk['market']} ({mk['arrival_date']})."]
    spread = (mk["pool_max"] - mk["pool_min"]) / mk["modal_price"] if mk["modal_price"] else 0
    evidence.append(f"Modal prices across {mk['markets_considered']} reporting markets range ₹{mk['pool_min']:,.0f}–₹{mk['pool_max']:,.0f}/qtl.")
    change = None
    if mk.get("previous"):
        change = (mk["modal_price"] - mk["previous"]["modal_price"]) / mk["previous"]["modal_price"]
        evidence.append(f"{change * 100:+.1f} % vs previous observation ({mk['previous']['arrival_date']}).")
    level = "high" if spread > 0.6 or (change is not None and change < -0.15) else ("moderate" if spread > 0.3 or (change is not None and change < -0.05) else "low")
    return _cat(
        "market", "Market", level, evidence,
        "Wide price dispersion or falling prices make harvest-time revenue uncertain.",
        "Daily modal price and the spread between reporting markets.",
        "Compare nearby mandis before sale and consider staggered selling." if level != "low" else "Prices are stable across markets.",
        ["Agmarknet via data.gov.in"], "/crop-advisor")


def yield_risk(canonical: Optional[dict]) -> dict:
    y = (canonical or {}).get("yield") or {}
    ref = None
    if canonical:
        from .crop_rules import FINANCIAL_KNOWLEDGE
        ref = FINANCIAL_KNOWLEDGE.get(canonical["crop"], {}).get("expected_yield_t_ha")
    if not canonical or y.get("value_t_ha") is None or not ref:
        return _cat("yield", "Yield", "unavailable", ["No yield estimate is available for the recommended crop."],
                    "Yield drives both food output and revenue.", None, None, ["Yield estimate"], "/yield-prediction")
    ratio = y["value_t_ha"] / ref
    level = "low" if ratio >= 0.85 else ("moderate" if ratio >= 0.6 else "high")
    evidence = [f"Estimated {canonical['crop']} yield {y['value_t_ha']:.2f} t/ha is {ratio * 100:.0f} % of the "
                f"{ref:g} t/ha reference ({y.get('method_label')})."]
    limiting = [c["text"] for c in canonical["constraints"] if c["severity"] in ("caution", "critical")][:2]
    evidence += limiting
    return _cat(
        "yield", "Yield", level, evidence,
        "Every constraint that lowers suitability lowers the attainable yield for the same inputs.",
        "The limiting factors listed for the recommended crop.",
        "Address the limiting factors (irrigation, soil amendment, sowing date) before sowing." if level != "low"
        else "No yield-limiting factor beyond normal management.",
        [y.get("method_label") or "Yield estimate", "KRISHIMITRA rules engine"], "/yield-prediction")


def risk_timeline(daily: list, irr: dict) -> list:
    irr_dates = {d["date"] for d in (irr or {}).get("days", []) if d.get("irrigation_gross", 0) > 0}
    out = []
    for d in daily:
        flags = []
        if d.get("tmax") is not None and d["tmax"] >= 35:
            flags.append({"type": "heat", "label": f"Heat {d['tmax']:.0f} °C", "severity": "critical" if d["tmax"] >= 40 else "caution"})
        if d.get("tmin") is not None and d["tmin"] <= 4:
            flags.append({"type": "frost", "label": f"Frost risk {d['tmin']:.0f} °C", "severity": "critical"})
        if (d.get("precip") or 0) >= IMD_HEAVY:
            flags.append({"type": "rain", "label": f"Heavy rain {d['precip']:.0f} mm", "severity": "critical" if d["precip"] >= IMD_VERY_HEAVY else "caution"})
        if d.get("rh_mean") is not None and d.get("tmax") is not None and d.get("tmin") is not None                 and d["rh_mean"] >= 80 and 20 <= (d["tmax"] + d["tmin"]) / 2 <= 30:
            flags.append({"type": "disease", "label": "Disease-favourable", "severity": "caution"})
        if (d.get("wind_max") or 0) >= 40:
            flags.append({"type": "wind", "label": f"Wind {d['wind_max']:.0f} km/h", "severity": "caution"})
        if d.get("date") in irr_dates:
            flags.append({"type": "irrigation", "label": "Irrigation due", "severity": "info"})
        out.append({"date": d.get("date"), "flags": flags})
    return out


def _first_flag_date(timeline, types):
    for day in timeline:
        if any(f["type"] in types for f in day["flags"]):
            return day["date"]
    return None


def assess(daily, irr, irrigation_type, canonical, soil, soil_interp) -> dict:
    cats = [
        climate_risk(daily),
        water_risk(irr, irrigation_type),
        suitability_risk(canonical),
        yield_risk(canonical),
        disease_risk(daily),
        soil_risk(soil, soil_interp),
        market_risk(canonical),
    ]
    timeline = risk_timeline(daily, irr)
    sow = ((canonical or {}).get("sowing") or {}).get("window_label")
    has_moisture = bool((irr or {}).get("assumptions")) and not any("assumed at field capacity" in a for a in irr.get("assumptions", []))
    meta = {
        "climate": (_first_flag_date(timeline, {"heat", "frost", "rain", "wind"}), "Medium: 7-day numerical forecast"),
        "water": ((irr or {}).get("next_irrigation", {}) or {}).get("date") if irr else None,
        "suitability": (f"Before sowing ({sow})" if sow else None, None),
        "yield": (f"Before sowing ({sow})" if sow else None, None),
        "pest": (_first_flag_date(timeline, {"disease"}), "Low: generic weather rule, not pest surveillance"),
        "soil": (f"Before sowing ({sow})" if sow else None, None),
        "market": ("At harvest and sale", "Medium: single-day mandi prices"),
    }
    for c in cats:
        m = meta.get(c["id"])
        if c["id"] == "water":
            c["when"] = m if m else ("Now" if (irr or {}).get("status") == "irrigate_now" else None)
            c["confidence"] = "Medium: modelled soil moisture + ET₀ forecast" if has_moisture else "Low: soil moisture assumed"
        elif c["id"] == "suitability":
            c["when"], c["confidence"] = m[0], f"{canonical['confidence']}: {round(canonical['coverage'] * 100)} % of rule inputs" if canonical else None
        elif c["id"] == "yield":
            c["when"], c["confidence"] = m[0], ((canonical or {}).get("yield") or {}).get("reliability")
        elif c["id"] == "soil":
            c["when"] = m[0]
            c["confidence"] = "Medium: HWSD v2.0 ~1 km cell (regional estimate)" if soil.get("status") == "ok" else (
                "Low: nearby HWSD v2.0 cell" if soil.get("status") == "fallback" else None)
        else:
            c["when"], c["confidence"] = m
        if c["level"] == "unavailable":
            c["confidence"] = None
    rated = [c for c in cats if c["level"] != "unavailable"]
    overall = max((c["level"] for c in rated), key=LEVEL_ORDER.get) if rated else "unavailable"
    return {"overall": overall, "categories": cats, "timeline": timeline,
            "available": len(rated), "total": len(cats)}
