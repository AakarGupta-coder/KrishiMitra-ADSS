import calendar
import datetime
import logging

logger = logging.getLogger("KrishiMitra")

RULES_VERSION = "KM-Rules 2.1"
RULES_UPDATED = "2026-09-23"

CROP_KNOWLEDGE = {
    "Wheat": {"N": (100, 150), "P": (40, 60), "K": (30, 50), "temp": (15, 25), "humidity": (50, 70), "ph": (6.0, 7.5), "rainfall": (300, 600)},
    "Sorghum": {"N": (80, 100), "P": (30, 50), "K": (20, 40), "temp": (25, 35), "humidity": (40, 60), "ph": (5.5, 8.5), "rainfall": (400, 600)},
    "Pearl Millet": {"N": (60, 80), "P": (20, 40), "K": (20, 30), "temp": (28, 38), "humidity": (40, 50), "ph": (6.0, 8.0), "rainfall": (300, 500)},
    "Barley": {"N": (60, 80), "P": (30, 40), "K": (20, 30), "temp": (12, 22), "humidity": (50, 60), "ph": (6.5, 8.0), "rainfall": (200, 400)},

    "Green Gram": {"N": (20, 30), "P": (40, 50), "K": (20, 30), "temp": (25, 35), "humidity": (60, 80), "ph": (6.5, 7.5), "rainfall": (600, 800)},
    "Black Gram": {"N": (20, 30), "P": (40, 50), "K": (20, 30), "temp": (25, 35), "humidity": (60, 80), "ph": (5.5, 7.5), "rainfall": (600, 800)},

    "Sugarcane": {"N": (200, 300), "P": (80, 120), "K": (100, 150), "temp": (25, 35), "humidity": (70, 85), "ph": (6.5, 7.5), "rainfall": (1500, 2500)},

    "Tomato": {"N": (100, 150), "P": (60, 80), "K": (80, 120), "temp": (20, 30), "humidity": (60, 80), "ph": (6.0, 7.0), "rainfall": (400, 600)},
    "Potato": {"N": (120, 150), "P": (80, 100), "K": (100, 150), "temp": (15, 25), "humidity": (70, 85), "ph": (5.0, 6.5), "rainfall": (500, 700)},
    "Onion": {"N": (100, 120), "P": (50, 70), "K": (80, 100), "temp": (15, 30), "humidity": (60, 75), "ph": (6.0, 7.0), "rainfall": (350, 550)},

    "Turmeric": {"N": (120, 150), "P": (50, 70), "K": (100, 120), "temp": (20, 35), "humidity": (70, 90), "ph": (5.5, 7.5), "rainfall": (1500, 2000)},
    "Ginger": {"N": (100, 120), "P": (50, 70), "K": (100, 120), "temp": (20, 35), "humidity": (70, 90), "ph": (6.0, 6.5), "rainfall": (1500, 2000)},
}

FINANCIAL_KNOWLEDGE = {
    "Wheat": {"expected_yield_t_ha": 3.5, "price_per_t": 22000, "cost_per_ha": 45000},
    "Sorghum": {"expected_yield_t_ha": 2.0, "price_per_t": 25000, "cost_per_ha": 30000},
    "Pearl Millet": {"expected_yield_t_ha": 1.5, "price_per_t": 20000, "cost_per_ha": 25000},
    "Barley": {"expected_yield_t_ha": 2.5, "price_per_t": 21000, "cost_per_ha": 35000},
    "Green Gram": {"expected_yield_t_ha": 1.2, "price_per_t": 70000, "cost_per_ha": 30000},
    "Black Gram": {"expected_yield_t_ha": 1.1, "price_per_t": 65000, "cost_per_ha": 28000},
    "Sugarcane": {"expected_yield_t_ha": 70.0, "price_per_t": 3000, "cost_per_ha": 120000},
    "Tomato": {"expected_yield_t_ha": 25.0, "price_per_t": 15000, "cost_per_ha": 150000},
    "Potato": {"expected_yield_t_ha": 20.0, "price_per_t": 12000, "cost_per_ha": 100000},
    "Onion": {"expected_yield_t_ha": 15.0, "price_per_t": 18000, "cost_per_ha": 80000},
    "Turmeric": {"expected_yield_t_ha": 5.0, "price_per_t": 80000, "cost_per_ha": 150000},
    "Ginger": {"expected_yield_t_ha": 6.0, "price_per_t": 75000, "cost_per_ha": 160000},
}

COST_COMPONENTS = ["seed", "fertilizer", "pesticide", "irrigation", "labour", "machinery", "transport", "other"]

