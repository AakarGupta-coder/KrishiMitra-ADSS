# KRISHIMITRA: AI-Powered Agricultural Decision Support System

<p align="center">
  <!-- You can add a logo image here later if needed -->
  <!-- <img src="docs/assets/krishimitra_logo.png" alt="KRISHIMITRA" width="90%" /> -->
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge" />
  <img src="https://img.shields.io/badge/AI_ML-XGBoost%20%7C%20LightGBM-29B5E8?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-purple?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Domain-Precision_Agriculture-FF9900?style=for-the-badge" />
</p>

<p align="center">
  <strong>Comprehensive AI-driven agricultural decision support framework fusing multi-modal environmental datasets (weather, soil, historical yields) to deliver explainable crop advisories, yield predictions, and dynamic irrigation schedules.</strong>
</p>

<p align="center">
  <strong>Made by Aakar Gupta & Prathamesh Burange</strong>
</p>

---

## Repository Metadata

<div align="center">

| Field | Value |
|---|---|
| Repository name | `KrishiMitra-ADSS` |
| Authors | Aakar Gupta (24BRS1321), Prathamesh Burange (24BRS1344) |
| Project type | Decision Support System (DSS) / Machine Learning Pipeline |
| Primary domain | Precision Agriculture & Agronomy |
| Secondary domain | Multi-Modal Data Fusion, Explainable AI (XAI) |
| Core technologies | Python, Pandas, LightGBM, XGBoost, SHAP, Matplotlib |
| Data sources | NASA POWER API, Open-Meteo, SoilGrids, FAOSTAT |

</div>

<div style="border-left: 6px solid #2e7d32; background: #edf7ed; padding: 12px 16px; margin: 16px 0;">
<strong>Project Highlight:</strong> Synthesizing disparate geospatial, meteorological, and pedological data pipelines into a unified, low-latency ensemble architecture that provides <em>interpretable (SHAP-backed)</em> agronomic insights for rural farmers.
</div>

---

## Table of Contents

<div align="center">

