import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useFarmStore } from '../store/useFarmStore';
import { useLocationNotifications } from '../components/NotificationCenter';
import {
  Badge, Button, CHART, ChartTooltip, Eyebrow, FactorAttribution, Icon, ModuleLink, PageHeader, Panel,
  SummaryGate, TONE_TEXT, UnavailableBlock, axisProps, riskLabel, riskTone, severityIcon, severityTone,
} from '../components/ui';
import { FarmContextBar, ForecastStrip, RiskMatrix, climateSourceTag, irrigationHeadline, placeLabel, priceBasisBadge, totalRain, weatherSourceTag } from '../components/widgets';
import { fmtAgDate, fmtArea, fmtDayLabel, fmtDayMonth, fmtINRCompact, fmtMm, fmtNum, fmtPct01, fmtRelative, fmtUnit, fmtWeekday, isNum, numRain, numYield } from '../lib/format';
import { convTemp, localizeText, rainUnit, tempUnit, yieldUnit } from '../lib/units';
import type { CropResult, FarmSummary } from '../lib/types';

const KpiCard: React.FC<{ label: string; badge?: React.ReactNode; value: React.ReactNode; unit?: string; sub: React.ReactNode; footLabel: string; foot: React.ReactNode; to: string; valueClass?: string }> = ({
  label, badge, value, unit, sub, footLabel, foot, to, valueClass = 'text-forest',
}) => (
  <Link to={to} className="group bg-white rounded-xl border border-hairline p-5 shadow-[0_1px_2px_rgba(17,66,50,0.04)] flex flex-col hover:border-field transition-colors min-w-0">
    <div className="flex items-start justify-between gap-2 mb-3">
      <Eyebrow>{label}</Eyebrow>
      {badge}
    </div>
    <div className="flex items-baseline gap-2 min-w-0">
      <span className={`text-headline-lg font-semibold tracking-tight truncate ${valueClass}`}>{value}</span>
      {unit && <span className="text-label-md font-label-md text-on-surface-variant">{unit}</span>}
    </div>
    <div className="mt-1.5 text-body-sm text-on-surface-variant min-h-[20px]">{sub}</div>
    <div className="mt-auto pt-3 border-t border-hairline mt-4 flex justify-between gap-2 text-body-sm">
      <span className="text-on-surface-variant">{footLabel}</span>
      <span className="text-on-surface font-medium text-right truncate">{foot}</span>
    </div>
  </Link>
);

// Same "wet day" threshold as the forecast strip (IMD rainy day, >= 2.5 mm) and the notification heat threshold.
const RAINY_DAY_MM = 2.5;
const HEAT_STRESS_C = 35;

// Consecutive runs of day indices, labelled "Mon" or "Mon–Wed".
const dayRuns = (idx: number[], label: (i: number) => string) => {
  const runs: number[][] = [];
  idx.forEach((i) => (runs.length && runs[runs.length - 1].at(-1) === i - 1 ? runs[runs.length - 1].push(i) : runs.push([i])));
  return runs.map((r) => ({ len: r.length, text: r.length > 1 ? `${label(r[0])}–${label(r[r.length - 1])}` : label(r[0]) }));
};

