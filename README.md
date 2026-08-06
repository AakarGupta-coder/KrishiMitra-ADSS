# KRISHIMITRA: AI-Powered Agricultural Decision Support System

<p align="center">
  <img src="logo.png" alt="KRISHIMITRA" width="80%" />
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

## Data Loading and Datasets Used

This repository currently focuses on the robust multi-modal data ingestion pipeline located in `dataset_loader.py`. 

### Datasets Integrated

<div align="center">

| Dataset Source | Modality | Target Use | Access Method |
|---|---|---|---|
| **NASA POWER API** | Meteorological | Historical Temp, Humidity, Rain | Live REST API |
| **Open-Meteo API** | Meteorological | 7-day Forward Weather Forecasts | Live REST API |
| **SoilGrids** | Pedological | Soil pH, Nitrogen, Sand/Clay % | Historical Records |
| **FAOSTAT** | Historical | True Yield Labels & Harvest Area | Historical Records |

</div>

### Execution

Run the data loader script to verify API connections and data extraction:

```bash
python dataset_loader.py
```

**Output:**
```text
--- Loading NASA POWER Dataset (20.59, 78.96) ---
Success! NASA POWER Data (First 5 rows):
...
```
