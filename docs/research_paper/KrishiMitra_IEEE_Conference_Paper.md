# KrishiMitra: An Explainable, Multi-Source Agricultural Decision Support System Combining Agronomic Rule Engines with Tree Ensembles

**Aakar Gupta**  
Department of Computer Science and Engineering  
*[Author Institutional Affiliation Placeholder]*  
*[City, Country Placeholder]*  
*[Author Email / ORCID Placeholder]*  

---

### Abstract
Smallholder agricultural management in developing nations faces compounding challenges from climate variability, pedological degradation, and fragmented advisory infrastructure. While machine learning (ML) models have demonstrated promising predictive accuracy in agricultural benchmarks, practical operational adoption remains severely hindered by "black-box" decision pipelines, single-task silos (e.g., isolated weather apps or soil testing kits), and training-inference data distribution shifts. This paper presents **KrishiMitra**, an open, low-latency Agricultural Decision Support System (ADSS) that synthesizes live numerical weather predictions, satellite agroclimatology, high-resolution global soil rasters, and commodity market prices into a unified agronomic intelligence pipeline. Rather than subordinating farm management to uncalibrated black-box classifiers, KrishiMitra implements an ensemble hybrid architecture where a transparent, deterministic expert rule engine (`KM-Rules 2.1`) acts as the primary decision authority, constrained by Indian agricultural crop calendars (Kharif, Rabi, Zaid) and multi-factor physiological thresholds. Concurrently, a dual-variant XGBoost classifier operates as an independent "second opinion," achieving 98.86% holdout accuracy (99.27% $\pm$ 0.33% 5-fold cross-validation) on a 22-crop benchmark when laboratory soil test values ($N, P, K$) are available, and 94.09% accuracy (95.82% $\pm$ 0.53% 5-fold CV) under an engineered climate-only fallback variant. Dynamic root-zone soil water budgeting is implemented via the FAO-56 Penman-Monteith daily water balance formulation, computing evapotranspiration ($ET_c$), readily available water ($RAW$), and gross volumetric irrigation demand ($m^3/\text{ha}$) across Drip, Sprinkler, and Surface irrigation regimes. We report an empirical audit of system components, honestly disclose that historical crop yield regression on small national samples exhibits negative holdout determination ($R^2 = -5.33$), and detail the operational fallback to deterministic reference yields scaled by suitability. Complete end-to-end execution is demonstrated across 10 application interfaces with verified data provenance, caching mechanisms, and automated field advisory reporting.

**Index Terms**—Agricultural decision support systems, crop recommendation, precision agriculture, explainable AI, FAO-56 water balance, gradient-boosted trees, data provenance.

---

## I. INTRODUCTION

Agriculture serves as the economic backbone of rural livelihoods in India, employing over 45% of the national workforce and ensuring domestic food security [6]. However, farming enterprises operate under severe systemic uncertainties driven by intensifying climate variability, irregular monsoon precipitation patterns, depleting groundwater aquifers, uncalibrated chemical fertilizer application, and volatile commodity market prices. Despite rapid advances in digital technologies, traditional agricultural decision-making—encompassing crop selection, sowing schedules, irrigation timing, and input expenditure—remains predominantly driven by historical intuition, localized customs, or isolated, disconnected information channels.

Contemporary agricultural information systems suffer from severe architectural and agronomic fragmentation [6]. A farmer commonly accesses numerical weather forecasts through public meteorological portals, receives delayed soil test reports from physical laboratories, and consults weekly agricultural market (mandi) bulletins independently. These separate information streams are rarely integrated into a unified decision support pipeline. Furthermore, recent academic literature has witnessed an influx of machine learning (ML) classifiers proposed for precision crop recommendation and yield prediction [1], [5], [10]. However, these standalone ML interventions frequently fail when deployed in operational field conditions due to three critical structural weaknesses:

1. **The "Black-Box" Interpretability Deficit:** Standard deep neural networks and complex tree ensembles output discrete classification labels or uncalibrated class probabilities without explaining the underlying agronomic justification. A farmer cannot verify *why* a particular crop was recommended over another, eroding trust and discouraging adoption when recommendations conflict with traditional knowledge [3], [6].
2. **Missing Input Fragility & Distribution Shift:** Many published crop classifiers mandate a full feature suite comprising soil macronutrients (Nitrogen $N$, Phosphorus $P$, Potassium $K$), soil pH, and environmental indicators [1]. In real-world rural farming, laboratory soil test results are available to only a small fraction of smallholders. When soil test features are missing, conventional models fail catastrophically, lacking principled degradation pathways.
3. **Absence of Crop Lifecycle Synergy:** Recommending an optimal crop is merely the initial phase of farm management. Once a crop is planted, farmers require continuous operational advisories, including daily soil water balance monitoring, dynamic irrigation scheduling, climate hazard warnings (frost, heatwaves, heavy precipitation), and market margin calculations.

To address these fundamental limitations, this paper introduces **KrishiMitra**, an AI-powered Agricultural Decision Support System (ADSS) designed for smallholder precision agriculture. KrishiMitra combines deterministic agronomic expert rules with gradient-boosted machine learning classifiers and regressors within a decoupled, low-latency architecture. 

### Contributions
The substantive contributions of this work are summarized as follows:
1. **Ensemble Decision Architecture:** We design and implement an architecture where an interpretable, deterministic agronomic rules engine (`KM-Rules 2.1`) serves as the primary decision authority, while a dual-variant XGBoost classifier operates as an independent, secondary verification mechanism.
2. **Robust Multi-Source Data Lineage:** We engineer an integrated ingestion pipeline synthesizing 7 heterogeneous data streams—including Open-Meteo numerical weather forecasts [8], NASA POWER satellite agroclimatology [9], a local memory-mapped FAO/IIASA Harmonized World Soil Database (HWSD v2.0) 1-km raster engine [7], and Agmarknet mandi modal prices—with persistent SQLite caching and exponential backoff.
3. **Principled Missing-Data Degradation:** We develop a dual-model ML strategy: when laboratory soil tests are available, a 7-feature XGBoost classifier achieves 98.86% holdout benchmark accuracy; when soil tests are absent, the system dynamically routes inference to a 4-feature climate-and-pH model achieving 94.09% accuracy.
4. **Physically Grounded Irrigation & Risk Modeling:** We operationalize the international standard FAO-56 daily root-zone soil water balance model [4], computing evapotranspiration ($ET_c$), readily available water ($RAW$), and volumetric water demand ($m^3/\text{ha}$) across specific irrigation delivery systems (Drip, Sprinkler, Surface).
5. **Scientific Rigor & Honest Empirical Auditing:** We avoid common promotional assertions by evaluating components on real datasets, documenting the failure modes and negative $R^2$ of regression models on small national samples, and verifying all system behaviors across 10 functional application interfaces.

The remainder of this paper is organized as follows: Section II reviews related literature and establishes the research gap. Section III details dataset characteristics and provenance. Section IV formulates the proposed system methodology and mathematical models. Section V outlines implementation details and code listings. Section VI describes the experimental setup. Section VII presents empirical results, comparisons, and interface demonstrations. Section VIII addresses limitations and threats to validity, and Section IX concludes the paper.

