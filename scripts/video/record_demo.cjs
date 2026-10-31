// Live, real-time capture of the running KrishiMitra app for the silent demonstration video.
// Frames come from Chrome's own screencast; every value on screen is whatever the app returns during the run.
// Usage: node record_demo.cjs <output_dir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RUN = path.resolve(process.argv[2]);
const FRAMES = path.join(RUN, 'frames');
const DOWNLOADS = path.join(RUN, 'downloads');
const BASE = 'http://localhost:5173';
const API = 'http://localhost:8000';
fs.mkdirSync(FRAMES, { recursive: true });
fs.mkdirSync(DOWNLOADS, { recursive: true });

// Demo farm: the Nagpur preset, configured the way a user would in Farm Profile.
const FARM = {
  id: 'preset-nagpur', name: 'Nagpur', district: 'Nagpur', region: 'Maharashtra', lat: 21.1458, lon: 79.0882,
  area: 2, unit: 'ha', irrigationType: 'Drip', currentCrop: 'Cotton', locationSource: 'preset', presetId: 'nagpur',
  context: 'Vidarbha: cotton, soybean and orange', soilTest: {}, farmId: null,
};
const SEED = JSON.stringify({ state: { selectedFarm: FARM, savedFarm: FARM, recent: [FARM], deviceAttempted: true }, version: 2 });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let page, cdp, t0 = 0;
const events = [];
const issues = [];
const now = () => (Date.now() - t0) / 1000;

function installPointer() {
  const add = () => {
    if (document.getElementById('km-pointer')) return;
    const c = document.createElement('div');
    c.id = 'km-pointer';
    c.style.cssText = 'position:fixed;left:0;top:0;width:30px;height:30px;z-index:2147483647;pointer-events:none;transform:translate(960px,520px);will-change:transform;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));';
    c.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M4 2.5 L4 20 L8.6 15.9 L11.8 23 L15.2 21.5 L12 14.5 L18.4 14.2 Z" fill="#fff" stroke="#114232" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    const style = document.createElement('style');
    style.textContent = '@keyframes kmripple{0%{transform:translate(-50%,-50%) scale(.25);opacity:.9}100%{transform:translate(-50%,-50%) scale(1);opacity:0}}';
    document.documentElement.appendChild(style);
    document.addEventListener('mousemove', (e) => { c.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 2}px)`; }, true);
    document.addEventListener('mousedown', (e) => {
      const r = document.createElement('div');
      r.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:44px;height:44px;border:3px solid #E3B04B;border-radius:50%;z-index:2147483646;pointer-events:none;animation:kmripple .5s ease-out forwards;`;
      document.documentElement.appendChild(r);
      setTimeout(() => r.remove(), 520);
    }, true);
  };
  if (document.documentElement) add(); else document.addEventListener('DOMContentLoaded', add);
}

let cur = { x: 960, y: 520 };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

async function move(x, y, ms = 500) {
  const { x: sx, y: sy } = cur;
  const s = Date.now();
  for (;;) {
    const t = Math.min(1, (Date.now() - s) / ms);
    const e = ease(t);
    await page.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e);
    if (t >= 1) break;
    await sleep(10);
  }
  cur = { x, y };
}

async function scrollYTo(y, ms = 900) {
  await page.evaluate(([target, dur]) => new Promise((res) => {
    const from = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const to = Math.max(0, Math.min(max, target));
    const s = performance.now();
    const f = (n) => {
      const t = Math.min(1, (n - s) / dur);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      window.scrollTo(0, from + (to - from) * e);
      if (t < 1) requestAnimationFrame(f); else res();
    };
    requestAnimationFrame(f);
  }), [y, ms]);
}

async function scrollEl(loc, { offset = 84, ms = 900 } = {}) {
  const y = await loc.first().evaluate((el, o) => el.getBoundingClientRect().top + window.scrollY - o, offset);
  await scrollYTo(y, ms);
}

async function reveal(loc) {
  const b = await loc.boundingBox();
  const vh = 891;
  if (b && (b.y < 72 || b.y + b.height > vh - 12)) await scrollEl(loc, { offset: 140, ms: 500 });
}

