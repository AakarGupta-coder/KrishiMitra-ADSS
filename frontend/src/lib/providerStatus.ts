import type { FarmSummary } from './types';
import { isNum } from './format';

// Single source of provider status for the top bar, Farm Profile, module source tags, reports and notifications.
// Provider health comes from summary.provider_status (the same registry /api/sources exposes, i.e. the outcome of the
// latest real request). Data state for this location comes from summary.sources / summary.soil. The two are kept
// separate: an HWSD nearby-cell fallback is valid data from an available provider, not an outage.

export type ProviderState = 'ok' | 'fallback' | 'partial' | 'pending' | 'unavailable';

export interface ProviderRow {
  id: string;
  label: string;
  state: ProviderState;
  text: string;
  // One-line explanation of a non-ok state, from the same data; null when the state needs none.
  detail: string | null;
  health: string | null;
  error: string | null;
}

export const PROVIDERS: [string, string][] = [
  ['open_meteo', 'Weather · Open-Meteo'],
  ['nasa_power', 'Climate · NASA POWER'],
  ['hwsd', 'Soil · HWSD v2.0'],
  ['agmarknet', 'Market · Agmarknet'],
  ['nominatim', 'Geocoding · Nominatim'],
];

export const isRateLimit = (err: string | null | undefined) => !!err && /429|rate limit/i.test(err);

export function providerRow(s: FarmSummary, id: string): ProviderRow {
  const label = PROVIDERS.find(([k]) => k === id)?.[1] ?? id;
  const p = s.provider_status?.[id];
  const health = p?.status ?? null;
  const error = p?.last_error ?? null;
  const row = (state: ProviderState, text: string, detail: string | null = null): ProviderRow => ({ id, label, state, text, detail, health, error });

  if (health === 'unavailable') return row('unavailable', isRateLimit(error) ? 'rate limited' : 'unavailable', isRateLimit(error) ? 'data.gov.in returned HTTP 429' : 'Latest request failed');
  if (health === 'degraded') return row('partial', isRateLimit(error) ? 'rate limited' : 'degraded', isRateLimit(error) ? 'data.gov.in returned HTTP 429' : 'Latest request failed; recent data still in use');

  if (id === 'hwsd') {
    const st = s.soil.status;
    if (st === 'ok') return row('ok', 'ok');
    if (st === 'fallback') return row('fallback', 'fallback', `Using nearest valid HWSD soil cell${isNum(s.soil.distance_km) ? ` (${s.soil.distance_km} km)` : ''}`);
    if (st === 'pending') return row('pending', 'pending');
    return s.soil.result_code === 'NO_SOIL_DATA'
      ? row('unavailable', 'no soil data here', 'No usable HWSD soil cell near this farm')
      : row('unavailable', 'unavailable');
  }
  if (id === 'agmarknet') {
    const live = s.crops.filter((c) => c.market.status === 'live').length;
    const stale = s.crops.filter((c) => c.market.status === 'stale').length;
    if (live) return row('ok', live === s.crops.length ? 'ok' : `ok · ${live}/${s.crops.length} live`);
    if (stale) return row('partial', 'last observed', 'Real mandi prices from an earlier arrival date');
    return health === 'connected'
      ? row('partial', 'no arrivals', 'Connected; no arrivals for the evaluated crops')
      : row('unavailable', 'unavailable');
  }
  const st = s.sources[id]?.status;
  return st === 'ok' ? row('ok', 'ok') : row('unavailable', 'unavailable');
}

export const providerRows = (s: FarmSummary) => PROVIDERS.map(([id]) => providerRow(s, id));

// Why the data is partial: amber/red provider rows plus the recommended crop's unevaluated rule inputs.
export function completenessNotes(s: FarmSummary): string[] {
  const notes = providerRows(s).filter((r) => r.state !== 'ok').map((r) => `${r.label.split(' · ')[0]}: ${r.text}`);
  const canon = s.crops.find((c) => c.crop === s.recommendation.canonical);
  if (canon?.excluded_factors.length) notes.push(`Not evaluated (no data): ${canon.excluded_factors.join(', ')}`);
  return notes;
}

export const DOT: Record<ProviderState, string> = {
  ok: 'bg-chlorophyll', fallback: 'bg-caution', partial: 'bg-caution', pending: 'bg-caution', unavailable: 'bg-critical',
};

export const tagState = (st: ProviderState) => (st === 'partial' ? 'fallback' : st);