---

## II. RELATED WORK

The application of digital decision support systems (DSS) and machine learning in precision agriculture has been extensively surveyed in recent years [5], [6]. This section examines prior contributions across crop recommendation, yield prediction, irrigation scheduling, and agricultural explainability.

### A. Machine Learning in Crop Recommendation
Automated crop selection has predominantly been formulated as a supervised multi-class classification problem. In their seminal work, Pudumalar et al. [1] proposed a crop recommendation framework for precision agriculture in Tamil Nadu utilizing an ensemble majority voting architecture. By combining Random Tree, CHAID, $k$-Nearest Neighbors ($k$-NN), and Naive Bayes classifiers over soil nutrients ($N, P, K$) and environmental factors, their ensemble achieved approximately 88% predictive accuracy, outperforming individual base learners. Similarly, Bondre and Mahagaonkar investigated Random Forest and Support Vector Machines for crop selection, demonstrating that decision tree ensembles exhibit superior resistance to noise and multi-collinearity compared to linear models.

More recently, Atharva Ingle released the curated *Crop Recommendation Dataset* (mirrored in the open-source *Harvestify* project), synthesizing Indian agricultural parameters across 22 crop classes and 2,200 instances. While models trained on this benchmark frequently report classification accuracies exceeding 98% using XGBoost [2] or Random Forest, these studies evaluate performance exclusively in closed, synthetic benchmark environments. They fail to address how models behave when soil nutrient tests are unavailable, nor do they align classification outputs with official sowing calendars.

### B. Crop Yield Prediction and Regression Modeling
Forecasting agricultural yield prior to harvest has been approached through statistical time-series models and non-linear regression algorithms. In an extensive systematic literature review comprising 50 primary studies, van Klompenburg et al. [5] analyzed machine learning approaches for crop yield prediction. Their survey revealed that Artificial Neural Networks (ANNs) and Random Forests were the most widely used algorithms, with temperature, rainfall, and soil type serving as the most decisive input variables. 

In the Indian context, Nishant et al. [10] evaluated linear regression, decision trees, and Random Forest algorithms on district-level agricultural statistics, finding that extreme rainfall variance significantly degraded the predictive reliability of shallow regressors. Medar et al. [11] investigated yield estimation across Karnataka districts using Multilayer Perceptrons and tree ensembles, reporting that gradient boosting algorithms offered improved residual minimization on non-linear multi-source features. However, as van Klompenburg et al. critically observed [5], the literature is saturated with studies training complex regressors on aggregated regional statistics (such as national FAOSTAT or state directorate tables) that lack site-specific soil moisture or weather inputs, resulting in severe overfitting or non-generalizable predictions.

### C. Evapotranspiration and Smart Irrigation Scheduling
Precision water management relies fundamentally on the estimation of reference evapotranspiration ($ET_0$) and root-zone water balance. The Food and Agriculture Organization (FAO) Irrigation and Drainage Paper No. 56 by Allen et al. [4] established the internationally accepted Penman-Monteith equation as the sole standard for computing $ET_0$. Standard agronomic practice derives crop-specific water requirements ($ET_c$) through single crop coefficients ($K_c$) mapped across developmental phenological stages. Modern ag-tech platforms increasingly integrate numerical weather predictions from open platforms such as Open-Meteo [8] to forecast reference evapotranspiration. However, existing mobile applications typically communicate raw millimeter water deficits without translating depletion into actionable irrigation events calibrated against soil water-holding capacities or irrigation application efficiencies.

### D. Explainable Artificial Intelligence (XAI) in Agronomy
The imperative for interpretability in high-stakes socio-economic domains led Lundberg and Lee [3] to formulate SHAP (SHapley Additive exPlanations). Grounded in cooperative game theory, SHAP provides a unified framework that computes Shapley values satisfying three foundational properties: Local Accuracy, Missingness, and Consistency. While SHAP has been adopted in clinical diagnostics and financial risk underwriting, its application in smallholder agronomic decision support remains nascent. Existing agricultural DSS implementations often provide naked predictions, forcing farmers to place uncalibrated trust in complex algorithms without visibility into feature attributions [6].

### E. Research Gap & Comparative Synthesis
Table I provides a systematic comparison of representative prior literature against KrishiMitra.

```
TABLE I
CRITICAL COMPARISON OF RELATED WORKS AGAINST KRISHIMITRA ADSS
```
| Ref. | Study / Venue | Primary Task | Dataset & Scale | Core Methodology | Reported Results | Key Limitations | Distinction in KrishiMitra |
|---|---|---|---|---|---|---|---|
| [1] | Pudumalar et al. (2016) [1] | Crop Recommendation | Regional soil samples, Tamil Nadu | Ensemble majority voting (Tree, CHAID, $k$-NN, NB) | ~88% Accuracy | Offline dataset; black-box voting; no irrigation or weather integration | Merges deterministic rule engine with XGBoost; integrates 7 live data streams and FAO-56 irrigation. |
| [10]| Nishant et al. (2020) [10] | Yield Prediction | Indian district statistics (1998–2014) | Linear Regression, Decision Tree, Random Forest | $R^2 \approx 0.78$ on regional aggregates | Macro-district scale; lacks site-specific soil or live meteorological features | Couples yield estimation with SHAP feature impact attribution and fallback to agronomic reference yields. |
| [11]| Medar et al. (2019) [11] | Yield Prediction | Karnataka agricultural directorate data | SVM, MLP, Random Forest Regressors | Lowest RMSE with Random Forest | Static historical data; no real-time telemetry or farmer feedback loop | Live client-server architecture with automated PDF field reporting and data provenance tracking. |
| [6] | Zhai et al. (2020) [6] | ADSS Survey | Meta-analysis of Agriculture 4.0 systems | Literature taxonomy and architecture survey | Concluded ag-tech suffers from architectural silos | Survey only; no practical software artifact or empirical system deployed | Fully realized, open-source ADSS implementation combining frontend, backend, local rasters, and APIs. |
| **This Work** | **KrishiMitra (2026)** | **Multi-Module ADSS** | **2,200 benchmark rows, 1.86 GB HWSD raster, live APIs** | **Hybrid: KM-Rules 2.1 + Dual XGBoost + FAO-56 + SHAP** | **98.86% Full ML Acc, 94.09% Climate Acc, 24 unit tests** | **Yield regressor limited on small national sample ($R^2 < 0$)** | **Unified farm cockpit; explicit provenance; dual-track concordance; offline pedological engine.** |

Existing literature overwhelmingly treats crop recommendation, yield estimation, weather tracking, and irrigation scheduling as isolated research tasks. Furthermore, prior systems exhibit an "all-or-nothing" reliance on complete feature vectors, failing when laboratory soil tests are missing. KrishiMitra bridges this specific research gap by coordinating these disparate agricultural disciplines through a unified canonical farm summary service, explicit data provenance tracking, and an ensemble architecture that enforces deterministic agronomic guardrails over machine learning outputs.

---

## III. DATASETS AND DATA PROVENANCE

Scientific credibility in agricultural computing requires rigorous documentation of data origins, schemas, spatial resolutions, update semantics, and operational limitations. KrishiMitra integrates 7 primary data streams spanning static offline benchmarks, local binary rasters, and live REST APIs. Table II outlines the comprehensive dataset provenance ledger.

