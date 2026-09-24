import os
import json
import pickle
import datetime
import numpy as np
from xgboost import XGBClassifier, XGBRegressor
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score, mean_absolute_error, mean_squared_error,
                             precision_recall_fscore_support, precision_score, r2_score, recall_score)
from src.features.engineering import prepare_crop_training_data, prepare_yield_training_data
import logging

logger = logging.getLogger("KrishiMitra")

MODEL_DIR = "models/"
os.makedirs(MODEL_DIR, exist_ok=True)

TEST_SIZE = 0.2
RANDOM_STATE = 42
CV_FOLDS = 5

CROP_DATASET_SOURCE = ("Kaggle 'Crop Recommendation Dataset' (Atharva Ingle), 2,200 rows, 22 crops; "
                       "mirrored from github.com/Gladiator07/Harvestify")

# Two variants: N, P and K only exist when the farmer enters a soil test, so the climate variant
# (temperature, humidity, pH, rainfall) serves every other location.
CROP_VARIANTS = {
    "full": {"file": "crop_xgb.pkl", "features": ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]},
    "climate": {"file": "crop_xgb_climate.pkl", "features": ["temperature", "humidity", "ph", "rainfall"]},
}
CROP_PARAMS = dict(n_estimators=200, max_depth=4, learning_rate=0.1, random_state=RANDOM_STATE, eval_metric="mlogloss")


def _classifier_metrics(y_true, y_pred, classes) -> dict:
    labels = list(range(len(classes)))
    p, r, f, support = precision_recall_fscore_support(y_true, y_pred, labels=labels, zero_division=0)
    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision_macro": precision_score(y_true, y_pred, average="macro", zero_division=0),
        "recall_macro": recall_score(y_true, y_pred, average="macro", zero_division=0),
        "f1_macro": f1_score(y_true, y_pred, average="macro", zero_division=0),
        "precision_weighted": precision_score(y_true, y_pred, average="weighted", zero_division=0),
        "recall_weighted": recall_score(y_true, y_pred, average="weighted", zero_division=0),
        "f1_score": f1_score(y_true, y_pred, average="weighted", zero_division=0),
        "per_class": [{"label": c, "precision": float(p[i]), "recall": float(r[i]), "f1": float(f[i]), "support": int(support[i])}
                      for i, c in enumerate(classes)],
        # Rows = true crop, columns = predicted crop, both in `classes` order.
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=labels).tolist(),
    }


def train_crop_model():
    logger.info("Training Crop Recommendation Models...")
    X, y = prepare_crop_training_data()

    classes = sorted(y.unique())
    if len(classes) < 2:
        raise ValueError("Crop dataset has fewer than two classes; a classifier cannot be trained.")
    class_to_idx = {c: i for i, c in enumerate(classes)}
    y_encoded = y.map(class_to_idx)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y_encoded)
    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)

    variants = {}
    for name, spec in CROP_VARIANTS.items():
        cols = spec["features"]
        model = XGBClassifier(**CROP_PARAMS)
        model.fit(X_train[cols], y_train)
        m = _classifier_metrics(y_test, model.predict(X_test[cols]), classes)
        # Cross-validation on the whole dataset checks the single hold-out split was not a lucky draw.
        cv_acc = cross_val_score(XGBClassifier(**CROP_PARAMS), X[cols], y_encoded, cv=cv, scoring="accuracy")
        m["cv_accuracy_mean"], m["cv_accuracy_std"] = float(cv_acc.mean()), float(cv_acc.std())
        logger.info(f"Crop Model ({name}) - Accuracy: {m['accuracy']:.4f}, macro F1: {m['f1_macro']:.4f}, "
                    f"CV accuracy: {m['cv_accuracy_mean']:.4f} ± {m['cv_accuracy_std']:.4f}")
        with open(os.path.join(MODEL_DIR, spec["file"]), "wb") as f:
            pickle.dump(model, f)
        variants[name] = {"file": spec["file"], "features": cols, **m}

    meta = {
        "version": "v2.1",
        "trained_at": datetime.date.today().isoformat(),
        "algorithm": "XGBoost gradient-boosted trees (XGBClassifier)",
        "hyperparameters": {k: v for k, v in CROP_PARAMS.items() if k != "random_state"},
        "dataset": {"source": CROP_DATASET_SOURCE, "rows": int(len(X)), "train_rows": int(len(X_train)), "test_rows": int(len(X_test))},
        "split": {"method": "Stratified train/test split", "test_size": TEST_SIZE, "random_state": RANDOM_STATE,
                  "cv": f"Stratified {CV_FOLDS}-fold cross-validation (shuffled)"},
        "classes": classes,
        "variants": variants,
    }
    with open(os.path.join(MODEL_DIR, "crop_meta.json"), "w") as f:
        json.dump(meta, f, indent=4)
    logger.info("Crop models saved successfully.")


def train_yield_model():
    logger.info("Training Yield Prediction Model...")
    X, y, feature_cols = prepare_yield_training_data()

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE)

    model = XGBRegressor(n_estimators=100, random_state=RANDOM_STATE)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    r2 = r2_score(y_test, preds)

    logger.info(f"Yield Model - MAE: {mae:.2f}, RMSE: {rmse:.2f}, R2: {r2:.4f}")

    model_path = os.path.join(MODEL_DIR, "yield_xgb.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)

    crops = [c[5:] for c in feature_cols if c.startswith("Crop_")]
    meta = {
        "version": "v1.1",
        "trained_at": datetime.date.today().isoformat(),
        "algorithm": "XGBoost gradient-boosted trees (XGBRegressor), 100 trees",
        "mae": mae,
        "rmse": rmse,
        "r2_score": r2,
        "target": "Yield_hg_ha (hectograms per hectare; 10,000 hg/ha = 1 t/ha)",
        "features": feature_cols,
        "dataset": {"rows": int(len(X)), "train_rows": int(len(X_train)), "test_rows": int(len(X_test)),
                    "crops": crops, "year_min": int(X["Year"].min()), "year_max": int(X["Year"].max())},
        "split": {"method": "Random train/test split", "test_size": TEST_SIZE, "random_state": RANDOM_STATE},
        "test_predictions": [{"year": int(yr), "crop": next((c for c in crops if X_test.loc[i, f"Crop_{c}"]), None),
                              "actual_hg_ha": float(a), "predicted_hg_ha": float(p)}
                             for i, yr, a, p in zip(X_test.index, X_test["Year"], y_test, preds)],
    }
    with open(os.path.join(MODEL_DIR, "yield_meta.json"), "w") as f:
        json.dump(meta, f, indent=4)
    logger.info("Yield model saved successfully.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    train_crop_model()
    train_yield_model()
