"""Build the one-page course-project submission sheet (HTML and PDF).

Usage:
    python scripts/report/build_submission_sheet.py [--video URL] [--report URL]

Links left out render as "link to be added". The PDF is printed with headless
Microsoft Edge (or Chrome), so one of them must be installed.
"""

import argparse
import base64
import io
import math
import shutil
import subprocess
import tempfile
from pathlib import Path

import qrcode
import qrcode.image.svg

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "docs" / "submission"
HTML_PATH = OUT_DIR / "KrishiMitra_Submission_Sheet_Final.html"
PDF_PATH = OUT_DIR / "KrishiMitra_Submission_Sheet_Final.pdf"

GITHUB_URL = "https://github.com/AakarGupta-coder/KrishiMitra-ADSS"

TEAM = [
    ("Aakar Gupta", "24BRS1321", "aakar.gupta2024@vitstudent.ac.in"),
    ("Prathamesh Avinash Burange", "24BRS1344", "prathamesh.avinash2024@vitstudent.ac.in"),
]

GUIDE = {
    "name": "Dr. K. Vijayaprabakaran",
    "title": "Assistant Professor, Senior Grade 1",
    "dept": "School of Computer Science and Engineering (SCOPE)",
    "inst": "Vellore Institute of Technology, Chennai",
}

STATS = [
    ("5", "live data sources", "Open-Meteo · NASA POWER · HWSD v2.0 · Agmarknet · OSM"),
    ("12", "crops ranked", "KM-Rules 2.1 factor-attributed rule engine"),
    ("98.86%", "ML accuracy", "XGBoost second opinion, 22-crop benchmark hold-out"),
    ("10", "advisory modules", "Crop, yield, irrigation, soil, weather, risk and reports"),
]

BROWSERS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
]


def data_uri(path: Path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def qr_svg(url: str) -> str:
    img = qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage, box_size=10, border=0)
    buf = io.BytesIO()
    img.save(buf)
    svg = buf.getvalue().decode()
    return svg[svg.index("<svg"):]


def contour_svg() -> str:
    """Field-furrow contour lines for the hero panel."""
    w, h = 1000, 420
    paths = []
    for i in range(22):
        base = 40 + i * 18
        amp = 14 + 10 * math.sin(i * 0.7)
        phase = i * 0.45
        pts = []
        for x in range(0, w + 1, 20):
            y = base + amp * math.sin(x / 140 + phase) + 6 * math.sin(x / 47 + i)
            pts.append(f"{x},{y:.1f}")
        opacity = 0.05 + 0.13 * (i / 21)
        paths.append(
            f'<polyline points="{" ".join(pts)}" fill="none" stroke="#b9e27a" '
            f'stroke-width="1.1" stroke-opacity="{opacity:.2f}"/>'
        )
    return (
        f'<svg class="contours" viewBox="0 0 {w} {h}" preserveAspectRatio="none" '
        f'xmlns="http://www.w3.org/2000/svg">{"".join(paths)}</svg>'
    )


ICONS = {
    "code": '<path d="M8 6 2 12l6 6M16 6l6 6-6 6M14 4l-4 16"/>',
    "play": '<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4z"/>',
    "doc": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'
    '<path d="M14 2v6h6M8 13h8M8 17h6"/>',
}


def link_card(icon: str, title: str, label: str, url: str | None) -> str:
    svg = (
        '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        f'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{ICONS[icon]}</svg>'
    )
    if url:
        body = (
            f'<a class="link" href="{url}">{label}</a>'
            f'<div class="qr">{qr_svg(url)}</div>'
        )
        cls = "card"
    else:
        body = '<span class="link pending">Link to be added</span><div class="qr qr-empty"></div>'
        cls = "card"
    return f'<div class="{cls}"><div class="card-head">{svg}<span>{title}</span></div>{body}</div>'


