# KrishiMitra Final Video (Master)

Oct 31, 2026

The final demonstration video and everything needed to understand or rebuild it. Video work is complete.

| File | What it is | Length |
| --- | --- | --- |
| `media/KrishiMitra_Video_Final.mov` | **Final video**, the one submitted (was `KrishiMitra_FullVideo.mov`) | 5:24 |
| `media/KrishiMitra_Demo_Final_Silent.mp4` | Silent master: slides then website, no narration | 5:30 |
| `docs/presentation/KrishiMitra_Presentation_Final.pptx` | The 8-slide presentation used in the video | |
| `docs/presentation/KrishiMitra_Script_Prompter_Final.html` | Offline prompter with the whole script, 19 sections from 00:00 to 05:30 | |

The final video is also on [Google Drive](https://drive.google.com/file/d/1A8Z8P53Pe-GyHYCh7ZUpmb4MXLLrvqrE/view?usp=sharing), where it plays in the browser. GitHub only offers the `.mov` as a download.

The narration script below is the text the prompter shows. The timeline, feature coverage and recording summary describe the 5:30 slides-and-website build whose silent master is kept above. The subtitle file covers the first 2:00 only.

## Contents

1. [KrishiMitra Narration Script (Final)](#krishimitra-narration-script-final)
2. [KrishiMitra Demo Video Report (Final)](#krishimitra-demo-video-report-final)
3. [Subtitles (first 2:00)](#subtitles-first-200)

<details><summary>Combined from 3 files</summary>

- `docs/presentation/KrishiMitra_Narration_Script_Final.md`
- `media/KrishiMitra_Demo_Final_Master.md`
- `media/KrishiMitra_Subtitles_Final.srt`

</details>

---

## KrishiMitra Narration Script (Final)

*Source: `docs/presentation/KrishiMitra_Narration_Script_Final.md`*

Oct 31, 2026

The full spoken script for the 5:30 demonstration video: slides (00:00–02:00), then the website (02:00–05:30). Exact sentence timings for the website part are in the `SLIDES` JSON of `KrishiMitra_Website_Prompter_Final.html`.

### Contents

1. [KrishiMitra Speaking Script](#krishimitra-speaking-script)
2. [KrishiMitra Website Script](#krishimitra-website-script)

<details><summary>Combined from 2 files</summary>

- `docs/presentation/KrishiMitra_Speaking_Script_Final.md`
- `docs/presentation/KrishiMitra_Website_Script_Final.md`

</details>

---

### KrishiMitra Speaking Script

*Source: `docs/presentation/KrishiMitra_Speaking_Script_Final.md`*

Spoken over the first two minutes of the demonstration video. 239 words.

| Slide | Time | Spoken script |
| --- | --- | --- |
| 1 | 00:00–00:12 | Good morning. I'm Aakar Gupta, and with Prathamesh Burange, I built KrishiMitra, an agricultural decision-support system that turns scattered data into explainable advice. |
| 2 | 00:12–00:27 | Weather, soil, crop choice, irrigation and prices live apart, and many ML tools give no reasons. So we built one farm summary, with every value labelled measured, modelled, fallback or unavailable. |
| 3 | 00:27–00:45 | Our React 19 frontend calls FastAPI, which fetches every source concurrently into one canonical JSON summary. The deterministic KM-Rules 2.1 engine is authoritative for crop ranking. XGBoost is an independent second opinion that never overrides it. |
| 4 | 00:45–01:02 | Those are Open-Meteo, NASA POWER, Agmarknet, Nominatim and local HWSD soil estimates: modelled, not lab-measured. Responses are cached, SQLite logs status, and failures degrade gracefully with visible provenance. |
| 5 | 01:02–01:22 | KM-Rules scores twelve crops on agronomic suitability, checks seasonal eligibility, and shows every penalty. XGBoost reaches 98.86 percent hold-out accuracy, or 94.09 without a soil test. Those are benchmark results, not field accuracy. |
| 6 | 01:22–01:39 | Every yield estimate carries a reliability label. Trained on twenty hand-made rows, our model's R-squared is minus 5.33, so we mark it low. A simplified FAO-56 daily water balance schedules irrigation, with stated assumptions. |
| 7 | 01:39–01:51 | This is a working web application. The chart is benchmark evidence; software tests show 23 passed, one skipped. Neither is field validation. |
| 8 | 01:51–02:00 | Field trials, regional data and yield modelling come next. Here's how it makes farm intelligence more accessible, explainable and actionable. |

---

### KrishiMitra Website Script

*Source: `docs/presentation/KrishiMitra_Website_Script_Final.md`*

Spoken over the website section of the demonstration video, 02:00 to 05:30.

| Section | Time | Spoken script |
| --- | --- | --- |
| Dashboard | 02:00–02:28 | Here is the running application, using a demo farm in Nagpur. The top cards show the recommended crop, yield, irrigation need and farm risk. Data status shows every source and any fallback. Alerts come from live data, split into farm alerts and data events. Below, the seven-day forecast shows rainfall, ET-zero and soil moisture. The advisory profile shows the exact rule penalties. Every risk and alert comes from this farm's current data. |
| Crop Advisor | 02:28–03:00 | KM-Rules ranks the crops by suitability and season. Each score is explained factor by factor, with a confidence label. Sowing windows are labelled open, upcoming or off-season. The economic view uses observed mandi prices, and shows how yield, price and reference costs build up the net return. Suitability and net return are never merged into one score. XGBoost appears beside the rules, only as an opinion. The what-if tool tests rainfall and temperature, without changing the baseline. |
| Yield Prediction | 03:00–03:18 | Onion uses a reference yield, labelled indicative. Every input is listed with its source and resolution. Wheat uses the XGBoost model, but its R-squared is negative, so it's marked low reliability. SHAP shows only year and crop effects, so it explains the model, not local farming. |
| Irrigation Advisor | 03:18–03:38 | Irrigation runs a seven-day root-zone water balance. Here we see status, next date, gross depth and water volume. The chart shows rainfall, irrigation and crop water use. Irrigation triggers once depletion exceeds the threshold. The assumptions are stated, and the parameters are not calibrated with sensors. |
| Weather Intelligence | 03:38–03:54 | Weather shows current conditions and the Open-Meteo forecast. This chart tracks daily high and low temperatures. Rainfall and temperature are compared with NASA POWER climatology. The daily table and monthly climate sit at the bottom. |
| Soil Intelligence | 03:54–04:10 | Soil comes from the local HWSD dataset. The farm's cell is urban, so a nearby cell is flagged. pH, texture and organic carbon are modelled estimates, not lab measurements. A soil test from the farm can override pH and add N, P and K. |
| AI Insights & Risk | 04:10–04:30 | Seven risk categories use explicit thresholds. The timeline flags each forecast day. Each insight names the data behind it. Each risk gives a reason and a recommended action. The rules stay in charge of crop ranking. This card shows hold-out metrics: benchmark results, not field accuracy. |
| Farm Profile | 04:30–04:51 | Farm Profile sets the area, irrigation system and crop. These soil-test values are examples, and they unlock N, P and K scoring. Saving recomputes every module. The map moves the pin, but only saving applies it. You can also pick a preset or search for a place. |
| Reports | 04:51–05:05 | Reports combine everything for this farm. Each section shows if its data is ready. The PDF is built in the browser, with a JSON export too. It carries the same figures, with sources and a timestamp. |
| Settings | 05:05–05:24 | Settings control units, notifications, refresh and data sources. Every source shows its status, last update and cache time. We can inspect the raw source details. Model details and API status are here too. Clearing the farm returns to first-run setup, where we pick the saved farm again. |
| Closing | 05:24–05:30 | That is KrishiMitra: decision support that shows its evidence. Thank you. |

507 words.

---

## KrishiMitra Demo Video Report (Final)

*Source: `media/KrishiMitra_Demo_Final_Master.md`*

Oct 31, 2026

Timeline, feature coverage and recording summary for `KrishiMitra_Demo_Final.mp4`.

### Contents

1. [KrishiMitra Video Timeline](#krishimitra-video-timeline)
2. [KrishiMitra Feature Coverage](#krishimitra-feature-coverage)
3. [KrishiMitra Recording Summary](#krishimitra-recording-summary)

<details><summary>Combined from 3 files</summary>

- `media/KrishiMitra_Demo_Final_Timeline.md`
- `media/KrishiMitra_Demo_Final_Feature_Coverage.md`
- `media/KrishiMitra_Demo_Final_Recording_Summary.md`

</details>

---

### KrishiMitra Video Timeline

*Source: `media/KrishiMitra_Demo_Final_Timeline.md`*

File: `KrishiMitra_Demo_Final_Silent.mp4`  
Total duration: 05:30.000 (330.000 s, 9,900 frames at 30 fps)

#### PowerPoint section (00:00–02:00)

Slide boundaries were checked by matching frames of the exported video against the deck. Each PowerPoint transition (about 1.4 s) begins at the start time shown.

| Time | Slide | Content | Highlight ring sequence |
| --- | --- | --- | --- |
| 00:00–00:12 | 1 | Project introduction | Title and authors, no highlight ring |
| 00:12–00:27 | 2 | Problem and solution | Problem list; solution block; "every value is labelled" line |
| 00:27–00:45 | 3 | System architecture | React frontend; FastAPI backend; data integration; decision layer with KM-Rules 2.1; independent ML opinion; outputs |
| 00:45–01:02 | 4 | Data engineering and technology stack | Live services; local datasets; request pipeline; technology stack; test and modelled-soil note |
| 01:02–01:22 | 5 | Crop recommendation and ML | KM-Rules 2.1 authoritative; XGBoost variants and metrics; "never overrides"; benchmark-not-field note |
| 01:22–01:39 | 6 | Yield estimation and smart irrigation | Yield flow; R² −5.33; irrigation flow; parameters; stated assumptions |
| 01:39–01:51 | 7 | Working application and results | Application screens; classifier benchmark chart; functional tests and yield limitation |
| 01:51–02:00 | 8 | Limitations, future scope and conclusion | Limitations; future work; contribution statement |

#### Live website section (02:00–05:30)

| Time | Section | Route | Major features demonstrated |
| --- | --- | --- | --- |
| 02:00–02:28 | Dashboard | `/dashboard` | Farm context bar (location, coordinates, season, date, data freshness); four KPI cards (recommended crop, yield estimate, irrigation need, overall risk); data-status popover; notification centre with both tabs; 7-day forecast; farm advisory profile with rule-factor attribution; risk overview and active alerts |
| 02:28–03:00 | Crop Advisor | `/crop-advisor` | Ranked crops with suitability percentages and confidence labels; sowing and eligibility badges; factor breakdown; Economic view with mandi prices and cost build-up; Trade-off chart; independent ML opinion with inputs; what-if simulation |
| 03:00–03:18 | Yield Prediction | `/yield-prediction` | Recommended-crop estimate with Reference method and Indicative reliability; production estimate; full input table with sources; Wheat selected: ML model, Low reliability, R² shown; SHAP panel |
| 03:18–03:38 | Irrigation Advisor | `/irrigation-advisor` | Status, next irrigation date, gross depth, water volume, 7-day deficit; 7-day water-balance chart with tooltip; metric strip; depletion against RAW; method and assumptions; daily balance table |
| 03:38–03:54 | Weather Intelligence | `/weather-intelligence` | Current conditions; 7-day forecast and summary metrics; temperature chart with tooltip; rainfall accumulation against climatological pace; anomalies; small multiples; daily detail; monthly climatology |
| 03:54–04:10 | Soil Intelligence | `/soil-intelligence` | Location resolution with nearby-cell warning; pH, texture, sand, silt, clay, organic carbon, CEC; texture composition; suitability interpretation; crop-choice implications; farm-entered soil-test panel |
| 04:10–04:30 | AI Insights & Risk | `/ai-insights` | Current risk; risk matrix; risk timeline; actionable insights; risk evidence; model transparency; crop-classifier model card with hold-out metrics, per-crop table and confusion matrix |
| 04:30–04:51 | Farm Profile | `/farm-profile` | Area edit; irrigation change to Sprinkler; current crop; soil-test entry with example values; Save farm with recompute; map click with reverse geocoding and unsaved-location warning; location picker presets; place search with live Nominatim results |
| 04:51–05:04 | Reports | `/reports` | Section list with data readiness; None and All controls; real PDF download; JSON export; session history; two pages of the generated PDF shown |
| 05:04–05:24 | Settings | `/settings` | Unit switch °C/°F and back; notification and refresh options; data sources and provenance; raw source details for Open-Meteo; model information; API status; Choose again, Clear, first-run setup, restore saved farm |
| 05:24–05:30 | Closing screen | none | Title, contribution statement, authors, institution and decision-support note |

Section changes are 0.3 s dissolves at the moment of the real sidebar click. Slide 8 dissolves into the website over 01:59.5–02:00.0, and the title card stays until 02:02.7.

#### On-screen captions

| Time | Section | Caption |
| --- | --- | --- |
| 02:00 | Dashboard | Demo farm: Nagpur, Maharashtra. Every value shown is a live output of the running application. |
| 02:02 | Dashboard | Unified farm intelligence combining weather, soil, market and agricultural recommendations. |
| 02:05 | Dashboard | Headline results: recommended crop, yield estimate, irrigation need and overall farm risk. |
| 02:09 | Dashboard | Data status lists every source for this farm, so partial or fallback data is never hidden. |
| 02:12 | Dashboard | Alerts are evaluated from live data and separated into farm alerts and data events. |
| 02:16 | Dashboard | Seven-day forecast with rainfall, ET₀ and modelled soil moisture, each with its source. |
| 02:20 | Dashboard | Farm advisory profile: the canonical recommendation with exact rule penalties, not SHAP. |
| 02:24 | Dashboard | Risk overview and active alerts are generated from the current data for this farm. |
| 02:28 | Crop Advisor | KM-Rules 2.1 ranks crops using agronomic suitability, seasonal eligibility and available economic information. |
| 02:32 | Crop Advisor | Every score is explained factor by factor, with confidence, sowing window, weather and soil fit. |
| 02:36 | Crop Advisor | Seasonal eligibility shapes the ranking: open, upcoming and off-season windows are labelled. |
| 02:40 | Crop Advisor | Economic outlook uses observed Agmarknet mandi prices; reference prices and costs are labelled. |
| 02:47 | Crop Advisor | Suitability and net return stay separate dimensions, never merged into one score. |
| 02:52 | Crop Advisor | Independent XGBoost opinion: shown beside the rules, it never overrides the ranking. |
| 02:55 | Crop Advisor | What-if simulation varies rainfall and temperature; the baseline recommendation never changes. |
| 03:00 | Yield Prediction | Yield estimates include explicit reliability labels to distinguish indicative predictions from validated results. |
| 03:04 | Yield Prediction | Every input is listed with its value, source and resolution. Missing values are excluded, never filled. |
| 03:07 | Yield Prediction | Wheat uses the XGBoost regressor. Its hold-out R² is negative, so the estimate is labelled Low reliability. |
| 03:13 | Yield Prediction | SHAP attributes this estimate to year and crop only. It explains the model, not local agronomy. |
| 03:18 | Irrigation Advisor | A seven-day root-zone water balance estimates irrigation requirements using forecast weather and stated assumptions. |
| 03:21 | Irrigation Advisor | Status, next irrigation date, gross depth and water volume for this farm’s area and irrigation system. |
| 03:25 | Irrigation Advisor | Seven-day chart of forecast rainfall, recommended irrigation and crop water use (ETc). |
| 03:29 | Irrigation Advisor | Irrigation triggers when root-zone depletion exceeds readily available water. |
| 03:33 | Irrigation Advisor | Daily balance and stated assumptions: parameters are not calibrated with soil-moisture sensors. |
| 03:38 | Weather Intelligence | Current conditions and the seven-day Open-Meteo forecast for the selected farm. |
| 03:42 | Weather Intelligence | Daily maximum and minimum temperature across the forecast window. |
| 03:45 | Weather Intelligence | Forecast rainfall and temperature are compared with NASA POWER climatology for this month. |
| 03:49 | Weather Intelligence | Daily detail table and five-year monthly climatology for this location. |
| 03:54 | Soil Intelligence | Explore soil properties, texture, pH and source provenance using available HWSD soil information. |
| 03:57 | Soil Intelligence | Location resolution is explicit: when the farm cell has no soil data, the nearest cell is used and flagged. |
| 04:01 | Soil Intelligence | pH, texture, sand, silt, clay and organic carbon are modelled ~1 km estimates, not laboratory measurements. |
| 04:05 | Soil Intelligence | Farm-entered soil tests override HWSD pH and add N, P and K to crop scoring. |
| 04:10 | AI Insights & Risk | Evidence-backed farm risk across seven categories, each rated from explicit thresholds. |
| 04:13 | AI Insights & Risk | Risk timeline: day-by-day flags from the forecast and the water balance. |
| 04:16 | AI Insights & Risk | Actionable insights are computed from current values, and each names its data source. |
| 04:19 | AI Insights & Risk | Each risk states why it matters, what to watch, the recommended action and the data used. |
| 04:22 | AI Insights & Risk | Independent ML predictions complement the transparent rules engine without overriding its recommendations. |
| 04:25 | AI Insights & Risk | Model cards report hold-out metrics and confusion matrices: benchmark results, not field accuracy. |
| 04:30 | Farm Profile | Farm details drive every module: location, area, irrigation system and current crop. |
| 04:34 | Farm Profile | Soil-test inputs, shown here with example values, override HWSD pH and enable N, P and K scoring. |
| 04:39 | Farm Profile | Saving recomputes every module, alert and report for this farm. |
| 04:41 | Farm Profile | Clicking the map moves the farm pin and resolves the place; it applies only after saving. |
| 04:44 | Farm Profile | Farms can also be chosen from presets, device location or place search. |
| 04:51 | Reports | Generate a consolidated farm advisory report containing available agricultural insights. |
| 04:53 | Reports | Each section shows its data readiness before export: ready, partial or unavailable. |
| 04:56 | Reports | The PDF is generated in the browser; a JSON export of the same data is also available. |
| 05:00 | Reports | Generated report: the same figures as the modules, with sources and generation time stated. |
| 05:04 | Settings | Configuration: units, notifications, refresh interval, data sources and model information. |
| 05:09 | Settings | Source provenance: live status, last update, cache period and what each source contributed here. |
| 05:12 | Settings | Raw source details can be inspected for each provider. |
| 05:15 | Settings | Model information and API status are reported for the running application. |
| 05:18 | Settings | Clearing the active farm returns to first-run setup: device location or a manual choice. |

---

### KrishiMitra Feature Coverage

*Source: `media/KrishiMitra_Demo_Final_Feature_Coverage.md`*

Inventory taken from `frontend/src/App.tsx`, `lib/routes.ts`, all ten page components, the shared components and `api/main.py`. Timestamps refer to the final video.

Status key: **Interacted** means the control was operated in the recording. **Shown** means it is visible on screen but was not operated. **Not demonstrated** means it exists but does not appear.

#### Routes

| Route | Page | Status | Time |
| --- | --- | --- | --- |
| `/dashboard` | Dashboard | Interacted | 02:00–02:28 |
| `/crop-advisor` | Crop Advisor | Interacted | 02:28–03:00 |
| `/yield-prediction` | Yield Prediction | Interacted | 03:00–03:18 |
| `/irrigation-advisor` | Irrigation Advisor | Interacted | 03:18–03:38 |
| `/weather-intelligence` | Weather Intelligence | Interacted | 03:38–03:54 |
| `/soil-intelligence` | Soil Intelligence | Interacted | 03:54–04:10 |
| `/ai-insights` | AI Insights & Risk | Interacted | 04:10–04:30 |
| `/farm-profile` | Farm Profile | Interacted | 04:30–04:51 |
| `/reports` | Reports | Interacted | 04:51–05:04 |
| `/settings` | Settings | Interacted | 05:04–05:24 |
| `/` | Redirects to `/dashboard` | Redirect only, not separately shown | none |
| `*` | Unknown paths redirect to `/dashboard` | Redirect only, not separately shown | none |
| No route | First-run setup screen (no farm selected) | Interacted | 05:19–05:22 |

#### Features

| Area | Feature | Status | Time |
| --- | --- | --- | --- |
| Top bar | Page title and module context | Shown | 02:00 onward |
| Top bar | Place search with live Nominatim results | Interacted | 04:47–04:50 |
| Top bar | Farm picker: presets, saved farm, device-location option | Interacted (opened; preset not chosen here) | 04:45–04:47 |
| Top bar | Data-status popover | Interacted | 02:09–02:12 |
| Top bar | Notification centre with Active farm alerts and Data & system tabs | Interacted | 02:12–02:16 |
| Top bar | Profile menu | Not demonstrated | none |
| Dashboard | Farm context bar | Interacted (hover) | 02:02–02:05 |
| Dashboard | Recommended crop, yield, irrigation need and risk KPI cards | Interacted (hover) | 02:05–02:09 |
| Dashboard | 7-day forecast, rainfall, ET₀, modelled soil moisture | Shown | 02:16–02:20 |
| Dashboard | Farm advisory profile and rule-factor attribution | Shown | 02:20–02:24 |
| Dashboard | Risk overview and active alerts | Shown | 02:24–02:28 |
| Dashboard | Generate report button | Shown | 02:00–02:16 |
| Crop Advisor | Ranked crops, suitability percentages, confidence labels | Shown | 02:30–02:36 |
| Crop Advisor | Factor breakdown | Interacted | 02:33–02:36 |
| Crop Advisor | Seasonal eligibility and sowing badges | Shown | 02:36–02:40 |
| Crop Advisor | Economic view, mandi prices, price source labels | Interacted | 02:40–02:45 |
| Crop Advisor | Cost and revenue build-up for a selected row | Interacted | 02:43–02:47 |
| Crop Advisor | Agronomic against economic trade-off chart | Interacted | 02:47–02:52 |
| Crop Advisor | Independent XGBoost ML opinion and its inputs | Interacted | 02:52–02:55 |
| Crop Advisor | What-if rainfall simulation with baseline comparison | Interacted | 02:55–03:00 |
| Crop Advisor | What-if temperature slider and Reset to baseline | Shown | 02:57–03:00 |
| Yield | Estimate, production, reliability label, method | Shown | 03:01–03:04 |
| Yield | Input table with source and resolution | Shown | 03:04–03:07 |
| Yield | Crop selector, Wheat ML model, Low reliability, R² | Interacted | 03:07–03:13 |
| Yield | SHAP panel, historical trend, prediction against historical range, sensitivity panel | Shown | 03:13–03:18 |
| Irrigation | Status, next date, gross depth, water volume, deficit | Interacted (hover) | 03:19–03:25 |
| Irrigation | 7-day water balance chart with tooltip | Interacted (hover) | 03:25–03:29 |
| Irrigation | Metric strip, depletion against RAW, method and assumptions | Shown | 03:29–03:33 |
| Irrigation | Daily balance table | Shown | 03:33–03:38 |
| Weather | Current conditions and 7-day forecast | Shown | 03:39–03:42 |
| Weather | Temperature chart with tooltip | Interacted (hover) | 03:42–03:45 |
| Weather | Rainfall accumulation, anomalies, agricultural implications | Shown | 03:45–03:49 |
| Weather | Small-multiple charts, daily detail, monthly climatology | Shown | 03:47–03:54 |
| Soil | Location resolution and nearby-cell warning | Shown | 03:55–04:01 |
| Soil | pH, texture, sand, silt, clay, organic carbon, CEC | Shown | 04:01–04:05 |
| Soil | Texture composition, suitability interpretation, crop implications | Shown | 04:02–04:10 |
| Soil | Soil-test panel | Shown | 04:05–04:10 |
| Soil | Refresh soil data button | Shown, not clicked | 03:55–04:01 |
| AI Insights | Current risk and risk matrix with seven categories | Shown | 04:11–04:13 |
| AI Insights | Risk timeline | Shown | 04:13–04:16 |
| AI Insights | Top actionable insights | Shown | 04:16–04:19 |
| AI Insights | Risk evidence | Shown | 04:19–04:22 |
| AI Insights | Explainability and model transparency | Shown | 04:22–04:25 |
| AI Insights | Model card: metrics, per-crop table, confusion matrix | Interacted | 04:25–04:29 |
| AI Insights | Other model cards (rules, yield, irrigation, soil, risk, economics) | Not demonstrated (info buttons shown) | 04:22–04:25 |
| Farm Profile | Area, irrigation system, current crop | Interacted (area and irrigation edited) | 04:31–04:34 |
| Farm Profile | Soil-test entry (N, P, K, pH), example values | Interacted | 04:34–04:39 |
| Farm Profile | Save and recompute | Interacted | 04:39–04:41 |
| Farm Profile | Map click, reverse geocoding, unsaved-location warning | Interacted | 04:41–04:45 |
| Farm Profile | Farm context panel | Partly shown (heading only) | 04:31–04:50 |
| Reports | Section selection and data readiness | Interacted | 04:52–04:56 |
| Reports | PDF download | Interacted | 04:56–04:58 |
| Reports | JSON export | Interacted | 04:58–05:00 |
| Reports | Session history and generated PDF pages | Shown | 05:00–05:04 |
| Settings | Temperature unit switch | Interacted | 05:05–05:08 |
| Settings | Rainfall, area and yield unit options; reset to metric | Shown | 05:05–05:09 |
| Settings | Notification toggles, refresh interval, Refresh now | Shown | 05:05–05:10 |
| Settings | Data sources and provenance | Shown | 05:09–05:12 |
| Settings | Raw source details | Interacted | 05:12–05:15 |
| Settings | Refresh source and provider site links | Shown, not clicked | 05:09–05:12 |
| Settings | Model information and application status | Shown | 05:15–05:18 |
| Settings | Choose again, Clear, first-run setup | Interacted | 05:18–05:22 |
| First run | Device-location detection path | Not demonstrated (option shown) | 05:19–05:22 |

#### Backend endpoints exercised during the recording

`/api/farm/summary`, `/api/advisory/crop`, `/api/advisory/yield`, `/api/sources`, `/api/sources/{source_id}/raw`, `/api/models/{model_id}`, `/api/health`.

Not called in the recording: `/api/sources/{source_id}/refresh`, `/api/weather/forecast`, `/api/soil/properties`, `/api/models`.

#### Coverage notes

- All ten routes and the first-run screen appear.
- The profile menu is the only top-bar control not opened. It only links to pages already shown.
- Outage paths such as "Retry failed source" did not occur because the sources were available. The soil nearby-cell fallback did occur and is shown.

---

### KrishiMitra Recording Summary

*Source: `media/KrishiMitra_Demo_Final_Recording_Summary.md`*

#### Video specifications

| Item | Requirement | Measured with ffprobe / ffmpeg |
| --- | --- | --- |
| File | `KrishiMitra_Demo_Final_Silent.mp4` | Present, 50,198,197 bytes |
| Duration | 5:30 | 330.000 s |
| Frames | 9,900 at 30 fps | 9,900 decoded, constant 30 fps |
| Resolution | 1920 × 1080, 16:9 | 1920 × 1080, progressive |
| Codec | H.264 | H.264 High, level 4.2, yuv420p, BT.709 |
| Audio | None | 0 audio streams; the file has 1 stream, the video |
| PowerPoint section | 00:00–02:00 | Slide 1 starts at 00:00; slide 8 has dissolved out by 02:00 |
| Website section | 02:00–05:30 | Live application fully on screen from 02:00 |

#### Recording method

**PowerPoint.** The deck was run in real PowerPoint presentation mode from a read-only copy and captured from the 1920 × 1080 screen with ffmpeg `gdigrab`, then converted to constant 30 fps. The slides, their order and PowerPoint's own transitions are unchanged. A rust-coloured highlight ring was added afterwards to direct attention. It is a video overlay only; the deck was not edited. Slide 1 has no ring.

**Website.** The real React frontend (`localhost:5173`) and FastAPI backend (`localhost:8000`) ran locally. Headless Google Chrome was driven by Playwright and recorded in real time with Chrome's screencast (2,922 JPEG frames, quality 95, 1920 × 979, browser zoom 110 %). Pages and server responses were pre-loaded just before recording, so navigation is not interrupted by first-load delays. The pointer is a drawn indicator that follows the real mouse events, and gold ripples mark real clicks.

**Data.** Every number on screen is what the application returned during the recording on 31 October 2026, shortly after midnight IST. No caption quotes a value typed in from an earlier run.

**Editing.** Captions sit in a 101 px band below the page, so they never cover the application. The title card briefly overlaps the dashboard at 02:00–02:03. Two pages of the PDF generated in the recording are shown over the Reports page at 05:00–05:04. A closing screen fills 05:24–05:30.

#### Encoding

`libx264`, preset `slow`, CRF 16, High profile, level 4.2, yuv420p, BT.709, `+faststart`, `-an`. Average bitrate about 1.2 Mbit/s.

#### Confirmation of silent video

The encoder ran with `-an` and no audio input. ffprobe reports 0 audio streams. The file contains no narration, TTS, music, sound effects or microphone audio.

#### Final verification results

| Check | Result |
| --- | --- |
| All eight slides, correct order | Passed. Frame matching at 1 s sampling places the slides in order, changing at about 00:12, 00:27, 00:45, 01:02, 01:22, 01:39 and 01:51 |
| Slide readability | Passed. Frames reviewed at 1920 × 1080; colours within ±1 of PowerPoint's export |
| All routes demonstrated | Passed. 10 of 10, plus first-run setup |
| Scripted interactions | Passed. 0 failed steps and 0 late steps in the final take |
| Application errors in the take | No page errors. 3 in-flight requests were cancelled by the app when superseded (`net::ERR_ABORTED`), with no visible effect |
| Black frames | 0 detected |
| Freeze over 8 s | One: slide 1, the planned 12 s |
| Decode errors | 0 across all 9,900 frames |
| PDF output | Real 4-page PDF and JSON export produced in the take |
| Originals | Presentation and earlier recordings not modified |

Review used sampled frames across the whole video and full-size frames at key moments. Watching it through in real time has not been done.

#### Edits and inputs to be aware of

- **Demo farm.** Nagpur preset, set to 2 ha, Drip and Cotton before recording. During Farm Profile it is changed to 2.5 ha and Sprinkler.
- **Example soil test.** N 110, P 60, K 90 and pH 6.5 are example inputs, not measurements, and the caption says so. They were chosen inside the rule ranges for the recommended crop. In a rehearsal, N 240, P 18, K 210 and pH 7.2 dropped the top crop to 12 %.
- **Search result hold.** Nominatim answered 0.3 s before the next step. From 04:49.4 to 04:50.4 the real results frame is held, removing about 0.8 s of waiting. This is the only time edit in the website section.
- **Map click.** The pin moved at 04:41 is left unsaved, as the on-screen warning states.

#### Application behaviour visible in the video

These are real outputs. The application was not changed.

- **Forecast starts on 30 October.** The recording ran shortly after midnight IST, when the Open-Meteo daily series still began on Fri Oct 30. The app therefore shows "Today" on the second card and a next irrigation date of Fri Oct 30, one day before the recording date.
- **"All 6 categories rated".** The Reports page shows this hard-coded text (`ReportsPage.tsx`, line 28), while the risk engine and the captions use seven categories.
- **ML opinion is "Not directly comparable".** The rules pick, Onion, is not one of the classifier's 22 classes, so the app reports no agreement or disagreement.
- **Slide 7 differs from the live result.** Its screenshots show Sugarcane, while the live farm in the video shows Onion. The two use different farm settings, but the cause of the difference was not investigated.

#### Reproduction

- `scripts/video/record_demo.cjs`: live capture
- `scripts/video/render_overlays.cjs`: caption bands, title card and closing screen
- `scripts/video/build_demo_video.py`: final composition and encode
- `.claude/launch.json`: added `backend-py314`, because the backend dependencies are installed for Python 3.14 and not for the default `python` (3.13)

---

## Subtitles (first 2:00)

*Source: `media/KrishiMitra_Subtitles_Final.srt`*

```text
﻿1
00:00:00,500 --> 00:00:01,400
Good morning.

2
00:00:01,510 --> 00:00:05,460
I'm Aakar Gupta, and with Prathamesh Burange, I built KrishiMitra,

3
00:00:05,720 --> 00:00:07,700
an agricultural decision-support system

4
00:00:07,720 --> 00:00:10,852
that turns scattered data into explainable advice.

5
00:00:12,500 --> 00:00:16,360
Weather, soil, crop choice, irrigation and prices live apart,

6
00:00:16,380 --> 00:00:18,702
and many ML tools give no reasons.

7
00:00:19,200 --> 00:00:20,660
So we built one farm summary,

8
00:00:20,680 --> 00:00:25,007
with every value labelled measured, modelled, fallback or unavailable.

9
00:00:27,500 --> 00:00:30,220
Our React 19 frontend calls FastAPI,

10
00:00:30,240 --> 00:00:32,420
which fetches every source concurrently

11
00:00:32,440 --> 00:00:34,633
into one canonical JSON summary.

12
00:00:34,800 --> 00:00:37,180
The deterministic KM-Rules 2.1 engine

13
00:00:37,200 --> 00:00:39,612
is authoritative for crop ranking,

14
00:00:39,800 --> 00:00:41,500
and we also use XGBoost,

15
00:00:41,520 --> 00:00:44,604
which is an independent second opinion that never overrides it.

16
00:00:45,500 --> 00:00:49,480
Those are Open-Meteo, NASA POWER, Agmarknet, Nominatim

17
00:00:49,860 --> 00:00:53,690
and local HWSD soil estimates: modelled, not lab-measured.

18
00:00:54,000 --> 00:00:56,400
Responses are cached, SQLite logs status,

19
00:00:56,420 --> 00:00:59,700
and failures degrade gracefully with visible provenance.

20
00:01:02,400 --> 00:01:05,780
KM-Rules scores twelve crops on agronomic suitability,

21
00:01:06,020 --> 00:01:09,150
checks seasonal eligibility, and shows every penalty.

22
00:01:09,500 --> 00:01:13,240
XGBoost reaches 98.86 percent hold-out accuracy,

23
00:01:13,260 --> 00:01:16,334
or 94.09 without a soil test.

24
00:01:17,200 --> 00:01:19,806
Those are benchmark results, not field accuracy.

25
00:01:22,400 --> 00:01:25,795
Every yield estimate carries a reliability label.

26
00:01:25,950 --> 00:01:28,320
Trained on twenty hand-made rows,

27
00:01:28,500 --> 00:01:32,534
our model's R-squared is minus 5.33, so we mark it low.

28
00:01:32,700 --> 00:01:35,480
A simplified FAO-56 daily water balance

29
00:01:35,500 --> 00:01:38,281
schedules irrigation, with stated assumptions.

30
00:01:39,900 --> 00:01:41,815
This is a working web application.

31
00:01:43,600 --> 00:01:45,532
The chart is benchmark evidence;

32
00:01:46,000 --> 00:01:48,863
software tests show 23 passed, one skipped.

33
00:01:49,050 --> 00:01:50,645
Neither is field validation.

34
00:01:51,000 --> 00:01:54,295
Field trials, regional data and yield modelling come next.

35
00:01:54,900 --> 00:01:56,620
Here's how it makes farm intelligence

36
00:01:56,640 --> 00:01:59,409
more accessible and explainable and actionable.
```
