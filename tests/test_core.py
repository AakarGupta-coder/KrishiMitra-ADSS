import asyncio
import datetime
import json

import pytest

from src.advisory import crop_rules as R
from src.advisory.irrigation import compute_water_balance
from src.advisory.soil import interpret_soil, ph_class, usda_texture
from src.data import api_utils, hwsd, market
from src.services import farm_summary as fs


def run(coro):
    return asyncio.run(coro)


def test_usda_texture_classes():
    assert usda_texture(40, 40, 20) == "Loam"
    assert usda_texture(90, 5, 5) == "Sand"
    assert usda_texture(88, 6, 6) == "Loamy sand"
    assert usda_texture(20, 30, 50) == "Clay"
    assert usda_texture(10, 70, 20) == "Silt loam"
    assert usda_texture(None, None, None) is None


def test_soil_amendments_only_when_rule_fires():
    assert ph_class(5.0)["tone"] == "critical"
    acid = interpret_soil({"phh2o": 5.2, "sand": 92, "silt": 4, "clay": 4, "soc": 3.0, "cec": 6})
    assert any("Liming" in a for a in acid["amendments"])
    neutral = interpret_soil({"phh2o": 7.0, "sand": 40, "silt": 40, "clay": 20, "soc": 9.0, "cec": 20})
    assert neutral["amendments"] == []
    empty = interpret_soil({k: None for k in ("phh2o", "sand", "silt", "clay", "soc", "cec")})
    assert empty["amendments"] == [] and empty["constraints"] == []


def test_water_balance_schedules_irrigation_and_handles_missing_et0():
    days = [{"date": f"2026-10-0{d}", "et0": 6.0, "precip": 0.0} for d in range(1, 8)]
    wb = compute_water_balance(days, "Wheat", "Drip", "Loam", None, 1.0)
    assert wb["kc"] == 1.15 and wb["efficiency"] == 0.9 and wb["next_irrigation"]
    assert wb["next_irrigation"]["gross_mm"] == pytest.approx(wb["next_irrigation"]["net_mm"] / 0.9, abs=0.1)
    assert compute_water_balance([{"date": "2026-10-01", "et0": None}], None, "Rainfed", None, None, 1)["status"] == "unavailable"


def test_season_labels_follow_the_date():
    assert R.season_context(datetime.date(2026, 9, 23))["planning_label"] == "Rabi 2026–27"
    assert R.season_context(datetime.date(2027, 1, 10))["current_label"] == "Rabi 2026–27"
    assert R.season_context(datetime.date(2026, 4, 10))["planning_label"] == "Kharif 2026"
    assert R.sowing_status("Wheat", datetime.date(2026, 9, 23))["window_label"] == "Nov–Dec 2026"


@pytest.fixture
def tiny_hwsd(tmp_path, monkeypatch):
    """A 5 x 5 HWSD-format grid (0.1° cells, lon 0–0.5, lat 0–0.5) with a matching attribute DB.
    Row 0: SMU 1 soil, SMU 2 open water, SMU 3 no layer record, SMU 4 soil with missing CEC/texture; the rest NODATA."""
    import sqlite3
    import numpy as np
    grid = np.full((5, 5), 65535, dtype="<u2")
    grid[0, :4] = [1, 2, 3, 4]
    grid.tofile(tmp_path / "HWSD2.bil")
    (tmp_path / "HWSD2.hdr").write_text("BYTEORDER I\nNROWS 5\nNCOLS 5\nULXMAP 0.05\nULYMAP 0.45\nXDIM 0.1\nYDIM 0.1\nNODATA 65535\n")
    con = sqlite3.connect(tmp_path / "hwsd2.sqlite")
    cols = ("smu_id", "sequence", "share", "wrb2", "fao90", "layer", "sand", "silt", "clay", "coarse", "texture_usda", "bulk",
            "org_carbon", "ph_water", "total_n", "cec_soil", "awc_mm", "root_depth", "drainage")
    con.execute(f"CREATE TABLE layers ({', '.join(cols)})")
    rows = [(1, 1, 70, "VR", "VRe", "D1", 20, 30, 50, 5, 3, 1.5, 0.8, 7.9, 0.9, 45, 180, 1, "MW"),
            (1, 2, 30, "CM", "CMe", "D1", 60, 20, 20, 5, 10, 1.4, 0.5, 6.5, 0.6, 12, 120, 1, "W"),
            (2, 1, 100, "WR", "WR", "D1", *[None] * 13),
            (4, 1, 100, "LP", "LPe", "D1", None, None, None, None, None, None, 1.2, 6.1, None, None, 50, 3, "W")]
    con.executemany(f"INSERT INTO layers VALUES ({', '.join('?' * len(cols))})", rows)
    con.execute("CREATE TABLE smu (smu_id, awc_mm_m)")
    con.executemany("INSERT INTO smu VALUES (?, ?)", [(1, 180), (4, 50)])
    for t, data in {"d_texture_usda": [("3", "Clay (light)"), ("10", "Sandy clay loam")],
                    "d_wrb2": [("VR", "Vertisols"), ("WR", "Open Water"), ("LP", "Leptosols"), ("CM", "Cambisols")],
                    "d_fao90": [("WR", "Water bodies")], "d_root_depth": [("1", "Deep  (> 100cm)"), ("3", "Shallow  (< 50cm)")]}.items():
        con.execute(f"CREATE TABLE {t} (CODE, VALUE)")
        con.executemany(f"INSERT INTO {t} VALUES (?, ?)", data)
    con.execute("CREATE TABLE d_drainage (SYMBOL, CODE, VALUE)")
    con.executemany("INSERT INTO d_drainage VALUES (?, ?, ?)", [("4", "MW", "Moderately well drained "), ("3", "W", "Well drained")])
    con.commit()
    con.close()
    for name, f in (("RASTER", "HWSD2.bil"), ("HEADER", "HWSD2.hdr"), ("DATABASE", "hwsd2.sqlite")):
        monkeypatch.setattr(hwsd, name, str(tmp_path / f))
    hwsd.clear_cache()
    yield tmp_path
    hwsd.clear_cache()


