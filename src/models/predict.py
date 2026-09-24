import os
import json
import pickle
import logging

logger = logging.getLogger("KrishiMitra")

MODEL_DIR = "models/"

def load_model(name="crop_xgb.pkl"):
    path = os.path.join(MODEL_DIR, name)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model {name} not found. Please run training first.")
    with open(path, "rb") as f:
        return pickle.load(f)

def load_meta(name="crop_meta.json"):
    path = os.path.join(MODEL_DIR, name)
    with open(path, "r") as f:
        return json.load(f)
