"""Model cards: what each model or rule engine does, why, its data and its evaluation.

Served by /api/models and shown behind the "i" buttons in the UI. Numbers come from the trained-model metadata
and the engines' own constants, so a card cannot drift from the code it describes.
"""
import datetime
from typing import Optional

import pandas as pd

from src.advisory import crop_rules as R
from src.advisory import irrigation as I
from src.advisory import risk as K
from src.advisory.soil import PH_CLASSES
from src.data import hwsd
from src.models.crop_ml import CROP_NAMES, TOP_N, WINDOW_MONTHS, load_classifiers
from src.models.predict import load_meta
from src.services.farm_summary import MIN_AGRONOMIC, MIN_FACTORS

NO_GROUND_TRUTH = ("No labelled ground truth exists for this logic, so accuracy, precision, recall and F1 cannot be "
                   "computed. Its behaviour is checked by unit tests in tests/test_core.py.")

# How each dataset was collected. Shared by the model cards and the Data sources catalogue.
DATASETS = {
    "crop_dataset": {
        "collection": ("Published on Kaggle by Atharva Ingle (2020). The Kaggle description says it was built by augmenting "
                       "Indian rainfall, climate and fertiliser datasets; the underlying sources and sampling method are not "
                       "documented. The classes separate almost perfectly, which suggests the rows were generated rather than "
                       "measured on real fields."),
        "categories": ["Inputs: N, P, K (soil nutrient ratios), temperature (°C), humidity (%), pH, rainfall (mm, monthly scale)",
                       "Target: crop label (22 classes, 100 rows each, balanced)"],
    },
    "faostat": {
        "collection": ("Modelled on FAOSTAT's 'Crops and livestock products' domain, which holds national statistics that "
                       "countries report to FAO through annual questionnaires, supplemented by official publications and FAO "
                       "estimates. The local file is a small hand-made sample, not a FAOSTAT export."),
        "categories": ["Columns: Country, Year, Crop, Area harvested (ha), Yield (hg/ha), Production (t)"],
    },
    "hwsd": {
        "collection": ("FAO and IIASA harmonised regional and national soil maps and soil-profile databases (including SOTER, "
                       "the European Soil Database, the Soil Map of China and WISE profiles) into one global raster. Each ~1 km "
                       "cell points to a mapping unit that lists its soil components, their share and their layer properties."),
        "categories": ["WRB soil reference groups", "12 USDA texture classes",
                       "7 depth layers (D1 0–20 cm … D7 150–200 cm); KRISHIMITRA uses " + hwsd.LAYER],
    },
    "nasa_power": {
        "collection": "Derived from satellite observations and NASA GMAO's MERRA-2 reanalysis; queried live as a monthly point time series.",
        "categories": ["T2M (air temperature at 2 m)", "PRECTOTCORR (bias-corrected precipitation)", "RH2M (relative humidity)",
                       "ALLSKY_SFC_SW_DWN (solar radiation)"],
    },
    "open_meteo": {
        "collection": ("Numerical weather-prediction models from national weather services (e.g. ECMWF IFS, NOAA GFS, DWD ICON), "
                       "chosen per location by Open-Meteo. Reference evapotranspiration is computed with the FAO-56 "
                       "Penman–Monteith equation."),
        "categories": ["Daily temperature, rainfall, rain probability, ET₀, humidity, wind, weather code", "Hourly soil moisture 9–27 cm"],
    },
    "agmarknet": {
        "collection": ("Daily arrivals and prices reported by Agricultural Produce Market Committees (APMC mandis) to the "
                       "Agmarknet portal (Directorate of Marketing & Inspection), published through the data.gov.in API."),
        "categories": ["Commodity, variety, grade", "Market, district, state", "Min / max / modal price (₹ per quintal)"],
    },
    "nominatim": {
        "collection": "OpenStreetMap: crowd-sourced map data, including administrative boundaries, queried by reverse geocoding.",
        "categories": ["Place, district, state, country"],
    },
    "rules": {
        "collection": ("Hand-compiled for this project: preferred crop ranges, the Indian sowing calendar and reference economics "
                       "are general agronomic guidance, not calibrated to a region. Crop coefficients follow FAO-56; heavy-rain "
                       "categories follow the India Meteorological Department (IMD)."),
        "categories": [f"{len(R.CROP_KNOWLEDGE)} crops", f"{len(R.FACTOR_LABELS)} factors: " + ", ".join(R.FACTOR_LABELS.values()),
                       "Seasons: Kharif (Jun–Oct), Rabi (Nov–Mar), Zaid (Apr–May)"],
    },
}