def _clean(r):
    _no_bad_numbers(r)
    assert "undefined" not in json.dumps(r)


def test_hwsd_valid_cell_uses_dominant_component(tiny_hwsd):
    r = hwsd.lookup_soil(0.45, 0.05)
    assert r["status"] == "ok" and r["result_code"] == "SUCCESS" and not r["fallback_used"]
    assert r["hwsd_smu_id"] == 1 and r["soil_unit"] == "Vertisols" and r["component_share"] == 70 and r["components_in_unit"] == 2
    assert (r["phh2o"], r["sand"], r["silt"], r["clay"], r["cec"], r["nitrogen"]) == (7.9, 20, 30, 50, 45, 0.9)
    assert r["soc"] == 8.0  # 0.8 % weight -> 8 g/kg
    assert r["texture_class"] == "Clay" and r["texture_class_hwsd"] == "Clay (light)"
    assert r["depth"] == "0-20 cm" and r["source_type"] == "MODELLED_GRID" and r["data_quality"] == "REGIONAL_ESTIMATE"
    p = r["provenance"]
    assert p["source"] == "FAO/IIASA HWSD v2.0" and p["resolution"] == "~1 km" and p["depth"] == "0-20 cm"
    assert (p["resolvedLatitude"], p["resolvedLongitude"], p["fallbackDistanceKm"]) == (0.45, 0.05, 0.0)
    assert interpret_soil(r)["texture"] == "Clay"
    _clean(r)


def test_hwsd_non_soil_cell_falls_back_within_radius_only(tiny_hwsd):
    near = hwsd.lookup_soil(0.45, 0.15, radius_km=15)
    assert near["status"] == "fallback" and near["result_code"] == "FALLBACK" and near["fallback_used"]
    assert near["hwsd_smu_id"] == 1 and 0 < near["distance_km"] <= 15 and near["resolved_lon"] == 0.05
    assert "Open Water" in near["fallback_reason"]
    none = hwsd.lookup_soil(0.45, 0.15, radius_km=2)
    assert none["status"] == "unavailable" and none["result_code"] == "NO_SOIL_DATA"
    assert all(none[k] is None for k in hwsd.PROPERTIES) and none["resolved_lat"] is None
    _clean(near), _clean(none)


def test_hwsd_missing_attribute_record_and_sea(tiny_hwsd):
    r = hwsd.lookup_soil(0.45, 0.25, radius_km=0)
    assert r["result_code"] == "NO_SOIL_DATA" and "no D1 attribute record" in r["fallback_reason"]
    sea = hwsd.lookup_soil(0.05, 0.45, radius_km=5)
    assert sea["result_code"] == "NO_SOIL_DATA" and sea["hwsd_smu_id"] is None
    _clean(r), _clean(sea)


def test_hwsd_missing_properties_stay_null(tiny_hwsd):
    r = hwsd.lookup_soil(0.45, 0.35, radius_km=0)
    assert r["status"] == "ok" and r["phh2o"] == 6.1 and r["soc"] == 12.0
    assert r["cec"] is None and r["sand"] is None and r["texture_class"] is None and r["nitrogen"] is None
    interp = interpret_soil(r)
    assert interp["texture"] is None
    _clean(r)


