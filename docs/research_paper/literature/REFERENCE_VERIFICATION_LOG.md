# KrishiMitra-ADSS: Reference Verification Log

This log records the independent bibliographic verification of all 16 cited primary scholarly works against publisher metadata, Crossref registries, and institutional repositories.

---

### [1] Pudumalar et al. (2016)
- **Title:** Crop recommendation system for precision agriculture
- **Authors:** S. Pudumalar, E. Ramanujam, R. Harine Rajashree, C. Kavya, T. Kiruthika, J. Nisha
- **Venue:** *2016 Eighth International Conference on Advanced Computing (ICoAC)*, Chennai, India
- **Publisher:** IEEE
- **Pages:** 32–36
- **Publication Date:** 14–16 December 2016
- **DOI:** `10.1109/ICoAC.2017.7951740`
- **Verification Status:** **PASS** (Verified via IEEE Xplore / Crossref)
- **Dataset / Context:** Soil and environmental dataset from Tamil Nadu, India (soil type, pH, nitrogen, phosphorus, potassium, rainfall).
- **Core Methodology:** Majority voting ensemble combining Random Tree, CHAID (Chi-squared Automatic Interaction Detection), $k$-Nearest Neighbors ($k$-NN), and Naive Bayes classifiers.
- **Reported Results:** Ensemble classifier achieved approximately 88% overall accuracy, demonstrating that combining tree structures with instance-based learners outperforms standalone classifiers on agricultural datasets.
- **Limitations:** Closed offline dataset; lacks weather forecast integration or dynamic irrigation models; majority voting is uncalibrated and does not provide feature-level rationales.
- **Relevance:** Foundational multi-factor crop recommendation baseline for Indian agriculture; adapted in KrishiMitra by coupling rule-based physiological intervals with gradient boosting.

---

### [2] Chen & Guestrin (2016)
- **Title:** XGBoost: A Scalable Tree Boosting System
- **Authors:** Tianqi Chen, Carlos Guestrin
- **Venue:** *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining*
- **Publisher:** ACM, New York, NY, USA
- **Pages:** 785–794
- **Publication Date:** August 13–17, 2016
- **DOI:** `10.1145/2939672.2939785`
- **Verification Status:** **PASS** (Verified via ACM Digital Library / Crossref)
- **Dataset / Context:** Standard competitive tabular machine learning benchmarks (Higgs 10M, Allstate, Kaggle challenges).
- **Core Methodology:** Regularized gradient-boosted decision trees (GBDT) featuring second-order Taylor expansion loss approximation, weighted quantile sketch for approximate split finding, sparsity-aware split routing, and cache-aware column-block out-of-core computing.
- **Reported Results:** Achieved state-of-the-art predictive performance across structured tabular tasks, delivering over $10\times$ speedups over existing distributed boosting implementations.
- **Limitations:** Prone to severe overfitting when trained on small, unregularized samples; leaf weight outputs require calibration before being treated as true probabilities.
- **Relevance:** Algorithmic foundation for KrishiMitra's dual-variant crop classifiers (`crop_xgb.pkl`, `crop_xgb_climate.pkl`) and yield regressor (`yield_xgb.pkl`).

---

### [3] Lundberg & Lee (2017)
- **Title:** A Unified Approach to Interpreting Model Predictions
- **Authors:** Scott M. Lundberg, Su-In Lee
- **Venue:** *Advances in Neural Information Processing Systems 30 (NeurIPS 2017)*
- **Publisher:** Curran Associates, Inc.
- **Volume / Pages:** Vol. 30, pp. 4768–4777
- **Publication Date:** December 2017
- **Identifier:** `arXiv:1705.07874`
- **Verification Status:** **PASS** (Verified via NeurIPS Proceedings / arXiv)
- **Dataset / Context:** Benchmark classification and regression tasks across tabular, vision, and natural language domains.
- **Core Methodology:** SHAP (SHapley Additive exPlanations), a unified framework connecting six prior local explanation methods (LIME, DeepLIFT, Layer-Wise Relevance Propagation, Shapley regression values). Mathematically proves that Shapley values represent the unique class of additive feature attributions satisfying Local Accuracy, Missingness, and Consistency.
- **Reported Results:** Proved mathematical uniqueness and demonstrated superior human agreement in computational user studies compared to heuristic attribution methods.
- **Limitations:** Computing exact Shapley values exhibits exponential complexity $\mathcal{O}(2^M)$; necessitates polynomial-time tree approximations (`TreeSHAP`) that assume feature independence.
- **Relevance:** Core explainability engine used in KrishiMitra for feature-level yield impact decomposition on `yield_xgb`.