def _faostat_profile(path: str = "data/faostat_sample.csv") -> Optional[dict]:
    try:
        df = pd.read_csv(path)
    except Exception:
        return None
    this_year = datetime.date.today().year
    counts = df["Yield_hg_ha"].value_counts()
    return {
        "rows": int(len(df)),
        "crops": sorted(df["Crop"].unique().tolist()),
        "future_year_rows": int((df["Year"] > this_year).sum()),
        "placeholder_rows": int(df["Yield_hg_ha"].isin(counts[counts >= 3].index).sum()),
    }


def dataset_details(source_id: str) -> dict:
    """Collection method, split and classes for the Data sources catalogue."""
    d = dict(DATASETS.get(source_id, {}))
    if source_id == "crop_dataset":
        _, meta = load_classifiers()
        if meta:
            ds = meta["dataset"]
            d["split"] = (f"{meta['split']['method']} {int((1 - meta['split']['test_size']) * 100)}/{int(meta['split']['test_size'] * 100)}: "
                          f"{ds['train_rows']:,} train / {ds['test_rows']:,} test rows (random_state {meta['split']['random_state']}), "
                          f"plus {meta['split']['cv']}")
            d["classes"] = [CROP_NAMES.get(c, c) for c in meta["classes"]]
    if source_id == "faostat":
        prof = _faostat_profile()
        ym = _yield_meta()
        if ym and ym.get("dataset"):
            d["split"] = (f"{ym['split']['method']} 80/20: {ym['dataset']['train_rows']} train / {ym['dataset']['test_rows']} test rows")
        if prof:
            d["classes"] = prof["crops"]
            d["quality"] = (f"{prof['placeholder_rows']} of {prof['rows']} rows repeat a placeholder yield and "
                            f"{prof['future_year_rows']} carry future years")
    return d


def _yield_meta() -> Optional[dict]:
    try:
        return load_meta("yield_meta.json")
    except Exception:
        return None


def _crop_classifier_card() -> dict:
    _, meta = load_classifiers()
    card = {
        "id": "crop_classifier",
        "title": "Crop classifier (crop_xgb)",
        "kind": "Machine learning · multi-class classification",
        "summary": f"Predicts which of 22 crops best matches the farm's climate and soil. Shown as the ML opinion (top {TOP_N} crops with probabilities); it never changes the rules-based recommendation.",
        "why": [
            "XGBoost (gradient-boosted decision trees) is the strongest standard choice for small tabular datasets: it captures interactions between factors, needs no feature scaling and trains in seconds.",
            "It outputs a probability per crop, so the app can show a ranked list rather than a single label.",
            "Two variants because N, P and K exist only when the farmer enters a soil test; this model never saw missing values in training, so a separate model without them is more honest than passing blanks.",
        ],
        "how": [
            "Full variant (all 7 inputs) runs when a soil test with N, P, K and pH is entered; otherwise the climate variant (temperature, humidity, pH, rainfall) runs.",
            f"Climate inputs are 5-year NASA POWER means over the current month and the next {WINDOW_MONTHS - 1}, the season about to be planted.",
            "Rainfall is the mean per month, because the training data's rainfall column is on a monthly scale (rice ≈ 236 mm).",
            "pH comes from the soil test, otherwise from HWSD v2.0 topsoil.",
            "The model's probabilities are compared with the rules pick: agree, differ, or not comparable when the rules crop is not one of its 22 classes.",
        ],
        "limitations": [
            "The dataset is a public benchmark, not specific to any Indian region, and is probably synthetic.",
            "Classes separate so cleanly that the model often reports probabilities near 100 %, overstating certainty on real farms.",
            "Only 2 of its 22 crops (Green Gram, Black Gram) are among the 12 the rules engine evaluates.",
            "Hold-out accuracy measures agreement with this dataset, not whether a crop succeeds on a real field.",
        ],
        "used_in": ["Crop Advisor → ML opinion"],
    }
    if not meta:
        return {**card, "available": False}
    ds = meta["dataset"]
    return {
        **card,
        "available": True,
        "algorithm": meta.get("algorithm"),
        "hyperparameters": meta.get("hyperparameters"),
        "trained_at": meta.get("trained_at"),
        "dataset": {"name": ds["source"], **dataset_details("crop_dataset"), "rows": ds["rows"],
                    "train_rows": ds["train_rows"], "test_rows": ds["test_rows"]},
        "classes": [{"label": c, "name": CROP_NAMES.get(c, c), "in_rules": CROP_NAMES.get(c) in R.CROP_KNOWLEDGE} for c in meta["classes"]],
        "variants": {
            name: {k: v[k] for k in ("features", "accuracy", "precision_macro", "recall_macro", "f1_macro", "precision_weighted",
                                     "recall_weighted", "f1_score", "cv_accuracy_mean", "cv_accuracy_std", "per_class", "confusion_matrix")
                   if k in v}
            for name, v in meta["variants"].items()
        },
    }


