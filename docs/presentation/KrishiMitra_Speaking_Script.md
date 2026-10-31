# KrishiMitra Speaking Script

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
