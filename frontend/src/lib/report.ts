import { jsPDF } from 'jspdf';
import type { FarmSummary } from './types';
import type { FarmContext } from '../store/useFarmStore';
import { farmLabel } from '../store/useFarmStore';
import { MARKET_BASIS_LABEL, fmtAgDate, fmtCoord, fmtDateTime, fmtDayLabel, isNum } from './format';
import { weatherLabel } from './weather';
import { convRain, convTemp, convYield, localizeText, rainUnit, tempUnit, yieldUnit } from './units';
import { providerRow } from './providerStatus';

import type { SectionId } from './reportSections';

const t = (s: unknown): string =>
  localizeText(String(s ?? ''))
    .replace(/₹/g, 'Rs ')
    .replace(/ET₀/g, 'ET0')
    .replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080))
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/−/g, '-')
    .replace(/…/g, '...')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/•/g, '·')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');

const n = (v: unknown, d = 1, unit = '') => (isNum(v) ? `${v.toFixed(d)}${unit}` : 'Unavailable');
const rs = (v: unknown) => (isNum(v) ? `Rs ${Math.round(v).toLocaleString('en-IN')}` : 'Unavailable');
const pct = (v: unknown) => (isNum(v) ? `${Math.round(v * 100)}%` : 'Unavailable');

const FOREST: [number, number, number] = [17, 66, 50];
const INK: [number, number, number] = [25, 28, 26];
const MUTED: [number, number, number] = [65, 73, 68];
const HAIR: [number, number, number] = [226, 232, 222];
const CANVAS: [number, number, number] = [249, 250, 246];

class ReportWriter {
  doc = new jsPDF({ unit: 'mm', format: 'a4' });
  y = 0;
  readonly m = 16;
  readonly w = 210 - 32;
  readonly bottom = 297 - 18;

  ensure(h: number) {
    if (this.y + h > this.bottom) {
      this.doc.addPage();
      this.y = 18;
    }
  }

  header(title: string, subtitle: string, right: string[]) {
    const d = this.doc;
    d.setFillColor(...FOREST);
    d.rect(0, 0, 210, 34, 'F');
    d.setTextColor(255, 255, 255);
    d.setFont('helvetica', 'bold');
    d.setFontSize(16);
    d.text(t(title), this.m, 15);
    d.setFont('helvetica', 'normal');
    d.setFontSize(9.5);
    d.text(t(subtitle), this.m, 22);
    d.setFontSize(8.5);
    right.forEach((r, i) => d.text(t(r), 210 - this.m, 12 + i * 5, { align: 'right' }));
    this.y = 44;
  }

  section(title: string) {
    this.ensure(16);
    const d = this.doc;
    d.setDrawColor(...FOREST);
    d.setLineWidth(0.6);
    d.line(this.m, this.y, this.m + 8, this.y);
    this.y += 5;
    d.setTextColor(...FOREST);
    d.setFont('helvetica', 'bold');
    d.setFontSize(12);
    d.text(t(title), this.m, this.y);
    this.y += 6;
  }

  para(text: string, opts: { size?: number; color?: [number, number, number]; bold?: boolean; indent?: number } = {}) {
    const d = this.doc;
    d.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    d.setFontSize(opts.size ?? 9);
    d.setTextColor(...(opts.color ?? INK));
    const lines = d.splitTextToSize(t(text), this.w - (opts.indent ?? 0)) as string[];
    const lh = (opts.size ?? 9) * 0.45;
    for (const line of lines) {
      this.ensure(lh + 1);
      d.text(line, this.m + (opts.indent ?? 0), this.y);
      this.y += lh;
    }
    this.y += 1.5;
  }

  bullets(items: string[]) {
    items.forEach((i) => {
      const d = this.doc;
      this.ensure(5);
      d.setFillColor(...FOREST);
      d.circle(this.m + 1.2, this.y - 1.1, 0.6, 'F');
      this.para(i, { indent: 4 });
      this.y -= 1;
    });
    this.y += 1.5;
  }