def _yield_card() -> dict:
    ym = _yield_meta()
    card = {
        "id": "yield_model",
        "title": "Yield prediction",
        "kind": "Machine learning · regression, with a reference-yield fallback",
        "summary": "Estimates yield in t/ha. The XGBoost regressor is used for crops present in its training data; every other crop uses reference yield × agronomic suitability.",
        "why": [
            "Regression predicts a continuous value (tonnes per hectare), so classification metrics such as precision, recall and F1 do not apply; MAE, RMSE and R² are used instead.",
            "SHAP (TreeExplainer) splits each prediction into a base value plus per-feature contributions; it is exact and fast for tree models.",
            "For unsupported crops the reference method keeps yield tied to the same suitability score the rules engine reports, and is labelled 'Indicative'.",
        ],
        "how": [
            "Inputs: year and a one-hot crop indicator. Target: yield in hg/ha (÷ 10,000 → t/ha).",
            "Uncertainty range: prediction ± hold-out MAE.",
            "Reference method: reference yield (knowledge base) × agronomic suitability, e.g. 3.5 t/ha × 57 % ≈ 2.0 t/ha.",
            "Reliability label: R² < 0.3 Low, < 0.7 Moderate, otherwise High.",
        ],
        "limitations": [
            "Trained on a tiny sample; most test rows are placeholder values, so the metrics say little about real accuracy.",
            "Uses only year and crop, not local weather or soil.",
            "Needs a full FAOSTAT or district-level production dataset before it carries real weight.",
        ],
        "used_in": ["Yield Prediction", "Crop Advisor → Economic outlook"],
    }
    if not ym:
        return {**card, "available": False}
    fao = _faostat_profile()
    return {
        **card,
        "available": True,
        "algorithm": ym.get("algorithm"),
        "trained_at": ym.get("trained_at"),
        "dataset": {"name": "FAOSTAT sample (data/faostat_sample.csv)", **dataset_details("faostat"), **(ym.get("dataset") or {})},
        "regression": {
            "mae_t_ha": ym["mae"] / 10000, "rmse_t_ha": ym["rmse"] / 10000 if ym.get("rmse") is not None else None,
            "r2": ym["r2_score"],
            "test_predictions": [{**p, "actual_t_ha": p["actual_hg_ha"] / 10000, "predicted_t_ha": p["predicted_hg_ha"] / 10000}
                                 for p in ym.get("test_predictions", [])],
        },
        "data_quality": fao,
        "reference_crops": sorted(c for c in R.FINANCIAL_KNOWLEDGE if f"Crop_{c}" not in ym["features"]),
    }


def _rules_card() -> dict:
    return {
        "id": "rules_engine",
        "title": f"Agronomic rules engine ({R.RULES_VERSION})",
        "kind": "Knowledge-based expert system",
        "available": True,
        "summary": f"Scores each of {len(R.CROP_KNOWLEDGE)} crops for this farm, decides which can be sown now and picks the recommendation.",
        "why": [
            "No labelled local dataset says which crop is right for a farm, so a model cannot be trained for this; expert rules encode established agronomy directly.",
            "Every point lost is traceable to a factor, its value, its preferred range and its source.",
            "Missing data is skipped and reported as 'not evaluated', never guessed.",
        ],
        "how": [
            "Features are crop-specific: temperature, rainfall and humidity are NASA POWER 5-year means over each crop's own growing months.",
            "Score starts at 1.0. A factor below its range multiplies it by max(0.2, 1 − (min − value) / min); above, by max(0.2, 1 − (value − max) / max). Inside the range: no change.",
            "Rainfall below the minimum on an irrigated farm is not penalised ('met by irrigation').",
            f"Off-season (sowing window more than {R.SOWING_LOOKAHEAD_DAYS} days away): score × {R.OFF_SEASON_MULTIPLIER}.",
            "Constraint severity: factor multiplier < 0.6 critical, otherwise caution.",
            "Confidence from input coverage: ≥ 85 % High, ≥ 55 % Medium, otherwise Low.",
            f"Eligible: at least {MIN_FACTORS} factors evaluated, sowing window open or within {R.SOWING_LOOKAHEAD_DAYS} days, score ≥ {int(MIN_AGRONOMIC * 100)} %.",
            "Ranking: eligible first, then agronomic score, then net return per ha (observed mandi prices only). The top crop is the recommendation; the most profitable eligible crop is shown separately as the economic trade-off.",
        ],
        "dataset": {"name": "Crop knowledge base (src/advisory/crop_rules.py)", **DATASETS["rules"]},
        "categories": {
            "Crops": list(R.CROP_KNOWLEDGE),
            "Factors": list(R.FACTOR_LABELS.values()),
            "Constraint severities": ["info", "caution", "critical"],
            "Confidence levels": ["High", "Medium", "Low"],
            "Sowing status": ["open", "upcoming", "off_season"],
        },
        "evaluation": NO_GROUND_TRUTH,
        "limitations": [
            "Ranges are general guidance, not calibrated to a region or variety.",
            "Without a soil test only 4 of 7 factors (climate and pH) can be evaluated.",
            "Not yet validated against which crops districts actually grow.",
        ],
        "used_in": ["Crop Advisor", "Dashboard", "AI Insights", "Reports"],
    }


