import type { FarmSummary } from './types';

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
  const row = (state: ProviderState, text: string): ProviderRow => ({ id, label, state, text, health, error });

  if (health === 'unavailable') return row('unavailable', isRateLimit(error) ? 'rate limited' : 'unavailable');
  if (health === 'degraded') return row('partial', isRateLimit(error) ? 'rate limited' : 'degraded');

  if (id === 'hwsd') {
    const st = s.soil.status;
    if (st === 'ok') return row('ok', 'ok');
    if (st === 'fallback') return row('fallback', 'fallback');
    if (st === 'pending') return row('pending', 'pending');
    return row('unavailable', s.soil.result_code === 'NO_SOIL_DATA' ? 'no soil data here' : 'unavailable');
  }
  if (id === 'agmarknet') {
    const live = s.crops.filter((c) => c.market.status === 'live').length;
    const stale = s.crops.filter((c) => c.market.status === 'stale').length;
    if (live) return row('ok', live === s.crops.length ? 'ok' : `ok · ${live}/${s.crops.length} live`);
    if (stale) return row('partial', 'last observed');
    return row(health === 'connected' ? 'partial' : 'unavailable', health === 'connected' ? 'no arrivals' : 'unavailable');
  }
  const st = s.sources[id]?.status;
  return st === 'ok' ? row('ok', 'ok') : row('unavailable', 'unavailable');
}

export const providerRows = (s: FarmSummary) => PROVIDERS.map(([id]) => providerRow(s, id));

export const DOT: Record<ProviderState, string> = {
  ok: 'bg-chlorophyll', fallback: 'bg-caution', partial: 'bg-caution', pending: 'bg-caution', unavailable: 'bg-critical',
};

export const tagState = (st: ProviderState) => (st === 'partial' ? 'fallback' : st);
