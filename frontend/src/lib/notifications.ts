import type { FarmSummary, Severity } from './types';
import { fmtDayLabel, isNum } from './format';
import { isRateLimit, providerRow } from './providerStatus';

const fmtTemp = (v: unknown, d = 1) => (isNum(v) ? `${v.toFixed(d)} °C` : 'Unavailable');
const fmtMm = (v: unknown, d = 1) => (isNum(v) ? `${v.toFixed(d)} mm` : 'Unavailable');

export type NotificationCategory = 'farm' | 'system';

export const categoryOf = (id: string): NotificationCategory => (id.startsWith('data:') || id.startsWith('system:') ? 'system' : 'farm');

export interface NotificationCandidate {
  id: string;
  fingerprint: string;
  title: string;
  message: string;
  severity: Severity;
  source: string;
  module: string;
  dataTime: string | null;
}

const IMD_HEAVY = 64.5;
const IMD_VERY_HEAVY = 115.6;

const iso = (unix?: number | null) => (isNum(unix) ? new Date(unix * 1000).toISOString() : null);

export function evaluateNotifications(s: FarmSummary): NotificationCandidate[] {
  const out: NotificationCandidate[] = [];
  const w = s.weather;
  const wTime = iso(w.fetched_at);
  const daily = w.daily || [];

  const next48 = daily.slice(0, 2);
  const heavy48 = next48.filter((d) => isNum(d.precip) && d.precip >= IMD_HEAVY);
  if (heavy48.length) {
    const peak = heavy48.reduce((a, b) => ((a.precip ?? 0) >= (b.precip ?? 0) ? a : b));
    const very = (peak.precip ?? 0) >= IMD_VERY_HEAVY;
    out.push({
      id: 'weather:heavy-rain-48h',
      fingerprint: `${peak.date}:${Math.round(peak.precip ?? 0)}`,
      title: very ? 'Very heavy rainfall expected in the next 48 hours' : 'Heavy rainfall expected in the next 48 hours',
      message: `${fmtMm(peak.precip, 0)} forecast for ${fmtDayLabel(peak.date)} (IMD ${very ? 'very heavy' : 'heavy'} category). Clear field drainage and postpone spraying.`,
      severity: very ? 'critical' : 'warning',
      source: 'Open-Meteo',
      module: '/weather-intelligence',
      dataTime: wTime,
    });
  } else {
    const heavyLater = daily.slice(2).find((d) => isNum(d.precip) && d.precip >= IMD_HEAVY);
    if (heavyLater) {
      out.push({
        id: 'weather:heavy-rain-week',
        fingerprint: `${heavyLater.date}:${Math.round(heavyLater.precip ?? 0)}`,
        title: 'Heavy rainfall in the 7-day outlook',
        message: `${fmtMm(heavyLater.precip, 0)} forecast for ${fmtDayLabel(heavyLater.date)}.`,
        severity: 'caution',
        source: 'Open-Meteo',
        module: '/weather-intelligence',
        dataTime: wTime,
      });
    }
  }

  const hot = daily.filter((d) => isNum(d.tmax) && d.tmax >= 35);
  if (hot.length) {
    const peak = hot.reduce((a, b) => ((a.tmax ?? 0) >= (b.tmax ?? 0) ? a : b));
    const extreme = (peak.tmax ?? 0) >= 40;
    out.push({
      id: 'weather:heat',
      fingerprint: `${peak.date}:${Math.round(peak.tmax ?? 0)}`,
      title: extreme ? 'Extreme heat forecast' : 'Heat stress conditions forecast',
      message: `Maximum temperature reaches ${fmtTemp(peak.tmax)} on ${fmtDayLabel(peak.date)}; ${hot.length} day(s) at or above 35 °C.`,
      severity: extreme ? 'critical' : 'caution',
      source: 'Open-Meteo',
      module: '/weather-intelligence',
      dataTime: wTime,
    });
  }
  const frost = daily.find((d) => isNum(d.tmin) && d.tmin <= 4);
  if (frost) {
    out.push({
      id: 'weather:frost',
      fingerprint: `${frost.date}:${Math.round(frost.tmin ?? 0)}`,
      title: 'Frost risk forecast',
      message: `Minimum temperature of ${fmtTemp(frost.tmin)} forecast for ${fmtDayLabel(frost.date)}.`,
      severity: 'warning',
      source: 'Open-Meteo',
      module: '/weather-intelligence',
      dataTime: wTime,
    });
  }

  if (daily.length) {
    const total = daily.reduce((a, d) => a + (d.precip ?? 0), 0);
    out.push({
      id: 'system:forecast-updated',
      fingerprint: `${daily[0].date}:${daily.length}`,
      title: 'Weather forecast updated',
      message: `New ${daily.length}-day outlook: ${fmtMm(total)} total rainfall, maximum temperatures ${fmtTemp(Math.min(...daily.map((d) => d.tmax ?? Infinity)), 0)}–${fmtTemp(Math.max(...daily.map((d) => d.tmax ?? -Infinity)), 0)}.`,
      severity: 'info',
      source: 'Open-Meteo',
      module: '/weather-intelligence',
      dataTime: wTime,
    });
  }

  const irr = s.irrigation;
  if (irr.status === 'irrigate_now' || irr.status === 'irrigate_soon') {
    const n = irr.next_irrigation;
    out.push({
      id: 'irrigation:threshold',
      fingerprint: `${irr.status}:${n?.date}:${Math.round(n?.gross_mm ?? 0)}`,
      title: irr.status === 'irrigate_now' ? 'Water deficit has crossed the irrigation threshold' : 'Irrigation needed within 3 days',
      message: n
        ? `Root-zone depletion exceeds readily available water (${fmtMm(irr.raw_mm, 0)}) on ${fmtDayLabel(n.date)}. Apply about ${fmtMm(n.gross_mm, 0)}${irr.efficiency ? ` gross (${irr.irrigation_type})` : ' net'}.`
        : `Root-zone depletion ${fmtMm(irr.initial_depletion_mm, 0)} already exceeds readily available water ${fmtMm(irr.raw_mm, 0)}.`,
      severity: irr.status === 'irrigate_now' ? 'warning' : 'caution',
      source: 'Open-Meteo ET₀ · FAO-56 water balance',
      module: '/irrigation-advisor',
      dataTime: wTime,
    });
  }

  const canon = s.crops.find((c) => c.crop === s.recommendation.canonical);
  if (canon) {
    const temp = canon.attribution.find((a) => a.factor === 'temperature' && (a.status === 'low' || a.status === 'high'));
    if (temp) {
      out.push({
        id: `crop:temperature:${canon.crop}`,
        fingerprint: `${temp.status}:${Math.round(temp.value ?? 0)}`,
        title: `Temperature outside the preferred range for ${canon.crop}`,
        message: `Growing-season mean ${fmtTemp(temp.value)} is ${temp.status === 'low' ? 'below' : 'above'} the ${temp.min}–${temp.max} °C band.`,
        severity: temp.multiplier < 0.6 ? 'warning' : 'caution',
        source: 'NASA POWER · KRISHIMITRA rules',
        module: '/crop-advisor',
        dataTime: iso(s.climate.fetched_at),
      });
    }
    const ph = canon.attribution.find((a) => a.factor === 'ph' && (a.status === 'low' || a.status === 'high'));
    if (ph) {
      out.push({
        id: `soil:ph:${canon.crop}`,
        fingerprint: `${ph.status}:${ph.value}`,
        title: `Soil pH may constrain ${canon.crop}`,
        message: `Soil pH ${ph.value} is ${ph.status === 'low' ? 'below' : 'above'} the ${ph.min}–${ph.max} range preferred by ${canon.crop}.`,
        severity: ph.multiplier < 0.6 ? 'warning' : 'caution',
        source: ph.source || 'Soil',
        module: '/soil-intelligence',
        dataTime: iso(s.soil.fetched_at),
      });
    }

    const mk = canon.market;
    if (mk.status === 'live' && mk.previous && isNum(mk.modal_price) && mk.previous.modal_price > 0) {
      const change = (mk.modal_price - mk.previous.modal_price) / mk.previous.modal_price;
      if (Math.abs(change) >= 0.005) {
        out.push({
          id: `market:${canon.crop}:${mk.market}`,
          fingerprint: `${mk.arrival_date}:${mk.modal_price}`,
          title: `${canon.crop} price ${change > 0 ? 'up' : 'down'} ${Math.abs(change * 100).toFixed(1)}% at ${mk.market}`,
          message: `Modal price ₹${mk.modal_price.toLocaleString('en-IN')}/qtl on ${mk.arrival_date} vs ₹${mk.previous.modal_price.toLocaleString('en-IN')}/qtl on ${mk.previous.arrival_date}.`,
          severity: change <= -0.1 ? 'caution' : 'info',
          source: 'Agmarknet',
          module: '/crop-advisor',
          dataTime: iso(mk.fetched_at),
        });
      }
    }
  }

  const yRisk = s.risk.categories.find((c) => c.id === 'yield');
  if (yRisk && yRisk.level === 'high') {
    out.push({
      id: `yield:risk:${s.recommendation.canonical}`,
      fingerprint: yRisk.evidence[0] ?? 'high',
      title: `Yield risk for ${s.recommendation.canonical}`,
      message: yRisk.evidence[0] ?? 'Estimated yield is well below the reference yield.',
      severity: 'caution',
      source: 'KRISHIMITRA rules · yield estimate',
      module: '/yield-prediction',
      dataTime: null,
    });
  }

  const soil = s.soil;
  if (soil.status === 'unavailable') {
    out.push({
      id: 'data:hwsd',
      fingerprint: `unavailable:${soil.result_code ?? ''}`,
      title: soil.result_code === 'NO_SOIL_DATA' ? 'No HWSD soil data for this location' : 'HWSD v2.0 soil data is unavailable',
      message: `${soil.fallback_reason ?? ''} Soil pH and texture are excluded from crop scoring and irrigation uses assumed loam values.`.trim(),
      severity: 'caution',
      source: 'FAO/IIASA HWSD v2.0',
      module: '/settings',
      dataTime: null,
    });
  }
  if (w.status !== 'ok') {
    out.push({
      id: 'data:open-meteo',
      fingerprint: 'unavailable',
      title: 'Weather forecast unavailable',
      message: 'Open-Meteo did not respond; weather, irrigation and climate-risk results are unavailable.',
      severity: 'warning',
      source: 'Open-Meteo',
      module: '/settings',
      dataTime: null,
    });
  }
  if (s.climate.status !== 'ok') {
    out.push({
      id: 'data:nasa-power',
      fingerprint: 'unavailable',
      title: 'NASA POWER climatology unavailable',
      message: 'Crop scoring falls back to the 7-day forecast for temperature and humidity; seasonal rainfall is excluded.',
      severity: 'caution',
      source: 'NASA POWER',
      module: '/settings',
      dataTime: null,
    });
  }
  // Provider failure only when Agmarknet's latest real request failed (same registry as Settings → Data sources).
  const market = providerRow(s, 'agmarknet');
  const stale = s.crops.filter((c) => c.market.status === 'stale').length;
  const none = s.crops.filter((c) => c.market.status === 'unavailable').length;
  if (market.health === 'unavailable' || market.health === 'degraded') {
    const limited = isRateLimit(market.error);
    out.push({
      id: 'data:agmarknet',
      fingerprint: limited ? 'rate-limit' : 'failed',
      title: limited ? 'Market data rate-limited (HTTP 429)' : 'Market data temporarily unavailable',
      message: `${limited ? 'data.gov.in is rejecting requests for now.' : market.error ?? 'The latest Agmarknet request failed.'} `
        + (stale ? `${stale} crop price(s) use the last observed price.` : 'Financial estimates use reference prices until it recovers.'),
      severity: 'caution',
      source: 'Agmarknet',
      module: '/settings',
      dataTime: null,
    });
  } else if (stale) {
    out.push({
      id: 'data:agmarknet-prices',
      fingerprint: `stale:${stale}`,
      title: 'Some mandi prices are last observed values',
      message: `${stale} crop price(s) use the last observed Agmarknet price because today's price could not be resolved for them.`,
      severity: 'info',
      source: 'Agmarknet',
      module: '/crop-advisor',
      dataTime: null,
    });
  } else if (none === s.crops.length && s.crops.length) {
    out.push({
      id: 'data:agmarknet-prices',
      fingerprint: 'no-arrivals',
      title: 'No mandi arrivals reported for these crops',
      message: 'Agmarknet is connected but reported no arrivals for the evaluated crops; financial estimates use reference prices.',
      severity: 'info',
      source: 'Agmarknet',
      module: '/crop-advisor',
      dataTime: null,
    });
  }
  return out;
}