def _irrigation_card() -> dict:
    return {
        "id": "irrigation",
        "title": "Irrigation: FAO-56 soil-water balance",
        "kind": "Physics-based agronomic model",
        "available": True,
        "summary": "Tracks root-zone water day by day over the 7-day forecast and schedules irrigation when the crop would start to suffer.",
        "why": [
            "Crop water use follows the FAO-56 equations, the international standard; they need no training data and can be checked by hand.",
            "ET₀ from Open-Meteo is already computed with FAO-56 Penman–Monteith, so the inputs are consistent.",
        ],
        "how": [
            f"Total available water TAW = 1000 × (field capacity − wilting point) × {I.ROOT_DEPTH_M} m; readily available water RAW = {I.DEPLETION_FRACTION} × TAW.",
            "Daily crop water use ETc = Kc × ET₀ (FAO-56 mid-season Kc; 1.0 when no crop is set).",
            f"Effective rain = {int(I.EFFECTIVE_RAIN_FRACTION * 100)} % of the day's rain when it is ≥ {I.EFFECTIVE_RAIN_THRESHOLD_MM:g} mm, otherwise 0.",
            "Depletion = previous + ETc − effective rain (between 0 and TAW). When it exceeds RAW: irrigate net = depletion, gross = net ÷ efficiency, and the profile is refilled.",
            "Starting depletion comes from Open-Meteo modelled soil moisture; if missing, the soil is assumed full.",
            "Volume (m³) = gross mm × 10 × hectares.",
        ],
        "categories": {
            "Texture classes (field capacity, wilting point)": [f"{t}: {fc}, {wp}" for t, (fc, wp) in I.TEXTURE_WATER.items()],
            "Application efficiency": [f"{k}: {int(v * 100)} %" for k, v in I.EFFICIENCY.items()],
            "Status": ["irrigate_now", "irrigate_soon (within 2 days)", "scheduled", "not_needed"],
        },
        "evaluation": NO_GROUND_TRUTH,
        "limitations": ["Fixed mid-season Kc (no crop-stage curve)", f"Fixed {I.ROOT_DEPTH_M} m root zone", "7-day horizon only"],
        "used_in": ["Irrigation Advisor", "Dashboard", "AI Insights (water risk)"],
    }


