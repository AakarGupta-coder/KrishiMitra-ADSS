# KRISHIMITRA: AI-Powered Agricultural Decision Support System

<p align="center">
  <img src="assets/images/logo.png" alt="KRISHIMITRA" width="80%" />
</p>

## Overview

KRISHIMITRA is a full-scale AI-powered Agricultural Decision Support System (ADSS) designed to deliver professional agronomic insights. It synthesizes geospatial, meteorological, and pedological data pipelines into a low-latency ensemble architecture, providing explainable crop advisories, yield predictions, and dynamic irrigation schedules.

## V2 Features

- **Farm Profile**: Configurable farm details (location, area, crop).
- **Data Engineering Pipeline**: Robust ingestion from NASA POWER, Open-Meteo, Agmarknet and Nominatim, plus local FAO/IIASA HWSD v2.0 soil data and FAOSTAT, with validation, caching, retry/back-off and per-source health tracking.
- **Crop Recommendation**: Agronomic rules engine (`src/advisory/crop_rules.py`) scoring 12 crops against their preferred N, P, K, pH, seasonal rainfall, temperature and humidity ranges and the Indian sowing calendar. Each factor outside its range multiplies the score down; every factor is attributed to its data source. An XGBoost classifier (`crop_xgb`) exists but is not used for recommendations until it is trained on a multi-class dataset (see Limitations).
- **Yield Prediction**: XGBoost regressor (`yield_xgb`) for crops present in the FAOSTAT sample (Rice, Wheat), shown with its hold-out error and reliability; other crops use a labelled reference yield × agronomic suitability.
- **Explainable AI (XAI)**: Per-factor attribution explains *why* a crop was ranked where it is; SHAP values explain the yield model's predictions.
- **Irrigation & Risk Advisory**: Heuristic-based engines combining expected rainfall, temperature, and soil conditions to output actionable advice.
- **Canonical recommendation**: One backend summary (`/api/farm/summary`) feeds every page, so Dashboard, Crop Advisor, Yield, AI Insights and Reports always agree. A crop is eligible when its sowing window is open or opens within 60 days, its agronomic suitability is at least 40 % and at least 2 factors could be evaluated. Crops are ranked by eligibility, then agronomic suitability, then net return per hectare (observed mandi prices only); the most profitable eligible crop is reported separately as the economic trade-off.
- **Live notifications**: Alerts are evaluated from the current data (IMD heavy-rain thresholds, heat/frost, irrigation threshold, crop/soil constraints, mandi price changes, source outages), deduplicated per farm location.
- **PDF reports**: Generated in the browser from the live summary (jsPDF), with a source-status table on every report.
- **Data transparency**: Settings → Data Sources & Provenance shows every source's real status, last successful fetch, fallback use and raw payload, with refresh/retry.
- **UI**: React + Vite + Tailwind, following the Stitch design system.

## Architecture

The system operates via a decoupled frontend-backend architecture. 

```mermaid
flowchart TD
    subgraph Frontend [React + Vite]
        UI[User Interface]
        State[Zustand Store]
        PDF[PDF Generator]
    end

    subgraph Backend [FastAPI]
        API[API Router]
        Data[Data Fetchers]
        ML[ML Models & SHAP]
        Engines[Decision Engines]
    end

    subgraph External [External APIs]
        NASA(NASA POWER)
        Meteo(Open-Meteo)
        Gov(data.gov.in Agmarknet)
        OSM(Nominatim)
    end

    UI <-->|JSON over HTTP| API
    API --> Data
    API --> ML
    API --> Engines
    Data <--> External
    Data <--> Cache[(SQLite state + cache)]
    Data <--> HWSD[(HWSD v2.0 soil raster + SQLite)]
```

### Directory Structure