---

### [4] Allen et al. (1998)
- **Title:** Crop evapotranspiration - Guidelines for computing crop water requirements
- **Authors:** Richard G. Allen, Luis S. Pereira, Dirk Raes, Martin Smith
- **Series:** *FAO Irrigation and Drainage Paper No. 56*
- **Publisher:** Food and Agriculture Organization of the United Nations (FAO), Rome, Italy
- **Publication Date:** 1998
- **ISBN:** `92-5-104219-5`
- **Verification Status:** **PASS** (Verified via FAO Document Repository)
- **Dataset / Context:** Decadal lysimeter observations, weather station networks, and crop experimental plots across global agro-climatic zones.
- **Core Methodology:** Established the FAO-56 Penman-Monteith formulation as the sole international standard for reference evapotranspiration ($ET_0$). Outlined the single crop coefficient ($K_c$) approach ($ET_c = K_c \times ET_0$), soil water reservoir parameters (Total Available Water $TAW$, Readily Available Water $RAW$), and daily root-zone soil water depletion balance recursion.
- **Reported Results:** Global standardization of crop water requirement calculations, reducing empirical divergence between conflicting regional methods (e.g., Blaney-Criddle, Hargreaves).
- **Limitations:** Requires comprehensive daily meteorological variables (solar radiation, wind speed, relative humidity, air temperature); assumes standard unstressed management unless stress coefficients ($K_s$) are integrated.
- **Relevance:** Theoretical and mathematical foundation for KrishiMitra's Smart Irrigation Advisor (`src/advisory/irrigation.py`).

---

### [5] van Klompenburg et al. (2020)
- **Title:** Crop yield prediction using machine learning: A systematic literature review
- **Authors:** Thomas van Klompenburg, Ayalew Kassahun, Çağatay Çatal
- **Journal:** *Computers and Electronics in Agriculture*
- **Publisher:** Elsevier
- **Volume / Article:** Vol. 177, Art. 105709
- **Publication Date:** October 2020
- **DOI:** `10.1016/j.compag.2020.105709`
- **Verification Status:** **PASS** (Verified via ScienceDirect / Crossref)
- **Dataset / Context:** Meta-analysis of 50 primary machine learning crop yield studies selected across major indexing databases.
- **Core Methodology:** Systematic literature review evaluating feature sets, data sources, preprocessing routines, algorithms, and evaluation metrics across global literature.
- **Reported Results:** Artificial Neural Networks (ANNs) and Random Forests were the most commonly applied algorithms; temperature, rainfall, and soil type were the most frequent predictor features; RMSE and $R^2$ were the predominant evaluation metrics.
- **Limitations:** Highlighted that the vast majority of published studies train models on broad regional aggregates lacking localized soil moisture or farm-scale management practices.
- **Relevance:** Provides authoritative literature context on yield prediction features, benchmarks, and data limitations; directly informs KrishiMitra's evaluation protocol.

---

### [6] Zhai et al. (2020)
- **Title:** Decision support systems for agriculture 4.0: Survey and challenges
- **Authors:** Zhaoyu Zhai, José-Fernán Martínez, Victoria Beltran, Néstor Lucas Martínez
- **Journal:** *Computers and Electronics in Agriculture*
- **Publisher:** Elsevier
- **Volume / Article:** Vol. 170, Art. 105256
- **Publication Date:** March 2020
- **DOI:** `10.1016/j.compag.2020.105256`
- **Verification Status:** **PASS** (Verified via ScienceDirect / Crossref)
- **Dataset / Context:** Comprehensive taxonomy of Agriculture 4.0 systems, IoT architectures, and smart farming platforms.
- **Core Methodology:** Literature review synthesizing decision support paradigms across data acquisition, transmission, analytical processing, and application delivery layers.
- **Reported Results:** Identified that digital agriculture suffers from fragmentation, lack of interoperability, black-box algorithmic outputs, and high cognitive load for smallholders, hindering real-world adoption.
- **Limitations:** Review paper; does not introduce an empirical software artifact or open-source decision engine.
- **Relevance:** Corroborates KrishiMitra's foundational motivation: synthesizing disparate data streams into a single, explainable platform.