def build_html(video_url: str | None, report_url: str | None) -> str:
    vit = data_uri(ROOT / "assets" / "images" / "vit_logo.png")
    km = data_uri(ROOT / "assets" / "images" / "krishimitra_logo.png")

    rows = "".join(
        f"<tr><td class='num'>{i:02d}</td><td class='name'>{n}</td>"
        f"<td class='reg'>{r}</td><td class='mail'>{m}</td></tr>"
        for i, (n, r, m) in enumerate(TEAM, 1)
    )
    stats = "".join(
        f"<div class='stat'><div class='big'>{b}</div><div class='lbl'>{l}</div>"
        f"<div class='sub'>{s}</div></div>"
        for b, l, s in STATS
    )
    cards = "".join([
        link_card("code", "GitHub Repository", "github.com/AakarGupta-coder/KrishiMitra-ADSS", GITHUB_URL),
        link_card("play", "Working Video (5:30)", "krishimitra_demo_video", video_url),
        link_card("doc", "Project Report (IEEE Format)", "krishimitra_report", report_url),
    ])

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>KrishiMitra Submission Sheet</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
:root {{
  --navy:#1c2a6e; --navy-2:#2b3c9a; --ink:#17201b; --muted:#5d6b62;
  --forest:#0e2a1c; --forest-2:#16402a; --leaf:#4caf50; --lime:#a5d75a; --gold:#e3a72f;
  --paper:#fbfaf4; --line:#e3e1d6;
}}
@page {{ size:A4; margin:0; }}
* {{ box-sizing:border-box; margin:0; padding:0; }}
html, body {{ width:210mm; height:297mm; }}
body {{ background:var(--paper); color:var(--ink); font:400 9.5pt/1.45 Inter, "Segoe UI", sans-serif;
  -webkit-print-color-adjust:exact; print-color-adjust:exact; }}
.page {{ position:relative; width:210mm; height:297mm; padding:11mm 13mm 9mm; overflow:hidden; display:flex; flex-direction:column; }}
.page::before {{ content:""; position:absolute; inset:5mm; border:0.6pt solid var(--line); border-radius:4mm; pointer-events:none; }}
.corner {{ position:absolute; width:16mm; height:16mm; border-color:var(--gold); border-style:solid; }}
.corner.tl {{ top:5mm; left:5mm; border-width:1.6pt 0 0 1.6pt; border-top-left-radius:4mm; }}
.corner.br {{ bottom:5mm; right:5mm; border-width:0 1.6pt 1.6pt 0; border-bottom-right-radius:4mm; }}