AGMARKNET_NAMES = {
    "Wheat": "Wheat",
    "Sorghum": "Jowar(Sorghum)",
    "Pearl Millet": "Bajra(Pearl Millet/Cumbu)",
    "Barley": "Barley(Jau)",
    "Green Gram": "Green Gram(Moong)(Whole)",
    "Black Gram": "Black Gram(Urd Beans)(Whole)",
    "Sugarcane": "Sugarcane",
    "Tomato": "Tomato",
    "Potato": "Potato",
    "Onion": "Onion",
    "Turmeric": "Turmeric",
    "Ginger": "Ginger(Green)",
}

CROP_CALENDAR = {
    "Wheat": {"windows": [(11, 12)], "duration": 5, "seasons": ["Rabi"]},
    "Sorghum": {"windows": [(6, 7), (9, 10)], "duration": 4, "seasons": ["Kharif", "Rabi"]},
    "Pearl Millet": {"windows": [(6, 7), (2, 3)], "duration": 3, "seasons": ["Kharif", "Zaid"]},
    "Barley": {"windows": [(10, 11)], "duration": 4, "seasons": ["Rabi"]},
    "Green Gram": {"windows": [(6, 7), (3, 4)], "duration": 3, "seasons": ["Kharif", "Zaid"]},
    "Black Gram": {"windows": [(6, 7), (10, 11)], "duration": 3, "seasons": ["Kharif", "Rabi"]},
    "Sugarcane": {"windows": [(1, 3), (10, 11)], "duration": 12, "seasons": ["Annual"]},
    "Tomato": {"windows": [(6, 7), (10, 11), (1, 2)], "duration": 4, "seasons": ["Kharif", "Rabi", "Zaid"]},
    "Potato": {"windows": [(10, 11)], "duration": 4, "seasons": ["Rabi"]},
    "Onion": {"windows": [(6, 7), (10, 12)], "duration": 4, "seasons": ["Kharif", "Rabi"]},
    "Turmeric": {"windows": [(5, 6)], "duration": 8, "seasons": ["Kharif"]},
    "Ginger": {"windows": [(4, 6)], "duration": 8, "seasons": ["Kharif"]},
}

KC_MID = {
    "Wheat": 1.15, "Sorghum": 1.05, "Pearl Millet": 1.00, "Barley": 1.15,
    "Green Gram": 1.05, "Black Gram": 1.05, "Sugarcane": 1.25, "Tomato": 1.15,
    "Potato": 1.15, "Onion": 1.05, "Rice": 1.20, "Maize": 1.20, "Cotton": 1.15,
    "Soybean": 1.15, "Groundnut": 1.15, "Chickpea": 1.00,
}

FACTOR_LABELS = {
    "N": "Nitrogen", "P": "Phosphorus", "K": "Potassium", "temperature": "Temperature",
    "humidity": "Humidity", "ph": "Soil pH", "rainfall": "Seasonal rainfall",
}
FACTOR_UNITS = {"N": "kg/ha", "P": "kg/ha", "K": "kg/ha", "temperature": "°C", "humidity": "%", "ph": "", "rainfall": "mm"}
RANGE_KEYS = {"N": "N", "P": "P", "K": "K", "temperature": "temp", "humidity": "humidity", "ph": "ph", "rainfall": "rainfall"}

OFF_SEASON_MULTIPLIER = 0.5
SOWING_LOOKAHEAD_DAYS = 60


def indian_season(month: int) -> str:
    if 6 <= month <= 10:
        return "Kharif"
    if month >= 11 or month <= 3:
        return "Rabi"
    return "Zaid"


def season_context(today: datetime.date) -> dict:
    y, m = today.year, today.month

    def rabi(start_year):
        return f"Rabi {start_year}–{str(start_year + 1)[-2:]}"

    current = indian_season(m)
    if current == "Kharif":
        cur_label, planning, plan_label = f"Kharif {y}", "Rabi", rabi(y)
    elif current == "Rabi":
        start = y if m >= 11 else y - 1
        cur_label, planning, plan_label = rabi(start), "Zaid", f"Zaid {start + 1}"
    else:
        cur_label, planning, plan_label = f"Zaid {y}", "Kharif", f"Kharif {y}"
    return {"current": current, "current_label": cur_label, "planning": planning,
            "planning_label": plan_label, "date": today.isoformat()}


def _window_dates(window, ref: datetime.date):
    s, e = window
    for y in (ref.year - 1, ref.year, ref.year + 1):
        start = datetime.date(y, s, 1)
        end_year = y if e >= s else y + 1
        end = datetime.date(end_year, e, calendar.monthrange(end_year, e)[1])
        yield start, end