def test_hwsd_invalid_coordinate_and_missing_dataset(tiny_hwsd, monkeypatch):
    bad = hwsd.lookup_soil(95.0, 10.0)
    assert bad["status"] == "unavailable" and bad["error"] == "Coordinates out of range"
    assert hwsd.lookup_soil(float("nan"), 0.0)["status"] == "unavailable"
    monkeypatch.setattr(hwsd, "DATABASE", str(tiny_hwsd / "missing.sqlite"))
    gone = hwsd.lookup_soil(0.45, 0.05)
    assert gone["status"] == "unavailable" and "not installed" in gone["error"]
    assert all(gone[k] is None for k in hwsd.PROPERTIES)
    _clean(bad), _clean(gone)


def test_hwsd_repeated_lookup_is_cached_and_isolated(tiny_hwsd):
    a = hwsd.lookup_soil(0.45, 0.05)
    a["phh2o"] = -1
    b = run(hwsd.get_soil_properties(0.45, 0.05))
    assert b["phh2o"] == 7.9 and hwsd._resolve.cache_info().hits >= 1


@pytest.mark.skipif(not hwsd.dataset_available(), reason="HWSD v2.0 dataset not installed")
def test_hwsd_real_dataset_chennai():
    r = hwsd.lookup_soil(13.0827, 80.2707)
    assert r["status"] in ("ok", "fallback") and r["phh2o"] is not None and r["texture_class"]
    assert r["distance_km"] <= hwsd.FALLBACK_RADIUS_KM
    _clean(r)


def test_market_district_matching():
    assert market._same_district("Bengaluru", "Bengaluru Urban")
    assert not market._same_district("Pune", "Nashik")
    assert market._district_candidates("Nashik District") == ["Nashik"]


def _arrival(market_name, district, price):
    return {"commodity": "Onion", "state": "Maharashtra", "district": district, "market": market_name, "variety": None,
            "grade": None, "arrival_date": "23/09/2026", "min_price": price, "max_price": price, "modal_price": price}


def _patch_market(monkeypatch, by_query):
    async def q(commodity, state, district=None):
        return by_query.get((commodity, state, district), []), 1.0

    monkeypatch.setattr(market, "_query", q)
    monkeypatch.setattr(market.store, "save_market_observation", lambda rec: None)
    monkeypatch.setattr(market.store, "previous_market_observation", lambda *a: None)


def test_market_price_is_live_with_district_pool(monkeypatch):
    _patch_market(monkeypatch, {(None, "Maharashtra", "Nashik"): [
        _arrival("Lasalgaon", "Nashik", 1800), _arrival("Pimpalgaon", "Nashik", 2200), _arrival("Nashik", "Nashik", 2000)]})
    m = run(market.get_market_price("Onion", 20.0, 73.8, "Maharashtra", "Nashik"))
    assert m["status"] == "live" and m["basis"] == "local_district"
    assert m["modal_price"] == 2000
    assert (m["markets_considered"], m["pool_min"], m["pool_max"]) == (3, 1800, 2200)


def test_market_price_falls_back_to_national_without_state(monkeypatch):
    async def far(*a):
        return None, None

    _patch_market(monkeypatch, {("Onion", None, None): [_arrival("Azadpur", "Delhi", 2500)]})
    monkeypatch.setattr(market, "_nearest", far)
    m = run(market.get_market_price("Onion", 20.0, 73.8, None, None))
    assert m["status"] == "live" and m["basis"] == "national_median"
    assert m["markets_considered"] == 1


def test_negative_cache_backs_off_exponentially(monkeypatch):
    class Boom:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, url):
            raise RuntimeError("down")

    monkeypatch.setattr(api_utils.httpx, "AsyncClient", Boom)
    key = "test:backoff"
    api_utils.invalidate(key)
    ttls = []
    for _ in range(3):
        with pytest.raises(Exception):
            run(api_utils.data_fetcher.fetch_json("http://x", cache_key=key, ttl_error=60, max_retries=1))
        entry = api_utils._cache[key]
        ttls.append(round(entry["expires_at"] - entry["fetched_at"]))
        entry["expires_at"] = 0
    assert ttls == [60, 120, 240]
    api_utils.invalidate(key)


