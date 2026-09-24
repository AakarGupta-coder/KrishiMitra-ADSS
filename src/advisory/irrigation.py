from typing import Optional

from .crop_rules import KC_MID

TEXTURE_WATER = {
    "Sand": (0.12, 0.045),
    "Loamy sand": (0.14, 0.06),
    "Sandy loam": (0.23, 0.10),
    "Loam": (0.25, 0.12),
    "Silt loam": (0.29, 0.15),
    "Silt": (0.32, 0.15),
    "Sandy clay loam": (0.27, 0.17),
    "Clay loam": (0.32, 0.20),
    "Silty clay loam": (0.34, 0.21),
    "Sandy clay": (0.33, 0.22),
    "Silty clay": (0.36, 0.23),
    "Clay": (0.36, 0.22),
}
EFFICIENCY = {"Drip": 0.90, "Sprinkler": 0.75, "Flood/Surface": 0.60}
ROOT_DEPTH_M = 0.5
DEPLETION_FRACTION = 0.5
EFFECTIVE_RAIN_THRESHOLD_MM = 5.0
EFFECTIVE_RAIN_FRACTION = 0.8


def compute_water_balance(daily: list, crop: Optional[str], irrigation_type: str, texture: Optional[str],
                          soil_moisture: Optional[dict], area_ha: float) -> dict:
    assumptions = []
    valid = [d for d in daily if d.get("et0") is not None and d.get("date")]
    if not valid:
        return {"status": "unavailable", "reason": "ET₀ forecast unavailable from Open-Meteo.", "days": [],
                "assumptions": []}

    if crop and crop in KC_MID:
        kc, kc_basis = KC_MID[crop], f"FAO-56 mid-season Kc for {crop}"
    else:
        kc, kc_basis = 1.0, ("No FAO-56 Kc for this crop — reference ET₀ used" if crop
                             else "No current crop set — reference ET₀ (Kc = 1.0) used")
    assumptions.append(kc_basis)

    if texture in TEXTURE_WATER:
        fc, wp = TEXTURE_WATER[texture]
        texture_basis = f"{texture} (HWSD v2.0 USDA texture class)"
    else:
        fc, wp = TEXTURE_WATER["Loam"]
        texture_basis = "Soil texture unavailable — loam water-holding values assumed"
    assumptions.append(f"{texture_basis}; root zone {ROOT_DEPTH_M} m; p = {DEPLETION_FRACTION}")
    taw = 1000 * (fc - wp) * ROOT_DEPTH_M
    raw = DEPLETION_FRACTION * taw

    if soil_moisture and soil_moisture.get("value") is not None:
        theta = soil_moisture["value"]
        dr = min(taw, max(0.0, 1000 * (fc - theta) * ROOT_DEPTH_M))
        start_basis = f"Starting depletion from modelled soil moisture {theta:.3f} m³/m³ ({soil_moisture.get('depth')})"
    else:
        dr = 0.0
        start_basis = "No soil-moisture estimate — profile assumed at field capacity on day 1"
    assumptions.append(start_basis)
    assumptions.append(f"Effective rain = {int(EFFECTIVE_RAIN_FRACTION * 100)} % of daily rain ≥ {EFFECTIVE_RAIN_THRESHOLD_MM:g} mm")

    efficiency = EFFICIENCY.get(irrigation_type)
    if efficiency:
        assumptions.append(f"{irrigation_type} application efficiency {int(efficiency * 100)} %")
    else:
        assumptions.append("Rainfed farm — net requirement shown; no irrigation system on record")

    initial_dr = round(dr, 1)
    days, first_irrigation = [], None
    tot = {"rain": 0.0, "eff_rain": 0.0, "et0": 0.0, "etc": 0.0, "net_irrigation": 0.0, "gross_irrigation": 0.0}
    for d in valid:
        p = d.get("precip")
        p_val = p if p is not None else 0.0
        peff = EFFECTIVE_RAIN_FRACTION * p_val if p_val >= EFFECTIVE_RAIN_THRESHOLD_MM else 0.0
        etc = kc * d["et0"]
        dr = min(taw, max(0.0, dr + etc - peff))
        net = gross = 0.0
        if dr > raw:
            net = dr
            gross = net / efficiency if efficiency else net
            dr = 0.0
            if first_irrigation is None:
                first_irrigation = {"date": d["date"], "net_mm": round(net, 1), "gross_mm": round(gross, 1)}
        tot["rain"] += p_val
        tot["eff_rain"] += peff
        tot["et0"] += d["et0"]
        tot["etc"] += etc
        tot["net_irrigation"] += net
        tot["gross_irrigation"] += gross
        days.append({
            "date": d["date"],
            "rain": p,
            "effective_rain": round(peff, 1),
            "et0": d["et0"],
            "etc": round(etc, 2),
            "balance": round(peff - etc, 2),
            "depletion": round(dr, 1),
            "irrigation_gross": round(gross, 1),
            "irrigation_net": round(net, 1),
        })

    if initial_dr > raw:
        status = "irrigate_now"
    elif first_irrigation:
        idx = next(i for i, x in enumerate(days) if x["date"] == first_irrigation["date"])
        status = "irrigate_soon" if idx <= 2 else "scheduled"
    else:
        status = "not_needed"

    deficit = max(0.0, tot["etc"] - tot["eff_rain"])
    return {
        "status": status,
        "crop": crop,
        "kc": kc,
        "kc_basis": kc_basis,
        "irrigation_type": irrigation_type,
        "efficiency": efficiency,
        "taw_mm": round(taw, 1),
        "raw_mm": round(raw, 1),
        "initial_depletion_mm": initial_dr,
        "totals": {k: round(v, 1) for k, v in tot.items()},
        "deficit_mm": round(deficit, 1),
        "next_irrigation": first_irrigation,
        "volume_m3": round(tot["gross_irrigation"] * 10 * area_ha, 1),
        "horizon_days": len(days),
        "days": days,
        "assumptions": assumptions,
    }
