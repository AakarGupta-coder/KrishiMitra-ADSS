# KrishiMitra-ADSS: Project Audit Ledger

## 1. Environment & Snapshot Metadata
- **Repository URL:** https://github.com/AakarGupta-coder/KrishiMitra-ADSS
- **Local Project Root:** `D:\Aakar\College\AI Project`
- **Active Branch:** `main`
- **Commit SHA:** `21c73e6` ("Add evaluation metrics and model-card info buttons")
- **Inspection Date:** 2026-10-28
- **Working Tree State:** Clean tracking branch, untracked documentation files (`PROJECT_HANDOVER.md`, `assets/docs/conference-template-a4(1).docx`, `.agents/`, `.claude/`)
- **Python Runtime:** Python 3.14.0 (Windows 64-bit, AMD64)
- **Node.js Runtime:** Node.js v23.8.0, npm v10.9.2, Vite v8.3.0
- **Authoritative Layout Template:** `assets/docs/conference-template-a4(1).docx` (IEEE A4 Two-Column Format)

---

## 2. Exhaustive File & Directory Inventory

| Path | Category | Classification | Verification Disposition | Functional Description & Execution Role |
|---|---|---|---|---|
| `api/main.py` | Backend API | Source | Read & Analyzed; Runtime-Verified | FastAPI router defining endpoints (`/api/farm/summary`, `/api/advisory/crop`, `/api/advisory/yield`, `/api/health`, `/api/sources`). Handles query parsing, range checks, and summary orchestration. |
| `src/advisory/crop_rules.py` | Advisory Engine | Source | Read & Analyzed; Tested (test_core.py) | Agronomic rules engine (`KM-Rules 2.1`). Computes multiplicative suitability score across 12 Indian crops with Indian crop calendar gating (Kharif, Rabi, Zaid) and economic gross margin calculation. |
| `src/advisory/irrigation.py` | Advisory Engine | Source | Read & Analyzed; Tested (test_core.py) | FAO-56 daily root-zone water balance model. Computes $ET_c = K_c \times ET_0$, $TAW$, $RAW$, effective rain, root-zone depletion $D_r$, and irrigation triggers with application efficiency. |
| `src/advisory/risk.py` | Advisory Engine | Source | Read & Analyzed; Tested (test_core.py) | Multi-factor risk engine categorizing environmental and economic hazards (`low`, `moderate`, `high`) using IMD rainfall thresholds, extreme temperature limits, water deficit, and market modal price drops. |
| `src/advisory/soil.py` | Advisory Engine | Source | Read & Analyzed; Tested (test_core.py) | Pedological interpretation engine. Implements USDA 12-class soil texture classification algorithm from sand/silt/clay fractions, soil pH reaction tiers, and liming/gypsum amendment recommendations. |
| `src/data/hwsd.py` | Data Engine | Source | Read & Analyzed; Tested (test_core.py) | Local FAO/IIASA Harmonized World Soil Database v2.0 raster reader. Uses `numpy.memmap` on 1.86 GB `HWSD2.bil` binary grid (30 arc-second, ~1 km) and SQLite attribute lookup with radial search fallback up to 5 km. |
| `src/data/open_meteo.py` | Ingestion Client | Source | Read & Analyzed; Runtime-Verified | Open-Meteo REST API client. Fetches hourly/daily weather forecasts, Penman-Monteith reference evapotranspiration ($ET_0$), and soil moisture with 15-minute SQLite caching. |
| `src/data/nasa_power.py` | Ingestion Client | Source | Read & Analyzed; Runtime-Verified | NASA POWER API client. Queries 5-year satellite-derived monthly climatology ($T_{2M}$, precipitation, relative humidity, solar radiation) with 7-day SQLite caching. |
| `src/data/market.py` | Ingestion Client | Source | Read & Analyzed; Tested (test_core.py) | Agmarknet (data.gov.in) mandi modal price client. Matches commodities, provides district-level pooling, 3-hour cache TTL, and falls back to static national benchmark commodity prices. |
| `src/data/geocode.py` | Ingestion Client | Source | Read & Analyzed; Tested (test_core.py) | OpenStreetMap Nominatim reverse geocoder. Maps latitude and longitude to administrative district and state boundaries with 30-day SQLite caching. |
| `src/data/store.py` | Persistence | Source | Read & Analyzed; Tested (test_core.py) | SQLite persistence layer (`data/krishimitra_state.sqlite`). Implements caching, negative caching with exponential backoff, and data-source status health tracking. |
| `src/data/api_utils.py` | Utility | Source | Read & Analyzed | Common HTTP request wrapper with timeout handling, exponential backoff, and cache invalidation. |
| `src/features/engineering.py` | ML Feature Pipeline | Source | Read & Analyzed; Evaluated | Training data preparation routines for crop classifier (7 features) and yield regressor (one-hot encoding of `Year` and `Crop`). |
| `src/models/crop_ml.py` | ML Inference | Source | Read & Analyzed; Tested (test_core.py) | Crop recommendation classifier loader and prediction wrapper. Gates dual models (`crop_xgb.pkl` vs `crop_xgb_climate.pkl`) based on soil test availability. Produces secondary opinion. |
| `src/models/predict.py` | ML Utility | Source | Read & Analyzed | Model deserialization helper (`pickle.load`) and metadata JSON parser. |
| `src/models/train.py` | ML Training | Source | Read & Analyzed; Evaluated | Training script for XGBoost crop classifier and XGBoost yield regressor. Performs stratified 5-fold cross-validation and exports evaluation metadata. |
| `src/models/yield_service.py` | ML Inference | Source | Read & Analyzed; Tested (test_core.py) | Yield prediction orchestrator. Routes Rice and Wheat to `yield_xgb.pkl` with SHAP `TreeExplainer`; routes other 10 crops to deterministic reference yield multiplied by agronomic suitability score. |
| `src/services/farm_summary.py` | Service Orchestration| Source | Read & Analyzed; Tested (test_core.py) | Core aggregation engine. Coordinates concurrent data fetching, feature mapping, rules execution, ML second opinion, water balance, and risk synthesis into canonical response. |
| `src/services/model_cards.py` | Documentation Engine| Source | Read & Analyzed; Tested (test_core.py) | Exposes structured model cards, evaluation metrics, hyperparameters, dataset provenance, and data health registries. |
| `tests/test_core.py` | Test Suite | Test | Executed; 24 Passed | 24 pytest unit tests covering soil texture boundaries, soil amendments, FAO-56 water balance, crop season date math, HWSD raster lookup, market district matching, and outage fallbacks. |
| `frontend/src/App.tsx` | Frontend Routing | Source | Read & Analyzed; Runtime-Verified | Client router configuring 10 primary application views, first-run farm location setup gate, and Zustand store hydration. |
| `frontend/src/pages/Dashboard.tsx` | Frontend Page | Source | Visually Inspected (Screenshot) | Executive dashboard: location telemetry, active risk indicators, canonical crop recommendation card, water balance quick status, and market price snippet. |
| `frontend/src/pages/CropAdvisorPage.tsx` | Frontend Page | Source | Visually Inspected (Screenshot) | Full crop suitability ranking for 12 crops, factor attribution breakdown, calendar countdowns, and XGBoost ML second opinion comparison. |
| `frontend/src/pages/YieldPredictionPage.tsx`| Frontend Page | Source | Visually Inspected (Screenshot) | Yield forecast display, hold-out uncertainty range, SHAP feature impact waterfall, and suitability sensitivity sliders. |
| `frontend/src/pages/IrrigationAdvisorPage.tsx`| Frontend Page| Source | Visually Inspected (Screenshot) | 7-day tabular soil water budget ($ET_0, ET_c, P_{eff}, D_r$), irrigation trigger alerts, gross water volume in $m^3/\text{ha}$, and system efficiency multipliers. |
| `frontend/src/pages/WeatherIntelligencePage.tsx`| Frontend Page| Source | Visually Inspected (Screenshot) | 7-day meteorological charts, daily maximum/minimum temperatures, rainfall probability, wind speed, and IMD hazard alerts. |
| `frontend/src/pages/SoilIntelligencePage.tsx` | Frontend Page | Source | Visually Inspected (Screenshot) | HWSD v2.0 pedological soil profile (USDA texture class, topsoil pH, CEC, SOC), physical drainage characteristics, and liming/gypsum calculations. |
| `frontend/src/pages/AIInsightsPage.tsx` | Frontend Page | Source | Visually Inspected (Screenshot) | Model concordance matrix (Rules Engine vs XGBoost Classifier), confidence ratings, and multi-tier hazard threat breakdown. |
| `frontend/src/pages/FarmProfilePage.tsx` | Frontend Page | Source | Visually Inspected (Screenshot) | Interactive Leaflet map coordinate selector, farm size input, irrigation system selection, and optional laboratory soil test inputs. |
| `frontend/src/pages/ReportsPage.tsx` | Frontend Page | Source | Visually Inspected (Screenshot) | Client-side jsPDF report generator assembling comprehensive farm intelligence dossiers with embedded data provenance and telemetry tables. |
| `frontend/src/pages/SettingsPage.tsx` | Frontend Page | Source | Visually Inspected (Screenshot) | Real-time external provider health dashboard, displaying latency, cache TTL, failure status, and raw JSON payload inspection. |
| `data/crop_recommendation.csv` | Dataset | Binary/Data | Measured & Evaluated | 2,200 rows, 8 columns, 22 balanced crop classes (100 rows each). Features: N, P, K, temp, humidity, pH, rainfall. Source: Kaggle (Atharva Ingle / Harvestify). SHA256: `54a5a6e5408668e668667efc50de2fc867c1b875e0431b4f54dd331b0a109a4e`. |
| `data/faostat_sample.csv` | Dataset | Binary/Data | Measured & Evaluated | 20 rows, 6 columns. India national yields for Rice and Wheat. Contains 15 synthetic flat placeholder rows. SHA256: `6c8657ec8315f4dcebd04aead47946f42e3431e567398d93c79dddc6bfc659ed`. |
| `data/hwsd/HWSD2.bil` | Dataset | Binary/Data | Metadata Inspected; Tested | 1.86 GB (1,866,240,000 bytes) binary raster grid of FAO/IIASA HWSD v2.0 at 30 arc-second (~1 km) resolution. |
| `data/hwsd/hwsd2.sqlite` | Dataset | Binary/Data | Metadata Inspected; Tested | 51.2 MB SQLite database containing HWSD2_LAYERS, SMU lookup tables, and USDA texture dictionaries. |
| `models/crop_xgb.pkl` | Model Artifact | Serialized Model | Evaluated on Test Set | Stratified XGBoost Classifier (7 features: NPK + Climate). Test Accuracy: 98.86%, Macro F1: 98.85%, 5-Fold CV: 99.27% ± 0.33%. |
| `models/crop_xgb_climate.pkl` | Model Artifact | Serialized Model | Evaluated on Test Set | Stratified XGBoost Classifier (4 features: Climate + pH). Test Accuracy: 94.09%, Macro F1: 94.01%, 5-Fold CV: 95.82% ± 0.53%. |
| `models/yield_xgb.pkl` | Model Artifact | Serialized Model | Evaluated on Test Set | XGBoost Regressor trained on 20-row FAOSTAT sample. Test $R^2 = -5.33$, MAE = 310.0 hg/ha. Identified as prototype model. |
| `assets/docs/conference-template-a4(1).docx`| Template | Document | Analyzed & Namespace Fixed | Official IEEE Conference A4 Two-Column Document Template. Authoritative style reference for final paper layout. |
| `assets/docs/rough idea.md` | Planning Document | Legacy Text | Read & Reconciled | Conceptual project outline. Contains preliminary ideas, superseded by actual implementation. |
| `assets/docs/project_walkthrough.txt`| Planning Document | Legacy Text | Read & Reconciled | Conceptual design note describing hypothetical 54-input multimodal neural network, k-NN imputation, and SMOTE. Confirmed absent in current code. |
| `PROJECT_HANDOVER.md` | Handover Document | Markdown | Read & Reconciled | Comprehensive technical overview of KrishiMitra ADSS v2.1. |