WEATHER_OK = {
    "status": "ok", "source": "Open-Meteo", "fetched_at": 1.0, "timezone": "Asia/Kolkata",
    "grid": {"lat": 20.0, "lon": 73.8, "elevation": 600},
    "current": {"time": "2026-09-23T10:00", "temperature": 28.0, "humidity": 70, "precipitation": 0, "wind_speed": 10, "weather_code": 3},
    "daily": [{"date": f"2026-09-{23 + i}", "weather_code": 3, "tmax": 30.0, "tmin": 21.0, "precip": 1.0, "precip_prob": 20,
               "et0": 4.5, "rh_mean": 70, "wind_max": 12} for i in range(7)],
    "soil_moisture": {"value": 0.25, "time": "2026-09-23T10:00", "depth": "9–27 cm", "unit": "m³/m³"},
}
CLIMATE_OK = {"status": "ok", "source": "NASA POWER", "period": "2021–2025", "fetched_at": 1.0, "grid": {"lat": 20.0, "lon": 73.78},
              "monthly": [{"month": m, "t2m": 24.0, "rh2m": 65.0, "precip_mm": 80.0, "solar_mj_m2_day": 18.0, "n_years": 5} for m in range(1, 13)]}
SOIL_DOWN = {"status": "unavailable", "requested_lat": 20.0, "requested_lon": 73.78, "resolved_lat": None, "resolved_lon": None,
             "distance_km": None, "fallback_used": False, "fallback_reason": "The local HWSD v2.0 dataset is missing.", "depth": "0-20 cm",
             "fetched_at": None, "source": "FAO/IIASA HWSD v2.0", "error": "HWSD v2.0 dataset not installed", **{p: None for p in hwsd.PROPERTIES}}
GEO = {"status": "ok", "place": "Nashik", "district": "Nashik", "state": "Maharashtra", "country": "India", "country_code": "IN", "display_name": "Nashik"}


def _patch(monkeypatch, weather=WEATHER_OK, climate=CLIMATE_OK, soil=SOIL_DOWN, price=None):
    async def w(lat, lon):
        return weather

    async def c(lat, lon):
        return climate

    async def so(lat, lon):
        return soil

    async def g(lat, lon):
        return GEO

    async def m(commodity, lat, lon, state, district):
        if price is None:
            return {"commodity": commodity, "status": "unavailable", "basis": None, "reason": "Agmarknet did not respond."}
        return {"commodity": commodity, "status": "live", "basis": "local_district", "market": "APMC Test", "district": "Nashik",
                "state": "Maharashtra", "arrival_date": "23/09/2026", "modal_price": price, "min_price": price, "max_price": price,
                "price_per_kg": price / 100, "distance_km": 0.0, "markets_considered": 1, "pool_min": price, "pool_max": price,
                "previous": None, "fetched_at": 1.0}

    monkeypatch.setattr(fs, "get_weather_bundle", w)
    monkeypatch.setattr(fs, "get_monthly_climatology", c)
    monkeypatch.setattr(fs, "_soil", so)
    monkeypatch.setattr(fs, "reverse_geocode", g)
    monkeypatch.setattr(fs, "get_market_price", m)


def _no_bad_numbers(obj):
    text = json.dumps(obj, allow_nan=True)
    assert "NaN" not in text and "Infinity" not in text


def test_summary_survives_soil_and_market_outage(monkeypatch):
    _patch(monkeypatch)
    s = run(fs.build_summary(20.0, 73.78))
    canon = s["recommendation"]["canonical"]
    assert canon and canon == s["crops"][0]["crop"]
    assert s["soil"]["status"] == "unavailable"
    assert all(not c["economic"]["observed_price"] for c in s["crops"])
    assert s["recommendation"]["top_economic"] is None
    assert "Soil pH" in s["crops"][0]["excluded_factors"]
    _no_bad_numbers(s)


def test_summary_survives_weather_and_climate_outage(monkeypatch):
    down_w = {**WEATHER_OK, "status": "unavailable", "daily": [], "current": None, "soil_moisture": None, "fetched_at": None, "grid": None}
    down_c = {**CLIMATE_OK, "status": "unavailable", "monthly": [], "grid": None, "period": None}
    _patch(monkeypatch, weather=down_w, climate=down_c)
    s = run(fs.build_summary(20.0, 73.78))
    assert s["irrigation"]["status"] == "unavailable"
    assert next(c for c in s["risk"]["categories"] if c["id"] == "climate")["level"] == "unavailable"
    assert s["recommendation"]["canonical"] is None
    assert "unavailable" in s["recommendation"]["explanation"][0].lower()
    assert all(not c["scorable"] and not c["eligible"] for c in s["crops"])
    _no_bad_numbers(s)