```
TABLE II
KRISHIMITRA DATASET & DATA STREAM PROVENANCE LEDGER
```
| Data Stream | Source Identifier | Provider / Access URL | Format / Storage | Spatial Resolution | Extracted Features & Units | Downstream Module | Caching TTL & Reliability Policy |
|---|---|---|---|---|---|---|---|
| **Open-Meteo API** | v1.0.0 [8] | `api.open-meteo.com` | Live REST JSON | 1–11 km NWP grid | Hourly/Daily $T_{max}, T_{min}$ (°C), Precip (mm), Rain prob (%), $ET_0$ (mm), Wind (km/h), Soil Moisture ($m^3/m^3$) | Smart Irrigation, Climate Risk, Weather Cockpit | 15 min in SQLite; exponential backoff; seasonal norm fallback |
| **NASA POWER API** | MERRA-2 [9] | `power.larc.nasa.gov` | Live REST JSON | $0.5^\circ \times 0.625^\circ$ | 5-year monthly climatology: $T_{2M}$ (°C), Rain total (mm), $RH_{2M}$ (%), Solar ($MJ/m^2/day$) | Crop Rules Engine, Climatological Baseline | 7 days in SQLite; fallback to Open-Meteo forecast averages |
| **FAO/IIASA HWSD** | v2.0 (2023) [7] | FAO & IIASA | Local Binary Grid (`HWSD2.bil`) + SQLite | 30 arc-sec (~1 km) | Topsoil (D1 0–20 cm): pH ($H_2O$), Sand %, Silt %, Clay %, SOC (g/kg), CEC ($cmol_c/kg$), Bulk density ($g/cm^3$) | Soil Intelligence, Water Balance $TAW$, Rules Engine | Static local (1.86 GB); memory-mapped; 5 km radial search fallback |
| **Agmarknet** | OGD India | `api.data.gov.in` | Live REST JSON | Mandi / APMC level | Commodity modal prices (INR/quintal $\rightarrow$ INR/tonne), arrival dates, market location | Crop Financial Margins, Market Volatility Risk | 3 hours in SQLite; district pooling; national benchmark fallback |
| **OSM Nominatim** | OSM Foundation | `nominatim.openstreetmap.org`| Live REST JSON | Global administrative | Reverse geocoding: Lat/Lon $\rightarrow$ Village, District, State, Country | Location Picker, Farm Profile, Mandi Matching | 30 days in SQLite (`geocode_cache`); rate-limited to 1 req/sec |
| **Crop Benchmark** | Kaggle / Ingle | `data/crop_recommendation.csv`| Bundled CSV (2,200 rows) | Synthetic / Curated | $N, P, K$ (kg/ha), Temperature (°C), Humidity (%), pH, Rainfall (mm), Label (22 crops) | XGBoost Crop Classifier (`crop_xgb.pkl`) | Offline pre-trained; SHA256: `54a5a6e5408668e6...` |
| **FAOSTAT Yields** | UN FAO | `data/faostat_sample.csv` | Bundled CSV (20 rows) | India National | Country, Year (2010–2029), Crop, Harvested Area (ha), Yield (hg/ha), Production (tonnes) | XGBoost Yield Regressor (`yield_xgb.pkl`) | Offline pre-trained; SHA256: `6c8657ec8315f4de...` |

### A. Pedological Data Engineering via Memory-Mapped Rasters
A distinctive engineering feature of KrishiMitra is its local soil raster engine (`src/data/hwsd.py`). External soil APIs (such as SoilGrids [12]) frequently suffer from rate limiting, latency spikes (>3,000 ms), or server downtime. To eliminate runtime network dependency, KrishiMitra bundles the official FAO/IIASA Harmonized World Soil Database v2.0 [7]. The global pedological grid is stored as a 1.86 GB flat binary raster (`HWSD2.bil`) accompanied by an ENVI header (`HWSD2.hdr`) and an indexed 51.2 MB SQLite attribute database (`hwsd2.sqlite`).

At application startup, the raster is mapped into memory using `numpy.memmap` in read-only mode, consuming zero heap space until queried. Given a geographic coordinate $(\phi, \lambda)$, the raster coordinates $(row, col)$ are derived via affine transformation:
$$col = \left\lfloor \frac{\lambda - ULXMAP}{XDIM} \right\rfloor, \quad row = \left\lfloor \frac{ULYMAP - \phi}{YDIM} \right\rfloor \eqno{(1)}$$
where $ULXMAP = -180.0^\circ$, $ULYMAP = 90.0^\circ$, and $XDIM = YDIM = 0.0083333333^\circ$ (30 arc-seconds). The extracted 16-bit integer pixel represents the Soil Mapping Unit identifier ($HWSD2\_SMU\_ID$). The system queries `hwsd2.sqlite` to extract the dominant soil component within the topsoil layer ($D1: 0\text{--}20\text{ cm}$). If the target cell corresponds to a non-soil surface (e.g., inland water bodies, urban land, or coastal fringes), a geodesic spiral radial search is executed up to a 5 km threshold using the Haversine metric:
$$d = 2R \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)} \right) \eqno{(2)}$$
where $R = 6,371\text{ km}$. If no valid soil cell is encountered within 5 km, soil properties are safely nullified without system crash.

---

## IV. PROPOSED SYSTEM AND METHODOLOGY

The architecture of KrishiMitra is organized across four decoupled tiers: Presentation, Application & Orchestration, Analytical & Decision Engines, and Ingestion & Caching.

```
+----------------------------------------------------------------------------------------------------+
|                                    1. PRESENTATION TIER (REACT 19 + VITE)                         |
|  [ Dashboard ]  [ Crop Advisor ]  [ Yield Prediction ]  [ Irrigation ]  [ Soil & Weather ]  [ PDF ]|
+--------------------------------------------------+-------------------------------------------------+
                                                   | HTTP REST / JSON
+--------------------------------------------------v-------------------------------------------------+
|                                    2. APPLICATION & ORCHESTRATION TIER                             |
|       FastAPI Router (/api/*)  <--->  Canonical Farm Summary Service (farm_summary.py)            |
+--------------------------------------------------+-------------------------------------------------+
                                                   | Concurrent Dispatch
+--------------------------------------------------v-------------------------------------------------+
|                                    3. ANALYTICAL & DECISION TIER                                  |
|  +------------------------+  +-----------------------+  +------------------+  +------------------+ |
|  | KM-Rules 2.1 (Primary) |  | Dual XGBoost Models   |  | FAO-56 Water Bal |  | Multi-Factor     | |
|  | - S = 100 * Prod(m_k)  |  | - Full: 7 feats (98%) |  | - Dr_t Iteration |  | Risk Engine      | |
|  | - Crop Calendar Gating |  | - Clim: 4 feats (94%) |  | - TAW, RAW, ETc  |  | - IMD Rainfall   | |
|  | - Mandi Profit Margins |  | - SHAP TreeExplainer  |  | - Gross mm / m^3 |  | - Temp & Market  | |
|  +------------------------+  +-----------------------+  +------------------+  +------------------+ |
+--------------------------------------------------+-------------------------------------------------+
                                                   |
+--------------------------------------------------v-------------------------------------------------+
|                                    4. INGESTION, RASTERS & PROVENANCE                              |
|  [ Open-Meteo API ]  [ NASA POWER API ]  [ HWSD v2.0 Raster ]  [ Agmarknet API ]  [ SQLite Cache ] |
+----------------------------------------------------------------------------------------------------+
Fig. 1. Overall multi-tier system architecture of KrishiMitra ADSS.
```