  kv(rows: [string, string][], cols = 2) {
    const d = this.doc;
    const colW = this.w / cols;
    const rowsPerCol = Math.ceil(rows.length / cols);
    const lh = 5.2;
    this.ensure(rowsPerCol * lh + 2);
    const y0 = this.y;
    rows.forEach(([k, v], i) => {
      const c = Math.floor(i / rowsPerCol);
      const r = i % rowsPerCol;
      const x = this.m + c * colW;
      const y = y0 + r * lh;
      d.setFont('helvetica', 'normal');
      d.setFontSize(8.5);
      d.setTextColor(...MUTED);
      d.text(t(k), x, y);
      d.setTextColor(...INK);
      d.setFont('helvetica', 'bold');
      const val = d.splitTextToSize(t(v), colW * 0.55)[0] as string;
      d.text(val, x + colW - 4, y, { align: 'right' });
      d.setDrawColor(...HAIR);
      d.setLineWidth(0.2);
      d.line(x, y + 1.6, x + colW - 4, y + 1.6);
    });
    this.y = y0 + rowsPerCol * lh + 3;
  }

  table(head: string[], rows: string[][], widths: number[], align: ('l' | 'r')[] = []) {
    const d = this.doc;
    const total = widths.reduce((a, b) => a + b, 0);
    const ws = widths.map((w) => (w / total) * this.w);
    const drawHead = () => {
      d.setFillColor(...CANVAS);
      d.rect(this.m, this.y - 4, this.w, 6, 'F');
      d.setFont('helvetica', 'bold');
      d.setFontSize(7.5);
      d.setTextColor(...MUTED);
      let x = this.m;
      head.forEach((h, i) => {
        const a = align[i] === 'r';
        d.text(t(h).toUpperCase(), a ? x + ws[i] - 1.5 : x + 1.5, this.y, { align: a ? 'right' : 'left' });
        x += ws[i];
      });
      this.y += 5;
    };
    this.ensure(12);
    drawHead();
    rows.forEach((r) => {
      d.setFont('helvetica', 'normal');
      d.setFontSize(8);
      const cells = r.map((c, i) => d.splitTextToSize(t(c), ws[i] - 3) as string[]);
      const h = Math.max(...cells.map((c) => c.length)) * 3.6 + 1.6;
      if (this.y + h > this.bottom) {
        d.addPage();
        this.y = 18;
        drawHead();
      }
      let x = this.m;
      d.setTextColor(...INK);
      cells.forEach((c, i) => {
        const a = align[i] === 'r';
        c.forEach((line, li) => d.text(line, a ? x + ws[i] - 1.5 : x + 1.5, this.y + li * 3.6, { align: a ? 'right' : 'left' }));
        x += ws[i];
      });
      d.setDrawColor(...HAIR);
      d.setLineWidth(0.2);
      d.line(this.m, this.y + h - 3.2, this.m + this.w, this.y + h - 3.2);
      this.y += h;
    });
    this.y += 3;
  }

  footer(note: string) {
    const d = this.doc;
    const pages = d.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      d.setPage(i);
      d.setFont('helvetica', 'normal');
      d.setFontSize(7.5);
      d.setTextColor(...MUTED);
      d.setDrawColor(...HAIR);
      d.line(this.m, 297 - 12, 210 - this.m, 297 - 12);
      d.text(t(note), this.m, 297 - 8);
      d.text(`Page ${i} of ${pages}`, 210 - this.m, 297 - 8, { align: 'right' });
    }
  }
}

