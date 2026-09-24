import React from 'react';
import { Link } from 'react-router-dom';
import type { CropResult, FarmSummary, Market, RiskCategory } from '../lib/types';
import { MARKET_BASIS_LABEL, fmtAgDate, fmtCoord, fmtDayMonth, fmtLongDate, fmtMm, fmtNum, fmtRelative, fmtWeekday, isNum } from '../lib/format';
import { weatherIcon, weatherLabel, isWet } from '../lib/weather';
import { Badge, ContextBar, Icon, PageHeader, SourceTag, UnavailableBlock, riskLabel, riskTone, TONE_TEXT, type Tone } from './ui';
import { useFarmStore } from '../store/useFarmStore';
import { convTemp, localizeText } from '../lib/units';

export const placeLabel = (s: FarmSummary, fallbackName?: string) => {
  const l = s.location;
  const name = fallbackName || l.place || 'Selected location';
  return l.state && !name.includes(l.state) ? `${name}, ${l.state}` : name;
};

export const FarmContextBar: React.FC<{ s: FarmSummary }> = ({ s }) => {
  const farm = useFarmStore((st) => st.selectedFarm);
  return (
    <ContextBar
      items={[
        { icon: 'location_on', label: 'Location', value: placeLabel(s, farm?.name), title: s.location.display_name ?? undefined },
        { icon: 'my_location', label: 'Coordinates', value: fmtCoord(s.request.lat, s.request.lon) },
        { icon: 'eco', label: 'Season', value: `${s.season.current_label} · planning ${s.season.planning_label}`, title: `Current ${s.season.current_label}; planning ${s.season.planning_label}` },
        { icon: 'calendar_today', label: 'Date', value: fmtLongDate() },
        { icon: 'update', label: 'Data freshness', value: s.weather.status === 'ok' ? `Weather ${fmtRelative(s.weather.fetched_at)}` : 'Weather unavailable' },
      ]}
    />
  );
};

export const ForecastStrip: React.FC<{ s: FarmSummary; days?: number }> = ({ s, days = 7 }) => {
  const rows = s.weather.daily.slice(0, days);
  if (!rows.length) return null;
  const today = s.season.date;
  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
      {rows.map((d) => {
        const wet = isWet(d.weather_code) || (d.precip ?? 0) >= 2.5;
        return (
          <div key={d.date}
            className={`rounded-lg border px-2 py-2.5 flex flex-col items-center text-center ${wet ? 'bg-[#F0F9FF] border-[#BAE6FD]' : 'bg-surface-container-low border-hairline'}`}
            title={`${weatherLabel(d.weather_code)} · ${fmtDayMonth(d.date)}`}>
            <span className={`text-label-sm font-label-sm ${d.date === today ? 'text-forest font-bold' : 'text-on-surface-variant'}`}>
              {d.date === today ? 'Today' : fmtWeekday(d.date)}
            </span>
            <span className="text-[10px] font-label-sm text-outline">{fmtDayMonth(d.date)}</span>
            <Icon name={weatherIcon(d.weather_code)} className={`my-1.5 ${wet ? 'text-water' : 'text-caution'}`} />
            <span className="text-title-md font-telemetry-metric text-on-surface">{isNum(d.tmax) ? `${Math.round(convTemp(d.tmax) as number)}°` : '–'}</span>
            <span className="text-label-sm font-label-sm text-on-surface-variant">{isNum(d.tmin) ? `${Math.round(convTemp(d.tmin) as number)}°` : '–'}</span>
            <span className={`mt-1.5 text-label-sm font-label-sm ${wet ? 'text-[#0369A1] font-semibold' : 'text-on-surface-variant'}`}>{fmtMm(d.precip, (d.precip ?? 0) < 10 ? 1 : 0)}</span>
          </div>
        );
      })}
    </div>
  );
};

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