async function hover(loc, { ms = 500, fx = 0.5, fy = 0.5 } = {}) {
  const l = loc.first();
  await l.waitFor({ state: 'visible', timeout: 6000 });
  await reveal(l);
  const b = await l.boundingBox();
  await move(b.x + b.width * fx, b.y + b.height * fy, ms);
}

async function click(loc, opts = {}) {
  await hover(loc, opts);
  await sleep(80);
  await page.mouse.down();
  await sleep(50);
  await page.mouse.up();
  await sleep(100);
}

async function at(t) {
  const left = t - now();
  if (left > 0) await sleep(left * 1000);
  else if (left < -0.35) issues.push(`late by ${(-left).toFixed(2)}s at ${t}s`);
}

const step = async (name, fn) => {
  try { await fn(); } catch (e) { issues.push(`${name}: ${String(e.message).split('\n')[0]}`); console.warn('STEP FAILED', name, String(e.message).split('\n')[0]); }
};
const section = (name, route) => { events.push({ t: now(), type: 'section', name, route }); console.log(now().toFixed(1), 'SECTION', name); };
const cap = (text) => events.push({ t: now(), type: 'caption', text });
const mark = (name) => events.push({ t: now(), type: 'mark', name });
const text = (s, exact = true) => page.getByText(s, { exact });
const nav = (label) => page.locator('aside[aria-label="Primary"] a', { hasText: label });
const go = async (label, route) => {
  section(label === 'AI Insights & Risk' ? 'AI Insights & Risk' : label, route);
  await hover(nav(label), { ms: 450 });
  await sleep(80);
  await page.mouse.down();
  await sleep(50);
  mark('nav');
  await page.mouse.up();
  await page.waitForURL(`**${route}`, { timeout: 5000 });
};