def test_summary_with_only_climatology_still_recommends(monkeypatch):
    down_w = {**WEATHER_OK, "status": "unavailable", "daily": [], "current": None, "soil_moisture": None, "fetched_at": None, "grid": None}
    _patch(monkeypatch, weather=down_w)
    s = run(fs.build_summary(20.0, 73.78))
    assert s["recommendation"]["canonical"] is not None
    assert s["irrigation"]["status"] == "unavailable"
    _no_bad_numbers(s)


def test_recommendation_is_agronomic_and_economics_separate(monkeypatch):
    _patch(monkeypatch, price=3000.0)
    s = run(fs.build_summary(20.0, 73.78))
    eligible = [c for c in s["crops"] if c["eligible"]]
    best = max(c["agronomic_score"] for c in eligible)
    assert s["crops"][0]["agronomic_score"] == best
    assert all(c["sowing"]["in_season"] is not False for c in eligible)
    assert s["recommendation"]["top_economic"] is not None
    assert not any("overall_score" in c for c in s["crops"])


def test_identical_concurrent_summaries_are_coalesced(monkeypatch):
    calls = {"n": 0}
    _patch(monkeypatch)
    real = fs._build_summary

    async def counted(*a, **k):
        calls["n"] += 1
        return await real(*a, **k)

    monkeypatch.setattr(fs, "_build_summary", counted)

    async def both():
        return await asyncio.gather(fs.build_summary(20.0, 73.78), fs.build_summary(20.0, 73.78))

    a, b = run(both())
    assert calls["n"] == 1 and a is b


def test_ml_opinion_uses_climate_variant_without_soil_test(monkeypatch):
    soil = {**SOIL_DOWN, "status": "ok", "phh2o": 6.5}
    _patch(monkeypatch, soil=soil)
    s = run(fs.build_summary(20.0, 73.8))
    ml = s["ml_opinion"]
    assert ml["status"] == "ok" and ml["variant"] == "climate"
    assert set(ml["features"]) == {"temperature", "humidity", "rainfall", "ph"}
    assert ml["features"]["rainfall"] == 80.0  # monthly mean, the training data's scale
    assert len(ml["top"]) == 5 and abs(sum(t["probability"] for t in ml["top"])) <= 1.0001
    assert ml["agreement"] in ("agree", "differ", "not_comparable")
    # The opinion never changes the rules-based recommendation.
    assert s["recommendation"]["canonical"] == s["crops"][0]["crop"]
    _no_bad_numbers(ml)


def test_ml_opinion_uses_full_variant_with_soil_test(monkeypatch):
    _patch(monkeypatch)
    s = run(fs.build_summary(20.0, 73.8, soil_test={"N": 80, "P": 40, "K": 40, "ph": 6.8}))
    ml = s["ml_opinion"]
    assert ml["status"] == "ok" and ml["variant"] == "full" and ml["unused_inputs"] == []
    assert ml["feature_sources"]["N"].startswith("Soil test")


def test_ml_opinion_reports_missing_inputs(monkeypatch):
    _patch(monkeypatch, climate={"status": "unavailable", "monthly": [], "error": "down"})
    ml = run(fs.build_summary(20.0, 73.8))["ml_opinion"]
    assert ml["status"] == "unavailable"
    assert set(ml["missing"]) == {"temperature", "humidity", "rainfall", "ph"}


def test_model_cards_report_classifier_and_regression_metrics():
    from src.services.model_cards import dataset_details, model_cards
    cards = model_cards()
    assert {"rules_engine", "crop_classifier", "yield_model", "irrigation", "soil_rules", "risk_engine", "economics"} <= set(cards)
    clf = cards["crop_classifier"]
    for v in clf["variants"].values():
        for k in ("accuracy", "precision_macro", "recall_macro", "f1_macro"):
            assert 0 <= v[k] <= 1
        cm = v["confusion_matrix"]
        assert len(cm) == len(clf["classes"]) and all(len(r) == len(cm) for r in cm)
        # Each confusion-matrix row sums to that crop's test rows; the diagonal gives recall.
        for row, pc in zip(cm, v["per_class"]):
            assert sum(row) == pc["support"]
        assert sum(cm[i][i] for i in range(len(cm))) / sum(map(sum, cm)) == pytest.approx(v["accuracy"])
    assert "split" in clf["dataset"] and "collection" in clf["dataset"]
    assert {"mae_t_ha", "rmse_t_ha", "r2"} <= set(cards["yield_model"]["regression"])
    assert "cannot be computed" in cards["rules_engine"]["evaluation"]
    assert dataset_details("hwsd")["collection"]
