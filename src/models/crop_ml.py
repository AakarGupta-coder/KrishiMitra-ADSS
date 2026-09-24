"""ML opinion: the crop_xgb classifier's view of the farm, reported next to (never inside) the rules-based ranking."""
import datetime
import functools
import logging
from typing import Optional

import pandas as pd

from src.advisory.crop_rules import CROP_KNOWLEDGE
from src.models.predict import load_meta, load_model

logger = logging.getLogger("KrishiMitra")

TOP_N = 5
# The model scores the season about to be planted: this month plus the next three
# (matches the 60-day sowing lookahead used by the rules engine, plus early growth).
WINDOW_MONTHS = 4

# Training labels -> display names; names that match CROP_KNOWLEDGE link the opinion to the rules ranking.
CROP_NAMES = {
    "apple": "Apple", "banana": "Banana", "blackgram": "Black Gram", "chickpea": "Chickpea", "coconut": "Coconut",
    "coffee": "Coffee", "cotton": "Cotton", "grapes": "Grapes", "jute": "Jute", "kidneybeans": "Kidney Beans",
    "lentil": "Lentil", "maize": "Maize", "mango": "Mango", "mothbeans": "Moth Bean", "mungbean": "Green Gram",
    "muskmelon": "Muskmelon", "orange": "Orange", "papaya": "Papaya", "pigeonpeas": "Pigeon Pea",
    "pomegranate": "Pomegranate", "rice": "Rice", "watermelon": "Watermelon",
}


@functools.lru_cache(maxsize=1)
def load_classifiers():
    try:
        meta = load_meta("crop_meta.json")
        variants = meta.get("variants") or {}
        models = {name: load_model(v["file"]) for name, v in variants.items()}
        if len(meta.get("classes", [])) < 2 or not models:
            return None, None
        return models, meta
    except Exception as e:
        logger.warning(f"Crop classifier unavailable: {e}")
        return None, None


def _window(today: datetime.date) -> list:
    return [((today.month - 1 + i) % 12) + 1 for i in range(WINDOW_MONTHS)]


def build_features(climatology: dict, soil: dict, soil_test: dict, today: datetime.date) -> tuple[dict, dict]:
    months = _window(today)
    rows = [r for r in climatology.get("monthly", []) if r.get("month") in months]
    feats, srcs = {}, {}
    period = climatology.get("period")
    label = f"NASA POWER {period}, " + "–".join(datetime.date(2000, m, 1).strftime("%b") for m in (months[0], months[-1]))
    if rows and all(r.get("t2m") is not None for r in rows):
        feats["temperature"], srcs["temperature"] = round(sum(r["t2m"] for r in rows) / len(rows), 1), f"{label} mean"
    if rows and all(r.get("rh2m") is not None for r in rows):
        feats["humidity"], srcs["humidity"] = round(sum(r["rh2m"] for r in rows) / len(rows), 1), f"{label} mean"
    if rows and all(r.get("precip_mm") is not None for r in rows):
        # The training data's rainfall column is on a monthly scale (rice ≈ 236 mm), so use the monthly mean.
        feats["rainfall"], srcs["rainfall"] = round(sum(r["precip_mm"] for r in rows) / len(rows), 1), f"{label} mean monthly rainfall"

    if soil_test.get("ph") is not None:
        feats["ph"], srcs["ph"] = soil_test["ph"], "Soil test (entered in Farm Profile)"
    elif soil.get("phh2o") is not None:
        feats["ph"], srcs["ph"] = soil["phh2o"], "HWSD v2.0 topsoil" + (" (nearby cell)" if soil.get("fallback_used") else "")
    for k in ("N", "P", "K"):
        if soil_test.get(k) is not None:
            feats[k], srcs[k] = soil_test[k], "Soil test (entered in Farm Profile)"
    return feats, srcs


def ml_opinion(climatology: dict, soil: dict, soil_test: Optional[dict], today: datetime.date,
               rules_pick: Optional[str], rules_ranking: list) -> dict:
    models, meta = load_classifiers()
    if not models:
        return {"status": "unavailable", "reason": "The crop classifier has not been trained on a multi-class dataset."}

    feats, srcs = build_features(climatology, soil, soil_test or {}, today)
    variant = "full" if all(k in feats for k in meta["variants"]["full"]["features"]) else "climate"
    spec = meta["variants"][variant]
    missing = [f for f in spec["features"] if f not in feats]
    base = {
        "variant": variant,
        "model": f"crop_xgb ({'all 7 inputs' if variant == 'full' else 'climate + pH, no soil test'}) · XGBoost classifier",
        "version": meta.get("version"),
        "accuracy": round(spec["accuracy"], 4),
        "f1_score": round(spec["f1_score"], 4),
        "dataset": meta.get("dataset"),
        "classes": len(meta["classes"]),
        "window_months": _window(today),
        "features": feats,
        "feature_sources": srcs,
        "unused_inputs": [f for f in ("N", "P", "K") if f not in spec["features"]],
    }
    if missing:
        return {**base, "status": "unavailable", "missing": missing,
                "reason": "Missing model inputs: " + ", ".join(missing) + "."}

    row = pd.DataFrame([[feats[f] for f in spec["features"]]], columns=spec["features"])
    probs = models[variant].predict_proba(row)[0]
    ranked = sorted(zip(meta["classes"], probs), key=lambda t: t[1], reverse=True)
    top = [{"label": lbl, "crop": CROP_NAMES.get(lbl, lbl.title()), "probability": round(float(p), 4),
            "in_rules": CROP_NAMES.get(lbl) in CROP_KNOWLEDGE} for lbl, p in ranked[:TOP_N]]

    by_crop = {CROP_NAMES.get(lbl): float(p) for lbl, p in ranked}
    rules_prob = by_crop.get(rules_pick) if rules_pick else None
    # Rules crops the model also knows, in rules order, with the model's probability for each.
    overlap = [{"crop": c, "rules_rank": i + 1, "probability": round(by_crop[c], 4)}
               for i, c in enumerate(rules_ranking) if c in by_crop]

    if not rules_pick:
        agreement = "no_rules_pick"
    elif rules_pick not in by_crop:
        agreement = "not_comparable"
    elif top[0]["crop"] == rules_pick:
        agreement = "agree"
    else:
        agreement = "differ"

    return {**base, "status": "ok", "missing": [], "top": top, "top_crop": top[0]["crop"],
            "rules_pick": rules_pick, "rules_pick_probability": round(rules_prob, 4) if rules_prob is not None else None,
            "agreement": agreement, "overlap": overlap}
