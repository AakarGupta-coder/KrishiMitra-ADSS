import os
import json
import pickle
from xgboost import XGBClassifier, XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, r2_score
from src.features.engineering import prepare_crop_training_data, prepare_yield_training_data
import logging

logger = logging.getLogger("KrishiMitra")

MODEL_DIR = "models/"
os.makedirs(MODEL_DIR, exist_ok=True)

CROP_DATASET_SOURCE = ("Kaggle 'Crop Recommendation Dataset' (Atharva Ingle), 2,200 rows, 22 crops; "
                       "mirrored from github.com/Gladiator07/Harvestify")

# Two variants: N, P and K only exist when the farmer enters a soil test, so the climate variant
# (temperature, humidity, pH, rainfall) serves every other location.
CROP_VARIANTS = {
    "full": {"file": "crop_xgb.pkl", "features": ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]},
    "climate": {"file": "crop_xgb_climate.pkl", "features": ["temperature", "humidity", "ph", "rainfall"]},
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
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)

    variants = {}
    for name, spec in CROP_VARIANTS.items():
        cols = spec["features"]
        model = XGBClassifier(n_estimators=200, max_depth=4, learning_rate=0.1, random_state=42, eval_metric="mlogloss")
        model.fit(X_train[cols], y_train)
        preds = model.predict(X_test[cols])
        acc = accuracy_score(y_test, preds)
        f1 = f1_score(y_test, preds, average="weighted")
        logger.info(f"Crop Model ({name}) - Accuracy: {acc:.4f}, F1: {f1:.4f}")
        with open(os.path.join(MODEL_DIR, spec["file"]), "wb") as f:
            pickle.dump(model, f)
        variants[name] = {"file": spec["file"], "features": cols, "accuracy": acc, "f1_score": f1}

    meta = {
        "version": "v2.0",
        "dataset": {"source": CROP_DATASET_SOURCE, "rows": int(len(X)), "test_rows": int(len(X_test))},
        "classes": classes,
        "variants": variants,
    }
    with open(os.path.join(MODEL_DIR, "crop_meta.json"), "w") as f:
        json.dump(meta, f, indent=4)
    logger.info("Crop models saved successfully.")


def train_yield_model():
    logger.info("Training Yield Prediction Model...")
    X, y, feature_cols = prepare_yield_training_data()
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = XGBRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    
    logger.info(f"Yield Model - MAE: {mae:.2f}, R2: {r2:.4f}")
    
    model_path = os.path.join(MODEL_DIR, "yield_xgb.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
        
    meta = {
        "version": "v1.0",
        "mae": mae,
        "r2_score": r2,
        "features": feature_cols
    }
    with open(os.path.join(MODEL_DIR, "yield_meta.json"), "w") as f:
        json.dump(meta, f, indent=4)
    logger.info("Yield model saved successfully.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    train_crop_model()
    train_yield_model()