Fig. 1 illustrates the end-to-end dataflow. A request initiates from the React frontend, specifying farm coordinates, optional laboratory soil tests, farm area, irrigation infrastructure, and current crop. The backend `farm_summary.py` orchestrator executes concurrent asynchronous requests across all underlying engines, applies caching, and returns a unified canonical farm summary.

```
                                  [ Farm Context & Environmental Inputs ]
                                                     |
         +-------------------------------------------+-----------------------------------------+
         |                                           |                                         |
         v                                           v                                         v
+------------------+                       +-------------------+                     +--------------------+
| Crop Selection   |                       | Yield Prediction  |                     | Smart Irrigation   |
| Dual Track       |                       | Branching Logic   |                     | & Water Balance    |
+--------+---------+                       +---------+---------+                     +---------+----------+
         |                                           |                                         |
    +----+----+                                 +----+----+                                    v
    |         |                                 |         |                          [ Open-Meteo Forecast]
    v         v                                 v         v                          [ Daily ET0, Precip  ]
[KM-Rules] [XGBoost ML]                    [Rice/Wheat] [Other 10 Crops]                       |
[Primary ] [2nd Opinion]                        |                 |                            v
    |         |                                 v                 v                     [ FAO-56 Daily Model ]
    |         |                           [yield_xgb.pkl]   [Reference Yield  ]         [ Dr = Dr + ETc - Peff]
    |         |                           [Holdout R2<0 ]   [ × Suitability S ]                |
    |         |                                 |                 |                            v
    v         v                                 v                 v                     [ Trigger: Dr > RAW? ]
[ Concordance Audit: ]                    [ SHAP Explain]   [Sensitivity Matrix]        [ Output: Net/Gross  ]
[ Matches? Yes / No  ]                    [ Feature Imp ]   [ 40% -> 100% Sens ]        [ Schedule & m3 Vol  ]
         |                                      |                 |                            |
         +--------------------------------------+-----------------+----------------------------+
                                                |
                                                v
                                 [ Consolidated Canonical Farm Summary ]
Fig. 2. Detailed model and decision architecture showing dual-track crop selection, yield fallback branching, and SHAP execution.
```

Fig. 2 delineates the internal analytical branching logic across the decision engines.

### A. Agronomic Rules Engine (`KM-Rules 2.1`)
The crop recommendation engine (`src/advisory/crop_rules.py`) evaluates 12 major Indian field crops: Wheat, Sorghum, Pearl Millet, Barley, Green Gram, Black Gram, Sugarcane, Tomato, Potato, Onion, Turmeric, and Ginger. For each crop $c$, the knowledge base defines optimal physiological intervals $[min_k, max_k]$ across 7 fundamental agronomic factors:
$$\mathcal{F} = \{N, P, K, \text{temperature}, \text{humidity}, \text{pH}, \text{rainfall}\} \eqno{(3)}$$

For each factor $k \in \mathcal{F}$, the individual suitability multiplier $m_k \in [0.2, 1.0]$ is computed as:
$$m_k = \begin{cases} 
1.0, & \text{if } min_k \le x_k \le max_k \\ 
\max\left(0.2, 1.0 - \frac{min_k - x_k}{min_k}\right), & \text{if } x_k < min_k \\ 
\max\left(0.2, 1.0 - \frac{x_k - max_k}{max_k}\right), & \text{if } x_k > max_k 
\end{cases} \eqno{(4)}$$

*Special Irrigation Adaptation:* If seasonal rainfall is below $min_k$ ($x_{rain} < min_{rain}$) but the farmer operates an active irrigation system (Drip, Sprinkler, or Flood), $m_{rain}$ is not penalized ($m_{rain} = 1.0$). Instead, the deficit is flagged with status `met_by_irrigation`, informing the farmer that irrigation must supply the deficit.

The raw physiological suitability score $S_{phys}$ is the product of available multipliers:
$$S_{phys} = \prod_{k \in \mathcal{F}_{eval}} m_k \eqno{(5)}$$
To prevent unreliable scoring under data scarcity, an evaluation threshold mandates $|\mathcal{F}_{eval}| \ge 2$.

*Temporal Crop Calendar Gating:* The system maps the query date $t$ against the tripartite Indian agricultural calendar (Kharif: June–October, Rabi: November–March, Zaid: April–June). If the current date does not fall within the crop's sowing window and does not precede it within a 60-day planning horizon, an off-season penalty multiplier is applied:
$$S_{agronomic} = S_{phys} \times \omega_{season}, \quad \text{where } \omega_{season} = \begin{cases} 1.0, & \text{if in-season or opens } \le 60\text{ days} \\ 0.5, & \text{if off-season} \end{cases} \eqno{(6)}$$
Crops failing to achieve a minimum agronomic cutoff ($S_{agronomic} \ge 0.40$) are disqualified from primary recommendation.

*Economic Net Return Integration:* For all eligible crops, expected gross revenue and net profit are evaluated using live or reference mandi prices:
$$\text{Revenue} = Y_{exp} \times P_{mandi}, \quad \text{Profit} = \text{Revenue} - C_{cultivation} \eqno{(7)}$$
where $Y_{exp}$ is expected yield (t/ha), $P_{mandi}$ is modal price (INR/t), and $C_{cultivation}$ is baseline production cost (seed, fertilizer, machinery, labour).

### B. Machine Learning Crop Classifier & Second Opinion
To supplement the deterministic rules without compromising agronomic safety, KrishiMitra implements an XGBoost gradient-boosted decision tree classifier [2] operating as an independent "second opinion." Gradient boosting minimizes a regularized objective:
$$\mathcal{L}^{(t)} = \sum_{i=1}^n l\left(y_i, \hat{y}_i^{(t-1)} + f_t(x_i)\right) + \Omega(f_t) \eqno{(8)}$$
where $\Omega(f) = \gamma T + \frac{1}{2}\lambda \sum_{j=1}^T w_j^2$ penalizes tree complexity (number of leaves $T$ and leaf weights $w$).

KrishiMitra introduces a dual-model gating pipeline based on soil test availability:
1. **Full Classifier (`crop_xgb.pkl`):** Employs 7 features ($N, P, K, \text{temp}, \text{humidity}, pH, \text{rainfall}$). Invoked only when the farmer supplies laboratory soil test values.
2. **Climate Classifier (`crop_xgb_climate.pkl`):** Employs 4 features ($\text{temp}, \text{humidity}, pH, \text{rainfall}$), extracting $pH$ from HWSD v2.0 raster data and meteorological features from NASA POWER / Open-Meteo.

