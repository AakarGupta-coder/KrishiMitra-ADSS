import pandas as pd
from .api_utils import logger
import os

def load_faostat_yield(path: str = "data/faostat_sample.csv") -> pd.DataFrame:
    logger.info(f"Loading FAOSTAT data from {path}")
    try:
        df = pd.read_csv(path)
        df = df[(df['Year'] >= 1900) & (df['Year'] <= 2100)]
        return df
    except Exception as e:
        logger.error(f"Failed to load FAOSTAT data: {e}")
        return pd.DataFrame()

def load_crop_recommendation(path: str = "data/crop_recommendation.csv") -> pd.DataFrame:
    logger.info(f"Loading Crop Recommendation data from {path}")
    try:
        df = pd.read_csv(path)
        return df
    except Exception as e:
        logger.error(f"Failed to load Crop Recommendation data: {e}")
        return pd.DataFrame()
