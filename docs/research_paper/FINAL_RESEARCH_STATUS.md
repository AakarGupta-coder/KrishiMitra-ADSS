# KrishiMitra-ADSS: Final Research & Manuscript Status Report

This document summarizes the comprehensive investigation, empirical auditing, literature verification, and manuscript production executed for the **KrishiMitra: AI-Powered Agricultural Decision Support System (ADSS)** IEEE conference paper.

---

## 1. Executive Summary of Research Deliverables

| Deliverable Artifact | File Path | Status | Verification Summary |
|---|---|---|---|
| **Authoritative Word Manuscript** | `docs/research_paper/KrishiMitra_IEEE_Research_Paper.docx` | **COMPLETE** | Formatted using the official `conference-template-a4(1).docx` styles. 9-page IEEE conference format with embedded figures, tables, and equations. |
| **Final Rendered PDF** | `docs/research_paper/KrishiMitra_IEEE_Research_Paper.pdf` | **COMPLETE** | Compiled via Word/docx2pdf engine. All 9 pages rendered, inspected, and verified against layout standards. |
| **Full Paper Markdown Source** | `docs/research_paper/KrishiMitra_IEEE_Conference_Paper.md` | **COMPLETE** | Complete text, sections I through IX, equations, 5 tables, 8 figures referenced, 12 verified references. |
| **System Architecture Diagram** | `docs/research_paper/figures/fig1_system_architecture.svg` / `.png` | **COMPLETE** | Original 4-tier system architecture diagram matching the exact call graph. High-res 2x PNG generated. |
| **Model & Decision Architecture** | `docs/research_paper/figures/fig2_model_decision_architecture.svg` / `.png` | **COMPLETE** | Detailed branching diagram illustrating dual-track crop selection, yield fallback, and SHAP hook. High-res 2x PNG generated. |
| **Live Interface Screenshots (11)** | `docs/research_paper/figures/screenshots/*.png` | **COMPLETE** | Acquired via Chrome CDP across all 10 application pages + onboarding setup on a running local instance. |
| **Project Audit Ledger** | `docs/research_paper/audit/PROJECT_AUDIT_LEDGER.md` | **COMPLETE** | Complete file inventory, classifications, line ranges, and execution roles. |
| **Claims & Evidence Ledger** | `docs/research_paper/audit/CLAIMS_AND_EVIDENCE.md` | **COMPLETE** | 12 central claims evaluated with line numbers and empirical qualification. |
| **Implementation Discrepancies** | `docs/research_paper/audit/IMPLEMENTATION_DISCREPANCIES.md` | **COMPLETE** | Reconciled old planning notes (multimodal NN, k-NN, SMOTE) against actual XGBoost + rules codebase. |
| **Reference Verification Ledger** | `docs/research_paper/audit/REFERENCE_VERIFICATION.md` | **COMPLETE** | 12 peer-reviewed and institutional references verified with DOIs and Crossref metadata. |
| **BibTeX Reference Ledger** | `docs/research_paper/references.bib` | **COMPLETE** | Clean, machine-readable BibTeX file with verified DOIs. |
| **Dataset Provenance Ledger** | `docs/research_paper/audit/DATASET_PROVENANCE_LEDGER.md` | **COMPLETE** | 7 data streams documented with schemas, resolutions, TTLs, and lineage. |
| **Screenshot Evidence Manifest** | `docs/research_paper/audit/SCREENSHOT_MANIFEST.md` | **COMPLETE** | Route, scenario, data provenance, and image byte sizes recorded for all screenshots. |
| **Experiment Reproduction Log** | `docs/research_paper/audit/EXPERIMENT_LOG.md` | **COMPLETE** | Checksums, hyperparameters, 5-fold CV metrics, confusion matrices, and yield analysis documented. |
| **Final Quality Checklist** | `docs/research_paper/audit/FINAL_QUALITY_CHECKLIST.md` | **COMPLETE** | All 22 audit criteria marked PASS with evidence paths. |
| **Reproducible Experiment Script**| `docs/research_paper/experiments/run_experiments.py` | **COMPLETE** | Re-computes all metrics and generates publication plots in `docs/research_paper/results/`. |
| **Automated DOCX Paper Builder** | `scripts/report/build_docx_paper.py` | **COMPLETE** | Re-assembles the Word document from template and source text with single command. |

---

## 2. Central Findings & Empirical Verification

1. **Crop Recommendation Classifier:**
   - Evaluated on Kaggle benchmark dataset (2,200 rows, 22 crops, SHA256: `54a5a6e5...`).
   - Full 7-feature model (`crop_xgb.pkl`, with NPK): **98.86% holdout accuracy**, **98.85% Macro F1**, **99.27% $\pm$ 0.33% 5-fold cross-validation**.
   - Climate 4-feature model (`crop_xgb_climate.pkl`, without NPK): **94.09% holdout accuracy**, **94.01% Macro F1**, **95.82% $\pm$ 0.53% 5-fold cross-validation**.
   - Verified that the ML classifier functions strictly as an independent second opinion; the deterministic rules engine (`KM-Rules 2.1`) remains authoritative.

2. **Crop Yield Prediction Honest Audit:**
   - Evaluated on `faostat_sample.csv` (20 rows, SHA256: `6c8657ec...`).
   - Found that 15 of 20 rows contain flat synthetic repeats, and the model lacks weather/soil features.
   - Holdout performance: **$\text{MAE} = 0.031\text{ t/ha}$**, **$R^2 = -5.33$**.
   - The paper explicitly reports the negative $R^2$ as an empirical finding, validating KrishiMitra's design choice to tag `yield_xgb` as an experimental prototype and fall back to deterministic reference yields scaled by agronomic suitability ($Y = Y_{ref} \times S_{agronomic}$) for operational planning.

3. **Smart Irrigation & Water Balance:**
   - Implements standard FAO-56 daily water balance model over a 7-day forecast horizon.
   - Evaluates reference evapotranspiration ($ET_0$) from Open-Meteo, crop coefficients ($K_c$), total available water ($TAW$), and readily available water ($RAW$) based on USDA soil textures.
   - Computes daily depletion ($D_r$), irrigation trigger points, and gross volumetric demand ($m^3/\text{ha}$) across Drip (90%), Sprinkler (75%), and Surface (60%) efficiencies.

4. **Offline Pedological Engine:**
   - Ingests the official FAO/IIASA HWSD v2.0 global 30 arc-second raster grid (`HWSD2.bil`, 1.86 GB) via `numpy.memmap`.
   - Executes offline affine coordinate lookup, dominant soil component selection in SQLite, and a 5 km geodesic radial search fallback.

5. **Software Test Suite:**
   - 24 unit tests in `tests/test_core.py` executed and passed in 5.33 seconds, confirming boundary conditions, outage fallbacks, and seasonal date logic.

---

## 3. Author Action Items & Placeholders for Final Submission

The generated manuscript contains clearly flagged placeholders for information that only the primary author and target venue can specify:
- **Author Affiliation:** `[Author Institutional Affiliation Placeholder]` (e.g., University / Department name).
- **Author Location:** `[City, Country Placeholder]`.
- **Author Contact:** `[Author Email / ORCID Placeholder]`.
- **Target Conference:** `[Target IEEE Conference Name Placeholder]` (if the venue specifies header/footer publication codes).
- **Funding Acknowledgments:** Placeholder available if grant or institutional funding applies; otherwise the acknowledgment to open-access data providers remains valid.
