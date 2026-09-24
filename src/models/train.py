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

def train_crop_model():
    logger.info("Training Crop Recommendation Model...")
    X, y = prepare_crop_training_data()
    
    classes = sorted(y.unique())
    class_to_idx = {c: i for i, c in enumerate(classes)}
    y_encoded = y.map(class_to_idx)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)
    
    model = XGBClassifier(n_estimators=100, random_state=42, use_label_encoder=False, eval_metric='mlogloss')
    model.fit(X_train, y_train)
    
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    f1 = f1_score(y_test, preds, average='weighted')
    
    logger.info(f"Crop Model - Accuracy: {acc:.4f}, F1: {f1:.4f}")
    
    model_path = os.path.join(MODEL_DIR, "crop_xgb.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
        
    meta = {
        "version": "v1.0",
        "accuracy": acc,
        "f1_score": f1,
        "classes": classes,
        "features": X.columns.tolist()
    }
    with open(os.path.join(MODEL_DIR, "crop_meta.json"), "w") as f:
        json.dump(meta, f, indent=4)
    logger.info("Crop model saved successfully.")

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
    train_crop_model()
    train_yield_model()
