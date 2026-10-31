# KrishiMitra Cleanup Report (Final)

Oct 31, 2026

Video work is finished, and the final video is `media/KrishiMitra_Video_Final.mov`. Documents are combined into master files. Every retired markdown, JSON and text file is combined into `docs/archive/KrishiMitra_Archive_Master.md`, and those originals were then removed. Everything else that was retired is in `_deletable/`, which git ignores. Nothing else was deleted.

The earlier rename log and cleanup report are kept at the end of this file as appendices A and B.

## 1. Final video and presentation

| File | What it is |
| --- | --- |
| `media/KrishiMitra_Video_Final.mov` | **Final video**, 5:24. Renamed from `KrishiMitra_FullVideo.mov` |
| `media/KrishiMitra_Demo_Final_Silent.mp4` | Silent master, 5:30 |
| `media/KrishiMitra_Video_Final_Master.md` | File list, full narration script, timeline, feature coverage, recording summary and subtitle text |
| `docs/presentation/KrishiMitra_Presentation_Final.pptx` | The presentation used in the video |
| `docs/presentation/KrishiMitra_Script_Prompter_Final.html` | New combined prompter: the 8 slides and 11 website sections, 00:00 to 05:30 |

The old prompter covered the website only (02:00–05:30). The combined prompter adds the slides script, with each sentence's time spread across its slide by word count. The website timings are unchanged.

## 2. Master documents

| File | Holds |
| --- | --- |
| `docs/KrishiMitra_Handover_Master.md` | Technical handover, then the audio handover (now marked complete) |
| `docs/planning/KrishiMitra_Planning_Master.md` | Initial idea and implementation plan |
| `docs/research_paper/KrishiMitra_Research_Master.md` | Paper index and status, and every audit and literature ledger |
| `docs/archive/KrishiMitra_Archive_Master.md` | Every retired text file, in five parts: handover, planning, research, demo video history (v1, v2, v3, final), housekeeping |
| `docs/KrishiMitra_Cleanup_Report_Final.md` | This file |

**How the archive was checked:** every line of every retired file was searched for in the archive master. All original files matched in full. The only unmatched lines came from the in-between combined files made during this cleanup: their own titles and short introductions, and paths that had been rewritten to point at master files. The archive does not repeat those combined files, because all their content comes from the originals it includes.

**Not combined, on purpose:** files that scripts read or write (`SCREENSHOT_MANIFEST.json`, `LITERATURE_REVIEW_MATRIX.csv`, `references.bib`, `experiment_results.json`), the design system (its front matter is read by tooling), the full paper text `KrishiMitra_Paper_v1.md`, and the root `README.md`.

## 3. What is in `_deletable/`

| Folder | Size | What it holds |
| --- | --- | --- |
| `duplicate_videos/` | 67 MB | `KrishiMitra_Presentation.mov`, a byte-for-byte copy of the final video (same MD5) |
| `over_5m30_videos/` | 301 MB | v1 walkthrough (6:24) and v2 walkthrough (6:18), each with its raw capture |
| `video_work/` | 2.0 GB | Narrated 5:30 build `KrishiMitra_Demo_Final.mp4`, its narration (`.wav`, `.m4a`) and subtitles, `KrishiMitra_v3_Demo.mp4`, the old website-only prompter, and `archive/` |

`video_work/archive/` holds the v1 and v2 narration audio and scene clips, the v3 part videos, the capture sources (`web_run3/`, `show_cfr.mkv`), the audio tools and Whisper, and `old_files/` (old report drafts, slide PNGs, retired scripts, HWSD extracts and caches).

## 4. Still deletable outside `_deletable/` (your call)

| Path | Replaced by |
| --- | --- |
| `docs/research_paper/KrishiMitra_Report_v3.docx`, `.pdf`, `KrishiMitra_Manuscript_v3.docx`, `.pdf` | `docs/report/KrishiMitra_Report_Final.docx` and `.pdf` |
| `assets/images/krishimitra_architecture_v1.png` (5.2 MB) | `docs/research_paper/figures/fig1_system_architecture.png`. Nothing links to it |
| `api/__pycache__/` and other `__pycache__/` folders | Recreated automatically |

