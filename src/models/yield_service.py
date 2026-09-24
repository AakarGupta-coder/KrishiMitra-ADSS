import datetime
import functools
import logging

import pandas as pd

from src.advisory.crop_rules import FINANCIAL_KNOWLEDGE
from src.models.predict import load_meta, load_model

logger = logging.getLogger("KrishiMitra")

FAOSTAT_PATH = "data/faostat_sample.csv"


@functools.lru_cache(maxsize=1)
def _yield_model():
    try:
        return load_model("yield_xgb.pkl"), load_meta("yield_meta.json")
    except Exception as e:
        logger.warning(f"Yield model unavailable: {e}")
        return None, None


def model_info() -> dict:
    model, meta = _yield_model()
    if not meta:
        return {"available": False}
    crops = [f[5:] for f in meta["features"] if f.startswith("Crop_")]
    r2 = meta.get("r2_score")
    return {
        "available": model is not None,
        "name": "yield_xgb (XGBoost regressor)",
        "version": meta.get("version"),
        "features": meta["features"],
        "supported_crops": crops,
        "mae_t_ha": round(meta["mae"] / 10000, 3) if meta.get("mae") is not None else None,
        "r2": r2,
        "reliability": "Low" if r2 is None or r2 < 0.3 else ("Moderate" if r2 < 0.7 else "High"),
    }


def ml_supports(crop: str) -> bool:
    _, meta = _yield_model()
    return bool(meta) and f"Crop_{crop}" in meta["features"]


def estimate_yield(crop: str, agronomic_score: float, with_shap: bool = False) -> dict:
    year = datetime.date.today().year
    if ml_supports(crop):
        model, meta = _yield_model()
        feats = meta["features"]
        row = pd.DataFrame([[0.0] * len(feats)], columns=feats)
        row["Year"] = year
        row[f"Crop_{crop}"] = 1.0
        pred_t = float(model.predict(row)[0]) / 10000
        info = model_info()
        mae = info["mae_t_ha"]
        out = {
            "value_t_ha": round(pred_t, 2),
            "method": "ml",
            "method_label": f"{info['name']} · FAOSTAT-trained",
            "low_t_ha": round(max(0.0, pred_t - mae), 2) if mae is not None else None,
            "high_t_ha": round(pred_t + mae, 2) if mae is not None else None,
            "range_basis": "± model MAE on hold-out set" if mae is not None else None,
            "reliability": info["reliability"],
            "note": f"Hold-out R² = {info['r2']:.2f}; the model uses only year and crop, not local weather or soil.",
            "features_used": {"Year": year, "Crop": crop},
        }
        if with_shap:
            out["shap"] = _shap(model, row)
        return out

    ref = FINANCIAL_KNOWLEDGE.get(crop)
    if not ref:
        return {"value_t_ha": None, "method": "unavailable", "method_label": "No yield model or reference for this crop",
                "low_t_ha": None, "high_t_ha": None, "range_basis": None, "reliability": None,
                "note": "No yield source is available for this crop."}
    return {
        "value_t_ha": round(ref["expected_yield_t_ha"] * agronomic_score, 2),
        "method": "reference",
        "method_label": "Reference yield × agronomic suitability",
        "reference_t_ha": ref["expected_yield_t_ha"],
        "low_t_ha": None,
        "high_t_ha": None,
        "range_basis": None,
        "reliability": "Indicative",
        "note": (f"Static reference yield {ref['expected_yield_t_ha']} t/ha scaled by suitability "
                 f"{round(agronomic_score * 100)} %. Not a trained model, so no uncertainty range is available."),
    }


def _shap(model, row: pd.DataFrame):
    try:
        import shap
        explainer = shap.TreeExplainer(model)
        vals = explainer.shap_values(row)[0]
        base = float(explainer.expected_value if not hasattr(explainer.expected_value, "__len__") else explainer.expected_value[0])
        return {
            "base_t_ha": round(base / 10000, 3),
            "contributions": [
                {"feature": f, "value": float(row.iloc[0][f]), "shap_t_ha": round(float(v) / 10000, 3)}
                for f, v in zip(row.columns, vals)
            ],
        }
    except Exception as e:
        logger.warning(f"SHAP explanation failed: {e}")
        return None


def historical_yields(crop: str) -> dict:
    try:
        df = pd.read_csv(FAOSTAT_PATH)
    except Exception as e:
        return {"status": "unavailable", "series": [], "reason": str(e)}
    this_year = datetime.date.today().year
    df = df[(df["Crop"] == crop) & (df["Year"] >= 1900) & (df["Year"] <= this_year)].sort_values("Year")
    if df.empty:
        return {"status": "unavailable", "series": [],
                "reason": f"The local FAOSTAT sample has no {crop} records."}
    counts = df["Yield_hg_ha"].value_counts()
    repeated = set(counts[counts >= 3].index)
    series = [{
        "year": int(r.Year),
        "yield_t_ha": round(r.Yield_hg_ha / 10000, 2),
        "area_ha": int(r.Area_Harvested_ha),
        "placeholder_like": r.Yield_hg_ha in repeated,
    } for r in df.itertuples()]
    return {
        "status": "ok",
        "source": "FAOSTAT sample (local CSV, India national)",
        "country": str(df["Country"].iloc[0]),
        "series": series,
        "placeholder_rows": sum(1 for s in series if s["placeholder_like"]),
    }