export function buildFarmReport(s: FarmSummary, farm: FarmContext, sections: Set<SectionId>): jsPDF {
  const r = new ReportWriter();
  const generated = new Date();
  const canon = s.crops.find((c) => c.crop === s.recommendation.canonical) ?? null;
  const place = farmLabel(farm);

  r.header('KRISHIMITRA Farm Intelligence Report', `${place} · ${fmtCoord(s.request.lat, s.request.lon)} · ${s.season.current_label}, planning ${s.season.planning_label}`,
    [`Generated ${generated.toLocaleString('en-IN')}`, `Data summary built ${fmtDateTime(s._meta.generated_at)}`, `KRISHIMITRA v${s._meta.version} · ${s._meta.rules_version}`]);

  r.section('Executive summary');
  if (canon) {
  r.kv([
    ['Recommended crop', `${canon.crop} (${s.season.planning_label}, sowing ${canon.sowing.window_label ?? 'unknown'})`],
    ['Agronomic suitability', `${pct(canon.agronomic_score)} · ${canon.confidence} confidence`],
    ['Economic outlook', canon.economic.observed_price ? `Net ${rs(canon.financials.net_per_ha)}/ha (${canon.economic.confidence} confidence)` : 'Not assessable: no observed price'],
    ['Estimated yield', `${n(canon.yield.value_t_ha, 2, ' t/ha')} (${canon.yield.method === 'ml' ? 'ML model' : 'reference method'})`],
    ['Estimated net return', rs(canon.financials.net_return)],
    ['Irrigation', s.irrigation.status === 'unavailable' ? 'Unavailable' : s.irrigation.next_irrigation ? `Irrigate ${fmtDayLabel(s.irrigation.next_irrigation.date)} (~${n(s.irrigation.next_irrigation.gross_mm, 0, ' mm')})` : 'Not needed in forecast window'],
    ['Overall farm risk', s.risk.overall === 'unavailable' ? 'No data' : s.risk.overall],
  ]);
  } else {
    r.kv([['Recommended crop', 'Recommendation unavailable'], ['Overall farm risk', s.risk.overall === 'unavailable' ? 'No data' : s.risk.overall]]);
  }
  r.bullets(s.recommendation.explanation);

  if (sections.has('profile')) {
    r.section('Farm profile & location');
    r.kv([
      ['Farm', place],
      ['District / state', `${s.location.district ?? 'Unavailable'} / ${s.location.state ?? 'Unavailable'}`],
      ['Coordinates', fmtCoord(s.request.lat, s.request.lon)],
      ['Location source', farm.locationSource],
      ['Area', `${n(s.request.area, 2)} ha`],
      ['Irrigation system', s.request.irrigation_type],
      ['Current crop', s.request.current_crop ?? 'Not recorded'],
      ['Soil test on record', Object.keys(s.request.soil_test).length ? Object.entries(s.request.soil_test).map(([k, v]) => `${k} ${v}`).join(', ') : 'None'],
    ]);
  }

  if (sections.has('weather')) {
    r.section('Weather: 7-day forecast');
    if (s.weather.status !== 'ok') r.para(`Open-Meteo forecast unavailable${s.weather.error ? ` (${s.weather.error})` : ''}.`);
    else {
      if (s.weather.current) r.para(`Current: ${n(s.weather.current.temperature, 1, ' °C')}, ${weatherLabel(s.weather.current.weather_code)}, humidity ${n(s.weather.current.humidity, 0, '%')}, wind ${n(s.weather.current.wind_speed, 0, ' km/h')} (${fmtDateTime(s.weather.current.time)}).`);
      const rd = rainUnit() === 'in' ? 2 : 1;
      r.table(['Date', 'Conditions', `Max ${tempUnit()}`, `Min ${tempUnit()}`, `Rain ${rainUnit()}`, 'Prob. %', 'RH %', `ET0 ${rainUnit()}`],
        s.weather.daily.map((d) => [fmtDayLabel(d.date), weatherLabel(d.weather_code), n(convTemp(d.tmax)), n(convTemp(d.tmin)), n(convRain(d.precip), rd), n(d.precip_prob, 0), n(d.rh_mean, 0), n(convRain(d.et0), 2)]),
        [26, 30, 13, 13, 14, 13, 11, 14], ['l', 'l', 'r', 'r', 'r', 'r', 'r', 'r']);
    }
  }

  if (sections.has('soil')) {
    r.section('Soil');
    const so = s.soil;
    if (so.status === 'ok' || so.status === 'fallback') {
      r.kv([
        ['pH (H2O)', `${n(so.phh2o)}${so.interpretation.ph_class ? ` · ${so.interpretation.ph_class.label}` : ''}`],
        ['Texture (USDA)', so.interpretation.texture ?? 'Unavailable'],
        ['Sand / silt / clay', `${n(so.sand, 0)} / ${n(so.silt, 0)} / ${n(so.clay, 0)} %`],
        ['Organic carbon', n(so.interpretation.organic_carbon_pct, 2, ' %')],
        ['CEC', n(so.cec, 1, ' cmol(c)/kg')],
        ['Resolved coordinate', `${fmtCoord(so.resolved_lat, so.resolved_lon)}${so.fallback_used ? ` (fallback, ${n(so.distance_km, 0)} km)` : ''}`],
      ]);
      if (so.fallback_used) r.para(`Fallback: ${so.fallback_reason}`, { color: MUTED });
      if (so.interpretation.constraints.length) r.bullets(so.interpretation.constraints.map((c) => c.text));
      if (so.interpretation.amendments.length) r.bullets(so.interpretation.amendments.map((a) => `Amendment: ${a}`));
    } else {
      r.para(`HWSD v2.0 soil data unavailable: ${(so.fallback_reason ?? 'no data').replace(/\.$/, '')}. Soil pH and texture were excluded from scoring.`);
    }
  }

  if (sections.has('crop')) {
    r.section('Crop recommendation');
    r.para(`Recommendation = highest agronomic suitability among crops sowable within 60 days (KRISHIMITRA Agronomic Rules Engine ${s._meta.rules_version}). Economic outlook is reported separately and is not merged into the score. Best net return at observed prices: ${s.recommendation.top_economic ?? 'not assessable'}.`);
    r.table(['#', 'Crop', 'Agronomic', 'Eligible', 'Net return /ha', 'Price basis', 'Sowing window'],
      s.crops.slice(0, 8).map((c) => [String(c.rank), c.crop, pct(c.agronomic_score), c.eligible ? 'Yes' : 'No', c.economic.observed_price ? rs(c.financials.net_per_ha) : 'Not assessable', c.financials.price_basis.replace('_', ' '), c.sowing.window_label ?? 'Unavailable']),
      [6, 20, 14, 12, 20, 18, 26], ['r', 'l', 'r', 'l', 'r', 'l', 'l']);
    if (canon) {
      r.para(`Why ${canon.crop}:`, { bold: true });
      r.bullets([...canon.positives, ...canon.constraints.map((c) => c.text)]);
    }
    if (canon && canon.excluded_factors.length) r.para(`Not evaluated (no data): ${canon.excluded_factors.join(', ')}.`, { color: MUTED });
  }

  if (sections.has('yield')) {
    r.section('Yield prediction');
    if (!canon) r.para('Yield prediction unavailable: no crop could be recommended from the available data.');
    else {
    r.kv([
      ['Crop', canon.crop],
      ['Predicted yield', n(canon.yield.value_t_ha, 2, ' t/ha')],
      ['Range', isNum(canon.yield.low_t_ha) ? `${n(canon.yield.low_t_ha, 2)}–${n(canon.yield.high_t_ha, 2)} t/ha` : 'Not supported by method'],
      ['Farm output', n(canon.financials.production_t, 2, ' t')],
      ['Method', canon.yield.method_label],
      ['Reliability', canon.yield.reliability ?? 'Unavailable'],
    ]);
    r.para(canon.yield.note, { color: MUTED });
    }
  }

  if (sections.has('irrigation')) {
    r.section('Irrigation');
    const irr = s.irrigation;
    if (irr.status === 'unavailable') r.para('Water balance unavailable: ET0 forecast missing.');
    else {
      r.kv([
        ['Status', irr.status.replace('_', ' ')],
        ['Next irrigation', irr.next_irrigation ? `${fmtDayLabel(irr.next_irrigation.date)}, ${n(irr.next_irrigation.gross_mm, 0, ' mm')}` : 'None in window'],
        ['7-day ETc / effective rain', `${n(irr.totals.etc)} / ${n(irr.totals.eff_rain)} mm`],
        ['7-day deficit', n(irr.deficit_mm, 1, ' mm')],
        ['Readily available water', `${n(irr.raw_mm, 0)} of ${n(irr.taw_mm, 0)} mm`],
        ['Water volume', n(irr.volume_m3, 0, ' m³')],
      ]);
      r.para(`Assumptions: ${irr.assumptions.join('; ')}.`, { color: MUTED, size: 8 });
    }
  }

  if (sections.has('financial')) {
    r.section('Financial analysis');
    r.table(['Crop', `Yield ${yieldUnit()}`, 'Price Rs/kg', 'Price source', 'Gross', 'Cost', 'Net return'],
      [...s.crops].sort((a, b) => (b.financials.net_per_ha ?? -Infinity) - (a.financials.net_per_ha ?? -Infinity)).slice(0, 8).map((c) => {
        const f = c.financials;
        const src = f.price_basis === 'live' ? `${c.market.market} ${fmtAgDate(c.market.arrival_date)}` : f.price_basis === 'last_observed' ? 'Last observed' : 'Reference (static)';
        return [c.crop, n(convYield(f.yield_t_ha), 2), n(f.price_per_kg, 2), src, rs(f.gross_revenue), rs(f.cost_total), c.economic.observed_price ? rs(f.net_return) : 'Not assessable'];
      }),
      [18, 13, 13, 32, 18, 16, 18], ['l', 'r', 'r', 'l', 'r', 'r', 'r']);
    const m = canon?.market;
    if (canon && m) r.para(`Price for ${canon.crop}: ${m.status === 'live' ? `${MARKET_BASIS_LABEL[m.basis ?? ''] ?? ''}: ${m.market}, ${m.district}, ${m.state}${isNum(m.distance_km) && m.distance_km > 0 ? ` (${Math.round(m.distance_km)} km)` : ''}; modal Rs ${m.modal_price}/quintal on ${fmtAgDate(m.arrival_date)}.` : m.reason ?? 'reference price used.'}`, { size: 8.5 });
    r.para('Costs are a static national reference total per hectare. Seed, fertiliser, pesticide, irrigation, labour, machinery and transport components are not available from any connected source and are not itemised.', { color: MUTED, size: 8 });
  }

  if (sections.has('risk')) {
    r.section('Risks');
    r.table(['Category', 'Level', 'Evidence'], s.risk.categories.map((c) => [c.label, c.level === 'unavailable' ? 'No data' : c.level, c.evidence.join(' ')]), [22, 14, 90]);
  }

  if (sections.has('actions')) {
    r.section('Recommendations');
    const acts = s.risk.categories.filter((c) => c.level === 'high' || c.level === 'moderate').map((c) => `${c.label}: ${c.action}`);
    if (canon && canon.sowing.status !== 'off_season') acts.push(`Prepare to sow ${canon.crop} in the ${canon.sowing.window_label} window.`);
    if (canon?.excluded_factors.length) acts.push('Obtain a soil test (N, P, K, pH) to evaluate every suitability factor.');
    r.bullets(acts.length ? acts : ['No intervention is indicated by current data.']);
  }

  if (sections.has('sources')) {
    r.section('Data sources');
    const src = s.sources;
    const st = (k: string) => providerRow(s, k).text;
    r.table(['Source', 'Use', 'Status', 'Retrieved'], [
      ['Open-Meteo', 'Forecast, ET0, soil moisture', st('open_meteo'), fmtDateTime(src.open_meteo?.fetched_at as number | null)],
      ['NASA POWER', `Climatology ${String(src.nasa_power?.period ?? '')}`, st('nasa_power'), fmtDateTime(src.nasa_power?.fetched_at as number | null)],
      ['FAO/IIASA HWSD v2.0 (local)', `Soil properties ${String(src.hwsd?.depth ?? '').replace('-', '–')}, ~1 km`, st('hwsd'), 'static dataset'],
      ['Agmarknet (data.gov.in)', `Mandi prices: ${String(src.agmarknet?.live ?? 0)}/${String(src.agmarknet?.total ?? 0)} live`, st('agmarknet'), fmtDateTime(src.agmarknet?.fetched_at as number | null)],
      ['FAOSTAT sample (local)', 'Historical yields, yield model', 'local file', '–'],
      ['KRISHIMITRA rules', `${s._meta.rules_version}`, 'local', '–'],
    ], [30, 50, 18, 26]);
  }

  r.section('Fallback notices');
  const notices: string[] = [];
  if (s.soil.status === 'fallback') notices.push(`Soil: ${s.soil.fallback_reason} Resolved at ${fmtCoord(s.soil.resolved_lat, s.soil.resolved_lon)}, ${n(s.soil.distance_km, 0)} km from the farm.`);
  if (s.soil.status === 'unavailable' || s.soil.status === 'pending') notices.push(`Soil: ${s.soil.fallback_reason ?? 'HWSD v2.0 soil data unavailable'}. Soil factors were excluded and irrigation assumed loam water-holding values.`);
  if (s.weather.status !== 'ok') notices.push('Weather: Open-Meteo unavailable; weather, irrigation and climate risk could not be computed.');
  if (s.climate.status !== 'ok') notices.push('Climate: NASA POWER unavailable; 7-day forecast means were used for temperature and humidity and seasonal rainfall was excluded.');
  const staleN = s.crops.filter((c) => c.financials.price_basis === 'last_observed').length;
  const refN = s.crops.filter((c) => c.financials.price_basis === 'reference').length;
  if (staleN) notices.push(`Market: ${staleN} crop price(s) use the last observed Agmarknet price because the live feed was unavailable.`);
  if (refN) notices.push(`Market: ${refN} crop(s) have no observed price; their revenue uses a static reference price and their economic outlook is not assessable.`);
  const farMk = s.crops.filter((c) => c.market.basis === 'nearest_national' || c.market.basis === 'nearest_in_state');
  if (farMk.length) notices.push(`Market: ${farMk.length} crop price(s) come from the nearest reporting market rather than the farm's district (${farMk.map((c) => `${c.crop}: ${c.market.market}${isNum(c.market.distance_km) ? ` ${Math.round(c.market.distance_km)} km` : ''}`).join('; ')}).`);
  r.bullets(notices.length ? notices : ['No fallback data was used in this report.']);

  r.section('Model information');
  r.kv([
    ['Crop recommendation', `KRISHIMITRA Agronomic Rules Engine ${s._meta.rules_version}`],
    ['Yield', canon?.yield.method_label ?? 'Unavailable'],
    ['Irrigation', 'FAO-56 root-zone water balance'],
    ['Risk', 'Threshold rules (IMD rainfall categories, FAO-56)'],
  ], 1);

  r.section('Limitations');
  r.bullets([
    'Decision support only: verify recommendations with local agronomy experts before acting.',
    'Production costs are static national reference totals; itemised costs are not available from any connected source.',
    'The yield model supports only Rice and Wheat and has low hold-out accuracy; other crops use a reference-yield heuristic without an uncertainty range.',
    'Soil N, P and K are only evaluated when a soil test is entered; HWSD total nitrogen is not plant-available nitrogen.',
    'No deep-learning model is used. Crop ranking is rule-based and fully explained by the factor penalties in this report.',
  ]);

  r.footer(`KRISHIMITRA ADSS · ${place} · generated ${generated.toLocaleString('en-IN')} from live data. Decision support only.`);
  return r.doc;
}
