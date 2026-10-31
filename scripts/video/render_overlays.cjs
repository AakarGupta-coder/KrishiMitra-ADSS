// Renders the caption bands, title card and closing screen used by build_demo_video.py.
// Text comes from the caption events logged during the live recording, so overlays match what was on screen.
// Usage: node render_overlays.cjs <run_dir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RUN = path.resolve(process.argv[2]);
const OUT = path.join(RUN, 'post');
fs.mkdirSync(OUT, { recursive: true });
const { events } = JSON.parse(fs.readFileSync(path.join(RUN, 'capture.json'), 'utf8'));

const BAND_H = 101;
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const band = (section, route, index, total, caption) => `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
*{box-sizing:border-box;margin:0}html,body{width:1920px;height:${BAND_H}px;overflow:hidden}
.b{width:1920px;height:${BAND_H}px;background:#14382B;color:#fff;display:grid;grid-template-columns:330px 1fr 330px;align-items:center;font-family:Manrope,sans-serif;border-top:1px solid #0D2A20}
.s{padding-left:34px;height:60px;display:flex;flex-direction:column;justify-content:center;border-right:1px solid rgba(255,255,255,.16)}
.e{font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:600;letter-spacing:1.4px;color:#E3B04B;text-transform:uppercase}
.n{font-size:24px;font-weight:800;letter-spacing:-.2px;margin-top:3px}
.c{padding:0 34px;font-size:22px;line-height:30px;font-weight:600;color:#F6F1E7;letter-spacing:-.1px}
.r{padding-right:34px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:14.5px;font-weight:500;color:#A9C4B5}
</style></head><body><div class="b">
<div class="s"><div class="e">Live application · ${index}/${total}</div><div class="n">${esc(section)}</div></div>
<div class="c">${esc(caption)}</div>
<div class="r">localhost:5173${route}</div>
</div></body></html>`;

const title = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
*{box-sizing:border-box;margin:0}html,body{background:transparent;width:1920px;height:1080px;overflow:hidden}
.w{position:absolute;left:0;right:0;top:372px;display:flex;justify-content:center}
.t{background:#14382Bf2;border:1px solid #E3B04B;border-radius:18px;padding:34px 74px;text-align:center;color:#fff;font-family:Manrope,sans-serif;box-shadow:0 24px 60px rgba(13,42,32,.42)}
.h{font-size:44px;font-weight:800;letter-spacing:2.2px}
.s{margin-top:10px;font-size:20px;font-weight:600;color:#E3B04B}
</style></head><body><div class="w"><div class="t"><div class="h">LIVE APPLICATION DEMONSTRATION</div>
<div class="s">The running KrishiMitra website · live data recorded 31 October 2026</div></div></div></body></html>`;

const closing = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
*{box-sizing:border-box;margin:0}html,body{width:1920px;height:1080px;overflow:hidden}
.c{width:1920px;height:1080px;position:relative;background:#F6F0E4;font-family:Manrope,sans-serif;color:#1F3D2D;overflow:hidden}
.sun{position:absolute;right:230px;top:120px;width:190px;height:190px;border-radius:50%;background:#E3B04B}
.h1{position:absolute;left:-180px;bottom:-250px;width:1300px;height:470px;border-radius:50%;background:#1F3D2D}
.h2{position:absolute;right:-220px;bottom:-290px;width:1400px;height:470px;border-radius:50%;background:#4E8A3C}
.i{position:absolute;left:150px;top:190px;width:1500px}
.k{font-family:Georgia,serif;font-weight:700;font-size:96px;letter-spacing:1px;color:#1F3D2D}
.r{width:210px;height:9px;background:#E3B04B;margin:18px 0 34px}
.t{font-family:Georgia,serif;font-size:42px;line-height:58px;max-width:1240px}
.a{margin-top:40px;font-size:25px;font-weight:800}
.v{margin-top:6px;font-size:21px;font-weight:600;color:#47604F}
.d{margin-top:34px;max-width:1240px;font-size:20px;line-height:30px;font-weight:600;color:#B8573A}
</style></head><body><div class="c"><div class="sun"></div><div class="h1"></div><div class="h2"></div>
<div class="i"><div class="k">KRISHIMITRA</div><div class="r"></div>
<div class="t">Making Agricultural Intelligence More Accessible, Explainable, and Actionable.</div>
<div class="a">Aakar Gupta &nbsp;·&nbsp; Prathamesh Avinash Burange</div>
<div class="v">School of Computer Science and Engineering (SCOPE) · Vellore Institute of Technology, Chennai, India</div>
<div class="d">Decision support only. Benchmark metrics are not field accuracy, and field validation remains future work.</div>
</div></div></body></html>`;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const shot = async (html, file, clip, transparent) => {
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, file), clip, omitBackground: !!transparent });
  };

  const sections = events.filter((e) => e.type === 'section');
  const captions = [];
  let sec = null;
  for (const e of events) {
    if (e.type === 'section') sec = e;
    if (e.type === 'caption') {
      const index = sections.findIndex((s) => s.name === sec.name) + 1;
      const file = `band_${String(captions.length).padStart(2, '0')}.png`;
      await shot(band(sec.name, sec.route, index, sections.length, e.text), file, { x: 0, y: 0, width: 1920, height: BAND_H });
      captions.push({ t: e.t, section: sec.name, route: sec.route, text: e.text, file });
    }
  }
  await shot(title, 'title.png', { x: 0, y: 0, width: 1920, height: 1080 }, true);
  await shot(closing, 'closing.png', { x: 0, y: 0, width: 1920, height: 1080 });
  fs.writeFileSync(path.join(OUT, 'captions.json'), JSON.stringify(captions, null, 1));
  console.log(`rendered ${captions.length} caption bands`);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