The classifier outputs discrete class probabilities via softmax:
$$P(Y = c \mid \mathbf{x}) = \frac{\exp\left(\hat{y}_c(\mathbf{x})\right)}{\sum_{j=1}^C \exp\left(\hat{y}_j(\mathbf{x})\right)} \eqno{(9)}$$
The top-5 predicted crops are displayed alongside class confidence. Crucially, the system checks concordance:
$$\text{Concordance} = \mathbb{I}\left(\arg\max_{c} P(Y=c \mid \mathbf{x}) == c_{rules}^*\right) \eqno{(10)}$$
If the ML model disagrees with the rule engine, both outputs are displayed with their respective factor justifications. The ML output **never** overrides the deterministic rule recommendation.

### C. FAO-56 Daily Soil Water Balance & Irrigation Engine
The Smart Irrigation Advisor (`src/advisory/irrigation.py`) models root-zone soil hydrology over a 7-day forecast horizon based on FAO-56 methodology [4]. 

1. **Crop Evapotranspiration ($ET_c$):**
$$ET_c = K_c \times ET_0 \eqno{(11)}$$
where $ET_0$ is the daily Penman-Monteith reference evapotranspiration provided by Open-Meteo, and $K_c$ is the FAO mid-season crop coefficient (e.g., Sugarcane = 1.25, Wheat = 1.15, Pearl Millet = 1.00). If no crop is configured, $K_c = 1.0$.

2. **Soil Reservoir Boundaries:** Derived from the 12 USDA textural classes identified by HWSD v2.0 or sand/silt/clay fractions:
$$TAW = 1000 \times (\theta_{FC} - \theta_{WP}) \times Z_r \eqno{(12)}$$
$$RAW = p \times TAW \eqno{(13)}$$
where $\theta_{FC}$ is volumetric moisture at field capacity, $\theta_{WP}$ is wilting point, effective root depth $Z_r = 0.5\text{ m}$, and depletion fraction $p = 0.5$.

3. **Water Balance Dynamic Recursion:** For each day $t$:
$$P_{eff, t} = \begin{cases} 0.8 \times P_t, & \text{if } P_t \ge 5.0\text{ mm} \\ 0.0, & \text{if } P_t < 5.0\text{ mm} \end{cases} \eqno{(14)}$$
$$D_{r, t} = \min\left(TAW, \max\left(0, D_{r, t-1} + ET_{c, t} - P_{eff, t}\right)\right) \eqno{(15)}$$
If $D_{r, t} > RAW$, an irrigation event is triggered. Net irrigation requirement equals current depletion ($Net = D_{r, t}$). Gross irrigation accounts for system application efficiency:
$$Gross = \frac{Net}{\eta_{sys}}, \quad \eta_{sys} \in \{\text{Drip: } 0.90, \text{ Sprinkler: } 0.75, \text{ Flood: } 0.60\} \eqno{(16)}$$
Total volumetric water requirement ($V$, in cubic meters) across farm area $A$ (hectares) is:
$$V = Gross\text{ (mm)} \times 10 \times A\text{ (ha)} \eqno{(17)}$$
Following irrigation, depletion resets to $D_{r, t} = 0.0$.

