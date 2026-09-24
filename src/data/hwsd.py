"""Soil properties from the local FAO/IIASA Harmonized World Soil Database v2.0.

Lookup: (lat, lon) -> HWSD2.bil pixel (30 arc-second, ~1 km, value = HWSD2_SMU_ID)
        -> dominant component of that mapping unit (highest SHARE, then lowest SEQUENCE) in HWSD2_LAYERS
        -> the configured depth layer (default D1 = 0-20 cm, HWSD's topsoil layer).
The dataset is static and local: no network request is made. Build it once with scripts/hwsd/build_hwsd.py.
"""
import asyncio
import copy
import math
import os
import sqlite3
import threading
from functools import lru_cache
from typing import Optional

import numpy as np

SOURCE_ID = "hwsd"
SOURCE = "FAO/IIASA HWSD v2.0"
DATASET_VERSION = "2.0"
RESOLUTION = "~1 km"
DATA_DIR = os.getenv("HWSD_DIR", "data/hwsd")
RASTER = os.path.join(DATA_DIR, "HWSD2.bil")
HEADER = os.path.join(DATA_DIR, "HWSD2.hdr")
DATABASE = os.path.join(DATA_DIR, "hwsd2.sqlite")
LAYER = os.getenv("HWSD_LAYER", "D1")
FALLBACK_RADIUS_KM = float(os.getenv("HWSD_FALLBACK_RADIUS_KM", "5"))

PROPERTIES = ["nitrogen", "phh2o", "sand", "silt", "clay", "soc", "cec"]
UNITS = {
    "nitrogen": "g/kg", "phh2o": "pH", "sand": "%", "silt": "%", "clay": "%", "soc": "g/kg", "cec": "cmol(c)/kg",
    "bulk_density": "g/cm³", "available_water_capacity": "mm (rootable depth)", "awc_mm_per_m": "mm/m", "coarse_fragments": "% vol",
}
# WRB2 codes HWSD v2.0 uses for mapping units that are not soil (D_WRB2: Open Water, Glaciers, No Data, Islands).
NON_SOIL = {"WR", "GG", "ND", "IS"}
# FAO-90 miscellaneous (non-soil) units in D_FAO90; HWSD gives them no layer properties (e.g. UR = "Urban, mining, etc.").
FAO90_NON_SOIL = {"DS", "GG", "RK", "ST", "UR", "WR"}

_lock = threading.Lock()


def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def dataset_available() -> bool:
    return all(os.path.exists(p) for p in (RASTER, HEADER, DATABASE))


@lru_cache(maxsize=1)
def _raster():
    hdr = {}
    with open(HEADER) as f:
        for line in f:
            parts = line.split()
            if len(parts) == 2:
                hdr[parts[0].upper()] = parts[1]
    rows, cols = int(hdr["NROWS"]), int(hdr["NCOLS"])
    dtype = np.dtype("<u2" if hdr.get("BYTEORDER", "I") == "I" else ">u2")
    grid = np.memmap(RASTER, dtype=dtype, mode="r", shape=(rows, cols))
    # ULXMAP/ULYMAP are the centre of the upper-left cell.
    return grid, float(hdr["ULXMAP"]), float(hdr["ULYMAP"]), float(hdr["XDIM"]), float(hdr["YDIM"]), int(hdr.get("NODATA", 65535))


@lru_cache(maxsize=1)
def _db():
    con = sqlite3.connect(f"file:{DATABASE}?mode=ro", uri=True, check_same_thread=False)
    con.row_factory = sqlite3.Row
    return con


@lru_cache(maxsize=8)
def _domain(table: str) -> dict:
    rows = _db().execute(f"SELECT * FROM {table}").fetchall()
    value = next((k for k in rows[0].keys() if k.upper() == "VALUE"), None) if rows else None
    return {r["CODE"]: r[value].strip() for r in rows} if value else {}


def _cell(lat, lon):
    grid, ulx, uly, dx, dy, _ = _raster()
    col = math.floor((lon - (ulx - dx / 2)) / dx)
    row = math.floor(((uly + dy / 2) - lat) / dy)
    return row, col


def _centre(row, col):
    _, ulx, uly, dx, dy, _ = _raster()
    return round(uly - row * dy, 5), round(ulx + col * dx, 5)


def _unit(smu_id: int) -> Optional[dict]:
    """Dominant component of a mapping unit at the configured layer, or None when the unit has no record."""
    rows = _db().execute(
        "SELECT * FROM layers WHERE smu_id = ? AND layer = ? ORDER BY share DESC, sequence ASC", (smu_id, LAYER)).fetchall()
    if not rows:
        return None
    return {"top": dict(rows[0]), "components": len(rows)}


def _usable(unit: Optional[dict]) -> bool:
    if unit is None:
        return False
    top = unit["top"]
    return top["wrb2"] not in NON_SOIL and any(top[k] is not None for k in ("ph_water", "sand", "clay", "org_carbon"))