// Everything below is derived from the forecast rows already shown in the strip (s.weather.daily); nothing is fetched.
const ForecastOutlook: React.FC<{ s: FarmSummary }> = ({ s }) => {
  const rows = s.weather.daily.slice(0, 7);
  const day = (i: number) => (rows[i].date === s.season.date ? 'Today' : fmtWeekday(rows[i].date));
  const rain = rows.map((d) => (isNum(d.precip) ? d.precip : null));
  const maxRain = Math.max(0, ...rain.filter(isNum));
  const temps = rows.map((d) => ({ date: d.date, tmax: convTemp(d.tmax), tmin: convTemp(d.tmin) }));
  const hasTemps = temps.filter((t) => isNum(t.tmax)).length >= 2;

  const wettest = maxRain > 0 ? rain.indexOf(maxRain) : -1;
  const tmins = rows.map((d) => d.tmin).filter(isNum);
  const tmaxs = rows.map((d) => d.tmax).filter(isNum);
  const dryRuns = dayRuns(rain.flatMap((r, i) => (isNum(r) && r < RAINY_DAY_MM ? [i] : [])), day);
  const peak = tmaxs.length ? Math.max(...tmaxs) : null;
  const peakRuns = peak === null ? [] : dayRuns(rows.flatMap((d, i) => (isNum(d.tmax) && Math.round(d.tmax) === Math.round(peak) ? [i] : [])), day);

  const insights: string[] = [];
  const spell = dryRuns.reduce<{ len: number; text: string } | null>((a, r) => (!a || r.len > a.len ? r : a), null);
  if (spell && spell.len >= 3) insights.push(`No rainy day (≥ ${fmtMm(RAINY_DAY_MM)}) forecast ${spell.text}. Irrigation demand may rise as the root zone dries.`);
  if (peak !== null) {
    insights.push(`Maximum temperature peaks at ${fmtUnit(convTemp(peak), tempUnit(), 0)} on ${peakRuns.map((r) => r.text).join(', ')}`
      + (peak >= HEAT_STRESS_C ? `, above the ${fmtUnit(convTemp(HEAT_STRESS_C), tempUnit(), 0)} heat-stress threshold.` : '.'));
  }

  const stats: [string, string][] = [];
  if (wettest >= 0) stats.push(['Wettest day', `${day(wettest)} · ${fmtMm(maxRain, maxRain < 10 ? 1 : 0)}`]);
  if (tmins.length && tmaxs.length) stats.push(['Temperature range', `${Math.round(convTemp(Math.min(...tmins)) as number)}–${Math.round(convTemp(Math.max(...tmaxs)) as number)}${tempUnit()}`]);
  if (rain.some(isNum)) stats.push(['Dry days', dryRuns.length ? dryRuns.map((r) => r.text).join(', ') : 'None']);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <div className="min-w-0">
          <Eyebrow>Rainfall outlook</Eyebrow>
          <ul className="mt-2 space-y-1.5">
            {rows.map((d, i) => {
              const r = rain[i];
              return (
                <li key={d.date} className="grid grid-cols-[3rem_minmax(0,1fr)_4.5rem] items-center gap-2 text-label-sm font-label-sm">
                  <span className={d.date === s.season.date ? 'text-forest font-bold' : 'text-on-surface-variant'}>{day(i)}</span>
                  <span className="h-2 rounded-full bg-surface-container-low overflow-hidden">
                    {isNum(r) && maxRain > 0 && <span className="block h-full rounded-full bg-[#0284C7]" style={{ width: `${(r / maxRain) * 100}%` }} />}
                  </span>
                  <span className={`text-right tabular ${isNum(r) && r >= RAINY_DAY_MM ? 'text-[#0369A1] font-semibold' : 'text-on-surface-variant'}`}>
                    {isNum(r) ? fmtMm(r, r < 10 ? 1 : 0) : '–'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        {hasTemps && (
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow>Temperature trend</Eyebrow>
              <span className="flex items-center gap-3 text-label-sm font-label-sm text-on-surface-variant">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ background: CHART.heat }} />Max</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ background: CHART.muted }} />Min</span>
              </span>
            </div>
            <div className="mt-2 h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={temps} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="date" {...axisProps} tickFormatter={(d) => fmtWeekday(d).slice(0, 2)} />
                  <YAxis {...axisProps} width={32} domain={['auto', 'auto']} tickFormatter={(v: number) => `${Math.round(v)}°`} />
                  <Tooltip content={<ChartTooltip labelFormatter={(l) => fmtDayLabel(String(l))} valueFormatter={(v) => fmtUnit(v, tempUnit(), 1)} />} />
                  <Line isAnimationActive={false} dataKey="tmax" name="Max" stroke={CHART.heat} strokeWidth={2} dot={{ r: 2.5, fill: CHART.heat }} connectNulls={false} />
                  <Line isAnimationActive={false} dataKey="tmin" name="Min" stroke={CHART.muted} strokeWidth={2} dot={{ r: 2.5, fill: CHART.muted }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
      {(stats.length > 0 || insights.length > 0) && (
        <div className="pt-4 border-t border-hairline">
          <Eyebrow>7-day outlook</Eyebrow>
          {stats.length > 0 && (
            <dl className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 text-body-sm">
              {stats.map(([k, v]) => (
                <div key={k} className="min-w-0"><dt className="text-on-surface-variant">{k}</dt><dd className="font-label-md tabular text-on-surface truncate">{v}</dd></div>
              ))}
            </dl>
          )}
          {insights.length > 0 && (
            <ul className="mt-3 space-y-1 text-body-sm text-on-surface">
              {insights.map((t) => <li key={t} className="flex gap-1.5"><Icon name="chevron_right" className="!text-[16px] text-outline" />{t}</li>)}
            </ul>
          )}
        </div>
      )}
    </>
  );
};

// Restates the recommendation's own rule results in plain language; it computes no new score. Values already shown
// on the dashboard (per-factor numbers, price, economic confidence, sowing window) are not repeated.
const RecommendationOutlook: React.FC<{ c: CropResult }> = ({ c }) => {
  const unitOf = (u?: string) => (u && u !== '%' ? ` ${u}` : u || ''); // same unit rule as FactorAttribution
  const factors = c.attribution.filter((a) => a.factor !== 'season');
  const why: string[] = factors.filter((a) => a.status === 'in_range').map((a) => a.label);
  const plan: string[] = [];
  const limiting = factors.filter((a) => a.status === 'low' || a.status === 'high');
  if (limiting.length) plan.push(`Outside preferred range: ${limiting.map((a) => a.label.toLowerCase()).join(', ')}.`);
  for (const a of factors.filter((f) => f.status === 'met_by_irrigation')) {
    why.push(`${a.label} · irrigated`);
    plan.push(`Plan irrigation: ${a.label.toLowerCase()}${isNum(a.value) ? ` ${a.value}${unitOf(a.unit)}` : ''}${a.min !== undefined ? ` vs ${a.min}–${a.max}${unitOf(a.unit)} required` : ' below requirement'}.`);
  }
  if (c.sowing.status === 'open') why.push('Sowing window open');
  const mk = c.market;
  if (c.financials.price_basis === 'last_observed') {
    plan.push(`No current arrival; price last observed${mk.market ? ` at ${mk.market}` : ''}${mk.arrival_date ? `, ${fmtAgDate(mk.arrival_date)}` : ''}.`);
  } else if (c.financials.price_basis === 'reference') plan.push('No mandi price observed; financials use a reference price.');

  return (
    <div className="@container mt-4 pt-4 border-t border-hairline">
      <Eyebrow>Recommendation outlook</Eyebrow>
      <p className="mt-1.5 text-body-sm text-on-surface-variant">
        The {fmtPct01(c.agronomic_score)} score covers {factors.length} evaluated factor{factors.length === 1 ? '' : 's'} only.
        {c.excluded_factors.length > 0 && ` ${c.excluded_factors.join(', ')}: not evaluated (no value).`}
      </p>
      <div className="mt-3 grid grid-cols-1 @lg:grid-cols-2 gap-x-6 gap-y-3 text-body-sm">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-forest mr-1">Why {c.crop}</span>
            {why.length ? why.map((t) => <Badge key={t} tone="ok" icon="check">{t}</Badge>)
              : <span className="text-on-surface-variant">no evaluated factor is within its preferred range.</span>}
          </div>
        </div>
        {plan.length > 0 && (
          <div className="min-w-0">
            <div className="font-semibold text-forest">Planning considerations</div>
            <ul className="mt-1 space-y-1">{plan.map((t) => <li key={t} className="flex gap-1.5 text-on-surface"><Icon name="chevron_right" className="!text-[16px] text-outline mt-px" />{localizeText(t)}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
};

const DashboardView: React.FC<{ s: FarmSummary }> = ({ s }) => {
  const farm = useFarmStore((st) => st.selectedFarm)!;
  const navigate = useNavigate();
  const alerts = useLocationNotifications().filter((n) => n.active).slice(0, 4);
  const canon = s.crops.find((c) => c.crop === s.recommendation.canonical) ?? null;
  const irr = irrigationHeadline(s);
  const risk = s.risk;
  const worst = risk.categories.filter((c) => c.level === risk.overall && c.level !== 'unavailable');
  const rain7 = totalRain(s);
  const heavy = s.weather.daily.find((d) => (d.precip ?? 0) >= 64.5);

  let note: string;
  if (s.weather.status !== 'ok') note = 'Forecast unavailable, so no weather-based action can be derived.';
  else if (heavy) note = `Heavy rain (${fmtMm(heavy.precip, 0)}) is forecast for ${fmtDayLabel(heavy.date)}. Clear drainage channels and postpone fertiliser or spray applications.`;
  else if (s.irrigation.next_irrigation) note = `Root-zone depletion reaches the irrigation threshold on ${fmtDayLabel(s.irrigation.next_irrigation.date)}. Plan about ${fmtMm(s.irrigation.next_irrigation.gross_mm, 0)}.`;
  else if (rain7 >= 10) note = `${fmtMm(rain7)} of rain over 7 days keeps the root zone above the irrigation threshold. No pumping needed this week.`;
  else note = `Only ${fmtMm(rain7)} of rain is expected, but modelled depletion stays within readily available water this week.`;

  return (
    <>
      <PageHeader
        title={`Farm intelligence for ${placeLabel(s, farm.name)}`}
        subtitle={<>Recommendations for the {s.season.planning_label} planning window, built from live weather, climatology, soil and mandi data.</>}
        actions={<>
          <Button variant="secondary" icon="picture_as_pdf" onClick={() => navigate('/reports')}>Generate report</Button>
        </>}
      />
      <FarmContextBar s={s} />

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {canon ? (<>
        <KpiCard
          to="/crop-advisor"
          label="Recommended crop"
          badge={<Badge tone="ok">Agronomic {fmtPct01(canon.agronomic_score)}</Badge>}
          value={canon.crop}
          sub={<>{canon.confidence} confidence · {canon.economic.observed_price ? `net ${fmtINRCompact(canon.financials.net_per_ha)}/ha` : 'economics not assessable'}</>}
          footLabel="Sowing window"
          foot={canon.sowing.window_label ?? 'Unavailable'}
        />
        <KpiCard
          to="/yield-prediction"
          label="Estimated yield"
          badge={<Badge tone={canon.yield.method === 'ml' ? 'water' : 'neutral'}>{canon.yield.method === 'ml' ? 'ML model' : 'Reference'}</Badge>}
          value={numYield(canon.yield.value_t_ha, 2)}
          unit={isNum(canon.yield.value_t_ha) ? yieldUnit() : undefined}
          sub={`${canon.crop} · ${canon.yield.reliability ?? 'Unrated'} reliability`}
          footLabel="Farm output"
          foot={isNum(canon.financials.production_t) ? `${fmtNum(canon.financials.production_t, 2)} t on ${fmtArea(farm.area)}` : 'Unavailable'}
        />
        </>) : (<>
          <KpiCard to="/crop-advisor" label="Recommended crop" value="Unavailable" valueClass="text-outline text-title-lg" sub="Recommendation unavailable: not enough data" footLabel="Sowing window" foot="Unavailable" />
          <KpiCard to="/yield-prediction" label="Estimated yield" value="Unavailable" valueClass="text-outline text-title-lg" sub="No recommended crop" footLabel="Farm output" foot="Unavailable" />
        </>)}
        <KpiCard
          to="/irrigation-advisor"
          label="Irrigation need"
          badge={<Badge tone={irr.tone} icon={irr.icon}>{s.irrigation.status === 'unavailable' ? 'No data' : `${s.irrigation.horizon_days}-day`}</Badge>}
          value={s.irrigation.status === 'unavailable' ? 'Unavailable' : numRain(s.irrigation.totals.gross_irrigation, 0)}
          unit={s.irrigation.status === 'unavailable' ? undefined : rainUnit()}
          valueClass={s.irrigation.status === 'unavailable' ? 'text-outline text-title-lg' : 'text-water'}
          sub={irr.text}
          footLabel="7-day water deficit"
          foot={s.irrigation.status === 'unavailable' ? 'Unavailable' : fmtMm(s.irrigation.deficit_mm)}
        />
        <KpiCard
          to="/ai-insights"
          label="Overall farm risk"
          badge={<Badge tone="neutral">{risk.available}/{risk.total} rated</Badge>}
          value={riskLabel(risk.overall)}
          valueClass={TONE_TEXT[riskTone(risk.overall)]}
          sub={worst.length ? `Driven by ${worst.map((w) => w.label.toLowerCase()).join(', ')}` : 'No category above low'}
          footLabel="Primary watchpoint"
          foot={worst[0]?.label ?? 'None'}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel className="lg:col-span-7" icon="routine" title="7-day agro-meteorological forecast"
          subtitle="Daily max/min temperature and rainfall. Labels come from the same forecast rows as the values."
          footer={weatherSourceTag(s)}>
          {s.weather.status !== 'ok' ? (
            <div className="text-body-md text-on-surface-variant">Forecast unavailable. {s.weather.error}</div>
          ) : (
            <div className="space-y-4">
              <ForecastStrip s={s} />
              <div className="grid grid-cols-3 gap-px bg-hairline rounded-lg border border-hairline overflow-hidden text-body-sm">
                <div className="bg-white px-3 py-2"><div className="text-on-surface-variant">7-day rainfall</div><div className="font-label-md tabular text-[#0369A1]">{fmtMm(rain7)}</div></div>
                <div className="bg-white px-3 py-2"><div className="text-on-surface-variant">7-day ET₀</div><div className="font-label-md tabular text-on-surface">{fmtMm(s.irrigation.status === 'unavailable' ? null : s.irrigation.totals.et0)}</div></div>
                <div className="bg-white px-3 py-2"><div className="text-on-surface-variant">Soil moisture (model)</div><div className="font-label-md tabular text-on-surface">{s.weather.soil_moisture ? `${fmtNum(s.weather.soil_moisture.value, 3)} m³/m³` : 'Unavailable'}</div></div>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg border border-[#BAE6FD] bg-[#F0F9FF] px-3.5 py-3">
                <Icon name="lightbulb" className="text-[#0369A1] !text-[18px] mt-0.5" />
                <p className="text-body-sm text-[#0369A1]"><strong>Agronomic note:</strong> {note}</p>
              </div>
              <ForecastOutlook s={s} />
            </div>
          )}
        </Panel>

        {canon ? (
        <Panel className="lg:col-span-5" icon="psychology" title="Farm advisory profile" accent="forest"
          actions={<Badge tone={canon.confidence === 'High' ? 'ok' : canon.confidence === 'Medium' ? 'water' : 'caution'}>Confidence: {canon.confidence}</Badge>}
          footer={climateSourceTag(s)}>
          <div className="rounded-lg border border-hairline bg-canvas p-4">
            <Eyebrow>Canonical recommendation · {s.season.planning_label}</Eyebrow>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <div className="text-headline-md font-headline-md text-forest">{canon.crop}</div>
              <div className="text-telemetry-metric font-telemetry-metric text-chlorophyll">{fmtPct01(canon.agronomic_score)}</div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-3 text-body-sm">
              <div><div className="text-on-surface-variant">Agronomic</div><div className="font-label-md tabular text-on-surface">{fmtPct01(canon.agronomic_score)}</div></div>
              <div><div className="text-on-surface-variant">Economic outlook</div><div className="font-label-md tabular text-on-surface">{canon.economic.confidence === 'Unavailable' ? 'Not assessable' : `${canon.economic.confidence} conf.`}</div></div>
              <div><div className="text-on-surface-variant">Net / ha</div><div className="font-label-md tabular text-on-surface">{canon.economic.observed_price ? fmtINRCompact(canon.financials.net_per_ha) : 'Unavailable'}</div></div>
            </div>
            <ul className="mt-3 space-y-1 text-body-sm text-on-surface">
              {s.recommendation.explanation.map((e) => <li key={e} className="flex gap-1.5"><Icon name="chevron_right" className="!text-[16px] text-outline" />{localizeText(e)}</li>)}
            </ul>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <Eyebrow>Rule-factor attribution</Eyebrow>
              <span className="text-label-sm font-label-sm text-outline">exact rule penalties, not SHAP</span>
            </div>
            <FactorAttribution items={canon.attribution.slice(0, 5)} />
            {canon.excluded_factors.length > 0 && (
              <p className="mt-3 text-body-sm text-on-surface-variant">Not evaluated (no data): {canon.excluded_factors.join(', ')}. <Link className="text-forest font-semibold hover:underline" to="/farm-profile">Add soil test</Link></p>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 text-body-sm">
            <span className="flex items-center gap-2">{priceBasisBadge(canon)} <span className="text-on-surface-variant">{isNum(canon.financials.price_per_kg) ? `₹${fmtNum(canon.financials.price_per_kg, 2)}/kg` : ''}</span></span>
            <ModuleLink to="/crop-advisor">Full analysis</ModuleLink>
          </div>
          <RecommendationOutlook c={canon} />
        </Panel>
        ) : (
          <Panel className="lg:col-span-5" icon="psychology" title="Farm advisory profile">
            <UnavailableBlock icon="block" title="Recommendation unavailable" reason={s.recommendation.explanation[0]} />
          </Panel>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel className="lg:col-span-7" icon="shield" title="Risk overview" subtitle={`${risk.total} evidence-backed categories. Select one to open its module.`}>
          <RiskMatrix categories={risk.categories} />
        </Panel>
        <Panel className="lg:col-span-5" icon="notifications_active" title="Active alerts" subtitle="Generated from the current data for this farm">
          {alerts.length === 0 ? (
            <div className="text-body-md text-on-surface-variant py-6 text-center">No active alerts for this location.</div>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => {
                const tone = severityTone(a.severity);
                return (
                  <li key={a.id}>
                    <Link to={a.module} className="flex items-start gap-2.5 rounded-lg border border-hairline px-3 py-2.5 hover:bg-canvas">
                      <Icon name={severityIcon(a.severity)} fill className={`${TONE_TEXT[tone]} !text-[18px] mt-0.5`} />
                      <span className="min-w-0">
                        <span className="block text-body-md font-semibold text-on-surface">{localizeText(a.title)}</span>
                        <span className="block text-body-sm text-on-surface-variant line-clamp-2">{localizeText(a.message)}</span>
                        <span className="block mt-1 text-label-sm font-label-sm text-outline">{a.source} · {fmtRelative(a.updatedAt)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </section>

      {s.weather.status === 'ok' && (
        <p className="text-label-sm font-label-sm text-outline">
          Forecast horizon {fmtDayMonth(s.weather.daily[0]?.date)}–{fmtDayMonth(s.weather.daily[s.weather.daily.length - 1]?.date)} · timezone {s.weather.timezone} · summary built in {s._meta.build_ms} ms
        </p>
      )}
    </>
  );
};

const Dashboard: React.FC = () => <SummaryGate>{(s) => <DashboardView s={s} />}</SummaryGate>;

export default Dashboard;