---

### [7] Nachtergaele et al. (2023)
- **Title:** Harmonized World Soil Database version 2.0
- **Authors:** Freddy Nachtergaele, Harrij van Velthuizen, Luc Verelst, David Wiberg, Matieu Henry, Federica Chiozza, Yusuf Yigini
- **Series:** *Technical Report*
- **Publisher:** FAO & IIASA, Rome, Italy and Laxenburg, Austria
- **Publication Date:** 2023
- **DOI:** `10.4060/cc3823en`
- **ISBN:** `978-92-5-137499-3`
- **Verification Status:** **PASS** (Verified via FAO Publications / Crossref)
- **Dataset / Context:** Global compilation of harmonized soil survey mapping units across 8 depth layers (D1–D8), covering the terrestrial globe at 30 arc-second (~1 km) resolution.
- **Core Methodology:** Integration of regional soil survey databases (SOTER, WISE, Northern Circumpolar, Australian National) into a unified soil mapping unit (SMU) raster and SQLite schema.
- **Reported Results:** Provided updated global digital soil property maps (organic carbon, pH, bulk density, CEC, textural fractions, water capacity) with enhanced spatial alignment.
- **Limitations:** Resolution (~1 km) represents broad spatial mapping units; does not reflect hyper-local synthetic fertilizer acidification or topsoil loss on micro-plots.
- **Relevance:** Primary pedological dataset powering KrishiMitra's local memory-mapped soil raster engine (`src/data/hwsd.py`).

---

### [8] Zippenfenig (2023)
- **Title:** Open-Meteo.com Weather API
- **Authors:** Patrick Zippenfenig
- **Archive:** *Zenodo Open Access Software Archive*
- **Publication Date:** 2023
- **Version:** 1.0.0
- **DOI:** `10.5281/zenodo.7970649`
- **Verification Status:** **PASS** (Verified via Zenodo / GitHub)
- **Dataset / Context:** Numerical Weather Prediction (NWP) model outputs from international meteorological agencies (ECMWF IFS, GFS, DWD ICON, Météo-France ARPEGE).
- **Core Methodology:** High-performance open API engine delivering localized hourly and daily weather forecasts, solar radiation, wind speeds, and Penman-Monteith reference evapotranspiration ($ET_0$) without API key restrictions.
- **Reported Results:** Provides sub-100 ms global weather API queries using fast columnar binary serialization.
- **Limitations:** Pure numerical model outputs; accuracy degrades beyond 48–72 hours; lacks localized rain gauge ground calibration.
- **Relevance:** Operational weather and $ET_0$ provider for KrishiMitra's Smart Irrigation Advisor and Climate Risk Engine.

---

### [9] Sparks (2018)
- **Title:** nasapower: A NASA POWER Global Meteorology, Surface Solar Energy and Climatology Data Client for R
- **Authors:** Adam H. Sparks
- **Journal:** *The Journal of Open Source Software*
- **Publisher:** The Open Journal
- **Volume / Issue / Article:** Vol. 3, No. 30, Art. 1035
- **Publication Date:** October 2018
- **DOI:** `10.21105/joss.01035`
- **Verification Status:** **PASS** (Verified via JOSS / Crossref)
- **Dataset / Context:** NASA Langley MERRA-2 assimilation model and satellite solar observation data on a $0.5^\circ \times 0.625^\circ$ global grid.
- **Core Methodology:** Validated client interface retrieving satellite agroclimatology parameters (daily and monthly temperature, solar radiation, relative humidity, precipitation).
- **Reported Results:** Demonstrated consistency and spatial utility of NASA POWER parameters for agro-ecological research and decision support systems globally.
- **Limitations:** Spatial resolution ($0.5^\circ \times 0.625^\circ \approx 50\text{ km}$) is coarse; satellite precipitation estimates may smooth intense local orographic showers.
- **Relevance:** Supplies KrishiMitra's 5-year seasonal temperature, rainfall, and relative humidity baselines across crop growing months.

---