def sowing_status(crop: str, today: datetime.date) -> dict:
    cal = CROP_CALENDAR.get(crop)
    if not cal:
        return {"in_season": None, "window_label": None, "window_start": None, "status": "unknown"}
    best = None
    for w in cal["windows"]:
        for start, end in _window_dates(w, today):
            if end < today:
                continue
            if best is None or start < best[0]:
                best = (start, end, w)
    start, end, w = best
    open_now = start <= today <= end
    days_to_open = (start - today).days
    in_season = open_now or days_to_open <= SOWING_LOOKAHEAD_DAYS
    fmt = lambda d: d.strftime("%b")
    window_label = f"{fmt(start)}–{fmt(end)} {end.year}" if start.year == end.year else f"{fmt(start)} {start.year}–{fmt(end)} {end.year}"
    return {
        "in_season": in_season,
        "status": "open" if open_now else ("upcoming" if in_season else "off_season"),
        "window_label": window_label,
        "window_start": start.isoformat(),
        "window_end": end.isoformat(),
        "days_to_open": max(0, days_to_open),
        "seasons": cal["seasons"],
        "growing_months": [((start.month - 1 + i) % 12) + 1 for i in range(cal["duration"])],
    }


def seasonal_climate(monthly: list, months: list) -> dict:
    rows = [r for r in monthly if r["month"] in months]
    if not rows or any(r["t2m"] is None or r["precip_mm"] is None for r in rows):
        return {}
    return {
        "temperature": round(sum(r["t2m"] for r in rows) / len(rows), 1),
        "rainfall": round(sum(r["precip_mm"] for r in rows), 0),
        "humidity": round(sum(r["rh2m"] for r in rows if r["rh2m"] is not None) / max(1, len([r for r in rows if r["rh2m"] is not None])), 0)
        if any(r["rh2m"] is not None for r in rows) else None,
        "solar": round(sum(r["solar_mj_m2_day"] for r in rows) / len(rows), 2)
        if all(r.get("solar_mj_m2_day") is not None for r in rows) else None,
        "months": months,
    }


def evaluate_crop(crop: str, features: dict, sources: dict, irrigated: bool, season: dict) -> dict:
    reqs = CROP_KNOWLEDGE[crop]
    score = 1.0
    positives, constraints, attribution, excluded = [], [], [], []

    for key, label in FACTOR_LABELS.items():
        val = features.get(key)
        lo, hi = reqs[RANGE_KEYS[key]]
        unit = FACTOR_UNITS[key]
        u = f" {unit}" if unit and unit != "%" else unit
        if val is None:
            excluded.append(label)
            continue
        entry = {"factor": key, "label": label, "value": val, "min": lo, "max": hi, "unit": unit,
                 "source": sources.get(key), "multiplier": 1.0, "status": "in_range"}
        if lo <= val <= hi:
            positives.append(f"{label} {val:g}{u} within preferred {lo:g}–{hi:g}{u}")
        elif val < lo and key == "rainfall" and irrigated:
            entry["status"] = "met_by_irrigation"
            constraints.append({"severity": "info",
                                "text": f"Seasonal rainfall {val:g} mm is below the {lo:g} mm the crop needs — the gap must be met by irrigation"})
        else:
            if val < lo:
                m = max(0.2, 1.0 - (lo - val) / lo)
                direction = "below"
                edge = lo
            else:
                m = max(0.2, 1.0 - (val - hi) / hi)
                direction = "above"
                edge = hi
            entry.update({"multiplier": round(m, 3), "status": "low" if direction == "below" else "high"})
            score *= m
            constraints.append({"severity": "critical" if m < 0.6 else "caution",
                                "text": f"{label} {val:g}{u} {direction} preferred {'minimum' if direction == 'below' else 'maximum'} {edge:g}{u}"})
        attribution.append(entry)

    sow = sowing_status(crop, datetime.date.fromisoformat(season["date"]))
    if sow.get("in_season") is False:
        score *= OFF_SEASON_MULTIPLIER
        constraints.append({"severity": "caution",
                            "text": f"Off-season now — next sowing window {sow['window_label']}"})
        attribution.append({"factor": "season", "label": "Sowing window", "value": None, "multiplier": OFF_SEASON_MULTIPLIER,
                            "status": "off_season", "source": RULES_VERSION})
    elif sow.get("in_season"):
        positives.append(f"Sowing window {'open now' if sow['status'] == 'open' else 'opens'}: {sow['window_label']}")

    evaluated = len(FACTOR_LABELS) - len(excluded)
    coverage = evaluated / len(FACTOR_LABELS)
    confidence = "High" if coverage >= 0.85 else ("Medium" if coverage >= 0.55 else "Low")

    return {
        "crop": crop,
        "agronomic_score": round(score, 3),
        "positives": positives,
        "constraints": constraints,
        "attribution": attribution,
        "excluded_factors": excluded,
        "coverage": round(coverage, 2),
        "confidence": confidence,
        "sowing": sow,
    }