header {{ display:flex; align-items:center; gap:5mm; }}
header img {{ width:21mm; height:auto; }}
.inst h1 {{ font:800 21pt/1 Fraunces, Georgia, serif; color:var(--navy); letter-spacing:-0.2pt; }}
.inst .campus {{ font:600 9pt/1.3 Inter; color:var(--navy-2); letter-spacing:2.6pt; text-transform:uppercase; margin-top:1.6mm; }}
.inst .deemed {{ font-size:7.4pt; color:var(--muted); font-style:italic; margin-top:0.6mm; }}
.badge {{ margin-left:auto; text-align:right; font-size:7.2pt; letter-spacing:1.6pt; text-transform:uppercase; color:var(--muted); line-height:1.6; }}
.badge b {{ display:inline-block; color:#fff; background:var(--navy); padding:1.2mm 3mm; border-radius:10mm; letter-spacing:1.4pt; margin-bottom:1mm; font-weight:600; }}

.rule {{ height:1.2mm; margin:5mm 0 4.5mm; border-radius:1mm;
  background:linear-gradient(90deg,var(--navy) 0%,var(--navy-2) 30%,var(--leaf) 62%,var(--lime) 82%,var(--gold) 100%); }}

.school {{ text-align:center; }}
.school .s1 {{ font:700 10.5pt Inter; letter-spacing:2.4pt; color:var(--ink); }}
.school .s2 {{ margin-top:1.8mm; font:600 8.4pt Inter; letter-spacing:4pt; color:var(--leaf); text-transform:uppercase; }}
.school .s2 span {{ color:var(--gold); padding:0 2mm; }}

.hero {{ position:relative; margin-top:5mm; border-radius:5mm; overflow:hidden; color:#fff;
  background:radial-gradient(120% 140% at 85% 0%, #24603a 0%, var(--forest-2) 38%, var(--forest) 75%); padding:8mm 9mm 7mm; }}
.hero .contours {{ position:absolute; inset:0; width:100%; height:100%; }}
.hero .sun {{ position:absolute; right:-14mm; top:-18mm; width:62mm; height:62mm; border-radius:50%;
  background:radial-gradient(circle, rgba(227,167,47,.55) 0%, rgba(227,167,47,.12) 45%, rgba(227,167,47,0) 70%); }}
.hero > * {{ position:relative; }}
.hero .kicker {{ font:600 7.4pt Inter; letter-spacing:3pt; text-transform:uppercase; color:var(--lime); }}
.hero img.km {{ display:block; width:96mm; margin:3.5mm 0 3mm -1mm; filter:drop-shadow(0 1mm 2mm rgba(0,0,0,.35)); }}
.hero h2 {{ font:600 17pt/1.18 Fraunces, Georgia, serif; letter-spacing:-0.1pt; max-width:150mm; }}
.hero h2 em {{ font-style:italic; color:var(--gold); font-weight:400; }}
.hero p.lede {{ margin-top:2.6mm; max-width:158mm; color:#d7e6da; font-size:9.3pt; line-height:1.5; }}
.stats {{ display:grid; grid-template-columns:repeat(4,1fr); gap:2.6mm; margin-top:6mm; }}
.stat {{ background:rgba(255,255,255,.07); border:0.6pt solid rgba(185,226,122,.28); border-radius:3mm; padding:2.8mm 3mm; backdrop-filter:blur(2px); }}
.stat .big {{ font:800 15pt/1 Fraunces, Georgia, serif; color:#fff; }}
.stat .lbl {{ font:600 6.8pt Inter; letter-spacing:1.4pt; text-transform:uppercase; color:var(--lime); margin-top:1.3mm; }}
.stat .sub {{ font-size:6.6pt; color:#bcd0c1; line-height:1.35; margin-top:1mm; }}

.meta {{ display:flex; justify-content:center; gap:3mm; margin-top:5.5mm; }}
.chip {{ border:0.7pt solid var(--line); background:#fff; border-radius:10mm; padding:1.6mm 4.4mm; font-size:8.6pt; }}
.chip b {{ color:var(--navy); font-weight:700; margin-right:1.2mm; }}

h3.sec {{ display:flex; align-items:center; gap:3mm; margin:5.5mm 0 2.6mm; font:600 7.4pt Inter; letter-spacing:3pt; text-transform:uppercase; color:var(--muted); }}
h3.sec::after {{ content:""; flex:1; height:0.6pt; background:var(--line); }}
h3.sec i {{ width:2mm; height:2mm; border-radius:50%; background:var(--gold); }}

table {{ width:100%; border-collapse:separate; border-spacing:0; background:#fff; border:0.7pt solid var(--line); border-radius:3mm; overflow:hidden; }}
th {{ background:var(--navy); color:#fff; font:600 7pt Inter; letter-spacing:1.6pt; text-transform:uppercase; text-align:left; padding:2.4mm 4mm; }}
td {{ padding:3mm 4mm; border-top:0.6pt solid var(--line); font-size:9.6pt; }}
tr:nth-child(even) td {{ background:#f6f8f2; }}
td.num {{ font:500 8.4pt "JetBrains Mono", Consolas, monospace; color:var(--gold); width:13mm; }}
td.name {{ font-weight:600; }}
td.reg {{ font:500 9pt "JetBrains Mono", Consolas, monospace; color:var(--navy); letter-spacing:0.4pt; }}
td.mail {{ color:var(--muted); font-size:8.4pt; }}

.cards {{ display:grid; grid-template-columns:repeat(3,1fr); gap:3.4mm; }}
.card {{ position:relative; background:#fff; border:0.7pt solid var(--line); border-radius:3.4mm; padding:3.4mm 3.6mm 3.4mm; overflow:hidden; display:grid; grid-template-columns:1fr 17mm; grid-template-rows:auto 1fr; column-gap:2mm; }}
.card::before {{ content:""; position:absolute; left:0; top:0; bottom:0; width:1.1mm; background:linear-gradient(var(--leaf),var(--gold)); }}
.card-head {{ grid-column:1; display:flex; align-items:center; gap:1.8mm; font:700 8.6pt/1.25 Inter; color:var(--ink); }}
.card .ico {{ width:4.4mm; height:4.4mm; color:var(--leaf); flex:none; }}
.card .link {{ grid-column:1; align-self:end; font-size:7.4pt; color:var(--navy-2); text-decoration:underline; text-decoration-color:rgba(43,60,154,.35); word-break:break-all; margin-top:2mm; }}
.card .link.pending {{ color:var(--muted); text-decoration:none; font-style:italic; }}
.card .qr {{ grid-column:2; grid-row:1 / span 2; width:17mm; height:17mm; }}
.card .qr svg {{ width:100%; height:100%; }}
.card .qr svg path {{ fill:var(--forest); }}
.card .qr-empty {{ border:0.8pt dashed var(--line); border-radius:2mm; }}

.guide {{ margin-top:auto; display:flex; align-items:flex-end; justify-content:space-between; padding-top:5mm; }}
.guide .who .pre {{ font:600 7.2pt Inter; letter-spacing:3pt; text-transform:uppercase; color:var(--muted); }}
.guide .who .nm {{ font:700 15pt/1.2 Fraunces, Georgia, serif; color:var(--navy); margin-top:1.4mm; }}
.guide .who .d {{ font-size:8.6pt; color:var(--ink); line-height:1.5; }}
.guide .who .d span {{ color:var(--muted); }}
.stack {{ text-align:right; font-size:7pt; color:var(--muted); line-height:1.7; max-width:72mm; }}
.stack b {{ display:block; font:600 6.8pt Inter; letter-spacing:2.4pt; text-transform:uppercase; color:var(--leaf); }}
footer {{ margin-top:4mm; display:flex; justify-content:space-between; font-size:6.8pt; letter-spacing:1.4pt; text-transform:uppercase; color:#9aa39c; }}
</style></head>
<body><div class="page">
<div class="corner tl"></div><div class="corner br"></div>

<header>
  <img src="{vit}" alt="VIT logo">
  <div class="inst">
    <h1>Vellore Institute of Technology</h1>
    <div class="campus">Chennai Campus</div>
    <div class="deemed">(Deemed to be University under section 3 of UGC Act, 1956)</div>
  </div>
  <div class="badge"><b>Course Project</b><br>Final Submission<br>October 2026</div>
</header>

<div class="rule"></div>

<div class="school">
  <div class="s1">SCHOOL OF COMPUTER SCIENCE AND ENGINEERING (SCOPE)</div>
  <div class="s2">Artificial Intelligence<span>&#9670;</span>BCSE306L</div>
</div>

<section class="hero">
  {contour_svg()}
  <div class="sun"></div>
  <div class="kicker">Agricultural Decision Support System &middot; ADSS</div>
  <img class="km" src="{km}" alt="KrishiMitra">
  <h2>An Explainable, Multi-Source <em>Agricultural Decision Support System</em></h2>
  <p class="lede">A web platform that fuses live weather forecasts, NASA climatology, global soil data and
  mandi market prices into one farm summary, then turns it into explainable crop, irrigation, yield and
  risk advice for Indian farms. Every recommendation shows the factors and data sources behind it.</p>
  <div class="stats">{stats}</div>
</section>

<div class="meta">
  <div class="chip"><b>Course</b>BCSE306L &ndash; Artificial Intelligence</div>
  <div class="chip"><b>Academic Year</b>2026 &ndash; 2027</div>
</div>

<h3 class="sec"><i></i>Team Members</h3>
<table>
  <thead><tr><th>S.No.</th><th>Team Member Name</th><th>Registration No.</th><th>Email</th></tr></thead>
  <tbody>{rows}</tbody>
</table>

<h3 class="sec"><i></i>Submission Links</h3>
<div class="cards">{cards}</div>

<div class="guide">
  <div class="who">
    <div class="pre">Under the Guidance of</div>
    <div class="nm">{GUIDE["name"]}</div>
    <div class="d">{GUIDE["title"]}<br><span>{GUIDE["dept"]}<br>{GUIDE["inst"]}</span></div>
  </div>
  <div class="stack"><b>Built with</b>FastAPI &middot; React 19 &middot; TypeScript &middot; XGBoost &middot; SHAP<br>
  Open-Meteo &middot; NASA POWER &middot; FAO/IIASA HWSD v2.0 &middot; Agmarknet &middot; OpenStreetMap</div>
</div>

<footer><span>KrishiMitra &middot; ADSS</span><span>SCOPE &middot; VIT Chennai</span></footer>
</div></body></html>
"""


def print_pdf(html: Path, pdf: Path) -> None:
    browser = next((b for b in BROWSERS if Path(b).exists()), None) or shutil.which("msedge")
    if not browser:
        raise SystemExit("Edge or Chrome is needed to print the PDF.")
    # A separate profile stops a running browser from swallowing the headless call.
    with tempfile.TemporaryDirectory() as profile:
        subprocess.run(
            [browser, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
             f"--user-data-dir={profile}", "--virtual-time-budget=8000",
             f"--print-to-pdf={pdf}", html.as_uri()],
            check=True, capture_output=True, timeout=120,
        )
    if not pdf.exists():
        raise SystemExit("The browser ran but wrote no PDF.")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", help="URL of the working demo video")
    ap.add_argument("--report", help="URL of the IEEE-format project report")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    HTML_PATH.write_text(build_html(args.video, args.report), encoding="utf-8")
    print_pdf(HTML_PATH, PDF_PATH)
    print(f"Wrote {HTML_PATH.relative_to(ROOT)} and {PDF_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