### [10] Nishant et al. (2020)
- **Title:** Crop Yield Prediction Based on Indian Agriculture Using Machine Learning
- **Authors:** P. S. Nishant, P. Sai Venkat, B. L. Avinash, B. Jabber
- **Venue:** *2020 International Conference for Emerging Technology (INCET)*, Belgaum, India
- **Publisher:** IEEE
- **Pages:** 1–4
- **Publication Date:** 5–7 June 2020
- **DOI:** `10.1109/INCET49848.2020.9154036`
- **Verification Status:** **PASS** (Verified via IEEE Xplore / Crossref)
- **Dataset / Context:** Historical Indian district-level agricultural statistics spanning 1998–2014 across multiple Indian states.
- **Core Methodology:** Evaluation of Linear Regression, Decision Tree Regressor, and Random Forest Regressor on agricultural production datasets.
- **Reported Results:** Random Forest achieved an $R^2$ of approximately 0.78 on aggregated district crop yields, demonstrating significant improvements over linear models.
- **Limitations:** Macro-district scale statistics fail to capture field-level soil moisture, localized rainfall, or farm management differences.
- **Relevance:** Contextual Indian baseline for comparing agricultural yield estimation techniques.

---

### [11] Medar et al. (2019)
- **Title:** Crop Yield Prediction using Machine Learning Techniques
- **Authors:** Ramesh Medar, Vijay S. Rajpurohit, S. Shweta
- **Venue:** *2019 IEEE 5th International Conference for Convergence in Technology (I2CT)*, Bombay, India
- **Publisher:** IEEE
- **Pages:** 1–5
- **Publication Date:** 29–31 March 2019
- **DOI:** `10.1109/I2CT45611.2019.9033611`
- **Verification Status:** **PASS** (Verified via IEEE Xplore / Crossref)
- **Dataset / Context:** Agricultural yield and environmental records across Karnataka districts.
- **Core Methodology:** Comparative evaluation of Support Vector Machines (SVM), Multilayer Perceptron (MLP), and Random Forest Regressors.
- **Reported Results:** Random Forest demonstrated the lowest Root Mean Squared Error (RMSE) on non-linear agricultural feature interactions.
- **Limitations:** Static historical records; lacks live meteorological telemetry or actionable farmer-facing advisories.
- **Relevance:** Confirms the empirical superiority of tree-based ensembles for Indian crop analytics over shallow neural or linear networks.

---

### [12] Hengl et al. (2017)
- **Title:** SoilGrids250m: Global gridded soil information based on machine learning
- **Authors:** Tomislav Hengl, Jorge Mendes de Jesus, Gerard B. M. Heuvelink, et al.
- **Journal:** *PLOS ONE*
- **Publisher:** Public Library of Science
- **Volume / Issue / Article:** Vol. 12, No. 2, Art. e0169748
- **Publication Date:** February 16, 2017
- **DOI:** `10.1371/journal.pone.0169748`
- **Verification Status:** **PASS** (Verified via PLOS / Crossref)
- **Dataset / Context:** Global soil profile database (approx. 150,000 profiles) paired with 158 remote sensing covariates.
- **Core Methodology:** Automated digital soil mapping using Random Forest and gradient boosting algorithms predicting soil properties across standard depths on a 250m grid.
- **Reported Results:** Produced globally consistent continuous soil property rasters with cross-validation $R^2$ ranging from 56% to 83%.
- **Limitations:** Online REST API incurs significant query latency (>3,000 ms) and rate limits; cloud server outages disrupt real-time ADSS workflows.
- **Relevance:** Foundational reference in digital pedology; contrasted with KrishiMitra's zero-latency offline memory-mapped HWSD v2.0 raster engine.

---

### [13] Nigam et al. (2019)
- **Title:** Crop Yield Prediction Using Machine Learning Algorithms
- **Authors:** Aruvansh Nigam, Saksham Garg, Archit Agrawal, Parul Agrawal
- **Venue:** *2019 Fifth International Conference on Image Information Processing (ICIIP)*, Shimla, India
- **Publisher:** IEEE
- **Pages:** 125–130
- **Publication Date:** 15–17 November 2019
- **DOI:** `10.1109/ICIIP47207.2019.8985951`
- **Verification Status:** **PASS** (Verified via IEEE Xplore / Crossref)
- **Dataset / Context:** Agricultural statistics from Indian government open data portals covering multiple crops and seasonal cycles.
- **Core Methodology:** Evaluation of Random Forest, Decision Tree, and multiple linear regression algorithms for crop yield prediction.
- **Reported Results:** Demonstrated that tree ensembles provide superior resilience against non-normal rainfall and temperature distributions in monsoon-dominated agro-climates.
- **Limitations:** Standalone offline computational models; lacked operational deployment mechanisms or integration with crop calendars.
- **Relevance:** Corroborates the necessity of non-linear tree structures for Indian agricultural modeling.

