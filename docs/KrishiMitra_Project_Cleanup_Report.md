# KrishiMitra Project Cleanup Report

Oct 31, 2026

## Summary

About 870 MB of the 3.2 GB project can go, almost all of it old video work and extracted soil-database files. The app itself is well organised; the clutter is around it. This report changed nothing on disk.

**Fix these four things first:**

1. **Two videos share one name.** `KrishiMitra_Demonstration_Video/` (50.2 MB, verified and used for the narration) and `final_demonstration_deliverables/` (48.3 MB, not verified) both hold `KrishiMitra_Complete_Project_Demonstration.mp4`. They are different files. Keep only the one you will submit.
2. **Your research paper has no backup.** `docs/` and 32 scripts are untracked, so they are not on GitHub.
3. **The final report is not in the project.** `KrishiMitra_Final_Report.docx` exists only in Downloads.
4. **The audio session is still running.** Leave `KrishiMitra_Demonstration_Video/`, `scripts/build_demo_video_v3.py` and `scripts/record/` alone until it finishes.

`.env` is safe: it is ignored by git and has never been committed. Untracked files are not recoverable from git, so move them to a dated folder outside the project first, and delete that folder after your evaluation.

## Folder-by-folder review

Largest first. Keep the app folders where they are: `api/main.py` and the code use fixed paths such as `data/...` and `models/...`.

| Folder | Size | What it holds | Verdict |
| --- | --- | --- | --- |
| `data/` | 2.1 GB | Training CSVs, app state database and the HWSD soil data (1.78 GB raster) | Keep, trim `data/hwsd/raw/` |
| `walkthrough_media/` | 288 MB | Narration audio and raw recordings for the first two walkthroughs | Delete |
| `frontend/` | 216 MB | React app, about 214 MB of it `node_modules` | Keep |
| `video_production/` | 212 MB | Intermediate files for the second final video | Delete after choosing a video |
| `KrishiMitra_Demonstration_Video/` | 135 MB | Verified video, narration and three reports | Keep, rename |
| `scripts/` | 100 MB | 34 mixed scripts, about 99 MB of `node_modules` in `record/` | Split and prune |
| `walkthrough_v2_deliverables/` | 54 MB | Old narrated walkthrough and reports | Delete |
| `walkthrough_deliverables/` | 48 MB | First walkthrough and reports | Delete |
| `final_demonstration_deliverables/` | 47 MB | Second final video, reports and a spoken script | Compare, then delete |
| `docs/` | 41 MB | Research paper, audit records, figures, results and old drafts | Keep, prune, commit |
| `.git/` | 13 MB | 22 commits; two local branches are already merged | Keep |
| `models/` | 7.4 MB | Three trained models and metadata used by the app | Keep |
| `assets/` | 6.1 MB | Images mixed with planning documents and a Word template | Split |
| `ppt_slides_4k/` | 4.0 MB | PNG exports of the eight slides | Delete |
| `ppt_slides_export/` | 1.3 MB | Smaller PNG exports of the same slides | Delete |
| `src/` | 474 KB | Backend logic in five clear packages | Keep |
| `tests/` | 124 KB | The pytest suite | Keep |
| `api/` | 72 KB | FastAPI entry point | Keep |
| `v1/` | 28 KB | First version of the project, tracked in git | Remove from working tree |
| `.pytest_cache/` | 8 KB | Test cache | Delete |
| `.claude/` | 4 KB | Launch settings with stale entries | Keep, clean |
| `.agents/` | 1 KB | One commit-message rule | Keep |

The root also holds 15 loose files. Keep `README.md`, `requirements.txt`, `.env` and `.gitignore`, move two, and delete the nine `test_*` outputs.

**Two document problems:**

- `PROJECT_HANDOVER.md` is out of date. It says 5-fold CV 99.32 % and macro F1 98.84 %, while the final report says 99.27 % and 98.85 %. It also calls the yield sample 19 rows; the report says 20.
- The second walkthrough video shows hard-coded values that do not match the app, such as Wheat at 94.2 and 3.82 t/ha. Its report also names a LightGBM yield model, which the project does not use. Do not submit it.

## Delete

The first table is safe now, because everything in it can be regenerated. The second needs one check per row.

**Safe to delete now (about 210 MB)**

| Path | Size | Why it is safe |
| --- | --- | --- |
| `data/hwsd/raw/csv/`, `HWSD2.mdb`, `HWSD2.stx` | 189 MB | Extracted copies; keep the two `.zip` files and rebuild with `scripts/hwsd/` |
| `docs/research_paper/results/pdf_pages/` | 11 MB | 24 page previews from report checks; one is an exact duplicate |
| `ppt_slides_4k/`, `ppt_slides_export/` | 5.3 MB | Exports of the presentation |
| Nine root `test_*` files | 1.6 MB | Outputs from `scripts/test_*.py` |
| `frontend/dist/` | 1.9 MB | Rebuilt by `npm run build` |
| `scripts/test_auto_cols.py`, `test_sec.py`, `test_strip_num.py` | 6 KB | Document-layout experiments |
| `docs/research_paper/figures/screenshots/test_cdp.png` | 67 KB | Test screenshot |
| `.pytest_cache/`, all `__pycache__/` folders | 0.6 MB | Recreated automatically |

**Delete after checking (about 660 MB)**

