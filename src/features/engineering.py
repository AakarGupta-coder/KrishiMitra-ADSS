import pandas as pd
from src.data.local_data import load_crop_recommendation, load_faostat_yield
import logging

logger = logging.getLogger("KrishiMitra")

def prepare_crop_training_data():
    df = load_crop_recommendation()
    if df.empty:
        raise ValueError("Crop Recommendation dataset is empty.")
    
    X = df[['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']]
    y = df['label']
    
    return X, y

def prepare_yield_training_data():
    df = load_faostat_yield()
    if df.empty:
        raise ValueError("FAOSTAT Yield dataset is empty.")
    
    
    X = df[['Year', 'Crop']].copy()
    y = df['Yield_hg_ha']
    
    X_encoded = pd.get_dummies(X, columns=['Crop'], drop_first=False)
    
    return X_encoded, y, X_encoded.columns.tolist()
