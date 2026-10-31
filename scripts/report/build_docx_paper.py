import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import zipfile
import io
import os

TEMPLATE_PATH = "docs/templates/conference-template-a4.docx"
OUTPUT_DOCX = "docs/research_paper/KrishiMitra_IEEE_Research_Paper.docx"

# 1. Prepare template with standard OpenXML namespaces
mapping = {
    b'http://purl.oclc.org/ooxml/wordprocessingml/main': b'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    b'http://purl.oclc.org/ooxml/officeDocument/relationships': b'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    b'http://purl.oclc.org/ooxml/drawingml/main': b'http://schemas.openxmlformats.org/drawingml/2006/main',
    b'http://purl.oclc.org/ooxml/officeDocument/customXml': b'http://schemas.openxmlformats.org/officeDocument/2006/customXml',
    b'http://purl.oclc.org/ooxml/officeDocument/extendedProperties': b'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties'
}

with zipfile.ZipFile(TEMPLATE_PATH) as z:
    bio = io.BytesIO()
    with zipfile.ZipFile(bio, 'w') as out_z:
        for item in z.infolist():
            content = z.read(item.filename)
            for k, v in mapping.items():
                content = content.replace(k, v)
            out_z.writestr(item, content)

bio.seek(0)
doc = docx.Document(bio)

# Helper to clear existing body elements from template while preserving styles & sectPr
body = doc._body._element
for child in list(body):
    if child.tag.endswith('sectPr'):
        continue
    body.remove(child)

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def add_p(text="", style='Body Text', align=WD_ALIGN_PARAGRAPH.JUSTIFY, bold=False, italic=False):
    p = doc.add_paragraph(style=style)
    p.alignment = align
    if text:
        run = p.add_run(text)
        run.bold = bold
        run.italic = italic
    return p

def add_h1(text):
    return add_p(text, style='Heading 1', align=WD_ALIGN_PARAGRAPH.CENTER)

def add_h2(text):
    return add_p(text, style='Heading 2', align=WD_ALIGN_PARAGRAPH.LEFT)

def add_h3(text):
    return add_p(text, style='Heading 3', align=WD_ALIGN_PARAGRAPH.LEFT)