**Keep:** `data/hwsd/` (the app reads it), `data/hwsd/raw/*.zip` (to rebuild it), `docs/design/`, `docs/templates/`.

**Not updated, on purpose:** `scripts/report/build_comprehensive_report.py` lines 1751–1767 print the old audit file names in the v3 report's directory tree. Changing them would change that report.

## 5. How to delete

Back up anything you want first: git ignores `_deletable/` and `media/`, so they cannot be recovered from GitHub.

```bash
rm -rf _deletable
```

Then commit, so git records the old tracked markdown files as removed and the masters as added.

---

## Appendix A. Rename log (Oct 31, 2026)

*Source: `docs/KrishiMitra_Rename_Log.md`. Most of its actions are already done; paths in it may be out of date.*

Oct 31, 2026

Every rename made when the project moved to one naming convention. Earlier versions use `_v1`, `_v2`, `_v3`, and the current one uses `_Final`.

#### Final demo and narration

| Old path | New path |
| --- | --- |
| `media/KrishiMitra_Complete_Project_Demonstration_Narrated.mp4` | `media/KrishiMitra_Demo_Final.mp4` |
| `media/KrishiMitra_Complete_Project_Demonstration.mp4` | `media/KrishiMitra_Demo_Final_Silent.mp4` |
| `media/KrishiMitra_Narration_Subtitles.srt` | `media/KrishiMitra_Subtitles_Final.srt` |
| `media/KrishiMitra_Feature_Coverage.md` | `media/KrishiMitra_Demo_Final_Feature_Coverage.md` |
| `media/KrishiMitra_Recording_Summary.md` | `media/KrishiMitra_Demo_Final_Recording_Summary.md` |
| `media/KrishiMitra_Video_Timeline.md` | `media/KrishiMitra_Demo_Final_Timeline.md` |

#### Project documents and images

| Old path | New path |
| --- | --- |
| `docs/report/KrishiMitra_Final_Report.docx` | `docs/report/KrishiMitra_Report_Final.docx` |
| `docs/presentation/KrishiMitra_Project_Presentation_8slides.pptx` | `docs/presentation/KrishiMitra_Presentation_Final.pptx` |
| `docs/presentation/KrishiMitra_Speaking_Script.md` | `docs/presentation/KrishiMitra_Speaking_Script_Final.md` |
| `docs/research_paper/KrishiMitra_IEEE_Course_Project_Report.docx` | `docs/research_paper/KrishiMitra_Report_v3.docx` |
| `docs/research_paper/KrishiMitra_IEEE_Manuscript_Only.docx` | `docs/research_paper/KrishiMitra_Manuscript_v3.docx` |
| `docs/research_paper/KrishiMitra_IEEE_Course_Project_Report.pdf` | `docs/research_paper/KrishiMitra_Report_v3.pdf` |
| `docs/research_paper/KrishiMitra_IEEE_Manuscript_Only.pdf` | `docs/research_paper/KrishiMitra_Manuscript_v3.pdf` |
| `docs/research_paper/KrishiMitra_IEEE_Conference_Paper.md` | `docs/research_paper/KrishiMitra_Paper_v1.md` |
| `docs/research_paper/FINAL_RESEARCH_STATUS.md` | `docs/research_paper/RESEARCH_STATUS_v3.md` |
| `docs/research_paper/audit/FINAL_MANUSCRIPT_AUDIT.md` | `docs/research_paper/audit/MANUSCRIPT_AUDIT_v3.md` |
| `docs/research_paper/audit/FINAL_QUALITY_CHECKLIST.md` | `docs/research_paper/audit/QUALITY_CHECKLIST_v3.md` |
| `docs/PROJECT_HANDOVER.md` | `docs/KrishiMitra_Project_Handover.md` |
| `docs/design/DESIGN.md` | `docs/design/KrishiMitra_Design_System.md` |
| `docs/design/code.html` | `docs/design/KrishiMitra_Dashboard_Mockup.html` |
| `docs/design/screen.png` | `docs/design/KrishiMitra_Dashboard_Mockup.png` |
| `docs/planning/project_walkthrough.txt` | `docs/planning/KrishiMitra_Implementation_Plan.txt` |
| `docs/planning/rough_idea.md` | `docs/planning/KrishiMitra_Initial_Idea.md` |
| `assets/images/logo.png` | `assets/images/krishimitra_logo.png` |
| `assets/images/architecture.png` | `assets/images/krishimitra_architecture_v1.png` |