```text
KrishiMitra-ADSS/
├── api/                     # FastAPI backend application
├── src/                     # Backend core logic
│   ├── data/                # API clients (Open-Meteo, NASA POWER, Agmarknet, Nominatim), HWSD lookup, SQLite store
│   ├── features/            # Feature engineering for model training
│   ├── models/              # ML training, inference, yield service (incl. SHAP)
│   ├── advisory/            # Decision engines (crop rules, irrigation, risk, soil)
│   └── services/            # farm_summary: builds the canonical summary
├── scripts/hwsd/            # One-time build of the local HWSD v2.0 soil database
├── tests/                   # pytest suite
├── data/                    # Local CSV datasets & DBs
├── frontend/                # React Vite application
├── models/                  # Pickled ML models & metrics
├── v1/                      # Original V1 preserved code
└── requirements.txt         # Python Dependencies
```

## Datasets & Provenance

| Dataset Source | Modality | Target Use | Access Method |
|---|---|---|---|
| **Open-Meteo API** | Meteorological | Current conditions, 7-day forecast, FAO-56 ET₀, modelled soil moisture | Live REST API |
| **NASA POWER API** | Meteorological | 5-year monthly climatology → crop-specific growing-season climate | Live REST API |
| **FAO/IIASA HWSD v2.0** | Pedological | Topsoil pH, USDA texture, sand/silt/clay, OC, total N, CEC (~1 km, 0–20 cm) | Local raster + SQLite |
| **Agmarknet (data.gov.in)**| Market | Current daily mandi modal prices, local district or nearest market | Live REST API |
| **OSM Nominatim** | Geocoding | District/state resolution for market matching | Live REST API |
| **FAOSTAT** | Historical | National yields; yield-model training (19-row local sample) | Offline CSV |
| **Crop recommendation**| Agronomic | crop_xgb training data (20-row sample, single class) | Offline CSV |

## Installation & Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up environment variables by creating a `.env` file in the root directory. Required format:
   ```env
   # KrishiMitra Configuration
   
   # Agmarknet mandi prices (data.gov.in). Without a key the public sample key is used,
   # which returns at most 10 records per call and is quickly rate-limited (HTTP 429).
   # Register for a free personal key at https://data.gov.in and set it here.
   DATA_GOV_IN_API_KEY=""
   
   # Where runtime state (source health, market observations, geocode cache) is stored.
   KRISHIMITRA_STATE_DB="data/krishimitra_state.sqlite"
   
   # Frontend: backend URL used by the React app (Vite reads VITE_* variables).
   VITE_API_BASE="http://localhost:8000"
   
   # Application Settings
   ENVIRONMENT="development"
   LOG_LEVEL="INFO"
   ```
4. Build the local HWSD v2.0 soil database (one time). Download `HWSD2_RASTER.zip` and `HWSD2_DB.zip` from the [FAO HWSD page](https://www.fao.org/land-water/resources/tools/databases/hwsd/en), extract them into `data/hwsd/raw/`, then run:
   ```bash
   powershell -File scripts/hwsd/export_mdb.ps1
   python scripts/hwsd/build_hwsd.py
   ```
   Without it, soil data is reported as unavailable and the rest of the app still works.
5. Train models (Optional, pre-trained provided):
   ```bash
   python -m src.models.train
   ```
6. Run the backend (from the repository root):
   ```bash
   python -m uvicorn api.main:app --reload
   ```
7. Run the frontend:
   ```bash
   cd frontend && npm install && npm run dev
   ```
   Open http://localhost:5173 and choose a location.

## Limitations & Ethical Considerations

- **Experimental AI**: Recommendations come from a transparent rules engine and are intended for decision support, not absolute agronomic guarantees.
- **Sample training data**: The bundled training files are small samples. `crop_recommendation.csv` has 20 rows of one class (rice), so `crop_xgb` cannot rank crops and is excluded from recommendations. `faostat_sample.csv` has 19 rows and the yield model's hold-out R² is negative, so its estimates are marked low reliability. Replacing both files with full datasets and re-running `python -m src.models.train` is required before the models carry real weight.
- **Data Fallbacks**: If external APIs are unavailable, the system gracefully handles missing values and informs the user rather than hallucinating measurements.
- **Yield Ranges**: Yield predictions represent an estimated statistical trajectory rather than a guaranteed output.
- **Market data**: The public data.gov.in sample key is heavily rate-limited; without a personal key, prices may fall back to the last observed Agmarknet price.

## License

MIT License