def add_code_block(code_text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pPr = p._p.get_or_add_pPr()
    pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:left w:val="single" w:sz="18" w:space="4" w:color="16A34A"/></w:pBdr>')
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="F8FAFC"/>')
    pPr.append(pBdr)
    pPr.append(shd)
    run = p.add_run(code_text)
    run.font.name = 'Consolas'
    run.font.size = Pt(7.5)
    run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    return p

# TITLE
p_title = add_p("KrishiMitra: An Explainable, Multi-Source Agricultural Decision Support System Combining Agronomic Rule Engines with Tree Ensembles", style='paper title', align=WD_ALIGN_PARAGRAPH.CENTER)

# AUTHORS
p_auth = add_p("Aakar Gupta\nDepartment of Computer Science and Engineering\n[Author Institutional Affiliation Placeholder]\n[City, Country Placeholder]\n[Author Email / ORCID Placeholder]", style='Author', align=WD_ALIGN_PARAGRAPH.CENTER)

# ABSTRACT & KEYWORDS
p_abs = doc.add_paragraph(style='Abstract')
p_abs.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
r_abs_b = p_abs.add_run("Abstract—")
r_abs_b.bold = True
r_abs_b.italic = True
r_abs_t = p_abs.add_run("Smallholder agricultural management in developing nations faces compounding challenges from climate variability, pedological degradation, and fragmented advisory infrastructure. While machine learning (ML) models have demonstrated promising predictive accuracy in agricultural benchmarks, practical operational adoption remains severely hindered by \"black-box\" decision pipelines, single-task silos (e.g., isolated weather apps or soil testing kits), and training-inference data distribution shifts. This paper presents KrishiMitra, an open, low-latency Agricultural Decision Support System (ADSS) that synthesizes live numerical weather predictions, satellite agroclimatology, high-resolution global soil rasters, and commodity market prices into a unified agronomic intelligence pipeline. Rather than subordinating farm management to uncalibrated black-box classifiers, KrishiMitra implements an ensemble hybrid architecture where a transparent, deterministic expert rule engine (KM-Rules 2.1) acts as the primary decision authority, constrained by Indian agricultural crop calendars (Kharif, Rabi, Zaid) and multi-factor physiological thresholds. Concurrently, a dual-variant XGBoost classifier operates as an independent \"second opinion,\" achieving 98.86% holdout accuracy (99.27% ± 0.33% 5-fold cross-validation) on a 22-crop benchmark when laboratory soil test values (N, P, K) are available, and 94.09% accuracy (95.82% ± 0.53% 5-fold CV) under an engineered climate-only fallback variant. Dynamic root-zone soil water budgeting is implemented via the FAO-56 Penman-Monteith daily water balance formulation, computing evapotranspiration (ETc), readily available water (RAW), and gross volumetric irrigation demand (m³/ha) across Drip, Sprinkler, and Surface irrigation regimes. We report an empirical audit of system components, honestly disclose that historical crop yield regression on small national samples exhibits negative holdout determination (R² = -5.33), and detail the operational fallback to deterministic reference yields scaled by suitability. Complete end-to-end execution is demonstrated across 10 application interfaces with verified data provenance, caching mechanisms, and automated field advisory reporting.")

p_kw = doc.add_paragraph(style='Keywords')
p_kw.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
r_kw_b = p_kw.add_run("Index Terms—")
r_kw_b.bold = True
r_kw_b.italic = True
r_kw_t = p_kw.add_run("Agricultural decision support systems, crop recommendation, precision agriculture, explainable AI, FAO-56 water balance, gradient-boosted trees, data provenance.")

# SECTION I
add_h1("I. INTRODUCTION")
add_p("Agriculture serves as the economic backbone of rural livelihoods in India, employing over 45% of the national workforce and ensuring domestic food security [6]. However, farming enterprises operate under severe systemic uncertainties driven by intensifying climate variability, irregular monsoon precipitation patterns, depleting groundwater aquifers, uncalibrated chemical fertilizer application, and volatile commodity market prices. Despite rapid advances in digital technologies, traditional agricultural decision-making—encompassing crop selection, sowing schedules, irrigation timing, and input expenditure—remains predominantly driven by historical intuition, localized customs, or isolated, disconnected information channels.")

add_p("Contemporary agricultural information systems suffer from severe architectural and agronomic fragmentation [6]. A farmer commonly accesses numerical weather forecasts through public meteorological portals, receives delayed soil test reports from physical laboratories, and consults weekly agricultural market (mandi) bulletins independently. These separate information streams are rarely integrated into a unified decision support pipeline. Furthermore, recent academic literature has witnessed an influx of machine learning (ML) classifiers proposed for precision crop recommendation and yield prediction [1], [5], [10]. However, these standalone ML interventions frequently fail when deployed in operational field conditions due to three critical structural weaknesses:")

add_p("1) The \"Black-Box\" Interpretability Deficit: Standard deep neural networks and complex tree ensembles output discrete classification labels or uncalibrated class probabilities without explaining the underlying agronomic justification. A farmer cannot verify why a particular crop was recommended over another, eroding trust and discouraging adoption when recommendations conflict with traditional knowledge [3], [6].")

add_p("2) Missing Input Fragility & Distribution Shift: Many published crop classifiers mandate a full feature suite comprising soil macronutrients (Nitrogen N, Phosphorus P, Potassium K), soil pH, and environmental indicators [1]. In real-world rural farming, laboratory soil test results are available to only a small fraction of smallholders. When soil test features are missing, conventional models fail catastrophically, lacking principled degradation pathways.")

add_p("3) Absence of Crop Lifecycle Synergy: Recommending an optimal crop is merely the initial phase of farm management. Once a crop is planted, farmers require continuous operational advisories, including daily soil water balance monitoring, dynamic irrigation scheduling, climate hazard warnings (frost, heatwaves, heavy precipitation), and market margin calculations.")

add_p("To address these fundamental limitations, this paper introduces KrishiMitra, an AI-powered Agricultural Decision Support System (ADSS) designed for smallholder precision agriculture. KrishiMitra combines deterministic agronomic expert rules with gradient-boosted machine learning classifiers and regressors within a decoupled, low-latency architecture.")

add_p("The substantive contributions of this work are summarized as follows:\n"
      "• Ensemble Decision Architecture: We design an architecture where an interpretable, deterministic agronomic rules engine (KM-Rules 2.1) serves as the primary decision authority, while a dual-variant XGBoost classifier operates as an independent, secondary verification mechanism.\n"
      "• Robust Multi-Source Data Lineage: We engineer an integrated ingestion pipeline synthesizing 7 heterogeneous data streams—including Open-Meteo weather forecasts [8], NASA POWER agroclimatology [9], a local memory-mapped FAO/IIASA HWSD v2.0 1-km raster engine [7], and Agmarknet mandi modal prices—with persistent SQLite caching and exponential backoff.\n"
      "• Principled Missing-Data Degradation: When laboratory soil tests are available, a 7-feature XGBoost classifier achieves 98.86% holdout benchmark accuracy; when soil tests are absent, the system dynamically routes inference to a 4-feature climate-and-pH model achieving 94.09% accuracy.\n"
      "• Physically Grounded Irrigation & Risk Modeling: We operationalize the international standard FAO-56 daily root-zone soil water balance model [4], computing evapotranspiration (ETc), readily available water (RAW), and volumetric water demand (m³/ha) across Drip, Sprinkler, and Surface irrigation regimes.\n"
      "• Scientific Rigor & Honest Empirical Auditing: We evaluate components on real datasets, document the failure modes and negative R² of regression models on small national samples, and verify all system behaviors across 10 functional application interfaces.")

# SECTION II
add_h1("II. RELATED WORK")
add_h2("A. Machine Learning in Crop Recommendation")
add_p("Automated crop selection has predominantly been formulated as a supervised multi-class classification problem. In their seminal work, Pudumalar et al. [1] proposed a crop recommendation framework for precision agriculture in Tamil Nadu utilizing an ensemble majority voting architecture. By combining Random Tree, CHAID, k-Nearest Neighbors (k-NN), and Naive Bayes classifiers over soil nutrients (N, P, K) and environmental factors, their ensemble achieved approximately 88% predictive accuracy, outperforming individual base learners. Similarly, Bondre and Mahagaonkar investigated Random Forest and Support Vector Machines for crop selection, demonstrating that decision tree ensembles exhibit superior resistance to noise and multi-collinearity compared to linear models.")
add_p("More recently, Atharva Ingle released the curated Crop Recommendation Dataset (mirrored in the open-source Harvestify project), synthesizing Indian agricultural parameters across 22 crop classes and 2,200 instances. While models trained on this benchmark frequently report classification accuracies exceeding 98% using XGBoost [2] or Random Forest, these studies evaluate performance exclusively in closed, synthetic benchmark environments. They fail to address how models behave when soil nutrient tests are unavailable, nor do they align classification outputs with official sowing calendars.")

add_h2("B. Crop Yield Prediction and Regression Modeling")
add_p("Forecasting agricultural yield prior to harvest has been approached through statistical time-series models and non-linear regression algorithms. In an extensive systematic literature review comprising 50 primary studies, van Klompenburg et al. [5] analyzed machine learning approaches for crop yield prediction. Their survey revealed that Artificial Neural Networks (ANNs) and Random Forests were the most widely used algorithms, with temperature, rainfall, and soil type serving as the most decisive input variables.")
add_p("In the Indian context, Nishant et al. [10] evaluated linear regression, decision trees, and Random Forest algorithms on district-level agricultural statistics, finding that extreme rainfall variance significantly degraded the predictive reliability of shallow regressors. Medar et al. [11] investigated yield estimation across Karnataka districts using Multilayer Perceptrons and tree ensembles, reporting that gradient boosting algorithms offered improved residual minimization on non-linear multi-source features. However, as van Klompenburg et al. critically observed [5], the literature is saturated with studies training complex regressors on aggregated regional statistics (such as national FAOSTAT or state directorate tables) that lack site-specific soil moisture or weather inputs, resulting in severe overfitting or non-generalizable predictions.")

add_h2("C. Evapotranspiration and Smart Irrigation Scheduling")
add_p("Precision water management relies fundamentally on the estimation of reference evapotranspiration (ET0) and root-zone water balance. The Food and Agriculture Organization (FAO) Irrigation and Drainage Paper No. 56 by Allen et al. [4] established the internationally accepted Penman-Monteith equation as the sole standard for computing ET0. Standard agronomic practice derives crop-specific water requirements (ETc) through single crop coefficients (Kc) mapped across developmental phenological stages. Modern ag-tech platforms increasingly integrate numerical weather predictions from open platforms such as Open-Meteo [8] to forecast reference evapotranspiration. However, existing mobile applications typically communicate raw millimeter water deficits without translating depletion into actionable irrigation events calibrated against soil water-holding capacities or irrigation application efficiencies.")

add_h2("D. Explainable Artificial Intelligence (XAI) in Agronomy")
add_p("The imperative for interpretability in high-stakes socio-economic domains led Lundberg and Lee [3] to formulate SHAP (SHapley Additive exPlanations). Grounded in cooperative game theory, SHAP provides a unified framework that computes Shapley values satisfying three foundational properties: Local Accuracy, Missingness, and Consistency. While SHAP has been adopted in clinical diagnostics and financial risk underwriting, its application in smallholder agronomic decision support remains nascent. Existing agricultural DSS implementations often provide naked predictions, forcing farmers to place uncalibrated trust in complex algorithms without visibility into feature attributions [6].")

add_h2("E. Research Gap & Comparative Synthesis")
add_p("Table I provides a systematic comparison of representative prior literature against KrishiMitra.")

# TABLE I
t1 = doc.add_table(rows=6, cols=6)
t1.alignment = WD_TABLE_ALIGNMENT.CENTER
t1_headers = ["Ref.", "Study", "Task", "Method", "Reported Result", "Distinction in KrishiMitra"]
t1_data = [
    ("[1]", "Pudumalar (2016)", "Crop Rec.", "Ensemble Tree/k-NN", "~88% Acc.", "Rules + Dual XGBoost; 7 live data streams + FAO-56."),
    ("[10]", "Nishant (2020)", "Yield Pred.", "Random Forest", "R² = 0.78 (Regional)", "SHAP feature impacts + reference yield fallbacks."),
    ("[11]", "Medar (2019)", "Yield Pred.", "MLP / Tree Boost", "Lowest RMSE (RF)", "Client-server architecture; automated PDF reports."),
    ("[6]", "Zhai (2020)", "ADSS Survey", "Literature Survey", "Taxonomy of Silos", "Fully realized, open-source deployed platform."),
    ("Ours", "KrishiMitra (2026)", "ADSS Suite", "KM-Rules + Dual XGB", "98.9% Full / 94.1% Clim", "Unified cockpit; local 1-km soil raster; provenance.")
]
for col_idx, h in enumerate(t1_headers):
    cell = t1.cell(0, col_idx)
    cell.paragraphs[0].text = h
    cell.paragraphs[0].runs[0].font.bold = True
    cell.paragraphs[0].runs[0].font.size = Pt(7.5)
    set_cell_background(cell, "E2E8F0")
    set_cell_margins(cell, top=80, bottom=80, left=100, right=100)

for r_idx, row in enumerate(t1_data):
    for c_idx, val in enumerate(row):
        cell = t1.cell(r_idx + 1, c_idx)
        cell.paragraphs[0].text = val
        cell.paragraphs[0].runs[0].font.size = Pt(7)
        set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
        if r_idx % 2 == 1:
            set_cell_background(cell, "F8FAFC")

add_p("TABLE I: Critical Comparison of Related Works Against KrishiMitra ADSS", style='figure caption', align=WD_ALIGN_PARAGRAPH.CENTER)

# SECTION III
add_h1("III. DATASETS AND DATA PROVENANCE")
add_p("Scientific credibility in agricultural computing requires rigorous documentation of data origins, schemas, spatial resolutions, update semantics, and operational limitations. KrishiMitra integrates 7 primary data streams spanning static offline benchmarks, local binary rasters, and live REST APIs. Table II outlines the comprehensive dataset provenance ledger.")

# TABLE II
t2 = doc.add_table(rows=8, cols=5)
t2.alignment = WD_TABLE_ALIGNMENT.CENTER
t2_headers = ["Data Stream", "Source / Provider", "Spatial Res.", "Features Extracted", "Downstream Module"]
t2_data = [
    ("Open-Meteo [8]", "api.open-meteo.com", "1–11 km NWP", "Tmax, Tmin, Precip, ET0, Soil Moist.", "Smart Irrigation, Risk Engine"),
    ("NASA POWER [9]", "power.larc.nasa.gov", "0.5° × 0.625°", "5-Yr Climatology T2M, Rain, RH, Solar", "Crop Rules, Climatological Base"),
    ("HWSD v2.0 [7]", "FAO & IIASA (Local)", "30 arc-sec (1 km)", "Topsoil pH, Texture, SOC, CEC, AWC", "Soil Intelligence, Water Balance TAW"),
    ("Agmarknet", "data.gov.in (OGD)", "Mandi Level", "Commodity Modal Prices (INR/t)", "Crop Financials, Market Risk"),
    ("OSM Nominatim", "OpenStreetMap", "Admin Boundary", "Lat/Lon to District and State", "Location Picker, Farm Profile"),
    ("Crop Benchmark", "Kaggle (2,200 rows)", "Curated Samples", "N, P, K, Temp, Humidity, pH, Rainfall", "XGBoost Crop Classifier (crop_xgb)"),
    ("FAOSTAT Sample", "UN FAO (20 rows)", "India National", "Year, Crop, Harvested Area, Yield", "XGBoost Yield Regressor (yield_xgb)")
]
for col_idx, h in enumerate(t2_headers):
    cell = t2.cell(0, col_idx)
    cell.paragraphs[0].text = h
    cell.paragraphs[0].runs[0].font.bold = True
    cell.paragraphs[0].runs[0].font.size = Pt(7.5)
    set_cell_background(cell, "E2E8F0")
    set_cell_margins(cell, top=80, bottom=80, left=100, right=100)

for r_idx, row in enumerate(t2_data):
    for c_idx, val in enumerate(row):
        cell = t2.cell(r_idx + 1, c_idx)
        cell.paragraphs[0].text = val
        cell.paragraphs[0].runs[0].font.size = Pt(7)
        set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
        if r_idx % 2 == 1:
            set_cell_background(cell, "F8FAFC")

add_p("TABLE II: KrishiMitra Dataset & Data Stream Provenance Ledger", style='figure caption', align=WD_ALIGN_PARAGRAPH.CENTER)

add_h2("A. Pedological Data Engineering via Memory-Mapped Rasters")
add_p("A distinctive engineering feature of KrishiMitra is its local soil raster engine (src/data/hwsd.py). External soil APIs (such as SoilGrids [12]) frequently suffer from rate limiting, latency spikes (>3,000 ms), or server downtime. To eliminate runtime network dependency, KrishiMitra bundles the official FAO/IIASA Harmonized World Soil Database v2.0 [7]. The global pedological grid is stored as a 1.86 GB flat binary raster (HWSD2.bil) accompanied by an ENVI header (HWSD2.hdr) and an indexed 51.2 MB SQLite attribute database (hwsd2.sqlite).")
add_p("At application startup, the raster is mapped into memory using numpy.memmap in read-only mode, consuming zero heap space until queried. Given a geographic coordinate (lat, lon), raster coordinates (row, col) are derived via affine transformation: col = floor((lon - ULXMAP) / XDIM) and row = floor((ULYMAP - lat) / YDIM), where ULXMAP = -180.0°, ULYMAP = 90.0°, and XDIM = YDIM = 0.0083333333° (30 arc-seconds). The extracted 16-bit pixel represents the Soil Mapping Unit (SMU_ID). The system queries hwsd2.sqlite to extract the dominant soil component within the topsoil layer (D1: 0–20 cm). If non-soil surfaces are encountered, a geodesic spiral radial search is executed up to 5 km using the Haversine metric.")

# SECTION IV
add_h1("IV. PROPOSED SYSTEM AND METHODOLOGY")
add_p("The architecture of KrishiMitra is organized across four decoupled tiers: Presentation, Application & Orchestration, Analytical & Decision Engines, and Ingestion & Caching. Fig. 1 illustrates the overall multi-tier system architecture, and Fig. 2 delineates the internal model decision and branching architecture.")

# Embed Fig 1 and Fig 2
if os.path.exists("docs/research_paper/figures/fig1_system_architecture.png"):
    p_fig1 = doc.add_paragraph()
    p_fig1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_fig1 = p_fig1.add_run()
    run_fig1.add_picture("docs/research_paper/figures/fig1_system_architecture.png", width=Inches(3.35))
    add_p("Fig. 1. Overall multi-tier system architecture of KrishiMitra ADSS.", style='figure caption', align=WD_ALIGN_PARAGRAPH.CENTER)

if os.path.exists("docs/research_paper/figures/fig2_model_decision_architecture.png"):
    p_fig2 = doc.add_paragraph()
    p_fig2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_fig2 = p_fig2.add_run()
    run_fig2.add_picture("docs/research_paper/figures/fig2_model_decision_architecture.png", width=Inches(3.35))
    add_p("Fig. 2. Detailed model and decision architecture showing dual-track crop selection, yield fallback branching, and SHAP execution.", style='figure caption', align=WD_ALIGN_PARAGRAPH.CENTER)

add_h2("A. Agronomic Rules Engine (KM-Rules 2.1)")
add_p("The crop recommendation engine (src/advisory/crop_rules.py) evaluates 12 major Indian field crops: Wheat, Sorghum, Pearl Millet, Barley, Green Gram, Black Gram, Sugarcane, Tomato, Potato, Onion, Turmeric, and Ginger. For each crop c, the knowledge base defines optimal physiological intervals [min_k, max_k] across 7 factors: N, P, K, temperature, humidity, pH, and rainfall. Individual factor multipliers m_k in [0.2, 1.0] decay linearly based on normalized deviation. Overall suitability is computed as:")
add_p("S_agronomic = S_phys × omega_season = [Prod_(k in F) m_k] × omega_season          (1)", style='equation', align=WD_ALIGN_PARAGRAPH.CENTER)
add_p("where omega_season = 1.0 for in-season crops and 0.5 for off-season crops. Crops failing a 40% cutoff are disqualified. Crucially, if seasonal rainfall is below min_k but the farm operates an active irrigation system (Drip, Sprinkler, or Flood), m_rain is not penalized (m_rain = 1.0) and the deficit is flagged as met_by_irrigation.")

add_h2("B. Machine Learning Crop Classifier & Second Opinion")
add_p("To supplement the deterministic rules without compromising agronomic safety, KrishiMitra implements an XGBoost gradient-boosted decision tree classifier [2] operating as an independent second opinion. A dual-model gating pipeline dynamically selects between the 7-feature Full Classifier (crop_xgb.pkl) when laboratory soil tests are provided, and the 4-feature Climate Classifier (crop_xgb_climate.pkl) when soil nutrients are absent. Softmax probabilities generate top-5 rankings, and concordance with the rule engine is explicitly audited.")

add_h2("C. FAO-56 Daily Soil Water Balance & Irrigation Engine")
add_p("The Smart Irrigation Advisor (src/advisory/irrigation.py) models root-zone soil hydrology over a 7-day forecast horizon based on FAO-56 methodology [4]. Crop evapotranspiration is ETc = Kc × ET0. Total Available Water (TAW) and Readily Available Water (RAW) are derived from the 12 USDA textural classes:")
add_p("TAW = 1000 × (theta_FC - theta_WP) × Zr,   RAW = p × TAW          (2)", style='equation', align=WD_ALIGN_PARAGRAPH.CENTER)
add_p("where root depth Zr = 0.5 m and depletion fraction p = 0.5. Daily root-zone depletion Dr updates recursively:")
add_p("Dr,t = min(TAW, max(0, Dr,t-1 + ETc,t - Peff,t))          (3)", style='equation', align=WD_ALIGN_PARAGRAPH.CENTER)
add_p("If Dr,t > RAW, an irrigation event is triggered. Gross irrigation accounts for application efficiency (Drip 90%, Sprinkler 75%, Flood 60%): Gross = Net / eta_sys. Total volumetric demand across farm area A is V = Gross × 10 × A (in m³).")

add_h2("D. Explainable AI via SHAP")
add_p("For models utilizing machine learning inference (specifically the yield regressor), KrishiMitra implements SHAP (TreeExplainer) [3] to allocate credit among input features based on cooperative game theory:")
add_p("g(z') = phi_0 + Sum_(j=1)^M phi_j z'_j          (4)", style='equation', align=WD_ALIGN_PARAGRAPH.CENTER)
add_p("decomposing yield predictions into exact quantitative contributions (t/ha added or subtracted relative to base expectations).")

# SECTION V
add_h1("V. IMPLEMENTATION DETAILS")
add_p("KrishiMitra is engineered as a full-stack, modular client-server application. The backend application service is built on FastAPI (Python 3.14) and Uvicorn. State persistence, caching, and API health tracking are governed by SQLite. The presentation tier is constructed using React 19, TypeScript, Vite, and Tailwind CSS v4, adhering to the Stitch Design System. The following listings demonstrate authentic source code implementations.")

add_code_block("""# Listing 1: Multiplicative Scoring & Irrigation Gap Bypass (crop_rules.py)
def evaluate_crop(crop: str, features: dict, sources: dict, irrigated: bool, season: dict) -> dict:
    reqs = CROP_KNOWLEDGE[crop]
    score = 1.0; attribution = []
    for key, label in FACTOR_LABELS.items():
        val = features.get(key); lo, hi = reqs[RANGE_KEYS[key]]
        if val is None: continue
        entry = {"factor": key, "value": val, "min": lo, "max": hi}
        if lo <= val <= hi:
            entry["multiplier"] = 1.0
        elif val < lo and key == "rainfall" and irrigated:
            entry["status"] = "met_by_irrigation"  # Gap bypassed by irrigation
        else:
            m = max(0.2, 1.0 - (lo - val)/lo) if val < lo else max(0.2, 1.0 - (val - hi)/hi)
            entry["multiplier"] = round(m, 3); score *= m
        attribution.append(entry)
    return {"agronomic_score": round(score, 3), "attribution": attribution}""")

add_code_block("""# Listing 2: FAO-56 Daily Water Balance Iteration (irrigation.py)
for d in valid:
    p_val = d.get("precip") or 0.0
    peff = EFFECTIVE_RAIN_FRACTION * p_val if p_val >= EFFECTIVE_RAIN_THRESHOLD_MM else 0.0
    etc = kc * d["et0"]
    dr = min(taw, max(0.0, dr + etc - peff))
    net = gross = 0.0
    if dr > raw:
        net = dr; gross = net / efficiency if efficiency else net; dr = 0.0
        if first_irrigation is None:
            first_irrigation = {"date": d["date"], "gross_mm": round(gross, 1)}
    tot["etc"] += etc; tot["gross_irrigation"] += gross""")

add_code_block("""# Listing 3: Yield Model Inference, SHAP Hook, and Fallback Routing (yield_service.py)
def estimate_yield(crop: str, agronomic_score: float, with_shap: bool = False) -> dict:
    year = datetime.date.today().year
    if ml_supports(crop):
        model, meta = _yield_model()
        row = pd.DataFrame([[0.0] * len(meta["features"])], columns=meta["features"])
        row["Year"] = year; row[f"Crop_{crop}"] = 1.0
        pred_t = float(model.predict(row)[0]) / 10000
        out = {"value_t_ha": round(pred_t, 2), "method": "ml", "reliability": model_info()["reliability"]}
        if with_shap: out["shap"] = _shap(model, row)
        return out
    ref = FINANCIAL_KNOWLEDGE.get(crop)
    return {"value_t_ha": round(ref["expected_yield_t_ha"] * agronomic_score, 2),
            "method": "reference", "reliability": "Indicative"}""")

# SECTION VI
add_h1("VI. EXPERIMENTAL SETUP AND EVALUATION")
add_p("To verify reproducible system behavior, offline model evaluations were executed in an isolated experiment harness (docs/research_paper/experiments/run_experiments.py). For classification tasks, the 2,200 instances were partitioned via stratified random splitting into 80% training (N=1760) and 20% holdout testing (N=440) using random seed 42. Hyperparameters for XGBClassifier were fixed: n_estimators = 200, max_depth = 4, learning_rate = 0.1, and multi-class log-loss objective. Generalization stability was confirmed via Stratified 5-Fold Cross-Validation across the entire dataset. Regression evaluation was executed on data/faostat_sample.csv. All 24 unit tests in tests/test_core.py were executed to validate boundary conditions.")

# SECTION VII
add_h1("VII. RESULTS AND DISCUSSION")
add_h2("A. Crop Classifier Empirical Performance")
add_p("Table III reports the empirical evaluation metrics obtained for both XGBoost classifier variants on the 440-sample holdout test partition.")

# TABLE III
t3 = doc.add_table(rows=7, cols=4)
t3.alignment = WD_TABLE_ALIGNMENT.CENTER
t3_headers = ["Metric", "Full Variant (7 feats)", "Climate Variant (4 feats)", "Delta"]
t3_data = [
    ("Input Features", "N, P, K, T, H, pH, Rain", "T, H, pH, Rain", "-3 Nutrients"),
    ("Test Accuracy", "98.86 % (435/440)", "94.09 % (414/440)", "-4.77 %"),
    ("Macro Precision", "98.94 %", "94.20 %", "-4.74 %"),
    ("Macro Recall", "98.86 %", "94.09 %", "-4.77 %"),
    ("Macro F1 Score", "98.85 %", "94.01 %", "-4.84 %"),
    ("5-Fold CV Mean ± Std", "99.27 % ± 0.33 %", "95.82 % ± 0.53 %", "-3.45 %")
]
for col_idx, h in enumerate(t3_headers):
    cell = t3.cell(0, col_idx)
    cell.paragraphs[0].text = h
    cell.paragraphs[0].runs[0].font.bold = True
    cell.paragraphs[0].runs[0].font.size = Pt(7.5)
    set_cell_background(cell, "E2E8F0")
    set_cell_margins(cell, top=80, bottom=80, left=100, right=100)

for r_idx, row in enumerate(t3_data):
    for c_idx, val in enumerate(row):
        cell = t3.cell(r_idx + 1, c_idx)
        cell.paragraphs[0].text = val
        cell.paragraphs[0].runs[0].font.size = Pt(7)
        set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
        if r_idx % 2 == 1:
            set_cell_background(cell, "F8FAFC")

add_p("TABLE III: Crop Classifier Empirical Metrics (Holdout Test N=440)", style='figure caption', align=WD_ALIGN_PARAGRAPH.CENTER)

# Embed Confusion Matrix and Comparison Plot
if os.path.exists("docs/research_paper/results/confusion_matrix_full.png"):
    p_cm = doc.add_paragraph()
    p_cm.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_cm = p_cm.add_run()
    run_cm.add_picture("docs/research_paper/results/confusion_matrix_full.png", width=Inches(3.35))
    add_p("Fig. 3. Confusion matrix heatmap for the 7-feature XGBoost crop recommendation classifier (N=440).", style='figure caption', align=WD_ALIGN_PARAGRAPH.CENTER)

if os.path.exists("docs/research_paper/results/crop_model_comparison.png"):
    p_mc = doc.add_paragraph()
    p_mc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_mc = p_mc.add_run()
    run_mc.add_picture("docs/research_paper/results/crop_model_comparison.png", width=Inches(3.35))
    add_p("Fig. 4. Comparative evaluation across performance metrics for the Full vs Climate crop classifier variants.", style='figure caption', align=WD_ALIGN_PARAGRAPH.CENTER)

add_h2("B. Empirical Audit of Crop Yield Regression")
add_p("The experimental reproduction of yield_xgb.pkl on data/faostat_sample.csv yielded: Total Dataset Size = 20 rows (N_train = 16, N_test = 4); MAE = 309.99 hg/ha (0.031 t/ha); RMSE = 467.60 hg/ha (0.047 t/ha); and Coefficient of Determination (R²) = -5.328.")
add_p("A negative R² indicates that the trained regression model performs worse than simply predicting the historical sample mean. Inspection of faostat_sample.csv reveals that 15 of the 20 rows repeat identical placeholder values (Rice yields fixed at 27,000 hg/ha for years 2010–2015 and 2021–2029). Furthermore, the model contains zero environmental features (lacking rainfall, temperature, soil texture, and fertilizer data). Rather than concealing this result, KrishiMitra's architecture explicitly documents this limitation. Predictions from yield_xgb are programmatically tagged as Low Reliability (R² < 0.3), and the system falls back to deterministic reference yields scaled by agronomic suitability scores, which are transparently labeled as Indicative.")

add_h2("C. Comparison with Published Works")
add_p("Table IV situates KrishiMitra's experimental results within the broader landscape of published literature.")

# TABLE IV
t4 = doc.add_table(rows=4, cols=6)
t4.alignment = WD_TABLE_ALIGNMENT.CENTER
t4_headers = ["Study", "Task", "Dataset", "Metric", "Published Result", "KrishiMitra Result"]
t4_data = [
    ("Pudumalar (2016) [1]", "Crop Rec.", "Tamil Nadu Soil", "Accuracy", "~88.0 %", "98.86% (Full) / 94.09% (Clim)"),
    ("Nishant (2020) [10]", "Yield Pred.", "District Stats", "R² Score", "R² = 0.78 (RF)", "R² = -5.33 (Prototype)"),
    ("Medar (2019) [11]", "Yield Pred.", "Karnataka Stats", "RMSE", "Lowest RMSE (RF)", "RMSE = 0.047 t/ha (Constrained)")
]
for col_idx, h in enumerate(t4_headers):
    cell = t4.cell(0, col_idx)
    cell.paragraphs[0].text = h
    cell.paragraphs[0].runs[0].font.bold = True
    cell.paragraphs[0].runs[0].font.size = Pt(7.5)
    set_cell_background(cell, "E2E8F0")
    set_cell_margins(cell, top=80, bottom=80, left=100, right=100)

for r_idx, row in enumerate(t4_data):
    for c_idx, val in enumerate(row):
        cell = t4.cell(r_idx + 1, c_idx)
        cell.paragraphs[0].text = val
        cell.paragraphs[0].runs[0].font.size = Pt(7)
        set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
        if r_idx % 2 == 1:
            set_cell_background(cell, "F8FAFC")

add_p("TABLE IV: Qualified Comparison with Reported Results from Published Literature", style='figure caption', align=WD_ALIGN_PARAGRAPH.CENTER)

add_h2("D. System Verification and Interface Demonstration")
add_p("The platform was subjected to end-to-end runtime verification across 10 distinct interfaces. All 24 unit tests in tests/test_core.py passed in 5.33 seconds, validating core mathematical algorithms, boundary conditions, and cache resilience. Table V summarizes the operational verification status.")

# TABLE V
t5 = doc.add_table(rows=9, cols=4)
t5.alignment = WD_TABLE_ALIGNMENT.CENTER
t5_headers = ["Capability", "Code Location", "Demonstrated Result", "Verification Status"]
t5_data = [
    ("Location Geocoding", "src/data/geocode.py", "Maps lat/lon to district/state with 30-d cache", "Verified & Operational"),
    ("Soil Pedology", "src/data/hwsd.py", "Reads 1.86 GB raster; provides USDA texture & pH", "Verified & Operational"),
    ("Crop Recommendation", "src/advisory/crop_rules.py", "Evaluates 12 crops; enforces >= 40% cutoff", "Verified & Operational"),
    ("ML Second Opinion", "src/models/crop_ml.py", "Outputs top-5 crops + concordance flag", "Verified & Operational"),
    ("Water Balance", "src/advisory/irrigation.py", "Computes Dr, triggers irrigation events", "Verified & Operational"),
    ("Hazard Risk Alerts", "src/advisory/risk.py", "Categorizes heat, frost, gale, and IMD rain", "Verified & Operational"),
    ("Model Cards", "src/services/model_cards.py", "Exposes hyperparameters, metrics, and health", "Verified & Operational"),
    ("PDF Reporting", "frontend/src/pages/ReportsPage.tsx", "Client-side jsPDF agronomic report synthesis", "Verified & Operational")
]
for col_idx, h in enumerate(t5_headers):
    cell = t5.cell(0, col_idx)
    cell.paragraphs[0].text = h
    cell.paragraphs[0].runs[0].font.bold = True
    cell.paragraphs[0].runs[0].font.size = Pt(7.5)
    set_cell_background(cell, "E2E8F0")
    set_cell_margins(cell, top=80, bottom=80, left=100, right=100)

for r_idx, row in enumerate(t5_data):
    for c_idx, val in enumerate(row):
        cell = t5.cell(r_idx + 1, c_idx)
        cell.paragraphs[0].text = val
        cell.paragraphs[0].runs[0].font.size = Pt(7)
        set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
        if r_idx % 2 == 1:
            set_cell_background(cell, "F8FAFC")

add_p("TABLE V: End-to-End Capability and Verification Matrix", style='figure caption', align=WD_ALIGN_PARAGRAPH.CENTER)

# Embed Live Screenshot Evidence
if os.path.exists("docs/research_paper/figures/screenshots/dashboard.png"):
    p_dash = doc.add_paragraph()
    p_dash.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_dash = p_dash.add_run()
    run_dash.add_picture("docs/research_paper/figures/screenshots/dashboard.png", width=Inches(3.35))
    add_p("Fig. 5. Live KrishiMitra dashboard cockpit displaying farm location telemetry, active risk status, canonical crop recommendation, and irrigation countdown.", style='figure caption', align=WD_ALIGN_PARAGRAPH.CENTER)

if os.path.exists("docs/research_paper/figures/screenshots/crop_advisor.png"):
    p_crop = doc.add_paragraph()
    p_crop.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_crop = p_crop.add_run()
    run_crop.add_picture("docs/research_paper/figures/screenshots/crop_advisor.png", width=Inches(3.35))
    add_p("Fig. 6. Crop Advisor interface showing ranked suitability scores, factor attribution badges, sowing countdowns, and the XGBoost ML second opinion.", style='figure caption', align=WD_ALIGN_PARAGRAPH.CENTER)

if os.path.exists("docs/research_paper/figures/screenshots/irrigation_advisor.png"):
    p_irr = doc.add_paragraph()
    p_irr.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_irr = p_irr.add_run()
    run_irr.add_picture("docs/research_paper/figures/screenshots/irrigation_advisor.png", width=Inches(3.35))
    add_p("Fig. 7. FAO-56 Smart Irrigation Advisor showing 7-day soil water balance budget, root-zone depletion curves, and gross volumetric irrigation demand.", style='figure caption', align=WD_ALIGN_PARAGRAPH.CENTER)

if os.path.exists("docs/research_paper/figures/screenshots/yield_prediction.png"):
    p_yd = doc.add_paragraph()
    p_yd.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_yd = p_yd.add_run()
    run_yd.add_picture("docs/research_paper/figures/screenshots/yield_prediction.png", width=Inches(3.35))
    add_p("Fig. 8. Crop yield prediction dashboard featuring SHAP feature attribution waterfall and suitability sensitivity sliders.", style='figure caption', align=WD_ALIGN_PARAGRAPH.CENTER)

# SECTION VIII
add_h1("VIII. LIMITATIONS AND THREATS TO VALIDITY")
add_p("Rigorous scientific reporting requires transparent acknowledgment of limitations:\n"
      "1) Benchmark vs Real-World Distribution Shift: The 98.86% classification accuracy is measured on the Atharva Ingle / Kaggle benchmark dataset. This dataset features clean, discrete Gaussian clusters across environmental variables with zero missing values. Real-world agricultural plots exhibit significant spatial heterogeneity, micro-topographic variations, and measurement noise that will inevitably degrade out-of-sample field accuracy.\n"
      "2) Crop Yield Training Scale Deficit: The XGBoost yield regressor is trained on a 20-row national FAOSTAT sample containing 15 flat placeholder repeats, yielding a negative R² (-5.33). While KrishiMitra gracefully falls back to deterministic reference yields, the machine learning yield prediction component must be considered an experimental prototype until calibrated on multi-year, district-level panel data.\n"
      "3) Absence of Longitudinal Field Trials: While KrishiMitra has been thoroughly verified through software unit tests, integration suites, and browser-driven interface audits, it has not undergone multi-season randomized controlled agronomic field trials. The system demonstrated here is an operational decision support software platform, not a validated biological intervention.\n"
      "4) Third-Party API Dependency & Latency: The system relies on external cloud APIs (Open-Meteo, NASA POWER, Agmarknet). Although SQLite caching and exponential backoff mitigate short-term outages, sustained network disconnects or breaking upstream API schema changes will limit real-time data freshness in rural environments.\n"
      "5) Uncalibrated Model Probabilities: Softmax output probabilities from the XGBoost classifier represent relative margin distances rather than true Bayesian posterior probabilities of crop success. They should not be interpreted by agricultural extension workers as calibrated real-world confidence intervals.")

# SECTION IX
add_h1("IX. CONCLUSION AND FUTURE WORK")
add_p("This paper presented KrishiMitra, an explainable, multi-source Agricultural Decision Support System that synthesizes live numerical weather predictions, satellite agroclimatology, local memory-mapped soil rasters, and market modal prices into a cohesive agronomic advisory platform. Addressing the critical limitations of prior \"black-box\" systems, KrishiMitra implements an ensemble hybrid architecture where a transparent, deterministic rules engine (KM-Rules 2.1) enforces physiological thresholds and Indian seasonal crop calendars as the primary decision authority, while dual-variant XGBoost classifiers provide an independent second opinion (achieving 98.86% accuracy with laboratory soil tests and 94.09% accuracy without). Dynamic irrigation scheduling is operationalized via the international standard FAO-56 daily root-zone soil water balance, translating reference evapotranspiration into volumetric irrigation water demand (m³/ha).")
add_p("Future work will focus on: 1) Ingesting multi-decade district-level agricultural census data (e.g., ICRISAT-VDSA) to replace the prototype yield sample with a robust spatio-temporal yield regressor; 2) Integrating satellite multispectral imagery (Sentinel-2 NDVI / NDRE) to track real-time crop vegetation health and canopy development; 3) Deploying localized edge-IoT soil sensor nodes for real-time in-situ soil moisture calibration; and 4) Developing localized, multilingual speech interfaces to enhance usability among non-literate smallholder farming communities.")

# ACKNOWLEDGMENT
add_h1("ACKNOWLEDGMENT")
add_p("The authors acknowledge the open-access data providers that made this research possible: the Food and Agriculture Organization (FAO), International Institute for Applied Systems Analysis (IIASA), NASA Langley Research Center POWER Project, Open-Meteo, OpenStreetMap contributors, and the Open Government Data (OGD) Platform India.")

# REFERENCES
add_h1("REFERENCES")
refs = [
    "[1] S. Pudumalar, E. Ramanujam, R. H. Rajashree, C. Kavya, T. Kiruthika, and J. Nisha, \"Crop recommendation system for precision agriculture,\" in 2016 Eighth International Conference on Advanced Computing (ICoAC), Chennai, India: IEEE, 2016, pp. 32–36. doi: 10.1109/ICoAC.2017.7951740.",
    "[2] T. Chen and C. Guestrin, \"XGBoost: A Scalable Tree Boosting System,\" in Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining, San Francisco, CA, USA: ACM, 2016, pp. 785–794. doi: 10.1145/2939672.2939785.",
    "[3] S. M. Lundberg and S.-I. Lee, \"A Unified Approach to Interpreting Model Predictions,\" in Advances in Neural Information Processing Systems 30 (NeurIPS 2017), I. Guyon et al., Eds., Curran Associates, Inc., 2017, pp. 4768–4777. [Online]. Available: https://arxiv.org/abs/1705.07874.",
    "[4] R. G. Allen, L. S. Pereira, D. Raes, and M. Smith, Crop evapotranspiration - Guidelines for computing crop water requirements, ser. FAO Irrigation and Drainage Paper No. 56. Rome, Italy: Food and Agriculture Organization of the United Nations, 1998, ISBN: 92-5-104219-5.",
    "[5] T. van Klompenburg, A. Kassahun, and Ç. Çatal, \"Crop yield prediction using machine learning: A systematic literature review,\" Computers and Electronics in Agriculture, vol. 177, p. 105709, 2020. doi: 10.1016/j.compag.2020.105709.",
    "[6] Z. Zhai, J.-F. Martínez, V. Beltran, and N. L. Martínez, \"Decision support systems for agriculture 4.0: Survey and challenges,\" Computers and Electronics in Agriculture, vol. 170, p. 105256, 2020. doi: 10.1016/j.compag.2020.105256.",
    "[7] F. Nachtergaele, H. van Velthuizen, L. Verelst, D. Wiberg, M. Henry, F. Chiozza, and Y. Yigini, \"Harmonized World Soil Database version 2.0,\" Food and Agriculture Organization of the United Nations and International Institute for Applied Systems Analysis, Rome and Laxenburg, Tech. Rep., 2023. doi: 10.4060/cc3823en.",
    "[8] P. Zippenfenig, \"Open-Meteo.com Weather API,\" Zenodo, 2023. doi: 10.5281/zenodo.7970649.",
    "[9] A. H. Sparks, \"nasapower: A NASA POWER Global Meteorology, Surface Solar Energy and Climatology Data Client for R,\" The Journal of Open Source Software, vol. 3, no. 30, p. 1035, 2018. doi: 10.21105/joss.01035.",
    "[10] P. S. Nishant, P. Sai Venkat, B. L. Avinash, and B. Jabber, \"Crop Yield Prediction Based on Indian Agriculture Using Machine Learning,\" in 2020 International Conference for Emerging Technology (INCET), Belgaum, India: IEEE, 2020, pp. 1–4. doi: 10.1109/INCET49848.2020.9154036.",
    "[11] R. Medar, V. S. Rajpurohit, and S. Shweta, \"Crop Yield Prediction using Machine Learning Techniques,\" in 2019 IEEE 5th International Conference for Convergence in Technology (I2CT), Bombay, India: IEEE, 2019, pp. 1–5. doi: 10.1109/I2CT45611.2019.9033611.",
    "[12] T. Hengl, J. Mendes de Jesus, G. B. M. Heuvelink, et al., \"SoilGrids250m: Global gridded soil information based on machine learning,\" PLOS ONE, vol. 12, no. 2, p. e0169748, 2017. doi: 10.1371/journal.pone.0169748."
]

for ref in refs:
    p_ref = add_p(ref, style='Body Text', align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    p_ref.paragraph_format.left_indent = Inches(0.25)
    p_ref.paragraph_format.first_line_indent = Inches(-0.25)
    p_ref.runs[0].font.size = Pt(7.5)

doc.save(OUTPUT_DOCX)
print(f"Successfully generated IEEE Word manuscript: {OUTPUT_DOCX}")