#### Earlier video versions

| Old path | New path |
| --- | --- |
| `media/archive/walkthrough_media/master_narration.mp3` | `media/archive/v1_walkthrough/KrishiMitra_Walkthrough_v1_Narration.mp3` |
| `media/archive/walkthrough_media/narration_manifest.json` | `media/archive/v1_walkthrough/KrishiMitra_Walkthrough_v1_Narration_Manifest.json` |
| `media/archive/walkthrough_media/scene_timeline.json` | `media/archive/v1_walkthrough/KrishiMitra_Walkthrough_v1_Scene_Timeline.json` |
| `media/archive/walkthrough_media/raw_video_path.txt` | `media/archive/v1_walkthrough/KrishiMitra_Walkthrough_v1_Raw_Video_Path.txt` |
| `media/archive/walkthrough_deliverables/video_metadata.json` | `media/archive/v1_walkthrough/KrishiMitra_Walkthrough_v1_Metadata.json` |
| `media/archive/walkthrough_media/audio` | `media/archive/v1_walkthrough/scene_audio` |
| `media/archive/walkthrough_media/master_narration_v2.mp3` | `media/archive/v2_walkthrough/KrishiMitra_Walkthrough_v2_Narration.mp3` |
| `media/archive/walkthrough_media/narration_manifest_v2.json` | `media/archive/v2_walkthrough/KrishiMitra_Walkthrough_v2_Narration_Manifest.json` |
| `media/archive/walkthrough_media/scene_timeline_v2.json` | `media/archive/v2_walkthrough/KrishiMitra_Walkthrough_v2_Scene_Timeline.json` |
| `media/archive/walkthrough_media/raw_video_path_v2.txt` | `media/archive/v2_walkthrough/KrishiMitra_Walkthrough_v2_Raw_Video_Path.txt` |
| `media/archive/walkthrough_v2_deliverables/video_metadata.json` | `media/archive/v2_walkthrough/KrishiMitra_Walkthrough_v2_Metadata.json` |
| `media/archive/walkthrough_media/audio_v2` | `media/archive/v2_walkthrough/scene_audio` |
| `media/archive/walkthrough_media/master_narration_v2.wav` | `media/archive/v2_walkthrough/KrishiMitra_Walkthrough_v2_Narration.wav` |
| `media/archive/walkthrough_media/raw/page@f77a0957ae617cb810039b88c34bbb49.webm` | `media/archive/v1_walkthrough/KrishiMitra_Walkthrough_v1_Raw.webm` |
| `media/archive/walkthrough_media/raw_v2/page@7fa5ff899832553b9fec2d9ba50befac.webm` | `media/archive/v2_walkthrough/KrishiMitra_Walkthrough_v2_Raw.webm` |
| `media/archive/walkthrough_deliverables/krishimitra_complete_walkthrough.mp4` | `media/archive/v1_walkthrough/KrishiMitra_Walkthrough_v1.mp4` |
| `media/archive/walkthrough_deliverables/FEATURE_COVERAGE_REPORT.md` | `media/archive/v1_walkthrough/KrishiMitra_Walkthrough_v1_Feature_Coverage.md` |
| `media/archive/walkthrough_deliverables/RECORDING_SUMMARY.md` | `media/archive/v1_walkthrough/KrishiMitra_Walkthrough_v1_Recording_Summary.md` |
| `media/archive/walkthrough_v2_deliverables/KrishiMitra_Walkthrough_Final.mp4` | `media/archive/v2_walkthrough/KrishiMitra_Walkthrough_v2.mp4` |
| `media/archive/walkthrough_v2_deliverables/KrishiMitra_Feature_Coverage.md` | `media/archive/v2_walkthrough/KrishiMitra_Walkthrough_v2_Feature_Coverage.md` |
| `media/archive/walkthrough_v2_deliverables/KrishiMitra_Recording_Summary.md` | `media/archive/v2_walkthrough/KrishiMitra_Walkthrough_v2_Recording_Summary.md` |
| `media/archive/walkthrough_v2_deliverables/KrishiMitra_Narration_Script.md` | `media/archive/v2_walkthrough/KrishiMitra_Walkthrough_v2_Narration_Script.md` |
| `media/archive/final_demonstration_deliverables/KrishiMitra_Complete_Project_Demonstration.mp4` | `media/archive/v3_demo/KrishiMitra_Demo_v3.mp4` |
| `media/archive/final_demonstration_deliverables/KrishiMitra_Feature_Coverage.md` | `media/archive/v3_demo/KrishiMitra_Demo_v3_Feature_Coverage.md` |
| `media/archive/final_demonstration_deliverables/KrishiMitra_Recording_Summary.md` | `media/archive/v3_demo/KrishiMitra_Demo_v3_Recording_Summary.md` |
| `media/archive/final_demonstration_deliverables/KrishiMitra_Video_Timeline.md` | `media/archive/v3_demo/KrishiMitra_Demo_v3_Timeline.md` |
| `media/archive/final_demonstration_deliverables/KrishiMitra_Spoken_Presentation_Script.md` | `media/archive/v3_demo/KrishiMitra_Demo_v3_Spoken_Script.md` |
| `media/archive/video_production/part1_h264.mp4` | `media/archive/v3_demo/KrishiMitra_Demo_v3_Part1_Slides.mp4` |
| `media/archive/video_production/part1_powerpoint_walkthrough.mp4` | `media/archive/v3_demo/KrishiMitra_Demo_v3_Part1_Slides_Source.mp4` |
| `media/archive/video_production/part2_h264.mp4` | `media/archive/v3_demo/KrishiMitra_Demo_v3_Part2_Website.mp4` |
| `media/archive/video_production/page@eca2839b675e63c572bd000bae9a712f.webm` | `media/archive/v3_demo/KrishiMitra_Demo_v3_Part2_Website_Raw.webm` |
| `media/archive/video_production/test_cfr.mp4` | `media/archive/v3_demo/KrishiMitra_Demo_v3_Website_Test_Encode.mp4` |
| `media/archive/video_production/concat_list.txt` | `media/archive/v3_demo/KrishiMitra_Demo_v3_Concat_List.txt` |