export const MarketLine: React.FC<{ m: Market; compact?: boolean }> = ({ m, compact }) => {
  if (m.status === 'unavailable')
    return <span className="text-body-sm text-on-surface-variant">No live price. {m.reason ?? ''} Reference price used.</span>;
  const basis = m.basis ? MARKET_BASIS_LABEL[m.basis] : '';
  return (
    <span className="text-body-sm text-on-surface-variant">
      {m.market}{m.district ? `, ${m.district}` : ''} · {fmtAgDate(m.arrival_date)}
      {!compact && <> · <span className={m.status === 'stale' ? 'text-[#B45309]' : ''}>{basis}</span>{isNum(m.distance_km) && m.distance_km > 0 ? ` (${fmtNum(m.distance_km, 0)} km)` : ''}</>}
    </span>
  );
};

export const economicBadge = (c: CropResult) => {
  const conf = c.economic.confidence;
  if (conf === 'Unavailable') return <Badge tone="neutral" icon="block" title={c.economic.basis}>Economics not assessable</Badge>;
  return <Badge tone={conf === 'Medium' ? 'water' : 'caution'} title={c.economic.basis}>Economic confidence: {conf}</Badge>;
};

export const priceBasisBadge = (c: CropResult) => {
  const b = c.financials.price_basis;
  if (b === 'live') return <Badge tone="ok" icon="sensors">Live mandi</Badge>;
  if (b === 'last_observed') return <Badge tone="caution" icon="history">Last observed</Badge>;
  if (b === 'reference') return <Badge tone="neutral" icon="menu_book">Reference price</Badge>;
  return <Badge tone="neutral">No price</Badge>;
};

const RISK_ICON: Record<string, string> = {
  climate: 'thermostat',
  water: 'water_drop',
  suitability: 'eco',
  yield: 'trending_up',
  pest: 'pest_control',
  soil: 'layers',
  market: 'storefront',
};


export const RiskMatrix: React.FC<{ categories: RiskCategory[]; dense?: boolean }> = ({ categories, dense }) => (
  <div className={`grid ${dense ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-[repeat(auto-fill,minmax(220px,1fr))]'} bg-white rounded-xl border-l border-t border-hairline overflow-hidden`}>
    {categories.map((c) => {
      const tone: Tone = riskTone(c.level);
      return (
        <Link key={c.id} to={c.module} className="bg-white p-4 border-r border-b border-hairline hover:bg-canvas transition-colors min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-body-md font-semibold text-on-surface">
              <Icon name={RISK_ICON[c.id] ?? 'insights'} className={`${TONE_TEXT[tone]} !text-[18px]`} />
              {c.label}
            </span>
            <Badge tone={tone}>{riskLabel(c.level)}</Badge>
          </div>
          {!dense && <p className="mt-2 text-body-sm text-on-surface-variant line-clamp-3">{localizeText(c.evidence[0] ?? 'No evidence available.')}</p>}
        </Link>
      );
    })}
  </div>
);

export const totalRain = (s: FarmSummary) => s.weather.daily.reduce((a, d) => a + (isNum(d.precip) ? d.precip : 0), 0);

export const irrigationHeadline = (s: FarmSummary): { text: string; tone: Tone; icon: string } => {
  const st = s.irrigation.status;
  if (st === 'unavailable') return { text: 'Unavailable', tone: 'neutral', icon: 'cloud_off' };
  if (st === 'irrigate_now') return { text: 'Irrigate now', tone: 'critical', icon: 'water_drop' };
  if (st === 'irrigate_soon') return { text: 'Irrigate within 3 days', tone: 'caution', icon: 'water_drop' };
  if (st === 'scheduled') return { text: `Irrigate ${fmtWeekday(s.irrigation.next_irrigation!.date)} ${fmtDayMonth(s.irrigation.next_irrigation!.date)}`, tone: 'water', icon: 'event' };
  return { text: 'Not needed this week', tone: 'ok', icon: 'check_circle' };
};


export const NoRecommendation: React.FC<{ s: FarmSummary; title: string }> = ({ s, title }) => (
  <>
    <PageHeader title={title} />
    <FarmContextBar s={s} />
    <UnavailableBlock icon="block" title="Recommendation unavailable" reason={s.recommendation.explanation[0]}
      action={<Link to="/settings#sources" className="mt-2 text-body-sm font-semibold text-forest hover:underline">Check data sources</Link>} />
  </>
);