def _texture_name(code) -> tuple[Optional[str], Optional[str]]:
    """HWSD label and the USDA texture-triangle class used by KRISHIMITRA (HWSD splits USDA 'Clay' into heavy/light)."""
    if code is None:
        return None, None
    label = _domain("d_texture_usda").get(str(int(code)))
    if label is None:
        return None, None
    return label, "Clay" if label.startswith("Clay (") else label


def _lookup(lat: float, lon: float, radius_km: float) -> dict:
    grid, *_ = _raster()
    rows, cols = grid.shape
    r0, c0 = _cell(lat, lon)
    nodata = _raster()[5]
    exact_smu = int(grid[r0, c0]) if 0 <= r0 < rows and 0 <= c0 < cols else nodata
    exact_unit = _unit(exact_smu) if exact_smu != nodata else None
    if _usable(exact_unit):
        return {"smu": exact_smu, "unit": exact_unit, "row": r0, "col": c0, "exact": True}

    if exact_smu == nodata:
        reason = "HWSD v2.0 has no mapping unit at this cell (outside the soil map, e.g. sea)."
    elif exact_unit is None:
        reason = f"HWSD v2.0 mapping unit {exact_smu} has no {LAYER} attribute record."
    elif exact_unit["top"]["wrb2"] in NON_SOIL:
        reason = f"HWSD v2.0 classifies this cell as '{_domain('d_wrb2').get(exact_unit['top']['wrb2'])}' (mapping unit {exact_smu})."
    elif exact_unit["top"]["fao90"] in FAO90_NON_SOIL:
        reason = (f"HWSD v2.0 maps this cell as '{_domain('d_fao90').get(exact_unit['top']['fao90'])}' "
                  f"(FAO-90 {exact_unit['top']['fao90']}, mapping unit {exact_smu}), which carries no soil properties.")
    else:
        reason = f"HWSD v2.0 mapping unit {exact_smu} has no {LAYER} soil properties."

    _, _, _, dx, dy, _ = _raster()
    n = int(math.ceil(radius_km / (dy * 111.0))) + 1
    ncol = int(math.ceil(radius_km / max(dx * 111.0 * math.cos(math.radians(lat)), 1e-6))) + 1
    ra, rb = max(0, r0 - n), min(rows, r0 + n + 1)
    ca, cb = max(0, c0 - ncol), min(cols, c0 + ncol + 1)
    window = np.asarray(grid[ra:rb, ca:cb])
    candidates = []
    for i in range(window.shape[0]):
        for j in range(window.shape[1]):
            smu = int(window[i, j])
            if smu == nodata or (ra + i, ca + j) == (r0, c0):
                continue
            clat, clon = _centre(ra + i, ca + j)
            d = haversine_distance(lat, lon, clat, clon)
            if d <= radius_km:
                candidates.append((d, ra + i, ca + j, smu))
    tried = {}
    for d, r, c, smu in sorted(candidates):
        if smu not in tried:
            tried[smu] = _unit(smu)
        if _usable(tried[smu]):
            return {"smu": smu, "unit": tried[smu], "row": r, "col": c, "exact": False, "reason": reason}
    return {"smu": exact_smu if exact_smu != nodata else None, "unit": None, "exact": False, "reason": reason}


LAYER_DEPTHS = {"D1": (0, 20), "D2": (20, 40), "D3": (40, 60), "D4": (60, 80), "D5": (80, 100), "D6": (100, 150), "D7": (150, 200)}


def _empty(lat, lon, radius_km) -> dict:
    top, bot = LAYER_DEPTHS.get(LAYER, (None, None))
    result = {
        "requested_lat": lat, "requested_lon": lon, "resolved_lat": None, "resolved_lon": None,
        "distance_km": None, "fallback_used": False, "fallback_reason": None,
        "status": "unavailable", "result_code": "UNAVAILABLE",
        "depth": f"{top}-{bot} cm" if top is not None else LAYER, "layer": LAYER,
        "units": UNITS, "fetched_at": None, "source": SOURCE, "error": None,
        "source_type": "MODELLED_GRID", "dataset_version": DATASET_VERSION, "resolution": RESOLUTION,
        "data_quality": None, "fallback_radius_km": radius_km,
        "hwsd_smu_id": None, "soil_unit": None, "component_share": None, "components_in_unit": None,
        "texture_class": None, "texture_class_hwsd": None, "bulk_density": None, "available_water_capacity": None,
        "awc_mm_per_m": None, "rooting_depth": None, "drainage": None, "coarse_fragments": None,
    }
    for p in PROPERTIES:
        result[p] = None
    return result