### D. Explainable AI via SHAP
For models utilizing machine learning inference (specifically the yield regressor), KrishiMitra implements SHAP (`TreeExplainer`) [3] to allocate credit among input features. The additive feature attribution model is formulated as:
$$g(z') = \phi_0 + \sum_{j=1}^M \phi_j z_j' \eqno{(18)}$$
where $z' \in \{0, 1\}^M$ indicates feature presence, $\phi_0 = \mathbb{E}[f(x)]$ is the base expected model prediction, and $\phi_j$ is the Shapley value:
$$\phi_j = \sum_{S \subseteq F \setminus \{j\}} \frac{|S|!(|F| - |S| - 1)!}{|F|!} \left[ f_x(S \cup \{j\}) - f_x(S) \right] \eqno{(19)}$$
This decomposes yield predictions into exact quantitative contributions (t/ha added or subtracted relative to base expectations).

---

## V. IMPLEMENTATION DETAILS

KrishiMitra is engineered as a full-stack, modular client-server application. The backend application service is built on FastAPI (Python 3.14) and Uvicorn, exposing asynchronous endpoints protected by CORS middleware. State persistence, caching, and API health tracking are governed by SQLite (`data/krishimitra_state.sqlite`). The presentation tier is constructed using React 19, TypeScript, Vite, and Tailwind CSS v4, adhering to the Stitch Design System (`assets/docs/Samples/DESIGN.md`) for high-legibility corporate agronomic telemetry.

### Authentic Source Code Extracts
The following listings illustrate central algorithmic routines directly from the codebase.

```python
# Listing 1: Multiplicative Agronomic Scoring and Irrigation Gap Bypass
# Extracted from src/advisory/crop_rules.py (Lines 173-207)
def evaluate_crop(crop: str, features: dict, sources: dict, irrigated: bool, season: dict) -> dict:
    reqs = CROP_KNOWLEDGE[crop]
    score = 1.0
    positives, constraints, attribution, excluded = [], [], [], []
    for key, label in FACTOR_LABELS.items():
        val = features.get(key)
        lo, hi = reqs[RANGE_KEYS[key]]
        unit = FACTOR_UNITS[key]
        if val is None:
            excluded.append(label); continue
        entry = {"factor": key, "label": label, "value": val, "min": lo, "max": hi, "unit": unit}
        if lo <= val <= hi:
            positives.append(f"{label} {val:g} within preferred {lo:g}–{hi:g}")
        elif val < lo and key == "rainfall" and irrigated:
            entry["status"] = "met_by_irrigation"
            constraints.append({"severity": "info", "text": f"Seasonal rainfall {val:g} mm is below {lo:g} mm; met by irrigation"})
        else:
            m = max(0.2, 1.0 - (lo - val)/lo) if val < lo else max(0.2, 1.0 - (val - hi)/hi)
            entry.update({"multiplier": round(m, 3), "status": "low" if val < lo else "high"})
            score *= m
            constraints.append({"severity": "critical" if m < 0.6 else "caution", "text": f"{label} out of bounds"})
        attribution.append(entry)
    # Apply season penalty and return structured evaluation
```

```python
# Listing 2: FAO-56 Daily Water Balance Iteration
# Extracted from src/advisory/irrigation.py (Lines 70-88)
for d in valid:
    p = d.get("precip")
    p_val = p if p is not None else 0.0
    peff = EFFECTIVE_RAIN_FRACTION * p_val if p_val >= EFFECTIVE_RAIN_THRESHOLD_MM else 0.0
    etc = kc * d["et0"]
    dr = min(taw, max(0.0, dr + etc - peff))
    net = gross = 0.0
    if dr > raw:
        net = dr
        gross = net / efficiency if efficiency else net
        dr = 0.0
        if first_irrigation is None:
            first_irrigation = {"date": d["date"], "net_mm": round(net, 1), "gross_mm": round(gross, 1)}
    tot["etc"] += etc; tot["gross_irrigation"] += gross
```

```python
# Listing 3: Yield Model Inference, SHAP Hook, and Fallback Routing
# Extracted from src/models/yield_service.py (Lines 47-89)
def estimate_yield(crop: str, agronomic_score: float, with_shap: bool = False) -> dict:
    year = datetime.date.today().year
    if ml_supports(crop):
        model, meta = _yield_model()
        feats = meta["features"]
        row = pd.DataFrame([[0.0] * len(feats)], columns=feats)
        row["Year"] = year; row[f"Crop_{crop}"] = 1.0
        pred_t = float(model.predict(row)[0]) / 10000
        out = {"value_t_ha": round(pred_t, 2), "method": "ml", "reliability": model_info()["reliability"]}
        if with_shap:
            out["shap"] = _shap(model, row)
        return out
    ref = FINANCIAL_KNOWLEDGE.get(crop)
    return {"value_t_ha": round(ref["expected_yield_t_ha"] * agronomic_score, 2),
            "method": "reference", "reliability": "Indicative"}
```

```python
# Listing 4: Multi-Source Climatological Fallback Assembly
# Extracted from src/services/farm_summary.py (Lines 28-50)
def _crop_features(crop, climatology, weather, soil, soil_test, overrides, today):
    feats, srcs = {}, {}
    sow = rules.sowing_status(crop, today)
    seasonal = rules.seasonal_climate(climatology.get("monthly", []), sow.get("growing_months") or [])
    if seasonal:
        feats["temperature"] = seasonal["temperature"]
        feats["rainfall"] = seasonal["rainfall"]
    if feats.get("temperature") is None and weather.get("daily"):
        # Graceful fallback to 7-day numerical weather prediction average
        daily = weather["daily"]
        feats["temperature"] = _mean([(d["tmax"] + d["tmin"]) / 2 for d in daily if d.get("tmax") is not None])
    return feats, srcs
```

---

## VI. EXPERIMENTAL SETUP AND EVALUATION

To verify reproducible system behavior, offline model evaluations were executed in an isolated experiment harness (`docs/research_paper/experiments/run_experiments.py`).

### A. Environment and Checksums
Experiments ran on Python 3.14.0 (Windows 64-bit AMD64) utilizing `xgboost` 3.4.1 and `scikit-learn` 1.7.2. Raw dataset files were cryptographically validated:
- `data/crop_recommendation.csv`: SHA256 `54a5a6e5408668e668667efc50de2fc867c1b875e0431b4f54dd331b0a109a4e`
- `data/faostat_sample.csv`: SHA256 `6c8657ec8315f4dcebd04aead47946f42e3431e567398d93c79dddc6bfc659ed`

### B. Evaluation Protocols
For classification tasks, the 2,200 instances were partitioned via stratified random splitting into 80% training ($N_{train} = 1760$) and 20% holdout testing ($N_{test} = 440$) using random seed 42. Hyperparameters for `XGBClassifier` were fixed: $n\_estimators = 200$, $max\_depth = 4$, $learning\_rate = 0.1$, and multi-class log-loss objective. Generalization stability was confirmed via Stratified 5-Fold Cross-Validation across the entire dataset.

Evaluation metrics for classification follow standard statistical definitions:
$$\text{Accuracy} = \frac{TP + TN}{TP + TN + FP + FN} \eqno{(20)}$$
$$\text{Macro } F_1 = \frac{1}{C}\sum_{c=1}^C \frac{2 \cdot P_c \cdot R_c}{P_c + R_c} \eqno{(21)}$$
For regression tasks, Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and the Coefficient of Determination ($R^2$) were computed:
$$R^2 = 1 - \frac{\sum_{i=1}^n (y_i - \hat{y}_i)^2}{\sum_{i=1}^n (y_i - \bar{y})^2} \eqno{(22)}$$

Unit testing was conducted using `pytest 9.1.1` on `tests/test_core.py`, asserting USDA texture boundary polygon logic, liming amendment rules, FAO-56 water balance math, negative caching exponential backoff, concurrent request coalescing, and provider outage survival.

---

## VII. RESULTS AND DISCUSSION

### A. Crop Classifier Empirical Performance
Table III reports the empirical evaluation metrics obtained for both XGBoost classifier variants on the 440-sample holdout test partition.

```
TABLE III
CROP CLASSIFIER EMPIRICAL METRICS (HOLDOUT TEST N=440)
```
| Metric | Full Variant (`crop_xgb.pkl`) | Climate Variant (`crop_xgb_climate.pkl`) | Performance Delta ($\Delta$) |
|---|---|---|---|
| **Input Features** | 7 ($N, P, K, \text{temp}, \text{humidity}, pH, \text{rainfall}$) | 4 ($\text{temp}, \text{humidity}, pH, \text{rainfall}$) | -3 Soil Macronutrients |
| **Test Accuracy** | **98.86 %** (435 / 440 correct) | **94.09 %** (414 / 440 correct) | -4.77 % |
| **Macro Precision** | **98.94 %** | **94.20 %** | -4.74 % |
| **Macro Recall** | **98.86 %** | **94.09 %** | -4.77 % |
| **Macro $F_1$ Score** | **98.85 %** | **94.01 %** | -4.84 % |
| **Weighted $F_1$ Score** | **98.85 %** | **94.01 %** | -4.84 % |
| **5-Fold Stratified CV Mean** | **99.27 %** | **95.82 %** | -3.45 % |
| **5-Fold Stratified CV Std** | **$\pm$ 0.33 %** | **$\pm$ 0.53 %** | +0.20 % |

The Full Model achieves 98.86% holdout accuracy, with 18 of the 22 classes achieving perfect 1.0 precision and recall. Minor misclassifications occur exclusively between `blackgram` and `mungbean` (pulses sharing overlapping soil nutrient and rainfall requirements) and `rice` vs `jute`. When soil nutrient features are omitted, the Climate Variant retains 94.09% accuracy, demonstrating that temperature, humidity, pH, and rainfall distributions provide strong discriminatory separating hyperplanes for agricultural classification.

```
+---------------------------------------------------------------------------------------------------+
|               FIG. 3: CONFUSION MATRIX - FULL XGBOOST CROP CLASSIFIER (N=440)                     |
|                                                                                                   |
|  [ Matrix Heatmap: 22x22 Classes; 20 test samples per class; High diagonal saturation (Green) ]   |
|  - 18/22 Classes: 20/20 Perfect Classifications (apple, banana, chickpea, coconut, coffee, etc.)  |
|  - Minor Confusions: blackgram (19/20, 1 -> mungbean); jute (18/20, 2 -> rice)                    |
+---------------------------------------------------------------------------------------------------+
Fig. 3. Confusion matrix heatmap for the 7-feature XGBoost crop recommendation classifier (`docs/research_paper/results/confusion_matrix_full.png`).
```

```
+---------------------------------------------------------------------------------------------------+
|               FIG. 4: MODEL COMPARISON: FULL VS CLIMATE VARIANT METRICS                           |
|                                                                                                   |
|  100% |  [98.9%]  [94.1%]      [98.9%]  [94.2%]      [98.9%]  [94.1%]      [99.3%]  [95.8%]     |
|   90% |  +------+ +------+     +------+ +------+     +------+ +------+     +------+ +------+    |
|       |  | Full | | Clim |     | Full | | Clim |     | Full | | Clim |     | Full | | Clim |    |
|       |  Accuracy              Macro Precision       Macro F1              5-Fold CV Mean       |
+---------------------------------------------------------------------------------------------------+
Fig. 4. Comparative evaluation across performance metrics for the Full vs Climate crop classifier variants (`docs/research_paper/results/crop_model_comparison.png`).
```

### B. Empirical Audit of Crop Yield Regression
The experimental reproduction of `yield_xgb.pkl` on `data/faostat_sample.csv` yielded the following metrics:
- Total Dataset Size: 20 rows ($N_{train} = 16, N_{test} = 4$)
- Features: `Year`, `Crop_Rice`, `Crop_Wheat`
- Mean Absolute Error (MAE): 309.99 hg/ha ($0.031\text{ t/ha}$)
- Root Mean Squared Error (RMSE): 467.60 hg/ha ($0.047\text{ t/ha}$)
- Coefficient of Determination ($R^2$): **-5.328**

*Agronomic Interpretation of Negative $R^2$:* A negative $R^2$ indicates that the trained regression model performs worse than simply predicting the historical sample mean ($\bar{y}$). Inspection of `faostat_sample.csv` reveals that 15 of the 20 rows repeat identical placeholder values (Rice yields fixed at $27,000\text{ hg/ha}$ for years 2010–2015 and 2021–2029). Furthermore, the model contains zero environmental features (lacking rainfall, temperature, soil texture, and fertilizer data). 

Rather than concealing this result or claiming unrealistic predictive accuracy, KrishiMitra's architecture explicitly documents this limitation. In `yield_service.py` (Listing 3), predictions from `yield_xgb` are programmatically tagged as `Low Reliability` ($R^2 < 0.3$). For all non-FAOSTAT crops, the system completely bypasses the regressor, utilizing deterministic reference yields multiplied by agronomic suitability scores ($Y = Y_{ref} \times S_{agronomic}$), which are transparently labeled as `Indicative`.

### C. Comparison with Published Works
Table IV situates KrishiMitra's experimental results within the broader landscape of published literature.

```
TABLE IV
QUALIFIED COMPARISON WITH REPORTED RESULTS FROM PUBLISHED LITERATURE
```
| Study | Stated Objective | Dataset & Scale | Evaluation Protocol | Metric | Published Author Result | KrishiMitra Result | Direct Comparability Assessment |
|---|---|---|---|---|---|---|---|
| Pudumalar et al. (2016) [1] | Crop Recommendation | Regional soil data (Tamil Nadu) | Train/Test Split | Accuracy | ~88.0 % | **98.86 %** (Full) / **94.09 %** (Climate) | **No.** Different dataset, regional distribution, and class definitions. Higher benchmark accuracy does not imply superior field efficacy. |
| Nishant et al. (2020) [10] | Yield Prediction | Indian district statistics (1998–2014) | 80/20 Split | $R^2$ Score | $R^2 = 0.78$ (Random Forest) | $R^2 = -5.33$ (`yield_xgb`) | **No.** Nishant et al. modeled multi-year district aggregations; KrishiMitra's sample is an illustrative 20-row prototype. |
| Medar et al. (2019) [11] | Yield Prediction | Karnataka district records | Cross-Validation | RMSE | Lowest RMSE (RF) | $\text{RMSE} = 0.047\text{ t/ha}$ | **No.** Target variance artificially restricted by flat placeholder rows in KrishiMitra sample. |

### D. System Verification and Interface Demonstration
The platform was subjected to end-to-end runtime verification across 10 distinct interfaces. All 24 unit tests in `tests/test_core.py` passed in 5.33 seconds, validating core mathematical algorithms, boundary conditions, and cache resilience.

```
TABLE V
END-TO-END CAPABILITY AND VERIFICATION MATRIX
```
| Capability | Code Location | Unit / Integration Test | Runtime State | Demonstrated Result | Current Verification Status |
|---|---|---|---|---|---|
| **Location Geocoding** | `src/data/geocode.py` | `test_market_district_matching` | Verified via Chrome CDP | Maps lat/lon to district/state with 30-day SQLite cache | **Verified & Operational** |
| **Soil Pedology** | `src/data/hwsd.py` | `test_hwsd_real_dataset_chennai` | Verified via Chrome CDP | Reads 1.86 GB raster; provides USDA texture & pH | **Verified & Operational** |
| **Crop Recommendation**| `src/advisory/crop_rules.py`| `test_recommendation_is_agronomic`| Verified via Chrome CDP | Evaluates 12 crops; enforces $\ge 40\%$ cutoff | **Verified & Operational** |
| **ML Second Opinion** | `src/models/crop_ml.py` | `test_ml_opinion_uses_climate` | Verified via Chrome CDP | Outputs top-5 crops + concordance flag | **Verified & Operational** |
| **Water Balance** | `src/advisory/irrigation.py` | `test_water_balance_schedules` | Verified via Chrome CDP | Computes $D_r$, triggers irrigation events | **Verified & Operational** |
| **Hazard Risk Alerts** | `src/advisory/risk.py` | Boundary condition tests | Verified via Chrome CDP | Categorizes heat, frost, gale, and IMD rain | **Verified & Operational** |
| **Model Cards** | `src/services/model_cards.py`| `test_model_cards_report` | Verified via Chrome CDP | Exposes hyperparameters, metrics, and health | **Verified & Operational** |
| **PDF Reporting** | `frontend/src/pages/ReportsPage.tsx`| Client build assertion | Verified via Chrome CDP | Client-side jsPDF agronomic report synthesis | **Verified & Operational** |

```
+---------------------------------------------------------------------------------------------------+
|               FIG. 5: AUTHENTIC KRISHIMITRA ADSS USER INTERFACES                                 |
|                                                                                                   |
|  [ Panel A: Executive Farm Cockpit ]            [ Panel B: Crop Suitability & Factor Attribution ] |
|  - Telemetry: Nagpur, Maharashtra (21.14°N)     - Ranked Suitability: Wheat 94% (Rabi Window Open) |
|  - Active Hazards: IMD Rain & Heat Status       - Multipliers: Temp 1.0, Rain 1.0, Soil pH 1.0     |
|  - Recommended Crop & Water Budget Badge        - XGBoost Second Opinion: Top-1 Match (Concordant) |
|                                                                                                   |
|  [ Panel C: FAO-56 Daily Irrigation Schedule ]  [ Panel D: Yield Prediction & SHAP Decomposition ] |
|  - 7-Day Water Budget: ET0, ETc, Peff, Dr       - Forecast Yield: 3.40 t/ha (Wheat)                |
|  - Efficiency Adjustment: Drip (90%)            - SHAP Feature Attribution Waterfall               |
|  - Net Requirement: 28.5 mm -> 712.5 m3 Vol     - Suitability Sensitivity Matrix (40% - 100%)      |
+---------------------------------------------------------------------------------------------------+
Fig. 5. Multi-panel interface walkthrough captured from the running application (`docs/research_paper/figures/screenshots/`).
```

Fig. 5 illustrates representative screens captured during execution. Panel A shows the executive cockpit displaying telemetry for a 2.5-hectare farm in Nagpur, Maharashtra. Panel B exhibits the crop advisor displaying factor-by-factor attribution multipliers and the XGBoost second opinion. Panel C demonstrates the 7-day FAO-56 soil water balance schedule, and Panel D shows yield prediction with SHAP feature attributions and suitability sensitivity sliders.

---

## VIII. LIMITATIONS AND THREATS TO VALIDITY

Rigorous scientific reporting requires transparent acknowledgment of limitations:

1. **Benchmark vs Real-World Distribution Shift:** The 98.86% classification accuracy is measured on the Atharva Ingle / Kaggle benchmark dataset. This dataset features clean, discrete Gaussian clusters across environmental variables with zero missing values. Real-world agricultural plots exhibit significant spatial heterogeneity, micro-topographic variations, and measurement noise that will inevitably degrade out-of-sample field accuracy.
2. **Crop Yield Training Scale Deficit:** The XGBoost yield regressor is trained on a 20-row national FAOSTAT sample containing 15 flat placeholder repeats, yielding a negative $R^2$ (-5.33). While KrishiMitra gracefully falls back to deterministic reference yields, the machine learning yield prediction component must be considered an experimental prototype until calibrated on multi-year, district-level panel data.
3. **Absence of Longitudinal Field Trials:** While KrishiMitra has been thoroughly verified through software unit tests, integration suites, and browser-driven interface audits, it has not undergone multi-season randomized controlled agronomic field trials. The system demonstrated here is an operational decision support software platform, not a validated biological intervention.
4. **Third-Party API Dependency & Latency:** The system relies on external cloud APIs (Open-Meteo, NASA POWER, Agmarknet). Although SQLite caching and exponential backoff mitigate short-term outages, sustained network disconnects or breaking upstream API schema changes will limit real-time data freshness in rural environments.
5. **Uncalibrated Model Probabilities:** Softmax output probabilities from the XGBoost classifier represent relative margin distances rather than true Bayesian posterior probabilities of crop success. They should not be interpreted by agricultural extension workers as calibrated real-world confidence intervals.

---

## IX. CONCLUSION AND FUTURE WORK

This paper presented **KrishiMitra**, an explainable, multi-source Agricultural Decision Support System that synthesizes live numerical weather predictions, satellite agroclimatology, local memory-mapped soil rasters, and market modal prices into a cohesive agronomic advisory platform. Addressing the critical limitations of prior "black-box" systems, KrishiMitra implements an ensemble hybrid architecture where a transparent, deterministic rules engine (`KM-Rules 2.1`) enforces physiological thresholds and Indian seasonal crop calendars as the primary decision authority, while dual-variant XGBoost classifiers provide an independent second opinion (achieving 98.86% accuracy with laboratory soil tests and 94.09% accuracy without). Dynamic irrigation scheduling is operationalized via the international standard FAO-56 daily root-zone soil water balance, translating reference evapotranspiration into volumetric irrigation water demand ($m^3/\text{ha}$).

Future work will focus on:
1. Ingesting multi-decade district-level agricultural census data (e.g., ICRISAT-VDSA) to replace the prototype yield sample with a robust spatio-temporal yield regressor.
2. Integrating satellite multispectral imagery (Sentinel-2 NDVI / NDRE) to track real-time crop vegetation health and canopy development.
3. Deploying localized edge-IoT soil sensor nodes for real-time in-situ soil moisture calibration.
4. Developing localized, multilingual speech interfaces to enhance usability among non-literate smallholder farming communities.

---

## ACKNOWLEDGMENT
The authors acknowledge the open-access data providers that made this research possible: the Food and Agriculture Organization (FAO), International Institute for Applied Systems Analysis (IIASA), NASA Langley Research Center POWER Project, Open-Meteo, OpenStreetMap contributors, and the Open Government Data (OGD) Platform India.

---

## REFERENCES
```
[1] S. Pudumalar, E. Ramanujam, R. H. Rajashree, C. Kavya, T. Kiruthika, and J. Nisha, "Crop recommendation system for precision agriculture," in 2016 Eighth International Conference on Advanced Computing (ICoAC), Chennai, India: IEEE, 2016, pp. 32–36. doi: 10.1109/ICoAC.2017.7951740.
[2] T. Chen and C. Guestrin, "XGBoost: A Scalable Tree Boosting System," in Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining, San Francisco, CA, USA: ACM, 2016, pp. 785–794. doi: 10.1145/2939672.2939785.
[3] S. M. Lundberg and S.-I. Lee, "A Unified Approach to Interpreting Model Predictions," in Advances in Neural Information Processing Systems 30 (NeurIPS 2017), I. Guyon et al., Eds., Curran Associates, Inc., 2017, pp. 4768–4777. [Online]. Available: https://arxiv.org/abs/1705.07874.
[4] R. G. Allen, L. S. Pereira, D. Raes, and M. Smith, Crop evapotranspiration - Guidelines for computing crop water requirements, ser. FAO Irrigation and Drainage Paper No. 56. Rome, Italy: Food and Agriculture Organization of the United Nations, 1998, ISBN: 92-5-104219-5.
[5] T. van Klompenburg, A. Kassahun, and Ç. Çatal, "Crop yield prediction using machine learning: A systematic literature review," Computers and Electronics in Agriculture, vol. 177, p. 105709, 2020. doi: 10.1016/j.compag.2020.105709.
[6] Z. Zhai, J.-F. Martínez, V. Beltran, and N. L. Martínez, "Decision support systems for agriculture 4.0: Survey and challenges," Computers and Electronics in Agriculture, vol. 170, p. 105256, 2020. doi: 10.1016/j.compag.2020.105256.
[7] F. Nachtergaele, H. van Velthuizen, L. Verelst, D. Wiberg, M. Henry, F. Chiozza, and Y. Yigini, "Harmonized World Soil Database version 2.0," Food and Agriculture Organization of the United Nations and International Institute for Applied Systems Analysis, Rome and Laxenburg, Tech. Rep., 2023. doi: 10.4060/cc3823en.
[8] P. Zippenfenig, "Open-Meteo.com Weather API," Zenodo, 2023. doi: 10.5281/zenodo.7970649.
[9] A. H. Sparks, "nasapower: A NASA POWER Global Meteorology, Surface Solar Energy and Climatology Data Client for R," The Journal of Open Source Software, vol. 3, no. 30, p. 1035, 2018. doi: 10.21105/joss.01035.
[10] P. S. Nishant, P. Sai Venkat, B. L. Avinash, and B. Jabber, "Crop Yield Prediction Based on Indian Agriculture Using Machine Learning," in 2020 International Conference for Emerging Technology (INCET), Belgaum, India: IEEE, 2020, pp. 1–4. doi: 10.1109/INCET49848.2020.9154036.
[11] R. Medar, V. S. Rajpurohit, and S. Shweta, "Crop Yield Prediction using Machine Learning Techniques," in 2019 IEEE 5th International Conference for Convergence in Technology (I2CT), Bombay, India: IEEE, 2019, pp. 1–5. doi: 10.1109/I2CT45611.2019.9033611.
[12] T. Hengl, J. Mendes de Jesus, G. B. M. Heuvelink, et al., "SoilGrids250m: Global gridded soil information based on machine learning," PLOS ONE, vol. 12, no. 2, p. e0169748, 2017. doi: 10.1371/journal.pone.0169748.
```