def _soil_card() -> dict:
    ph_rows, lower = [], None
    for upper, label, tone in PH_CLASSES:
        ph_rows.append(f"{label}: {'≤ ' if lower is None else f'{lower}–'}{upper} ({tone})")
        lower = upper
    ph_rows.append(f"Very strongly alkaline: > {lower} (critical)")
    return {
        "id": "soil_rules",
        "title": "Soil interpretation rules",
        "kind": "Rule-based interpretation",
        "available": True,
        "summary": "Turns HWSD v2.0 soil properties (or a soil test) into constraints, crop implications and amendments.",
        "why": [
            "Soil-science thresholds for pH, texture, organic carbon and CEC are well established, so rules express them exactly.",
            "Amendments are suggested only when a rule fires, and always with the confirming test, never a guessed dose.",
        ],
        "how": [
            "HWSD lookup: coordinates → ~1 km raster cell → mapping unit → dominant soil component (largest share) at the topsoil layer.",
            f"Water, glacier, urban or no-data cells use the nearest valid soil cell within {hwsd.FALLBACK_RADIUS_KM:g} km, labelled 'fallback'.",
            "Texture from HWSD's USDA class, or from sand/silt/clay with the USDA texture triangle.",
            "pH < 5.5 critical (liming, after a buffer-pH test); 5.5–6.0 caution; 7.8–8.4 caution (Zn, Fe availability); > 8.4 critical (gypsum, after an ESP test).",
            "Sand / loamy sand: leaching risk. Clay classes: waterlogging risk. Organic carbon < 0.5 %: low. CEC < 10 cmol(c)/kg: low nutrient holding.",
        ],
        "dataset": {"name": "FAO/IIASA HWSD v2.0", **DATASETS["hwsd"]},
        "categories": {"pH classes": ph_rows, "USDA texture classes": list(I.TEXTURE_WATER)},
        "evaluation": NO_GROUND_TRUTH,
        "limitations": ["HWSD values are ~1 km regional estimates for the dominant soil, not field measurements."],
        "used_in": ["Soil Intelligence", "Crop Advisor (pH)", "Irrigation (texture)", "AI Insights (soil risk)"],
    }


def _risk_card() -> dict:
    return {
        "id": "risk_engine",
        "title": "Risk engine",
        "kind": "Threshold-based rules",
        "available": True,
        "summary": "Rates 7 risk categories as low, moderate or high, each with evidence, an action and a confidence label. Overall risk is the worst rated category.",
        "why": [
            "Official and agronomic thresholds already exist (IMD rainfall categories, heat and frost limits), so there is nothing to learn from data.",
            "Every rating cites the exact days and values that triggered it.",
        ],
        "how": [
            f"Climate: max ≥ 40 °C high, 35–40 °C moderate; min ≤ 4 °C high (frost); rain ≥ {K.IMD_VERY_HEAVY} mm high (IMD very heavy), ≥ {K.IMD_HEAVY} mm moderate (IMD heavy); wind ≥ 40 km/h moderate.",
            "Water: from the irrigation status; a rainfed farm rates one level higher because it cannot irrigate.",
            "Crop suitability: recommended crop's score ≥ 75 % low, ≥ 50 % moderate, otherwise high.",
            "Yield: estimate ÷ reference yield ≥ 85 % low, ≥ 60 % moderate, otherwise high.",
            "Pest & disease: days with mean humidity ≥ 80 % and mean temperature 20–30 °C; ≥ 5 days high, ≥ 3 moderate.",
            "Soil: any critical soil constraint high, any caution moderate.",
            "Market: price spread across markets > 60 % or a drop > 15 % high; > 30 % or a drop > 5 % moderate.",
        ],
        "categories": {"Categories": ["Climate", "Water", "Crop suitability", "Yield", "Pest & disease", "Soil", "Market"],
                       "Levels": ["low", "moderate", "high", "unavailable (no data)"]},
        "evaluation": NO_GROUND_TRUTH,
        "limitations": ["The pest rule is a generic weather rule, not pest surveillance, and is labelled low confidence."],
        "used_in": ["AI Insights & Risk", "Dashboard", "Alerts"],
    }


def _economics_card() -> dict:
    return {
        "id": "economics",
        "title": "Economic outlook",
        "kind": "Deterministic calculation",
        "available": True,
        "summary": "Estimates gross revenue and net return per crop from yield, mandi price and production cost.",
        "why": ["Kept separate from the agronomic score so the trade-off between best fit and best return stays visible."],
        "how": [
            "Price: live Agmarknet modal price, searched in order: farm's district → nearest market in the state → state median → nearest national → national median; then the last observed price; then a static reference price.",
            "Gross revenue = yield × area × price. Net return = gross − reference cost per ha × area.",
            "Economic confidence: Medium with a live price, Low with a last observed price, otherwise not assessable.",
        ],
        "dataset": {"name": "Agmarknet via data.gov.in", **DATASETS["agmarknet"]},
        "evaluation": NO_GROUND_TRUTH,
        "limitations": ["Production costs are static national totals, not itemised or state-specific."],
        "used_in": ["Crop Advisor → Economic / Trade-off", "Reports"],
    }


def model_cards() -> dict:
    cards = [_rules_card(), _crop_classifier_card(), _yield_card(), _irrigation_card(), _soil_card(), _risk_card(), _economics_card()]
    return {c["id"]: c for c in cards}
