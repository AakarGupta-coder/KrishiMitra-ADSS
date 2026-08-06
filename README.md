# KrishiMitra: AI-Powered Agricultural Decision Support System

KrishiMitra is an AI-powered Agricultural Decision Support System (ADSS) designed for precision farming. It integrates multi-modal environmental datasets to provide actionable insights for farmers, including crop suitability recommendations, yield estimations, and dynamic irrigation schedules.

## 📊 Datasets Loaded

This repository contains the initial data ingestion pipeline (`dataset_loader.py`) which successfully loads and integrates the following datasets:

1. **NASA POWER API (Meteorological Data)**: Fetches historical and real-time environmental data (Temperature, Relative Humidity, Precipitation).
2. **Open-Meteo API (Forecast Data)**: Fetches real-time localized weather forecasts to assist in dynamic irrigation scheduling.
3. **SoilGrids (Pedological Data)**: Global gridded soil information (pH, Nitrogen, Sand/Clay percentage, Soil Organic Carbon) essential for crop suitability.
4. **FAOSTAT (Historical Yield Records)**: Historical crop production and yield statistics to train our regression models for yield estimation.

## 🚀 Future Plan of Action

Our subsequent development phases are structured as follows:

- **Phase 1: Advanced Preprocessing** 
  - Implement k-NN multivariate imputation for missing API data.
  - Apply Z-Score standardization and temporal feature engineering.
- **Phase 2: Model Architecture Development**
  - Build the **Explainable Multi-modal Fusion Network**.
  - Train LightGBM classifiers for crop recommendation.
  - Train XGBoost regressors for yield estimation.
- **Phase 3: Explainability Layer**
  - Integrate SHAP (SHapley Additive exPlanations) to extract feature-attribution gradients, translating black-box predictions into human-readable farmer advisories.
- **Phase 4: Output Interface**
  - Develop an interactive, low-latency web dashboard (e.g., Streamlit) to display yield predictions, risk scores, and crop advisories.
