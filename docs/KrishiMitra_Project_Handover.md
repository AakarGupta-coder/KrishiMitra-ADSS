# KRISHIMITRA (ADSS): Comprehensive Technical & Architectural Handover Document

> **Target Audience:** Claude Pro / AI Technical Writer / Academic Project Evaluator  
> **Repository:** [https://github.com/AakarGupta-coder/KrishiMitra-ADSS](https://github.com/AakarGupta-coder/KrishiMitra-ADSS)  
> **System Name:** KRISHIMITRA: AI-Powered Agricultural Decision Support System  
> **System Version:** 2.1  
> **Document Purpose:** Complete, self-contained architectural, algorithmic, empirical, and interface specification for generating high-level project reports, thesis chapters, research papers, and evaluation dossiers without needing prior repository context.

---

## 1. Executive Summary & Project Identification

- **Project Domain:** Precision Agriculture, Applied Machine Learning, Decision Support Systems (ADSS), Geospatial & Pedological Data Engineering, Explainable AI (XAI).
- **Core Problem:** Indian agricultural decisions (crop selection, irrigation timing, input scheduling, yield estimation) remain heavily reliant on historical intuition and isolated data points. Conventional ag-tech tools offer siloed information (weather apps OR soil testing kits OR mandi market bulletins) with zero integration and black-box ML outputs that farmers cannot verify.
- **Solution:** KRISHIMITRA synthesizes live geospatial, satellite meteorological, global soil raster, and market price data into a unified, low-latency ensemble architecture. It merges deterministic agronomic rule engines with machine learning classifiers and regressors, providing transparent, explainable recommendations, dynamic FAO-56 irrigation schedules, and automated PDF field reports.

---

## 2. High-Level System Architecture & Flow

The system adopts a decoupled, modern multi-tier architecture:
- **Presentation Tier:** React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, Recharts, Leaflet, jsPDF.
- **Application & Inference Tier:** FastAPI (Python), Uvicorn, Scikit-Learn, XGBoost, SHAP.
- **Pedological & Geospatial Engine:** Local FAO/IIASA Harmonized World Soil Database (HWSD v2.0) 30 arc-second memory-mapped raster engine.
- **External Data Ingestion Tier:** Open-Meteo, NASA POWER, Agmarknet (data.gov.in), OpenStreetMap Nominatim.
- **Caching & Provenance Tier:** SQLite-backed state and persistent caching engine.

### 2.1 System Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer ["Frontend Client (React 19 + TypeScript + Vite)"]
        UI["Modern UI / Stitch Design System"]
        State["Zustand Client Store (useFarmStore, useFarmDataStore)"]
        PDFGen["Client-Side PDF Generator (jsPDF)"]
        UI <--> State
        State --> PDFGen
    end

    subgraph APILayer ["Backend Service (FastAPI / Uvicorn)"]
        Router["REST API Router (/api/*)"]
        Aggregator["Canonical Farm Summary Service (farm_summary.py)"]
        Router <--> Aggregator
    end

    subgraph AnalyticalEngines ["Decision & ML Engine"]
        CropRules["Agronomic Rules Engine (KM-Rules 2.1)"]
        IrrigationEngine["FAO-56 Soil Water Balance Engine"]
        RiskEngine["Multi-Factor Environmental & Market Risk Engine"]
        SoilEngine["USDA Texture & Soil Quality Engine"]
        MLClassifier["XGBoost Crop Classifier (crop_xgb)"]
        MLYield["XGBoost Yield Regressor + SHAP TreeExplainer"]
        
        Aggregator --> CropRules
        Aggregator --> IrrigationEngine
        Aggregator --> RiskEngine
        Aggregator --> SoilEngine
        Aggregator --> MLClassifier
        Aggregator --> MLYield
    end

    subgraph DataIngestionLayer ["Data Ingestion & Provenance"]
        NASAClient["NASA POWER Client (5-Year Climatology)"]
        MeteoClient["Open-Meteo Client (7-Day Forecast & ET0)"]
        MarketClient["Agmarknet Client (Mandi Modal Prices)"]
        GeoClient["OSM Nominatim Client (Reverse Geocoding)"]
        HWSDReader["FAO HWSD v2.0 Memory-Mapped Raster Reader"]
        CacheDB[("SQLite Cache & Health DB (krishimitra_state.sqlite)")]
        
        CropRules <--> NASAClient
        IrrigationEngine <--> MeteoClient
        SoilEngine <--> HWSDReader
        RiskEngine <--> MeteoClient
        RiskEngine <--> MarketClient
        
        NASAClient <--> CacheDB
        MeteoClient <--> CacheDB
        MarketClient <--> CacheDB
        GeoClient <--> CacheDB
    end

    ClientLayer <==>|JSON over HTTP (REST)| APILayer
```

---

## 3. Detailed Data Pipeline & Provenance Matrix

KrishiMitra integrates 7 primary data streams. Each stream features health tracking, exponential back-off, caching, and fallback guarantees:

| Data Source | Type / Access | Geographic Scope | Variables Extracted | Primary Target Module | Fallback Strategy |
|---|---|---|---|---|---|
| **Open-Meteo API** | Live REST API | Global (~1–11 km NWP) | Hourly/Daily Max/Min Temp, Rain sum, Rain probability, FAO-56 $ET_0$, Soil moisture (9–27 cm), Wind speed | Weather, Irrigation Advisor, Climate Risk | 15-min SQLite cache; historical seasonal norms |
| **NASA POWER API** | Live REST API | Global (0.5° × 0.625° MERRA-2) | 5-Year monthly climatology: $T_{2M}$, Precipitation total, Relative humidity ($RH_{2M}$), Solar radiation | Crop Advisor, Yield Prediction | 7-day SQLite cache; Open-Meteo forecast averages |
| **FAO/IIASA HWSD v2.0** | Local Binary Raster + SQLite | Global (~1 km / 30 arc-sec) | Topsoil (0–20 cm) pH, USDA Texture, Sand/Silt/Clay %, Organic Carbon, Total Nitrogen, CEC, Bulk density, AWC | Soil Intelligence, Crop Rules, Water Balance | Radial search up to 5 km; graceful fallback to "Unavailable" without crashing |
| **Agmarknet (data.gov.in)** | Live REST API | India (Mandi-level) | Daily commodity modal prices, arrival dates, market/district/state records | Crop Advisor Financials, Market Risk | 6-hour cache; nearest reporting mandi in state; static national benchmark prices |
| **OSM Nominatim** | Live REST API | Global (Admin boundaries) | Latitude/Longitude to District, State, and Country mapping | Location Picker, Market Matching | 30-day SQLite cache |
| **Crop Recommendation Benchmark** | Offline CSV (Kaggle) | 2,200 rows (22 crops) | N, P, K, Temperature, Humidity, pH, Rainfall | `crop_xgb` Classifier Training | Bundled inside repository; offline pre-trained |
| **FAOSTAT Historical Yields** | Offline CSV | India National Yields | Crop, Year, Yield (hg/ha $\rightarrow$ t/ha) | `yield_xgb` Regressor Training | Bundled inside repository; reference yield calculation fallback |

---

## 4. Algorithmic Deep-Dive: Core System Modules

### 4.1 Agronomic Rules Engine (`KM-Rules 2.1`)
Located at `src/advisory/crop_rules.py`. Evaluates suitability for 12 major Indian crops: Wheat, Sorghum, Pearl Millet, Barley, Green Gram, Black Gram, Sugarcane, Tomato, Potato, Onion, Turmeric, and Ginger.

1. **Scoring Function**:
   - Each crop defines optimal physiological intervals: $[N_{min}, N_{max}]$, $[P_{min}, P_{max}]$, $[K_{min}, K_{max}]$, $[T_{min}, T_{max}]$, $[H_{min}, H_{max}]$, $[pH_{min}, pH_{max}]$, $[Rain_{min}, Rain_{max}]$.
   - Individual factor score $S_i \in [0.0, 1.0]$. If parameter $x_i$ is within $[min, max]$, $S_i = 1.0$. If outside, score decays multiplicatively based on normalized deviation.
   - Overall Agronomic Suitability Score:
     $$S_{agronomic} = 100 \times \prod_{i=1}^{k} S_i$$
   - Minimum factor threshold: At least 2 factors must be measurable to produce a valid score; minimum eligibility cutoff is $40\%$.

2. **Temporal & Calendar Gating**:
   - Compares query date against the Indian agricultural crop calendar (Kharif, Rabi, Zaid).
   - If a crop's sowing window is not open and does not open within 60 days, an off-season penalty multiplier ($0.5\times$) is applied, disqualifying it from primary recommendation.

3. **Financial Optimization**:
   - Net Return Calculation:
     $$\text{Gross Revenue} = \text{Expected Yield (t/ha)} \times \text{Mandi Modal Price (INR/t)}$$
     $$\text{Net Profit (INR/ha)} = \text{Gross Revenue} - \text{Cultivation Cost (INR/ha)}$$
   - Ranks eligible crops primarily by Agronomic Score, with economic trade-offs surfaced independently.

---

### 4.2 Machine Learning Crop Classifier (`crop_xgb`)
Located at `src/models/crop_ml.py` and `src/models/train.py`.

- **Model Paradigm**: Stratified XGBoost Multi-Class Classifier trained on 2,200 samples across 22 crop classes.
- **Dual-Model Architecture**:
  1. **Full Variant (`crop_xgb.pkl`)**: 7 features ($N, P, K, \text{temp}, \text{humidity}, pH, \text{rainfall}$). Requires soil test data.
  2. **Climate Variant (`crop_xgb_climate.pkl`)**: 4 features ($\text{temp}, \text{humidity}, pH, \text{rainfall}$). Automatically invoked when farmer has not uploaded laboratory soil test values.
- **Architectural Role**: Acts as an **independent second opinion** in the UI. It *never* overrides the transparent agronomic rules engine. It outputs top-5 crops with class probabilities and a boolean flag indicating whether ML agrees with the rules engine.

#### Empirical Evaluation Metrics:
| Model Variant | Feature Set | Hold-Out Accuracy | Macro Precision | Macro Recall | Macro F1 | 5-Fold Cross Validation |
|---|---|---|---|---|---|---|
| **Full (with NPK)** | N, P, K, T, H, pH, Rain | **98.86 %** | 98.94 % | 98.86 % | 98.85 % | **99.27 % $\pm$ 0.33** |
| **Climate + pH** | T, H, pH, Rain | **94.09 %** | 94.20 % | 94.09 % | 94.01 % | **95.82 % $\pm$ 0.53** |

---

### 4.3 Crop Yield Prediction & Explainable AI (XAI)
Located at `src/models/yield_service.py`.

- **Model Paradigm**: XGBoost Regressor (`yield_xgb.pkl`) combined with SHAP (`TreeExplainer`).
- **Explainability**: Computes exact Shapley attribution values ($S_j$) for each input feature, answering: *“How many t/ha did rainfall add or subtract relative to baseline?”*
- **Sensitivity Matrix**: When reference yields are used for non-FAOSTAT crops, a sensitivity distribution is dynamically evaluated across suitability intervals ($40\% \rightarrow 100\%$).
- **Academic Transparency**: The documentation explicitly acknowledges that the FAOSTAT training sample is a 20-row prototype with negative hold-out $R^2$, properly flagging predictions as experimental until expanded datasets are integrated.

---

### 4.4 Smart Irrigation Advisor (FAO-56 Daily Water Balance)
Located at `src/advisory/irrigation.py`.

Computes root-zone soil water balance over a 7-day forecast horizon based on FAO-56 standard methodology:
1. **Crop Evapotranspiration ($ET_c$)**:
   $$ET_c = K_c \times ET_0$$
   Where $K_c$ is the FAO mid-season crop coefficient (e.g., Wheat = 1.15, Sugarcane = 1.25) and $ET_0$ is the Penman-Monteith reference evapotranspiration provided by Open-Meteo.
2. **Soil Reservoir Parameters**:
   - Total Available Water: $TAW = 1000 \times (\theta_{FC} - \theta_{WP}) \times Z_r$
     - $\theta_{FC}$: Field Capacity (derived from USDA soil texture).
     - $\theta_{WP}$: Wilting Point.
     - $Z_r$: Effective root zone depth ($0.5\text{ m}$).
   - Readily Available Water: $RAW = p \times TAW$ (depletion fraction $p = 0.5$).
3. **Daily Water Balance Iteration**:
   $$D_{r, i} = \min\left(TAW, \max\left(0, D_{r, i-1} + ET_{c, i} - P_{eff, i}\right)\right)$$
   Where $P_{eff}$ is effective rainfall ($80\%$ of rainfall $\ge 5\text{ mm}$).
4. **Actionable Irrigation Trigger**:
   - If root zone depletion $D_r > RAW$, an irrigation event is triggered.
   - Gross water requirement accounts for system application efficiency:
     $$\text{Gross Irrigation} = \frac{D_r}{\text{Efficiency}} \quad (\text{Drip: } 90\%, \text{ Sprinkler: } 75\%, \text{ Flood: } 60\%)$$

---

### 4.5 Environmental & Market Risk Engine
Located at `src/advisory/risk.py`.

Continuously monitors anomalies and categorizes threats into `low`, `moderate`, or `high`:
- **Climate Hazards**:
  - Heat Stress: $T_{max} \ge 40^\circ\text{C}$ (High), $35\text{--}40^\circ\text{C}$ (Moderate).
  - Frost Alert: $T_{min} \le 4^\circ\text{C}$ (High).
  - Heavy Rainfall: Indian Meteorological Department (IMD) standards ($\ge 64.5\text{ mm}$ Heavy, $\ge 115.6\text{ mm}$ Very Heavy).
  - Gale/Wind: Gusts $\ge 40\text{ km/h}$.
- **Water Stress**: Triggered when root-zone depletion crosses $RAW$ thresholds within 48 hours.
- **Soil Chemical Stress**: pH extremes ($< 5.5$ or $> 8.5$), high electrical conductivity, or nutrient deficits.
- **Economic/Market Volatility**: Mandi price drops $> 10\%$ week-on-week or data source outages.

---

## 5. Frontend UI/UX Architecture & Pages Overview

Built according to the **Stitch Design System** (`docs/design/KrishiMitra_Design_System.md`):
- **Visual Identity:** Professional corporate agronomy aesthetic. No folkloric clichés. Calm, high-legibility telemetry.
- **Color Codes:** Deep Forest Canopy (`#114232`), Chlorophyll Green (`#16A34A`), Azure Water (`#0284C7`), Pale Loam Canvas (`#F9FAF6`).
- **Typography:** Manrope (narrative editorial headings) + JetBrains Mono (telemetry, coordinates, and SHAP numbers).

### 5.1 The 10 Primary Application Interfaces:
1. **Dashboard (`Dashboard.tsx`)**: Executive overview with location telemetry, active risk pills, canonical crop recommendation, and quick water balance indicators.
2. **Crop Advisor (`CropAdvisorPage.tsx`)**: Transparent ranking of 12 crops with factor-by-factor breakdown, alongside the independent XGBoost ML prediction and sowing countdowns.
3. **Yield Prediction (`YieldPredictionPage.tsx`)**: Visual production forecasts, SHAP feature attribution waterfall/bar charts, and suitability sensitivity sliders.
4. **Irrigation Advisor (`IrrigationAdvisorPage.tsx`)**: 7-day tabular soil water budget ($ET_0, ET_c, P_{eff}, D_r$), irrigation status badges ("Irrigate Now", "Scheduled", "Optimal"), and water volume calculators ($m^3/\text{ha}$).
5. **Weather Intelligence (`WeatherIntelligencePage.tsx`)**: 7-day meteorology charts, rainfall probabilities, evapotranspiration curves, and IMD storm alerts.
6. **Soil Intelligence (`SoilIntelligencePage.tsx`)**: Pedological profile from HWSD v2.0 (USDA texture, pH, NPK, Organic Carbon, CEC), plus physical amendments (liming/gypsum calculations).
7. **AI Insights (`AIInsightsPage.tsx`)**: Synthesis matrix cross-referencing rule engine vs ML opinions, model confidence scores, and multi-tier hazard alerts.
8. **Farm Profile (`FarmProfilePage.tsx`)**: Interactive Leaflet map coordinate selector, farm area configurator, irrigation type selector, and manual laboratory soil test inputs.
9. **Reports Generator (`ReportsPage.tsx`)**: Client-side document synthesizer generating multi-page PDF agronomic advisory reports with embedded data provenance tables.
10. **Settings & Provenance (`SettingsPage.tsx`)**: Real-time health diagnostic dashboard for all external APIs, showing cache TTL, latency, error status, and raw JSON payload inspection.

---

## 6. Verification & Quality Assurance

- **Unit Test Coverage:** 24 unit tests in `tests/test_core.py` covering:
  - USDA texture classification boundary conditions.
  - Soil chemical amendments rules.
  - FAO-56 water balance math and missing data fallbacks.
  - Indian agricultural seasonal date logic.
  - Mocked memory-mapped HWSD v2.0 raster read and fallback radial search.
  - Market API caching and geocoding.
- **Test Command:**
  ```bash
  pytest -v tests/test_core.py
  ```
- **Frontend Verification:** Full TypeScript compilation and tree-shaken production build:
  ```bash
  cd frontend && npm run build
  ```

---

## 7. Instructions for Claude Pro: Report Generation Guidelines

When compiling this handover document into the final academic/technical report, follow these guidelines:

1. **Section Structure**:
   - **Introduction & Background:** Precision agriculture in India, climate risks, and data fragmentation.
   - **System Requirements & Design:** Functional vs Non-Functional requirements, Stitch design philosophy, and data governance.
   - **System Architecture & Data Engineering:** Detailed explanation of the 7 data streams and the HWSD v2.0 memory-mapped raster engine.
   - **Algorithmic Methodology:** Detailed mathematical formulation of the Agronomic Rules Engine (`KM-Rules 2.1`), FAO-56 Water Balance, and XGBoost dual-model design.
   - **Explainable AI (XAI) Implementation:** Why explainability matters in rural adoption and how SHAP provides feature-level accountability.
   - **Empirical Results & Discussion:** Presentation of the 98.9% accuracy on `crop_xgb`, confusion matrix discussion, and honest evaluation of the 19-row FAOSTAT prototype limitations.
   - **User Interface & Application Modules:** Walkthrough of the 10 interfaces.
   - **Deployment Architecture:** Dual deployment analysis (Vercel + Render vs Hugging Face Docker).
   - **Conclusion & Future Work:** IoT integration, drone spectral imagery (NDVI), and localized LLM speech interfaces.

2. **Tone**: Authoritative, rigorous, scientific, agronomic, and software-architectural. Avoid marketing buzzwords; emphasize explainability, resilience, and data provenance.
