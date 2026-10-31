import type { CropResult, FarmSummary } from './types';
import { fmtNum } from './format';
import { Badge, SourceTag } from '../components/ui';

export const weatherSourceTag = (s: FarmSummary) => (
  <SourceTag label="Weather" source="Open-Meteo" time={s.weather.status === 'ok' ? s.weather.fetched_at : undefined}
    state={s.weather.status === 'ok' ? 'ok' : 'unavailable'} note={s.weather.status === 'ok' ? undefined : 'unavailable'} />
);

export const soilSourceTag = (s: FarmSummary) => {
  const st = s.soil.status;
  return (
    <SourceTag label="Soil" source="FAO/IIASA HWSD v2.0"
      state={st === 'ok' ? 'ok' : st === 'fallback' ? 'fallback' : st === 'pending' ? 'pending' : 'unavailable'}
      note={st === 'fallback' ? `nearby ~1 km cell ${fmtNum(s.soil.distance_km, 1)} km away` : st === 'ok' ? '~1 km regional estimate' : st === 'pending' ? 'still loading' : 'unavailable'} />
  );
};

export const climateSourceTag = (s: FarmSummary) => (
  <SourceTag label="Climate" source={`NASA POWER ${s.climate.period ?? ''}`.trim()} time={s.climate.status === 'ok' ? s.climate.fetched_at : undefined}
    state={s.climate.status === 'ok' ? 'ok' : 'unavailable'} note={s.climate.status === 'ok' ? undefined : 'unavailable, forecast used'} />
);

export const economicBadge = (c: CropResult, className?: string) => {
  const conf = c.economic.confidence;
  if (conf === 'Unavailable') return <Badge tone="neutral" icon="block" title={c.economic.basis} className={className}>Economics not assessable</Badge>;
  return <Badge tone={conf === 'Medium' ? 'water' : 'caution'} title={c.economic.basis} className={className}>Economic confidence: {conf}</Badge>;
};

export const priceBasisBadge = (c: CropResult) => {
  const b = c.financials.price_basis;
  if (b === 'live') return <Badge tone="ok" icon="sensors">Live mandi</Badge>;
  if (b === 'last_observed') return <Badge tone="caution" icon="history">Last observed</Badge>;
  if (b === 'reference') return <Badge tone="neutral" icon="menu_book">Reference price</Badge>;
  return <Badge tone="neutral">No price</Badge>;
};