// Loads every page, map tile and cached API response first, so the recording shows normal navigation.
async function prewarm(ctx) {
  const pre = await ctx.newPage();
  const q = (extra) => `${API}/api/farm/summary?lat=21.1458&lon=79.0882&${extra}`;
  await Promise.all([
    pre.request.get(q('area=2&irrigation_type=Drip&current_crop=Cotton'), { timeout: 110000 }),
    pre.request.get(q('area=2.5&irrigation_type=Sprinkler&current_crop=Cotton&n=110&p=60&k=90&ph=6.5'), { timeout: 110000 }),
    pre.request.get(q('area=1&irrigation_type=Rainfed'), { timeout: 110000 }),
  ]);
  const y = `${API}/api/advisory/yield?lat=21.1458&lon=79.0882&area=2&irrigation_type=Drip&current_crop=Cotton`;
  await Promise.all(['Onion', 'Wheat'].map((c) => pre.request.get(`${y}&crop=${c}`, { timeout: 60000 })));
  await pre.goto(`${BASE}/dashboard`);
  await pre.evaluate(() => fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=7&accept-language=en&q=Coimbatore').catch(() => {}));
  for (const r of ['dashboard', 'crop-advisor', 'yield-prediction', 'irrigation-advisor', 'weather-intelligence', 'soil-intelligence', 'ai-insights', 'reports', 'settings', 'farm-profile']) {
    await pre.goto(`${BASE}/${r}`);
    await pre.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    await pre.waitForTimeout(300);
  }
  await pre.waitForTimeout(1500);
  await pre.close();
}

async function script() {
  // ---------- Dashboard ----------
  section('Dashboard', '/dashboard');
  cap('Demo farm: Nagpur, Maharashtra. Every value shown is a live output of the running application.');
  await at(2.8);
  cap('Unified farm intelligence combining weather, soil, market and agricultural recommendations.');
  await step('context', async () => { await hover(text('Coordinates'), { ms: 700 }); await hover(text('Data freshness'), { ms: 1000 }); });
  await at(5.6);
  cap('Headline results: recommended crop, yield estimate, irrigation need and overall farm risk.');
  await step('kpis', async () => {
    await hover(page.locator('main a[href="/crop-advisor"]'), { ms: 450 }); await sleep(250);
    await hover(page.locator('main a[href="/yield-prediction"]'), { ms: 400 }); await sleep(250);
    await hover(page.locator('main a[href="/irrigation-advisor"]'), { ms: 400 }); await sleep(250);
    await hover(page.locator('main a[href="/ai-insights"]'), { ms: 400 });
  });
  await at(9.6);
  cap('Data status lists every source for this farm, so partial or fallback data is never hidden.');
  await step('status', async () => { await click(page.getByRole('button', { name: /^Data status/ }), { ms: 450 }); });
  await at(12.6);
  await page.keyboard.press('Escape');
  cap('Alerts are evaluated from live data and separated into farm alerts and data events.');
  await step('notifications', async () => {
    await click(page.getByRole('button', { name: /^Notifications/ }), { ms: 350 });
    await sleep(1300);
    await click(page.getByRole('tab', { name: /Data & system/ }), { ms: 400 });
  });
  await at(16.6);
  await page.keyboard.press('Escape');
  cap('Seven-day forecast with rainfall, ET₀ and modelled soil moisture, each with its source.');
  await step('forecast', async () => { await scrollEl(text('7-day agro-meteorological forecast'), { offset: 92 }); await hover(text('7-day rainfall'), { ms: 500 }); });
  await at(20.4);
  cap('Farm advisory profile: the canonical recommendation with exact rule penalties, not SHAP.');
  await step('advisory', async () => { await hover(text('Rule-factor attribution'), { ms: 500 }); });
  await at(24);
  cap('Risk overview and active alerts are generated from the current data for this farm.');
  await step('risk', async () => { await scrollEl(text('Risk overview'), { offset: 92 }); await hover(text('Active alerts'), { ms: 500 }); });

  // ---------- Crop Advisor ----------
  await at(28);
  await step('nav crop', () => go('Crop Advisor', '/crop-advisor'));
  cap('KM-Rules 2.1 ranks crops using agronomic suitability, seasonal eligibility and available economic information.');
  await step('hero', async () => { await hover(text('Agronomic suitability'), { ms: 500 }); });
  await at(31.4);
  await step('top matches', async () => { await scrollEl(text('Top agronomic matches'), { offset: 80 }); });
  await at(32.6);
  cap('Every score is explained factor by factor, with confidence, sowing window, weather and soil fit.');
  await step('breakdown', async () => { await click(page.getByRole('button', { name: 'Show factor breakdown' }), { ms: 500 }); });
  await at(36.6);
  cap('Seasonal eligibility shapes the ranking: open, upcoming and off-season windows are labelled.');
  await step('rows', async () => { await scrollYTo(await page.evaluate(() => window.scrollY + 520), 1100); });
  await at(40.4);
  cap('Economic outlook uses observed Agmarknet mandi prices; reference prices and costs are labelled.');
  await step('economic', async () => {
    await scrollYTo(0, 500);
    await click(page.getByRole('tab', { name: 'Economic' }), { ms: 400 });
    await scrollEl(text('Financial crop analysis'), { offset: 80, ms: 500 });
  });
  await at(43.2);
  await step('econ row', async () => { await click(page.locator('main tr', { hasText: 'Wheat' }), { ms: 450 }); });
  await at(45);
  await step('buildup', async () => { await scrollEl(text('Cost & revenue build-up', false), { offset: 88, ms: 700 }); });
  await at(47.6);
  cap('Suitability and net return stay separate dimensions, never merged into one score.');
  await step('tradeoff', async () => {
    await scrollYTo(0, 450);
    await click(page.getByRole('tab', { name: 'Trade-off' }), { ms: 400 });
    await scrollEl(text('Agronomic vs economic trade-off'), { offset: 80, ms: 450 });
    await hover(page.locator('.recharts-scatter-symbol').nth(1), { ms: 450 });
  });
  await at(52);
  cap('Independent XGBoost opinion: shown beside the rules, it never overrides the ranking.');
  await step('ml', async () => {
    await scrollEl(text('ML opinion'), { offset: 80, ms: 600 });
    await click(page.locator('summary', { hasText: 'Inputs and model' }), { ms: 450 });
  });
  await at(55.4);
  cap('What-if simulation varies rainfall and temperature; the baseline recommendation never changes.');
  await step('what-if', async () => {
    await scrollEl(text('What-if scenario'), { offset: 96, ms: 600 });
    const s = page.locator('input[aria-label="Simulated seasonal rainfall"]');
    const b = await s.boundingBox();
    const val = Number(await s.inputValue());
    const x0 = b.x + (val / 3000) * b.width;
    await move(x0, b.y + b.height / 2, 400);
    await page.mouse.down();
    await move(x0 + b.width * 0.28, b.y + b.height / 2, 700);
    await page.mouse.up();
    await page.getByText('Baseline vs simulation').waitFor({ timeout: 2000 });
    await sleep(150);
    await scrollEl(text('What-if scenario'), { offset: 96, ms: 450 });
  });

  // ---------- Yield ----------
  await at(60);
  await step('nav yield', () => go('Yield Prediction', '/yield-prediction'));
  cap('Yield estimates include explicit reliability labels to distinguish indicative predictions from validated results.');
  await step('yield top', async () => { await hover(text('Reliability'), { ms: 600 }); });
  await at(64);
  cap('Every input is listed with its value, source and resolution. Missing values are excluded, never filled.');
  await step('yield data', async () => { await scrollEl(text('Yield prediction data'), { offset: 88 }); });
  await at(67.6);
  cap('Wheat uses the XGBoost regressor. Its hold-out R² is negative, so the estimate is labelled Low reliability.');
  await step('select wheat', async () => {
    await scrollYTo(0, 500);
    const sel = page.locator('main select');
    await click(sel, { ms: 400 });
    await page.keyboard.press('Escape');
    await sel.selectOption('Wheat');
    await sleep(500);
    await hover(text('Reliability'), { ms: 500 });
  });
  await at(73);
  cap('SHAP attributes this estimate to year and crop only. It explains the model, not local agronomy.');
  await step('shap', async () => { await scrollEl(text('Model explanation (SHAP)'), { offset: 96 }); await hover(text('Model explanation (SHAP)'), { ms: 400 }); });

  // ---------- Irrigation ----------
  await at(78);
  await step('nav irrigation', () => go('Irrigation Advisor', '/irrigation-advisor'));
  cap('A seven-day root-zone water balance estimates irrigation requirements using forecast weather and stated assumptions.');
  await step('irr status', async () => { await hover(text('Current irrigation status'), { ms: 500 }); });
  await at(81.6);
  cap('Status, next irrigation date, gross depth and water volume for this farm’s area and irrigation system.');
  await step('irr metrics', async () => {
    await hover(text('Next irrigation'), { ms: 400 }); await sleep(350);
    await hover(text('Gross depth'), { ms: 350 }); await sleep(350);
    await hover(text('Water volume'), { ms: 350 });
  });
  await at(85.4);
  cap('Seven-day chart of forecast rainfall, recommended irrigation and crop water use (ETc).');
  await step('irr chart', async () => {
    const c = page.locator('.recharts-responsive-container').first();
    const b = await c.boundingBox();
    await move(b.x + b.width * 0.12, b.y + b.height * 0.45, 500); await sleep(700);
    await move(b.x + b.width * 0.62, b.y + b.height * 0.45, 900);
  });
  await at(89);
  cap('Irrigation triggers when root-zone depletion exceeds readily available water.');
  await step('irr depletion', async () => { await scrollEl(text('Root-zone depletion vs threshold'), { offset: 170 }); });
  await at(93);
  cap('Daily balance and stated assumptions: parameters are not calibrated with soil-moisture sensors.');
  await step('irr table', async () => { await scrollEl(text('Daily balance'), { offset: 460 }); });

  // ---------- Weather ----------
  await at(98);
  await step('nav weather', () => go('Weather Intelligence', '/weather-intelligence'));
  cap('Current conditions and the seven-day Open-Meteo forecast for the selected farm.');
  await step('wx top', async () => { await hover(text('Current conditions'), { ms: 450 }); await sleep(300); await hover(text('Total rainfall'), { ms: 500 }); });
  await at(102.4);
  cap('Daily maximum and minimum temperature across the forecast window.');
  await step('wx temp', async () => {
    await scrollEl(text('Temperature'), { offset: 96 });
    const c = page.locator('.recharts-responsive-container').first();
    const b = await c.boundingBox();
    await move(b.x + b.width * 0.55, b.y + b.height * 0.4, 500);
  });
  await at(105.6);
  cap('Forecast rainfall and temperature are compared with NASA POWER climatology for this month.');
  await step('wx anomaly', async () => { await scrollEl(text('Rainfall accumulation'), { offset: 96 }); await hover(text('Rainfall vs normal'), { ms: 500 }); });
  await at(109.6);
  cap('Daily detail table and five-year monthly climatology for this location.');
  await step('wx clim', async () => { await scrollEl(text('Daily detail'), { offset: 96 }); await hover(text('Monthly climatology'), { ms: 500 }); });

  // ---------- Soil ----------
  await at(114);
  await step('nav soil', () => go('Soil Intelligence', '/soil-intelligence'));
  cap('Explore soil properties, texture, pH and source provenance using available HWSD soil information.');
  await step('soil top', async () => { await hover(text('Requested coordinate'), { ms: 500 }); await sleep(300); await hover(text('Resolved coordinate'), { ms: 400 }); });
  await at(117.4);
  cap('Location resolution is explicit: when the farm cell has no soil data, the nearest cell is used and flagged.');
  await step('soil fallback', async () => { await hover(text('Not local soil data'), { ms: 500 }); });
  await at(121);
  cap('pH, texture, sand, silt, clay and organic carbon are modelled ~1 km estimates, not laboratory measurements.');
  await step('soil metrics', async () => {
    await scrollEl(text('Soil pH (H₂O)'), { offset: 100, ms: 700 });
    await hover(text('Soil pH (H₂O)'), { ms: 350 }); await sleep(150);
    await hover(text('Sand'), { ms: 350 }); await sleep(150);
    await hover(text('Organic carbon'), { ms: 350 });
  });
  await at(125.6);
  cap('Farm-entered soil tests override HWSD pH and add N, P and K to crop scoring.');
  await step('soil test', async () => { await scrollEl(text('Soil test (farm-entered)'), { offset: 400, ms: 800 }); await hover(text('Soil test (farm-entered)'), { ms: 400 }); });

  // ---------- AI Insights & Risk ----------
  await at(130);
  await step('nav ai', () => go('AI Insights & Risk', '/ai-insights'));
  cap('Evidence-backed farm risk across seven categories, each rated from explicit thresholds.');
  await step('ai top', async () => { await hover(text('Current farm risk'), { ms: 450 }); await sleep(250); await hover(text('Risk matrix'), { ms: 450 }); });
  await at(133.6);
  cap('Risk timeline: day-by-day flags from the forecast and the water balance.');
  await step('ai timeline', async () => { await scrollEl(text('Risk timeline'), { offset: 96, ms: 700 }); });
  await at(136.6);
  cap('Actionable insights are computed from current values, and each names its data source.');
  await step('ai insights', async () => { await scrollEl(text('Top actionable insights'), { offset: 96, ms: 700 }); });
  await at(139.6);
  cap('Each risk states why it matters, what to watch, the recommended action and the data used.');
  await step('ai evidence', async () => { await scrollEl(text('Risk evidence'), { offset: 96, ms: 700 }); });
  await at(142.6);
  cap('Independent ML predictions complement the transparent rules engine without overriding its recommendations.');
  await step('ai transparency', async () => { await scrollEl(text('Model transparency'), { offset: 96, ms: 700 }); });
  await at(145);
  cap('Model cards report hold-out metrics and confusion matrices: benchmark results, not field accuracy.');
  await step('ai card', async () => {
    await click(page.getByRole('button', { name: 'About Crop classifier (XGBoost)' }).last(), { ms: 400 });
    await page.getByText('Evaluation on the held-out test set').waitFor({ timeout: 4000 });
    await page.evaluate(() => new Promise((res) => {
      const box = [...document.querySelectorAll('[role=dialog] .overflow-auto')][0];
      const h = [...box.querySelectorAll('h3')].find((x) => x.textContent.includes('Evaluation on the held-out'));
      const to = h.offsetTop - box.offsetTop - 12;
      const s = performance.now();
      const f = (n) => { const t = Math.min(1, (n - s) / 700); box.scrollTop = to * (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2); if (t < 1) requestAnimationFrame(f); else res(); };
      requestAnimationFrame(f);
    }));
  });
  await at(149.2);
  await page.keyboard.press('Escape');

  // ---------- Farm Profile ----------
  await at(150);
  await step('nav farm', () => go('Farm Profile', '/farm-profile'));
  cap('Farm details drive every module: location, area, irrigation system and current crop.');
  await step('farm fields', async () => {
    await click(page.getByLabel('Area'), { ms: 400 });
    await page.keyboard.press('Control+A');
    await page.keyboard.type('2.5', { delay: 70 });
    await sleep(150);
    const sel = page.getByLabel('Irrigation system');
    await hover(sel, { ms: 400 });
    await sel.selectOption('Sprinkler');
    await sleep(350);
    await hover(page.getByLabel('Current (standing) crop'), { ms: 400 });
  });
  await at(154.2);
  cap('Soil-test inputs, shown here with example values, override HWSD pH and enable N, P and K scoring.');
  await step('soil test entry', async () => {
    for (const [lbl, v, exact] of [['Available N', '110'], ['Available P', '60'], ['Available K', '90'], ['pH', '6.5', true]]) {
      await click(page.getByLabel(lbl, { exact: !!exact }), { ms: 280 });
      await page.keyboard.type(v, { delay: 55 });
    }
  });
  await at(159.4);
  cap('Saving recomputes every module, alert and report for this farm.');
  await step('save', async () => { await click(page.getByRole('button', { name: 'Save farm' }), { ms: 450 }); });
  await at(161.8);
  cap('Clicking the map moves the farm pin and resolves the place; it applies only after saving.');
  await step('map', async () => {
    const b = await page.locator('.leaflet-container').boundingBox();
    await move(b.x + b.width * 0.66, b.y + b.height * 0.36, 500);
    await sleep(100);
    await page.mouse.down(); await sleep(50); await page.mouse.up();
  });
  await at(164.8);
  cap('Farms can also be chosen from presets, device location or place search.');
  await step('picker', async () => { await click(page.locator('header button', { hasText: 'Nagpur' }), { ms: 500 }); });
  await at(167.2);
  await page.keyboard.press('Escape');
  await step('search', async () => {
    await click(page.locator('input[placeholder="Search city, town, or village..."]'), { ms: 400 });
    await page.keyboard.type('Coimbatore', { delay: 45 });
    await page.getByRole('dialog', { name: 'Location search results' }).getByRole('button').first().waitFor({ timeout: 2600 });
  });

  // ---------- Reports ----------
  await at(170.4);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Escape');
  await step('nav reports', () => go('Reports', '/reports'));
  cap('Generate a consolidated farm advisory report containing available agricultural insights.');
  await at(172.4);
  await step('report rows', async () => { await hover(page.locator('main label', { hasText: 'Soil' }), { ms: 500 }); });
  await at(173.6);
  cap('Each section shows its data readiness before export: ready, partial or unavailable.');
  await step('report toggles', async () => {
    await click(page.getByRole('button', { name: 'None', exact: true }), { ms: 400 });
    await sleep(350);
    await click(page.getByRole('button', { name: 'All', exact: true }), { ms: 350 });
  });
  await at(176.6);
  cap('The PDF is generated in the browser; a JSON export of the same data is also available.');
  await step('pdf', async () => { await click(page.getByRole('button', { name: 'Download PDF report' }), { ms: 500 }); mark('pdf_clicked'); });
  await at(178.8);
  await step('json', async () => { await click(page.getByRole('button', { name: 'Export JSON data' }), { ms: 400 }); });
  await at(180.2);
  mark('pdf_preview_start');
  cap('Generated report: the same figures as the modules, with sources and generation time stated.');
  await step('history', async () => { await hover(text('Generated this session'), { ms: 500 }); });
  await at(183.8);
  mark('pdf_preview_end');

  // ---------- Settings ----------
  await at(184);
  await step('nav settings', () => go('Settings', '/settings'));
  cap('Configuration: units, notifications, refresh interval, data sources and model information.');
  await step('units', async () => {
    await click(page.getByRole('tab', { name: '°F' }), { ms: 450 });
    await sleep(600);
    await click(page.getByRole('tab', { name: '°C' }), { ms: 350 });
  });
  await at(188);
  await step('refresh opt', async () => { await hover(text('Automatic refresh'), { ms: 450 }); });
  await at(189.4);
  cap('Source provenance: live status, last update, cache period and what each source contributed here.');
  await step('sources', async () => { await scrollEl(page.locator('#sources'), { offset: 84, ms: 800 }); });
  await at(192.4);
  cap('Raw source details can be inspected for each provider.');
  await step('raw', async () => {
    await click(page.getByRole('button', { name: 'View raw source details' }), { ms: 450 });
  });
  await at(195);
  await page.keyboard.press('Escape');
  cap('Model information and API status are reported for the running application.');
  await step('models', async () => { await scrollEl(page.locator('#models'), { offset: 96, ms: 800 }); await hover(text('API status'), { ms: 450 }); });
  await at(198.2);
  cap('Clearing the active farm returns to first-run setup: device location or a manual choice.');
  await step('first run', async () => {
    await click(page.getByRole('button', { name: 'Choose again' }), { ms: 450 });
    await sleep(350);
    await click(page.getByRole('button', { name: 'Clear', exact: true }), { ms: 350 });
    await page.getByText('Set up your farm location').waitFor({ timeout: 4000 });
    mark('first_run_visible');
    await sleep(900);
    await click(page.getByRole('button', { name: /Nagpur, Maharashtra/ }), { ms: 600 });
  });
  await at(202.6);
  await step('back', async () => { await click(nav('Dashboard'), { ms: 450 }); });
  await at(204.6);
  mark('live_end');
}

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome', headless: true,
    args: ['--force-device-scale-factor=1.1', '--window-size=1763,985', '--hide-scrollbars', '--mute-audio'],
  });
  const ctx = await browser.newContext({ viewport: null, acceptDownloads: true });
  await ctx.addInitScript(installPointer);
  await ctx.addInitScript((s) => { try { if (!sessionStorage.getItem('km-seeded')) { localStorage.setItem('krishimitra-farm', s); sessionStorage.setItem('km-seeded', '1'); } } catch { /* storage unavailable */ } }, SEED);
  console.log('prewarm…');
  await prewarm(ctx);

  page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`.slice(0, 200)));
  page.on('requestfailed', (r) => { if (!/tile\.openstreetmap|fonts\./.test(r.url())) errors.push(`failed: ${r.url().slice(0, 120)} ${r.failure()?.errorText}`); });
  page.on('download', async (d) => { const p = path.join(DOWNLOADS, d.suggestedFilename()); await d.saveAs(p); events.push({ t: now(), type: 'download', file: d.suggestedFilename() }); });

  await page.goto(`${BASE}/dashboard`);
  await page.getByText('Recommended crop').waitFor({ timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.mouse.move(cur.x, cur.y);
  await sleep(1200);
  console.log(await page.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio })));

  cdp = await ctx.newCDPSession(page);
  const frames = [];
  let writes = 0;
  cdp.on('Page.screencastFrame', (f) => {
    const i = frames.length;
    frames.push({ i, ts: f.metadata.timestamp });
    writes += 1;
    fs.writeFile(path.join(FRAMES, `${String(i).padStart(6, '0')}.jpg`), Buffer.from(f.data, 'base64'), () => { writes -= 1; });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  t0 = Date.now();
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: 2000, maxHeight: 1100, everyNthFrame: 2 });
  await page.mouse.move(cur.x + 1, cur.y);

  await script();

  await sleep(1000);
  await cdp.send('Page.stopScreencast');
  while (writes > 0) await sleep(50);
  fs.writeFileSync(path.join(RUN, 'capture.json'), JSON.stringify({ t0: t0 / 1000, frames, events, issues, errors }, null, 1));
  console.log(`frames ${frames.length}, end ${now().toFixed(1)}s`);
  console.log('ISSUES', issues);
  console.log('ERRORS', [...new Set(errors)].slice(0, 20));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