#### Removed project files

| Old path | New path |
| --- | --- |
| `docs/archive/KrishiMitra_IEEE_Research_Paper.docx` | `media/archive/old_files/reports/KrishiMitra_Paper_v1.docx` |
| `docs/archive/KrishiMitra_IEEE_Research_Paper.pdf` | `media/archive/old_files/reports/KrishiMitra_Paper_v1.pdf` |
| `docs/archive/KrishiMitra_IEEE_Course_Project_Report.docx` | `media/archive/old_files/reports/KrishiMitra_Report_v2.docx` |
| `docs/archive/KrishiMitra_IEEE_Manuscript_Only.docx` | `media/archive/old_files/reports/KrishiMitra_Manuscript_v2.docx` |
| `docs/archive/KrishiMitra_IEEE_Course_Project_Report.pdf` | `media/archive/old_files/reports/KrishiMitra_Report_v2.pdf` |
| `docs/archive/KrishiMitra_IEEE_Manuscript_Only.pdf` | `media/archive/old_files/reports/KrishiMitra_Manuscript_v2.pdf` |
| `docs/research_paper/results/pdf_pages` | `media/archive/old_files/reports/page_previews` |
| `ppt_slides_4k/slide_1.png` | `media/archive/old_files/slides/slide_01_4k.png` |
| `ppt_slides_export/slide_1.png` | `media/archive/old_files/slides/slide_01_hd.png` |
| `ppt_slides_4k/slide_2.png` | `media/archive/old_files/slides/slide_02_4k.png` |
| `ppt_slides_export/slide_2.png` | `media/archive/old_files/slides/slide_02_hd.png` |
| `ppt_slides_4k/slide_3.png` | `media/archive/old_files/slides/slide_03_4k.png` |
| `ppt_slides_export/slide_3.png` | `media/archive/old_files/slides/slide_03_hd.png` |
| `ppt_slides_4k/slide_4.png` | `media/archive/old_files/slides/slide_04_4k.png` |
| `ppt_slides_export/slide_4.png` | `media/archive/old_files/slides/slide_04_hd.png` |
| `ppt_slides_4k/slide_5.png` | `media/archive/old_files/slides/slide_05_4k.png` |
| `ppt_slides_export/slide_5.png` | `media/archive/old_files/slides/slide_05_hd.png` |
| `ppt_slides_4k/slide_6.png` | `media/archive/old_files/slides/slide_06_4k.png` |
| `ppt_slides_export/slide_6.png` | `media/archive/old_files/slides/slide_06_hd.png` |
| `ppt_slides_4k/slide_7.png` | `media/archive/old_files/slides/slide_07_4k.png` |
| `ppt_slides_export/slide_7.png` | `media/archive/old_files/slides/slide_07_hd.png` |
| `ppt_slides_4k/slide_8.png` | `media/archive/old_files/slides/slide_08_4k.png` |
| `ppt_slides_export/slide_8.png` | `media/archive/old_files/slides/slide_08_hd.png` |
| `test_auto_cols.docx` | `media/archive/old_files/test_outputs/test_auto_cols.docx` |
| `test_auto_cols.pdf` | `media/archive/old_files/test_outputs/test_auto_cols.pdf` |
| `test_sections.docx` | `media/archive/old_files/test_outputs/test_sections.docx` |
| `test_sections.pdf` | `media/archive/old_files/test_outputs/test_sections.pdf` |
| `test_sections.png` | `media/archive/old_files/test_outputs/test_sections.png` |
| `test_strip.docx` | `media/archive/old_files/test_outputs/test_strip.docx` |
| `test_strip.pdf` | `media/archive/old_files/test_outputs/test_strip.pdf` |
| `test_svg_fig2.png` | `media/archive/old_files/test_outputs/test_svg_fig2.png` |
| `test_svg_fitz.png` | `media/archive/old_files/test_outputs/test_svg_fitz.png` |
| `docs/research_paper/figures/screenshots/test_cdp.png` | `media/archive/old_files/test_outputs/test_cdp.png` |
| `scripts/test_auto_cols.py` | `media/archive/old_files/test_outputs/test_auto_cols.py` |
| `scripts/test_sec.py` | `media/archive/old_files/test_outputs/test_sec.py` |
| `scripts/test_strip_num.py` | `media/archive/old_files/test_outputs/test_strip_num.py` |
| `scripts/generate_narration.py` | `media/archive/old_files/scripts/generate_narration_v1.py` |
| `scripts/build_master_audio.py` | `media/archive/old_files/scripts/build_master_audio_v1.py` |
| `scripts/finalize_video.py` | `media/archive/old_files/scripts/finalize_video_v1.py` |
| `scripts/finalize_master_demonstration.py` | `media/archive/old_files/scripts/finalize_demo_v3.py` |
| `scripts/record/record_walkthrough.cjs` | `media/archive/old_files/scripts/record_walkthrough_v1.cjs` |
| `scripts/record/record_walkthrough_v2.cjs` | `media/archive/old_files/scripts/record_walkthrough_v2.cjs` |
| `scripts/record/record_krishimitra_master.cjs` | `media/archive/old_files/scripts/record_demo_v3.cjs` |
| `scripts/generate_narration_v2.py` | `media/archive/old_files/scripts/generate_narration_v2.py` |
| `scripts/build_master_audio_v2.py` | `media/archive/old_files/scripts/build_master_audio_v2.py` |
| `scripts/finalize_video_v2.py` | `media/archive/old_files/scripts/finalize_video_v2.py` |
| `scripts/append_appendices.py` | `media/archive/old_files/scripts/append_appendices.py` |
| `scripts/append_appendix_m.py` | `media/archive/old_files/scripts/append_appendix_m.py` |
| `scripts/append_appendix_n.py` | `media/archive/old_files/scripts/append_appendix_n.py` |
| `scripts/append_more_appendices.py` | `media/archive/old_files/scripts/append_more_appendices.py` |
| `scripts/apply_layout_updates.py` | `media/archive/old_files/scripts/apply_layout_updates.py` |
| `scripts/builder_class.py` | `media/archive/old_files/scripts/builder_class.py` |
| `scripts/clean_quotes.py` | `media/archive/old_files/scripts/clean_quotes.py` |
| `scripts/expand_appendix_e.py` | `media/archive/old_files/scripts/expand_appendix_e.py` |
| `scripts/extract_content.py` | `media/archive/old_files/scripts/extract_content.py` |
| `scripts/fix_listing9.py` | `media/archive/old_files/scripts/fix_listing9.py` |
| `scripts/fix_quotes_regex.py` | `media/archive/old_files/scripts/fix_quotes_regex.py` |
| `scripts/patch_converter.py` | `media/archive/old_files/scripts/patch_converter.py` |
| `scripts/patch_final_report.py` | `media/archive/old_files/scripts/patch_final_report.py` |
| `data/hwsd/raw` | `media/archive/old_files/hwsd_extracts` |
| `caches` | `media/archive/old_files/caches` |
| `frontend/dist` | `media/archive/old_files/caches/frontend_dist` |