def _provenance(r: dict) -> dict:
    return {
        "source": r["source"], "sourceType": r["source_type"], "datasetVersion": r["dataset_version"],
        "resolution": r["resolution"], "depth": r["depth"],
        "requestedLatitude": r["requested_lat"], "requestedLongitude": r["requested_lon"],
        "resolvedLatitude": r["resolved_lat"], "resolvedLongitude": r["resolved_lon"],
        "fallbackDistanceKm": r["distance_km"], "dataQuality": r["data_quality"],
    }


def lookup_soil(lat: float, lon: float, radius_km: Optional[float] = None) -> dict:
    radius_km = FALLBACK_RADIUS_KM if radius_km is None else radius_km
    result = _empty(lat, lon, radius_km)
    if not (isinstance(lat, (int, float)) and isinstance(lon, (int, float))
            and math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180):
        result["error"] = "Coordinates out of range"
        result["fallback_reason"] = "Invalid coordinate; no soil lookup was made."
        result["provenance"] = _provenance(result)
        return result
    lat, lon = round(lat, 4), round(lon, 4)
    result.update(requested_lat=lat, requested_lon=lon)
    if not dataset_available():
        result["error"] = f"HWSD v2.0 dataset not installed in {DATA_DIR}"
        result["fallback_reason"] = "The local HWSD v2.0 dataset is missing. Run scripts/hwsd/build_hwsd.py."
        result["provenance"] = _provenance(result)
        return result
    try:
        return copy.deepcopy(_resolve(lat, lon, radius_km))
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {e}"
        result["fallback_reason"] = "The local HWSD v2.0 lookup failed."
        result["provenance"] = _provenance(result)
        return result


@lru_cache(maxsize=4096)
def _resolve(lat: float, lon: float, radius_km: float) -> dict:
    """Static dataset: the result depends only on dataset version, coordinate, layer and radius, so it is cached for the process."""
    with _lock:
        return _build(lat, lon, radius_km)


def _build(lat: float, lon: float, radius_km: float) -> dict:
    result = _empty(lat, lon, radius_km)
    hit = _lookup(lat, lon, radius_km)
    result["hwsd_smu_id"] = hit.get("smu")
    if hit["unit"] is None:
        result["result_code"] = "NO_SOIL_DATA"
        result["fallback_reason"] = hit["reason"] + f" No usable HWSD soil cell within {radius_km:g} km."
        result["provenance"] = _provenance(result)
        return result

    top = hit["unit"]["top"]
    rlat, rlon = _centre(hit["row"], hit["col"])
    hwsd_label, usda = _texture_name(top["texture_usda"])
    oc = top["org_carbon"]
    result.update({
        "phh2o": top["ph_water"], "sand": top["sand"], "silt": top["silt"], "clay": top["clay"],
        "soc": round(oc * 10, 2) if oc is not None else None,  # HWSD ORG_CARBON is % weight; 1 % = 10 g/kg
        "nitrogen": top["total_n"], "cec": top["cec_soil"],
        "bulk_density": top["bulk"], "coarse_fragments": top["coarse"],
        "texture_class": usda, "texture_class_hwsd": hwsd_label,
        "available_water_capacity": top["awc_mm"],
        "rooting_depth": _domain("d_root_depth").get(str(int(top["root_depth"]))) if top["root_depth"] is not None else None,
        "drainage": _domain("d_drainage").get(top["drainage"]) if top["drainage"] else None,
        "soil_unit": _domain("d_wrb2").get(top["wrb2"], top["wrb2"]) if top["wrb2"] else None,
        "component_share": top["share"], "components_in_unit": hit["unit"]["components"],
        "resolved_lat": rlat, "resolved_lon": rlon,
        # Inside the requested cell the offset is 0; for a neighbouring cell it is the distance to that cell's centre.
        "distance_km": 0.0 if hit["exact"] else round(haversine_distance(lat, lon, rlat, rlon), 2),
        "data_quality": "REGIONAL_ESTIMATE",
    })
    smu_row = _db().execute("SELECT awc_mm_m FROM smu WHERE smu_id = ?", (hit["smu"],)).fetchone()
    result["awc_mm_per_m"] = smu_row["awc_mm_m"] if smu_row else None
    if hit["exact"]:
        result["status"], result["result_code"] = "ok", "SUCCESS"
    else:
        result["status"], result["result_code"], result["fallback_used"] = "fallback", "FALLBACK", True
        result["fallback_reason"] = f"{hit['reason']} Nearest HWSD soil cell {result['distance_km']:.1f} km away is used."
    result["provenance"] = _provenance(result)
    return result


async def get_soil_properties(lat: float, lon: float, radius_km: Optional[float] = None) -> dict:
    return await asyncio.to_thread(lookup_soil, lat, lon, radius_km)


def clear_cache() -> int:
    n = _resolve.cache_info().currsize
    _resolve.cache_clear()
    for f in (_raster, _db, _domain):
        f.cache_clear()
    return n
