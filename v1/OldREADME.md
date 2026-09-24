# KRISHIMITRA: AI-Powered Agricultural Decision Support System

<p align="center">
  <img src="assets/images/logo.png" alt="KRISHIMITRA" width="80%" />
</p>

## Overview

KRISHIMITRA is a full-scale AI-powered Agricultural Decision Support System (ADSS) designed to deliver professional agronomic insights. It synthesizes geospatial, meteorological, and pedological data pipelines into a low-latency ensemble architecture, providing explainable crop advisories, yield predictions, and dynamic irrigation schedules.

## V2 Features

- **Farm Profile**: Configurable farm details (location, area, crop).
- **Data Engineering Pipeline**: Robust ingestion from NASA POWER, Open-Meteo, FAO/IIASA HWSD v2.0 (local soil dataset), and FAOSTAT with proper validation, caching, and error handling.
- **Crop Recommendation**: XGBoost classification model predicting the most suitable crop based on N, P, K, pH, rainfall, temp, and humidity.
- **Yield Prediction**: XGBoost regression model estimating historical and future yield trajectories (t/ha).
- **Explainable AI (XAI)**: SHAP-powered feature importance charts explaining *why* a crop was recommended.
- **Irrigation & Risk Advisory**: Heuristic-based engines combining expected rainfall, temperature, and soil conditions to output actionable advice.
- **Canonical recommendation**: One backend summary (`/api/farm/summary`) feeds every page, so Dashboard, Crop Advisor, Yield, AI Insights and Reports always agree. Overall = 60 % agronomic + 40 % financial, restricted to crops sowable in the next 60 days.
- **Live notifications**: Alerts are evaluated from the current data (IMD heavy-rain thresholds, heat/frost, irrigation threshold, crop/soil constraints, mandi price changes, source outages), deduplicated per farm location.
- **PDF reports**: Generated in the browser from the live summary (jsPDF), with a source-status table on every report.
- **Data transparency**: Settings → Data Sources & Provenance shows every source's real status, last successful fetch, fallback use and raw payload, with refresh/retry.
- **UI**: React + Vite + Tailwind, following the Stitch design system in `assets/docs/Samples/`.

## Architecture

```text
KrishiMitra-ADSS/
├── app/                     # Streamlit frontend & UI components
├── src/                     # Backend modules
│   ├── data/                # Resilient API clients (NASA, OpenMeteo) + local HWSD v2.0 soil lookup
│   ├── features/            # Feature engineering pipelines
│   ├── models/              # ML training & inference logic
│   ├── advisory/            # Decision engines (Irrigation, Risk)
│   └── explainability/      # SHAP integration
├── data/                    # Local CSV datasets
├── models/                  # Pickled ML models & metrics
├── v1/                      # Original V1 data ingestion script preserved
├── .env.example             # Configuration
└── requirements.txt         # Dependencies
```

## Datasets & Provenance

| Dataset Source | Modality | Target Use | Access Method |
|---|---|---|---|
| **Open-Meteo API** | Meteorological | Current conditions, 7-day forecast, FAO-56 ET₀, modelled soil moisture | Live REST API |
| **NASA POWER API** | Meteorological | 5-year monthly climatology → crop-specific growing-season climate | Live REST API |
| **FAO/IIASA HWSD v2.0** | Pedological | 0–20 cm pH, USDA texture, sand/silt/clay, OC, total N, CEC, bulk density, AWC, rooting depth (~1 km, dominant soil of map unit) | Local dataset (see below) |
| **Agmarknet (data.gov.in)** | Market | Current daily mandi modal prices, local district or nearest market | Live REST API (`DATA_GOV_IN_API_KEY`) |
| **OpenStreetMap Nominatim** | Geocoding | District/state resolution for market matching | Live REST API |
| **FAOSTAT** | Historical | National yields; yield-model training (local sample) | Offline CSV |
| **Crop recommendation CSV** | Agronomic | crop_xgb training data (single class, so excluded from ranking) | Offline CSV |

**Installing the HWSD v2.0 soil dataset (one time, ~32 MB download, ~1.9 GB unpacked).** Download `HWSD2_RASTER.zip` and `HWSD2_DB.zip` from the [FAO HWSD page](https://www.fao.org/land-water/resources/tools/databases/hwsd/en), unzip both into `data/hwsd/raw/`, then run `powershell -File scripts/hwsd/export_mdb.ps1` and `python scripts/hwsd/build_hwsd.py`. The backend then reads soil per coordinate from `data/hwsd/` with no network access. `HWSD_LAYER` (default `D1` = 0–20 cm) and `HWSD_FALLBACK_RADIUS_KM` (default 5) are configurable.

## Installation & Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. (Optional) Copy `.env.example` to `.env` and add API keys if required.
4. Train models (Optional, pre-trained provided):
   ```bash
   python -m src.models.train
   ```
5. Run the backend (from the repository root):
   ```bash
   python -m uvicorn api.main:app --reload
   ```
6. Run the frontend:
   ```bash
   cd frontend && npm install && npm run dev
   ```
   Open http://localhost:5173 and choose a location (device location is only requested when you click it).

## Limitations & Ethical Considerations

- **Experimental AI**: Predictions are based on historical ML models and are intended for decision support, not absolute agronomic guarantees.
- **Data Fallbacks**: If external APIs are unavailable, the system gracefully handles missing values and informs the user rather than hallucinating measurements.
- **Yield Ranges**: Yield predictions represent an estimated statistical trajectory rather than a guaranteed output.
- **Model coverage**: The bundled yield model only supports Rice and Wheat (hold-out R² is negative); other crops use a labelled reference-yield × suitability method with no uncertainty range. The bundled crop classifier has a single class and is not used.
- **Costs**: Production costs are static national reference totals. Itemised costs (seed, fertiliser, labour…) have no connected source and are shown as unavailable.
- **Market data**: The public data.gov.in sample key is heavily rate-limited; without a personal key, prices may fall back to the last observed Agmarknet price or the labelled static reference price.

## License

MIT License
