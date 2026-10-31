# KrishiMitra-ADSS: Experiment & Model Reproduction Log

This log records the reproduction of offline machine learning model training and evaluation routines performed during the technical investigation.

## 1. Execution Environment & Checksums
- **Timestamp:** 2026-10-28T16:34:45+05:30
- **Python Runtime:** Python 3.14.0 (Windows 64-bit)
- **Core Library Versions:**
  - `xgboost`: 3.4.1
  - `scikit-learn`: 1.7.2
  - `shap`: 0.52.0
  - `numpy`: 2.5.4
  - `pandas`: 2.2.3
- **Reproducible Script:** `docs/research_paper/experiments/run_experiments.py`
- **Output Artifacts:** `docs/research_paper/results/experiment_results.json`, `confusion_matrix_full.png`, `confusion_matrix_climate.png`, `crop_model_comparison.png`

### Dataset Verification Hashes:
- `data/crop_recommendation.csv` SHA256: `54a5a6e5408668e668667efc50de2fc867c1b875e0431b4f54dd331b0a109a4e`
- `data/faostat_sample.csv` SHA256: `6c8657ec8315f4dcebd04aead47946f42e3431e567398d93c79dddc6bfc659ed`

---

## 2. Crop Classifier Reproduction Results

Training protocol: Stratified 80/20 train/test split ($N_{train} = 1760$, $N_{test} = 440$, random seed = 42). Hyperparameters: 200 estimators, max depth 4, learning rate 0.1, multi-class log-loss objective. Stratified 5-fold cross-validation on full dataset ($N=2200$).

| Metric | Full Variant (`crop_xgb.pkl`) | Climate Variant (`crop_xgb_climate.pkl`) | Performance Delta ($\Delta$) |
|---|---|---|---|
| **Input Features** | 7 ($N, P, K, \text{temp}, \text{humidity}, pH, \text{rainfall}$) | 4 ($\text{temp}, \text{humidity}, pH, \text{rainfall}$) | -3 Soil Nutrients |
| **Test Accuracy** | **98.86 %** (435 / 440 correct) | **94.09 %** (414 / 440 correct) | -4.77 % |
| **Macro Precision** | **98.94 %** | **94.20 %** | -4.74 % |
| **Macro Recall** | **98.86 %** | **94.09 %** | -4.77 % |
| **Macro F1 Score** | **98.85 %** | **94.01 %** | -4.84 % |
| **Weighted F1 Score** | **98.85 %** | **94.01 %** | -4.84 % |
| **5-Fold Stratified CV Mean** | **99.27 %** | **95.82 %** | -3.45 % |
| **5-Fold Stratified CV Std** | **$\pm$ 0.33 %** | **$\pm$ 0.53 %** | +0.20 % |

### Confusion Matrix Highlights:
- **Full Model:** 18 out of 22 classes achieved perfect 100% precision and recall ($F1 = 1.0$). Minor confusion occurred between `blackgram` and `mungbean` (due to similar NPK-rainfall profiles) and `jute` vs `rice`.
- **Climate Model:** Accurately maintains >94% performance even without soil nutrient data, proving that climatological features (temperature, rainfall, humidity) and pH provide strong discriminatory boundaries for agricultural classification.

---

## 3. Crop Yield Regressor Evaluation Results

Training protocol: 80/20 random train/test split on `data/faostat_sample.csv` ($N_{train} = 16$, $N_{test} = 4$, random seed = 42). Model: XGBoost Regressor (100 trees).

| Metric | Measured Value | Agronomic & Scientific Interpretation |
|---|---|---|
| **Dataset Scale** | 20 total rows (India national Rice & Wheat) | Severe sample deficiency; 15 rows repeat identical synthetic values (years 2010–2015 and 2021–2029). |
| **Input Features** | 3 (`Year`, `Crop_Rice`, `Crop_Wheat`) | Completely lacks environmental variables (no rainfall, temperature, soil texture, or fertilizer inputs). |
| **Mean Absolute Error (MAE)** | 310.0 hg/ha ($0.031\text{ t/ha}$) | Artificially low absolute error because flat repeat values restrict target variance. |
| **Root Mean Squared Error (RMSE)**| 467.6 hg/ha ($0.047\text{ t/ha}$) | Residual variance dominated by the single non-repeat test observation. |
| **Coefficient of Determination ($R^2$)**| **-5.328** | **Negative $R^2$ indicates the model performs worse than predicting the horizontal mean.** |
| **Conclusion & Architectural Role** | **Prototype Only; Flagged "Low Reliability"** | The negative $R^2$ empirically validates why KrishiMitra treats `yield_xgb` as an experimental prototype and uses deterministic reference yields multiplied by agronomic suitability for all operational farm planning. |