| # | Concept & Architecture | # | Operations & Reference |
|---|---|---|---|
| 1 | [Executive Summary](#1-executive-summary) | 7 | [Dataset Catalog](#7-dataset-catalog) |
| 2 | [Problem Statement & Motivation](#2-problem-statement--motivation) | 8 | [Future Work & Roadmap](#8-future-work--roadmap) |
| 3 | [Feature Overview](#3-feature-overview) | 9 | [Repository Structure](#9-repository-structure) |
| 4 | [Architecture Pipeline](#4-architecture-pipeline) | 10 | [Installation & Quick Start](#10-installation--quick-start) |
| 5 | [Component Responsibilities](#5-component-responsibilities) | 11 | [Running the Data Loader](#11-running-the-data-loader) |
| 6 | [Explainability Strategy](#6-explainability-strategy) | 12 | [Citation & Academic Use](#12-citation--academic-use) |

</div>

---

## 1. Executive Summary

*KrishiMitra translates to "Farmer's Friend"—embodying our vision to democratize data-driven agriculture.*

The KrishiMitra framework provides a structured environment to predict crop suitability and estimate harvest yields by analyzing the complex interplay of soil parameters and weather conditions. By ingesting multi-modal data streams via APIs and historical logs, cleaning it through k-NN imputation, and processing it via gradient-boosted ensembles (XGBoost/LightGBM), KrishiMitra offers an end-to-end pipeline that aims to reduce crop failure and optimize resource usage in the face of erratic climate fluctuations.

---

## 2. Problem Statement & Motivation

A pervasive flaw in modern agricultural practices is the reliance on heuristic intuition over empirical, localized data. When predictive AI models are employed, they frequently operate as isolated, black-box systems processing single modalities (e.g., only satellite imagery or only historical yield).

KrishiMitra systematically addresses these core challenges:

1. **Multi-Modal Fragmentation:** How can we fuse dynamic weather APIs (NASA POWER) with static pedological maps (SoilGrids) into a single predictive manifold?
2. **Black-Box Opacity:** Do farmers trust neural network recommendations? We address this by integrating SHAP (SHapley Additive exPlanations) to translate model weights into logical, human-readable advisories.
3. **Resource Efficiency:** Can we dynamically schedule irrigation by predicting near-term evapotranspiration and precipitation using Open-Meteo forecasts?

---

## 3. Feature Overview

<div align="center">

| Capability | Details |
|---|---|
| **Yield Regression** | XGBoost continuous yield estimation (tonnes/ha) based on temporal climatic shifts. |
| **Crop Classification** | LightGBM multi-class suitability prediction prioritizing local soil structures. |
| **Data Orchestration** | Automated fetching and temporal alignment of API data (NASA, Open-Meteo). |
| **Explainable AI** | SHAP feature-attribution mapping directly applied to the ensemble manifold. |
| **Risk Mitigation** | Local caching heuristics to handle API rate limiting and transient downtime. |

</div>

---

## 4. Architecture Pipeline

### High-Level Framework Architecture

```mermaid
flowchart LR
    %% Theming
    classDef data fill:#e3f2fd,stroke:#0277bd,stroke-width:2px,color:#000
    classDef pre fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#000
    classDef model fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#000
    classDef out fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px,color:#000

    subgraph Modalities ["Data Modalities"]
        direction TB
        N["NASA POWER<br/>(Meteorology)"]:::data
        S["SoilGrids<br/>(Pedology)"]:::data
        F["FAOSTAT<br/>(History)"]:::data
    end

    subgraph Preprocessing ["Data Preprocessing"]
        direction TB
        KNN["k-NN Imputation<br/>& Alignment"]:::pre
        STD["Z-Score<br/>Standardization"]:::pre
    end

    subgraph Fusion ["Explainable Multi-modal Fusion"]
        direction TB
        LGBM["LightGBM<br/>(Classification)"]:::model
        XGB["XGBoost<br/>(Regression)"]:::model
        SHAP["SHAP Explainer<br/>(Attribution)"]:::model
    end

    subgraph Output ["Output Interface"]
        direction TB
        ADV["Yield Prediction<br/>& Advisory"]:::out
        UI["Interactive<br/>Dashboard UI"]:::out
    end

    Modalities -->|Raw Data| Preprocessing
    Preprocessing -->|Tensors| Fusion
    Fusion -->|Insights & Gradients| Output
```

---

## 5. Component Responsibilities

<div align="center">

| Component | Files | Purpose |
|---|---|---|
| **Data Loader** | `dataset_loader.py` | Connects to REST APIs, ingests CSVs, and formats baseline Pandas DataFrames. |
| **Preprocessing Layer** | *(Planned)* | k-NN imputation for missing temporal sequences and Z-score scaling. |
| **Fusion Engine** | *(Planned)* | Parallel model inference utilizing trained LightGBM and XGBoost binaries. |
| **Explainability Module** | *(Planned)* | Wraps model heads with SHAP TreeExplainers to generate logic trees. |
| **Report Generator** | `generate_report.py` | Python orchestration script leveraging `python-docx` and `matplotlib` for documentation. |

</div>

---

## 6. Explainability Strategy

To ensure clinical adoption by rural practitioners, KrishiMitra enforces **Algorithmic Transparency**. 
Instead of merely stating "Plant Wheat," the SHAP module intercepts the classification probabilities and generates contextual rules:
*“Wheat is recommended primarily because Soil Nitrogen is optimally high (+1.2 impact) and 7-day forecasted precipitation is adequate (+0.8 impact).”*

---

## 7. Dataset Catalog

<div align="center">

| Dataset Source | Modality | Target Use | Access Method |
|---|---|---|---|
| **NASA POWER API** | Meteorological | Historical Temp, Humidity, Rain | Live REST API |
| **Open-Meteo API** | Meteorological | 7-day Forward Weather Forecasts | Live REST API |
| **SoilGrids** | Pedological | Soil pH, Nitrogen, Sand/Clay % | Offline CSV / WCS |
| **FAOSTAT** | Historical / Agronomic | True Yield Labels & Harvest Area | Offline CSV |

</div>

---

## 8. Future Work & Roadmap

- **Phase 1: Advanced Preprocessing** 
  - Complete the multivariate imputation modules and synthetic minority oversampling (SMOTE).
- **Phase 2: Model Training**
  - Implement the actual XGBoost/LightGBM pipelines mapped against the ingested datasets.
- **Phase 3: Real-time Dashboarding**
  - Construct a Streamlit or Gradio frontend for interactive geographic coordinate selection.
- **Phase 4: Hardware Portability**
  - Optimize inference execution for lightweight consumer hardware, edge devices, and mobile deployments.

---

## 9. Repository Structure

```text
KrishiMitra-ADSS/
├── README.md                     # This file
├── dataset_loader.py             # Data ingestion and API fetch script
├── faostat_sample.csv            # Sample dummy FAOSTAT dataset
├── soilgrids_sample.csv          # Sample dummy SoilGrids dataset
└── extras/                       
    ├── generate_report.py        # DA1 Report generation script
    ├── KrishiMitra_Architecture.png # Rendered system diagram
    └── KrishiMitra_DA1_Report.docx  # Exported DA1 Submission
```

---

## 10. Installation & Quick Start

### Prerequisites
- Python 3.10+
- `pip`

### Setup Steps
```powershell
# 1. Clone the repository
git clone https://github.com/AakarGupta-coder/KrishiMitra-ADSS.git
cd KrishiMitra-ADSS

# 2. Create a virtual environment
python -m venv .venv
.\.venv\Scripts\Activate

# 3. Install dependencies
pip install pandas requests docx matplotlib
```

---

## 11. Running the Data Loader

To verify that the multi-modal ingestion pipeline is operational:

```powershell
python dataset_loader.py
```

**Expected Output (Snippet):**
```text
--- Loading NASA POWER Dataset (20.59, 78.96) ---
Success! NASA POWER Data (First 5 rows):
              T2M  PRECTOTCORR   RH2M
2023-01-01  19.19         0.00  65.87
...
```

---

## 12. Citation & Academic Use

If you reference this framework architecture or report in your coursework or research, please attribute appropriately:

```text
Gupta, A., & Burange, P. (2026). KrishiMitra: An AI-Powered Agricultural Decision Support System. 
DA1 Project Submission.
```