---

### [14] Elavarasan & Vincent (2020)
- **Title:** Crop Yield Prediction Using Deep Reinforcement Learning Model for Sustainable Agrarian Applications
- **Authors:** Dhivya Elavarasan, P. M. Durairaj Vincent
- **Journal:** *IEEE Access*
- **Publisher:** IEEE
- **Volume / Pages:** Vol. 8, pp. 86886–86901
- **Publication Date:** May 2020
- **DOI:** `10.1109/ACCESS.2020.2992480`
- **Verification Status:** **PASS** (Verified via IEEE Xplore / Crossref)
- **Dataset / Context:** Multi-year meteorological and crop production statistics across 30 Indian states.
- **Core Methodology:** Formulated crop yield prediction as a sequential decision process using a Deep Reinforcement Learning (DRL) agent with recurrent policy networks.
- **Reported Results:** Achieved lower error metrics than traditional regression algorithms by learning dynamic state transitions across sequential growth phases.
- **Limitations:** Extremely high training complexity; black-box policy network is completely opaque to rural farmers; lacks local feature attributions.
- **Relevance:** Highlights state-of-the-art computational limits and reinforces why KrishiMitra prioritizes explainability and deterministic safety over opaque deep reinforcement models.

---

### [15] Rashid et al. (2021)
- **Title:** A Comprehensive Review of Crop Yield Prediction Using Machine Learning Approaches With Special Emphasis on Palm Oil Yield Prediction
- **Authors:** Mamunur Rashid, Bifta Sama Bari, Yusri Yusup, Mohamad Anuar Kamaruddin, Nuzhat Khan
- **Journal:** *IEEE Access*
- **Publisher:** IEEE
- **Volume / Pages:** Vol. 9, pp. 63406–63439
- **Publication Date:** April 2021
- **DOI:** `10.1109/ACCESS.2021.3075159`
- **Verification Status:** **PASS** (Verified via IEEE Xplore / Crossref)
- **Dataset / Context:** Comprehensive survey covering global agricultural yield datasets and commercial crop applications.
- **Core Methodology:** Systematic meta-analysis of regression algorithms, feature engineering paradigms, remote sensing vegetation indices, and validation schemes.
- **Reported Results:** Highlighted that the absence of real-time soil moisture and crop phenology significantly degrades field accuracy, and emphasized widespread reporting bias in academic publications.
- **Limitations:** Survey paper; does not deliver an open operational decision support system.
- **Relevance:** Directly supports KrishiMitra's scientific integrity in disclosing the negative $R^2$ of prototype models trained on small national samples.

---

### [16] Kumar et al. (2015)
- **Title:** Crop Selection Method to Maximize Crop Yield Rate using Machine Learning Technique
- **Authors:** Rakesh Kumar, M. P. Singh, Prabhat Kumar, J. P. Singh
- **Venue:** *2015 International Conference on Smart Technologies and Management for Computing, Communication, Controls, Energy and Materials (ICSTM)*, Chennai, India
- **Publisher:** IEEE
- **Pages:** 138–145
- **Publication Date:** 6–8 May 2015
- **DOI:** `10.1109/ICSTM.2015.7225403`
- **Verification Status:** **PASS** (Verified via IEEE Xplore / Crossref)
- **Dataset / Context:** Indian seasonal agricultural statistics, soil characteristics, and economic market data.
- **Core Methodology:** Proposed a Crop Selection Method (CSM) optimizing net yield rate and farmer profitability by matching seasonal soil and climate attributes with crop requirements.
- **Reported Results:** Demonstrated that formulating crop selection as a combined agronomic and economic optimization problem improves simulated net agricultural returns.
- **Limitations:** Heuristic scoring rules were static and hardcoded; lacked live numerical weather predictions or automated market mandi price feeds.
- **Relevance:** Validates KrishiMitra's coupling of physiological suitability scoring with dynamic Agmarknet market prices and economic gross margin calculation.