---

## Appendix B. Earlier cleanup report (Oct 31, 2026)

*Source: `docs/KrishiMitra_Project_Cleanup_Report.md`. Most of its actions are already done; paths in it may be out of date.*

Oct 31, 2026

> Written before the rename on Oct 31, 2026, so paths below use the old names. See `KrishiMitra_Rename_Log.md`.

#### Summary

About 870 MB of the 3.2 GB project can go, almost all of it old video work and extracted soil-database files. The app itself is well organised; the clutter is around it. This report changed nothing on disk.

**Fix these four things first:**

1. **Two videos share one name.** `KrishiMitra_Demonstration_Video/` (50.2 MB, verified and used for the narration) and `final_demonstration_deliverables/` (48.3 MB, not verified) both hold `KrishiMitra_Complete_Project_Demonstration.mp4`. They are different files. Keep only the one you will submit.
2. **Your research paper has no backup.** `docs/` and 32 scripts are untracked, so they are not on GitHub.
3. **The final report is not in the project.** `KrishiMitra_Final_Report.docx` exists only in Downloads.
4. **The audio session is still running.** Leave `KrishiMitra_Demonstration_Video/`, `scripts/build_demo_video_v3.py` and `scripts/record/` alone until it finishes.

`.env` is safe: it is ignored by git and has never been committed. Untracked files are not recoverable from git, so move them to a dated folder outside the project first, and delete that folder after your evaluation.

#### Folder-by-folder review

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

#### Delete

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

#### Move, rename and combine

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

#### Ideal project structure

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