| Path | Size | Check first |
| --- | --- | --- |
| `walkthrough_media/`, `walkthrough_deliverables/`, `walkthrough_v2_deliverables/` | 390 MB | You are not submitting either old walkthrough |
| `video_production/`, `final_demonstration_deliverables/` | 259 MB | You have chosen the verified video; move `KrishiMitra_Spoken_Presentation_Script.md` out first if you want it |
| Old video scripts: `generate_narration*.py`, `build_master_audio*.py`, `finalize_video*.py`, `record_walkthrough*.cjs` | Under 0.2 MB | Delete with the folders above |
| `scripts/finalize_master_demonstration.py`, `scripts/record/record_krishimitra_master.cjs` | Under 0.1 MB | Delete only if the second video goes |
| One-off report patches: `append_*.py`, `expand_appendix_e.py`, `fix_*.py`, `clean_quotes.py`, `patch_*.py`, `apply_layout_updates.py`, `extract_content.py` | 100 KB | The final report is accepted; these only edited earlier drafts |
| `docs/archive/` | 8.4 MB | Older drafts of the paper and report; keep the folder if you may need to compare them |
| `v1/` | 28 KB | Tracked in git, so `git rm -r v1` keeps it in history; update line 78 of `README.md` |
| `src/data/soilgrids.py` | 1 KB | Only a leftover import. Change line 11 of `src/data/market.py` to import from `.hwsd`, then run the tests |
| Local branches `feature/model-metrics-info`, `fix/market-prices-and-docs` | None | Both are merged into `main`: `git branch -d <name>` |

## Move, rename and combine

Do these after the audio session finishes and the deletes are done. Paths are relative to the project root.

**Move and rename**

| From | To | Also update |
| --- | --- | --- |
| `KrishiMitra_Demonstration_Video/` | `deliverables/demo_video/` | Nothing |
| `KrishiMitra_Project_Presentation_8slides.pptx` | `docs/presentation/` | Nothing |
| `Downloads/KrishiMitra_Final_Report.docx` (copy) | `docs/report/` | Nothing |
| `PROJECT_HANDOVER.md` | `docs/PROJECT_HANDOVER.md` | Its metrics and the `assets/docs/Samples/` path on line 194 |
| `assets/docs/Samples/` | `docs/design/` | `PROJECT_HANDOVER.md` |
| `assets/docs/KrishiMitra_DA1_Report.pdf` | `docs/planning/` | Nothing |
| `assets/docs/project_walkthrough.txt` | `docs/planning/` | Nothing |
| `assets/docs/rough idea.md` | `docs/planning/rough_idea.md` | Nothing |
| `assets/docs/conference-template-a4(1).docx` | `docs/templates/conference-template-a4.docx` | `TEMPLATE_PATH` in the three report scripts below |
| `assets/images/KrishiMitra Architecture.png` | `assets/images/architecture.png` | Any link to it in `docs/research_paper/` |
| `scripts/build_comprehensive_report.py`, `builder_class.py`, `build_docx_paper.py`, `capture_website_evidence.py` | `scripts/report/` | Their paths to the template and `docs/` |
| `scripts/build_demo_video_v3.py` | `scripts/video/build_demo_video.py` | Nothing |
| `scripts/record/record_demo_v3.cjs` | `scripts/video/record_demo.cjs` | Nothing |
| `scripts/record/render_overlays_v3.cjs` | `scripts/video/render_overlays.cjs` | Nothing |
| `scripts/record/package.json`, `package-lock.json` | `scripts/video/` | Run `npm install` there, then delete `scripts/record/` |

**Combine**

- **Reports:** keep one set of timeline, coverage and recording reports in `deliverables/demo_video/`. Three folders hold similar files today.
- **Report builders:** `builder_class.py` repeats the path constants in `build_comprehensive_report.py`. Compare them and merge the shared code into one module.
- **Launch settings:** reduce `.claude/launch.json` to `backend-py314` and `frontend`. The `qa-fail-*` entries point at an old temp folder, and `backend` fails because `python` here is 3.13 without the dependencies.
- **Ignore rules:** add these to `.gitignore`, so generated files stop showing as untracked.

```
.pytest_cache/
.venv/
deliverables/
*.mp4
*.webm
*.wav
*.m4a
```

**Then commit** `docs/`, the kept scripts and the moved files. Check first that no document contains anything private, because `origin` is on GitHub.

## Ideal project structure

The root should show only the app, its data, its tooling, documents and final outputs. The target layout is about 2.3 GB, and most of that is the soil data the app needs.

```
KrishiMitra-ADSS/
├── README.md
├── requirements.txt
├── .env                     # private, ignored by git
├── .env.example             # new: variable names only, no values
├── .gitignore
├── .venv/                   # new: Python environment, ignored by git
│
├── api/                     # FastAPI entry point
├── src/                     # Backend logic
│   ├── advisory/
│   ├── data/
│   ├── features/
│   ├── models/
│   └── services/
├── frontend/                # React app
├── models/                  # Trained models and metadata
├── tests/
│
├── data/
│   ├── crop_recommendation.csv
│   ├── faostat_sample.csv
│   ├── krishimitra_state.sqlite
│   └── hwsd/
│       ├── HWSD2.bil  .hdr  .prj
│       ├── hwsd2.sqlite
│       └── raw/             # the two .zip files only
│
├── scripts/
│   ├── hwsd/                # Soil database build
│   ├── report/              # Report builders
│   └── video/               # Recording, overlays, final build
│
├── assets/
│   └── images/              # Logos and architecture image
│
├── docs/
│   ├── report/              # Final report
│   ├── presentation/        # PowerPoint and speaking script
│   ├── research_paper/      # Paper, audit, figures, literature, results
│   ├── design/              # Design system reference
│   ├── planning/            # Early ideas and DA1 report
│   ├── templates/           # Word template
│   └── PROJECT_HANDOVER.md
│
└── deliverables/            # Ignored by git; back up separately
    └── demo_video/          # Final video, narration, subtitles, reports
```

Keep `api/`, `src/`, `frontend/`, `models/`, `tests/` and the `data/` file names as they are. Add one line to `README.md` for each new `scripts/` and `docs/` folder, and remove the `v1/` line.
