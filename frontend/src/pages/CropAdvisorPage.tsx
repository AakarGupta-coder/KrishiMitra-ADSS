import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, LabelList, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { apiGet, farmParams } from '../lib/api';
import type { CropResult, FarmSummary, Compatibility, MlOpinion } from '../lib/types';
import { useFarmStore } from '../store/useFarmStore';
import {
  Badge, Button, CHART, Callout, DataTable, Eyebrow, FactorAttribution, Icon, KV, PageHeader, Panel, Progress, Segmented, SourceTag, SummaryGate, TONE_TEXT, axisProps,
  type Column,
} from '../components/ui';
import { FarmContextBar, MarketLine, NoRecommendation, climateSourceTag, economicBadge, priceBasisBadge, soilSourceTag } from '../components/widgets';
import { MARKET_BASIS_LABEL, fmtAgDate, fmtArea, fmtINR, fmtINRCompact, fmtMm, fmtNum, fmtPct01, fmtRelative, fmtYield, isNum } from '../lib/format';
import { convRain, convTemp, localizeText, rainUnit, tempUnit } from '../lib/units';
import { providerRow, tagState } from '../lib/providerStatus';

type View = 'agronomic' | 'economic' | 'tradeoff';

const COST_LABELS: Record<string, string> = {
  seed: 'Seed', fertilizer: 'Fertiliser', pesticide: 'Pesticide / plant protection', irrigation: 'Irrigation',
  labour: 'Labour', machinery: 'Machinery', transport: 'Transport', other: 'Other production costs',
};

const scoreTone = (v: number) => (v >= 0.75 ? 'ok' : v >= 0.5 ? 'caution' : 'critical') as 'ok' | 'caution' | 'critical';

const compatLabel = (c: Compatibility) =>
  c.status === 'not_evaluated' ? 'Not evaluated' : `${c.status === 'compatible' ? 'Compatible' : c.status === 'partial' ? 'Partly compatible' : 'Incompatible'} (${c.in_range}/${c.evaluated})`;
const compatTone = (c: Compatibility) => (c.status === 'compatible' ? 'ok' : c.status === 'partial' ? 'caution' : c.status === 'incompatible' ? 'critical' : 'neutral') as 'ok' | 'caution' | 'critical' | 'neutral';

const DataKind: React.FC<{ kind: 'Observed' | 'Estimated' | 'Reference' | 'Model-derived' | 'Unavailable' }> = ({ kind }) => (
  <Badge tone={kind === 'Observed' ? 'ok' : kind === 'Estimated' || kind === 'Model-derived' ? 'water' : kind === 'Reference' ? 'caution' : 'neutral'}>{kind}</Badge>
);

const SowingBadge: React.FC<{ c: CropResult }> = ({ c }) => {
  const s = c.sowing;
  if (s.status === 'open') return <Badge tone="ok" icon="event_available">Sowing open · {s.window_label}</Badge>;
  if (s.status === 'upcoming') return <Badge tone="water" icon="event">Opens in {s.days_to_open} d · {s.window_label}</Badge>;
  if (s.status === 'off_season') return <Badge tone="neutral" icon="event_busy">Off-season · next {s.window_label}</Badge>;
  return null;
};

// Badges in the narrow card columns may wrap instead of overflowing into the neighbouring column.
const WRAP_BADGE = 'whitespace-normal! max-w-full';
const FitBadge: React.FC<{ c: Compatibility }> = ({ c }) => <Badge tone={compatTone(c)} className={WRAP_BADGE}>{compatLabel(c)}</Badge>;

const CropRow: React.FC<{ c: CropResult; rank: number; area: number; selected: boolean; onSelect: () => void; emphasis?: boolean }> = ({ c, rank, area, selected, onSelect, emphasis }) => {
  const f = c.financials;
  const [wlo, whi] = c.profile.water_requirement_mm;
  const [open, setOpen] = useState(false);
  const panelId = `factors-${c.crop.replace(/\W+/g, '-')}`;
  return (
    <article className={`grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-5 px-5 py-5 ${emphasis ? 'bg-[#F6FBF7]' : ''} ${selected ? 'ring-2 ring-inset ring-forest/25' : ''}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`w-7 h-7 shrink-0 rounded-full grid place-items-center text-label-md font-label-md ${rank === 1 ? 'bg-forest text-white' : 'bg-surface-container text-forest'}`}>{rank}</span>
          <h3 className="text-title-lg font-title-lg text-on-surface">{c.crop}</h3>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-[34px] leading-[38px] font-telemetry-metric font-semibold ${TONE_TEXT[scoreTone(c.agronomic_score)]}`}>{fmtPct01(c.agronomic_score)}</span>
          <span className="text-body-sm text-on-surface-variant">agronomic suitability</span>
        </div>
        <Progress value={c.agronomic_score} tone={scoreTone(c.agronomic_score) === 'ok' ? 'ok' : scoreTone(c.agronomic_score)} className="mt-2" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone={c.confidence === 'High' ? 'ok' : c.confidence === 'Medium' ? 'water' : 'caution'} title={`${Math.round(c.coverage * 100)}% of rule inputs available`}>{c.confidence} confidence</Badge>
          <SowingBadge c={c} />
          {!c.eligible && <Badge tone="caution" icon="block" title={c.ineligible_reasons.join('; ')}>Not eligible</Badge>}
        </div>
        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-body-sm">
          <dt className="text-on-surface-variant">Duration</dt><dd className="min-w-0 text-on-surface">{isNum(c.profile.duration_months) ? `${c.profile.duration_months} months` : 'Unavailable'}</dd>
          <dt className="text-on-surface-variant">Water need</dt><dd className="min-w-0 text-on-surface">{fmtMm(wlo, 0)}–{fmtMm(whi, 0)}</dd>
          <dt className="text-on-surface-variant">Weather</dt><dd className="min-w-0"><FitBadge c={c.profile.weather_compatibility} /></dd>
          <dt className="text-on-surface-variant">Soil</dt><dd className="min-w-0"><FitBadge c={c.profile.soil_compatibility} /></dd>
        </dl>
      </div>

      <div className="min-w-0 text-body-sm flex flex-col items-start gap-2">
        <ul className="space-y-1 self-stretch">
          {c.positives.slice(0, 4).map((p) => (
            <li key={p} className="flex gap-1.5 text-on-surface"><Icon name="check_circle" className="text-chlorophyll !text-[16px] mt-px" />{localizeText(p)}</li>
          ))}
          {c.constraints.slice(0, 4).map((k) => (
            <li key={k.text} className="flex gap-1.5 text-on-surface">
              <Icon name={k.severity === 'info' ? 'info' : 'warning'} className={`!text-[16px] mt-px ${k.severity === 'critical' ? 'text-critical' : k.severity === 'info' ? 'text-water' : 'text-caution'}`} />
              {localizeText(k.text)}
            </li>
          ))}
        </ul>
        {c.excluded_factors.length > 0 && <p className="text-outline">Not evaluated (no data): {c.excluded_factors.join(', ')}</p>}
        {!c.eligible && <p className="text-[#B45309]">Not eligible as the recommendation: {c.ineligible_reasons.join('; ')}.</p>}
        <button type="button" aria-expanded={open} aria-controls={panelId}
          onClick={() => { setOpen(!open); if (!open) onSelect(); }}
          className="inline-flex items-center gap-1 rounded font-semibold text-forest hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest">
          <Icon name={open ? 'expand_less' : 'expand_more'} className="!text-[18px]" /> {open ? 'Hide factor breakdown' : 'Show factor breakdown'}
        </button>
        {open && <div id={panelId} className="self-stretch pt-1"><FactorAttribution items={c.attribution} /></div>}
      </div>

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap"><Eyebrow>Economic outlook</Eyebrow>{economicBadge(c, WRAP_BADGE)}</div>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2.5">
          <div><Eyebrow>Yield</Eyebrow><div className="text-title-md font-telemetry-metric text-on-surface">{fmtYield(f.yield_t_ha)}</div></div>
          <div><Eyebrow>Production</Eyebrow><div className="text-title-md font-telemetry-metric text-on-surface">{isNum(f.production_t) ? `${fmtNum(f.production_t, 2)} t` : 'Unavailable'}</div></div>
          <div><Eyebrow>Price</Eyebrow><div className="text-body-md font-label-md tabular text-on-surface">{isNum(f.price_per_kg) ? `₹${fmtNum(f.price_per_kg, 2)}/kg` : 'Unavailable'}</div></div>
          <div><Eyebrow>Gross revenue</Eyebrow><div className="text-body-md font-label-md tabular text-on-surface">{fmtINRCompact(f.gross_revenue)}</div></div>
        </div>
        <div className="mt-3 pt-3 border-t border-hairline flex items-baseline justify-between gap-2">
          <span className="text-body-sm text-on-surface-variant">Est. net return · {fmtArea(area)}</span>
          <span className={`font-telemetry-metric ${!c.economic.observed_price ? 'text-body-md text-outline' : `text-title-lg ${isNum(f.net_return) && f.net_return < 0 ? 'text-critical' : 'text-chlorophyll'}`}`}>
            {c.economic.observed_price ? fmtINRCompact(f.net_return) : 'Not assessable'}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">{priceBasisBadge(c)}</div>
        <div className="mt-1"><MarketLine m={c.market} /></div>
      </div>
    </article>
  );
};

const EconomicTable: React.FC<{ crops: CropResult[]; selected: string; onSelect: (c: string) => void }> = ({ crops, selected, onSelect }) => {
  const rows = [...crops].sort((a, b) => Number(b.economic.observed_price) - Number(a.economic.observed_price)
    || (b.financials.net_per_ha ?? -Infinity) - (a.financials.net_per_ha ?? -Infinity));
  const cols: Column<CropResult>[] = [
    { key: 'crop', header: 'Crop', primary: true, render: (c) => <span className="font-semibold text-on-surface">{c.crop}</span> },
    { key: 'agro', header: 'Agronomic', align: 'right', render: (c) => fmtPct01(c.agronomic_score) },
    { key: 'yield', header: 'Yield', align: 'right', render: (c) => fmtYield(c.financials.yield_t_ha) },
    { key: 'price', header: 'Price ₹/kg', align: 'right', render: (c) => (isNum(c.financials.price_per_kg) ? fmtNum(c.financials.price_per_kg, 2) : 'Unavailable') },
    { key: 'src', header: 'Price source', render: (c) => priceBasisBadge(c) },
    { key: 'gross', header: 'Gross', align: 'right', render: (c) => fmtINRCompact(c.financials.gross_revenue) },
    { key: 'cost', header: 'Cost (ref.)', align: 'right', render: (c) => fmtINRCompact(c.financials.cost_total) },
    {
      key: 'net', header: 'Net / ha', align: 'right',
      render: (c) => (c.economic.observed_price
        ? <span className={isNum(c.financials.net_per_ha) && c.financials.net_per_ha < 0 ? 'text-critical' : 'text-[#15803D] font-semibold'}>{fmtINRCompact(c.financials.net_per_ha)}</span>
        : <span className="text-outline">Not assessable</span>),
    },
  ];
  return <DataTable columns={cols} rows={rows} rowKey={(c) => c.crop} onRowClick={(c) => onSelect(c.crop)} selectedKey={selected} minWidth={860} />;
};

interface Pt { crop: string; x: number; y: number; eligible: boolean }

const TradeoffChart: React.FC<{ crops: CropResult[]; canonical: string | null }> = ({ crops, canonical }) => {
  const pts: Pt[] = crops.filter((c) => c.economic.observed_price && isNum(c.financials.net_per_ha))
    .map((c) => ({ crop: c.crop, x: Math.round(c.agronomic_score * 100), y: c.financials.net_per_ha as number, eligible: c.eligible }));
  const excluded = crops.filter((c) => !(c.economic.observed_price && isNum(c.financials.net_per_ha))).map((c) => c.crop);
  if (!pts.length) return <Callout tone="neutral" icon="info">No crop has an observed mandi price for this location, so the agronomic–economic trade-off cannot be plotted.</Callout>;
  return (
    <>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 24, left: 8, bottom: 20 }}>
            <CartesianGrid stroke={CHART.grid} />
            <XAxis type="number" dataKey="x" domain={[0, 100]} name="Agronomic suitability" unit="%" {...axisProps}
              label={{ value: 'Agronomic suitability (%)', position: 'insideBottom', offset: -12, fill: CHART.axis, fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name="Net return" {...axisProps} width={64} tickFormatter={(v) => fmtINRCompact(v)}
              label={{ value: 'Net return ₹/ha', angle: -90, position: 'insideLeft', fill: CHART.axis, fontSize: 11 }} />
            <ZAxis range={[90, 90]} />
            <ReferenceLine y={0} stroke={CHART.muted} strokeDasharray="4 4" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
              const p = active ? (payload?.[0]?.payload as Pt | undefined) : undefined;
              if (!p) return null;
              return (
                <div className="rounded-lg border border-field bg-white px-3 py-2 shadow-sm text-body-sm">
                  <div className="font-semibold text-on-surface">{p.crop}{p.crop === canonical ? ' · recommended' : ''}</div>
                  <div className="text-on-surface-variant">Agronomic {p.x}% · net {fmtINRCompact(p.y)}/ha</div>
                  {!p.eligible && <div className="text-[#B45309]">Not eligible (season / suitability)</div>}
                </div>
              );
            }} />
            <Scatter isAnimationActive={false} data={pts.filter((p) => p.eligible)} fill={CHART.green} name="Eligible">
              <LabelList dataKey="crop" position="top" style={{ fontSize: 11, fill: CHART.axis }} />
            </Scatter>
            <Scatter isAnimationActive={false} data={pts.filter((p) => !p.eligible)} fill="#fff" stroke={CHART.muted} name="Not eligible">
              <LabelList dataKey="crop" position="top" style={{ fontSize: 11, fill: CHART.muted }} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-on-surface-variant">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-chlorophyll" />Eligible now</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-outline bg-white" />Not eligible (off-season or low suitability)</span>
        {excluded.length > 0 && <span>Not plotted (no observed price): {excluded.join(', ')}</span>}
      </div>
    </>
  );
};

const FEATURE_LABELS: Record<string, [string, string]> = {
  temperature: ['Growing-season temperature', 'temp'],
  rainfall: ['Growing-season rainfall', 'rain'],
  humidity: ['Growing-season humidity', '%'],
  solar: ['Solar radiation', 'MJ/m²/day'],
  ph: ['Soil pH', ''],
  N: ['Soil N', 'kg/ha'],
  P: ['Soil P', 'kg/ha'],
  K: ['Soil K', 'kg/ha'],
};

const featureValue = (k: string, v: number | undefined) => {
  if (!isNum(v)) return 'Not provided';
  const [, u] = FEATURE_LABELS[k];
  if (u === 'temp') return `${fmtNum(convTemp(v), 1)} ${tempUnit()}`;
  if (u === 'rain') return `${fmtNum(convRain(v), rainUnit() === 'in' ? 1 : 0)} ${rainUnit()}`;
  return `${v}${u ? ` ${u}` : ''}`;
};

const ML_FEATURE_LABELS: Record<string, string> = {
  temperature: 'Mean temperature', humidity: 'Mean humidity', rainfall: 'Mean monthly rainfall', ph: 'Soil pH', N: 'Soil N', P: 'Soil P', K: 'Soil K',
};
const fmtProb = (p: number) => (p > 0 && p < 0.005 ? '<1%' : fmtPct01(p));
const monthName = (m: number) => new Date(2000, m - 1, 1).toLocaleString('en', { month: 'short' });

// Second opinion from the crop_xgb classifier. Shown beside the rules-based ranking; it never changes it.
const MlOpinionPanel: React.FC<{ ml: MlOpinion | undefined }> = ({ ml }) => {
  const months = ml?.window_months?.length ? `${monthName(ml.window_months[0])}–${monthName(ml.window_months[ml.window_months.length - 1])}` : null;
  return (
    <Panel icon="model_training" title="ML opinion" accent="water"
      subtitle="A trained classifier's view of this farm, for comparison. It does not change the rules-based recommendation."
      actions={<Badge tone="water">Model-derived</Badge>}
      footer={ml?.dataset && <SourceTag label="Training data" source={`${ml.dataset.rows.toLocaleString('en-IN')} rows, ${ml.classes} crops (public benchmark)`} state="historical" />}>
      {!ml || ml.status !== 'ok' ? (
        <Callout tone="neutral" icon="info" title="ML opinion unavailable">{ml?.reason ?? 'The backend did not return an ML opinion.'}</Callout>
      ) : (
        <div className="space-y-4">
          {ml.agreement === 'agree' && (
            <Callout tone="ok" icon="check_circle" title="Agrees with the rules engine">Both rank <strong>{ml.rules_pick}</strong> first.</Callout>
          )}
          {ml.agreement === 'differ' && (
            <Callout tone="caution" icon="compare_arrows" title="Differs from the rules engine">
              The model favours <strong>{ml.top_crop}</strong>; the rules engine picks <strong>{ml.rules_pick}</strong>
              {isNum(ml.rules_pick_probability) && <>, which the model gives {fmtProb(ml.rules_pick_probability)}</>}.
            </Callout>
          )}
          {ml.agreement === 'not_comparable' && (
            <Callout tone="neutral" icon="info" title="Not directly comparable">
              The rules pick, {ml.rules_pick}, is not one of the model's {ml.classes} training crops.
            </Callout>
          )}
          <ol className="space-y-2.5">
            {ml.top?.map((t, i) => (
              <li key={t.label}>
                <div className="flex items-baseline justify-between gap-2 text-body-sm">
                  <span className="min-w-0 text-on-surface"><span className="text-outline tabular mr-1.5">{i + 1}.</span>{t.crop}
                    {!t.in_rules && <span className="ml-1.5 text-label-sm font-label-sm text-outline" title="Not among the crops the rules engine evaluates">· not in rules</span>}
                  </span>
                  <span className="font-label-md tabular text-on-surface">{fmtProb(t.probability)}</span>
                </div>
                <Progress value={t.probability} tone="water" className="mt-1" />
              </li>
            ))}
          </ol>
          <details className="text-body-sm group">
            <summary className="cursor-pointer font-semibold text-forest hover:underline list-none flex items-center gap-1">
              <Icon name="expand_more" className="!text-[18px] group-open:rotate-180 transition-transform" /> Inputs and model
            </summary>
            <div className="mt-2">
              {Object.entries(ml.features ?? {}).map(([k, v]) => (
                <div key={k} className="py-1.5 border-b border-hairline">
                  <div className="flex justify-between gap-2">
                    <span className="text-on-surface-variant">{ML_FEATURE_LABELS[k] ?? k}</span>
                    <span className="font-label-md tabular text-on-surface">{featureValue(k, v)}</span>
                  </div>
                  {ml.feature_sources?.[k] && <div className="text-[11px] font-label-sm text-outline">{ml.feature_sources[k]}</div>}
                </div>
              ))}
              <KV label="Model" value={ml.model} />
              <KV label="Hold-out accuracy" value={`${fmtPct01(ml.accuracy ?? null)} (${ml.dataset?.test_rows} test rows)`} mono />
              {months && <KV label="Climate window" value={`${months}, 5-year means`} />}
              <p className="mt-2 text-on-surface-variant">
                Trained on a public benchmark dataset that is not specific to this region. Its classes separate cleanly, so probabilities are often near 100 % and overstate certainty; high hold-out accuracy does not mean the crop suits this farm.
              </p>
            </div>
          </details>
          {!!ml.unused_inputs?.length && (
            <p className="text-body-sm text-on-surface-variant">
              No soil test, so {ml.unused_inputs.join(', ')} are not used. <Link to="/farm-profile" className="font-semibold text-forest hover:underline">Enter soil test</Link>
            </p>
          )}
        </div>
      )}
    </Panel>
  );
};

const CropAdvisorView: React.FC<{ s: FarmSummary }> = ({ s }) => {
  const farm = useFarmStore((st) => st.selectedFarm)!;
  const [view, setView] = useState<View>('agronomic');
  const [rain, setRain] = useState<number | null>(null);
  const [temp, setTemp] = useState<number | null>(null);
  const [scenario, setScenario] = useState<{ crops: CropResult[]; recommendation: FarmSummary['recommendation'] } | null>(null);
  const [scenarioState, setScenarioState] = useState<'idle' | 'loading' | 'error'>('idle');
  const simulating = rain !== null || temp !== null;
  const [selected, setSelected] = useState<string>(s.recommendation.canonical as string);

  useEffect(() => { setSelected(s.recommendation.canonical as string); setRain(null); setTemp(null); }, [s.request.lat, s.request.lon]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!simulating) {
      setScenario(null);
      setScenarioState('idle');
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setScenarioState('loading');
      try {
        const r = await apiGet<{ crops: CropResult[]; recommendation: FarmSummary['recommendation'] }>(
          '/api/advisory/crop', farmParams(farm, { rainfall: rain, temp }), ctl.signal);
        setScenario(r);
        setScenarioState('idle');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setScenarioState('error');
      }
    }, 350);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [rain, temp, simulating, farm]);

  const crops = s.crops;
  const byCrop = useMemo(() => Object.fromEntries(crops.map((c) => [c.crop, c])), [crops]);
  const simByCrop = useMemo(() => Object.fromEntries((scenario?.crops ?? []).map((c) => [c.crop, c])), [scenario]);
  const canon = byCrop[s.recommendation.canonical as string];
  const topEcon = s.recommendation.top_economic ? byCrop[s.recommendation.top_economic] : null;
  const sel = byCrop[selected] ?? canon;
  const baseRain = canon.features.rainfall;
  const baseTemp = canon.features.temperature;

  return (
    <>
      <PageHeader
        eyebrow="Decision support"
        title="Crop suitability advisor"
        subtitle="Crop recommendations from the KRISHIMITRA Agronomic Rules Engine, grounded in current location telemetry, season and market conditions."
        actions={<Segmented ariaLabel="Analysis view" value={view} onChange={setView} options={[
          { value: 'agronomic', label: 'Agronomic', icon: 'eco' },
          { value: 'economic', label: 'Economic', icon: 'payments' },
          { value: 'tradeoff', label: 'Trade-off', icon: 'scatter_plot' },
        ]} />}
      />
      <FarmContextBar s={s} />

      <section className="bg-white rounded-xl border border-hairline border-t-[3px] border-t-forest overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1fr] divide-y lg:divide-y-0 lg:divide-x divide-hairline">
          <div className="p-5">
            <Eyebrow>Recommendation · {s.season.planning_label}</Eyebrow>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <h2 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg text-forest">{canon.crop}</h2>
              <SowingBadge c={canon} />
            </div>
            <ul className="mt-2 space-y-1 text-body-sm text-on-surface">
              {s.recommendation.explanation.map((e) => <li key={e} className="flex gap-1.5"><Icon name="chevron_right" className="!text-[16px] text-outline" />{localizeText(e)}</li>)}
            </ul>
          </div>
          <div className="p-5">
            <Eyebrow>Agronomic suitability</Eyebrow>
            <div className={`mt-1 text-telemetry-metric font-telemetry-metric ${TONE_TEXT[scoreTone(canon.agronomic_score)]}`}>{fmtPct01(canon.agronomic_score)}</div>
            <div className="mt-2 space-y-1 text-body-sm">
              <div className="flex justify-between gap-2"><span className="text-on-surface-variant">Weather</span><Badge tone={compatTone(canon.profile.weather_compatibility)}>{compatLabel(canon.profile.weather_compatibility)}</Badge></div>
              <div className="flex justify-between gap-2"><span className="text-on-surface-variant">Soil</span><Badge tone={compatTone(canon.profile.soil_compatibility)}>{compatLabel(canon.profile.soil_compatibility)}</Badge></div>
              <div className="flex justify-between gap-2"><span className="text-on-surface-variant">Confidence</span><span className="text-on-surface">{canon.confidence} ({Math.round(canon.coverage * 100)}% of inputs)</span></div>
            </div>
          </div>
          <div className="p-5">
            <Eyebrow>Economic outlook</Eyebrow>
            <div className={`mt-1 text-telemetry-metric font-telemetry-metric ${canon.economic.observed_price ? 'text-[#0369A1]' : 'text-outline'}`}>
              {canon.economic.observed_price ? fmtINRCompact(canon.financials.net_per_ha) : 'Not assessable'}
              {canon.economic.observed_price && <span className="text-label-sm text-on-surface-variant"> /ha net</span>}
            </div>
            <div className="mt-1">{economicBadge(canon)}</div>
            <p className="text-body-sm text-on-surface-variant mt-2">
              {topEcon ? <>Best net return at observed prices: <strong className="text-on-surface">{topEcon.crop}</strong> ({fmtINRCompact(topEcon.financials.net_per_ha)}/ha, {fmtPct01(topEcon.agronomic_score)} agronomic).</> : 'No eligible crop has an observed mandi price.'}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {view === 'agronomic' && (
            <Panel icon="eco" title="Top agronomic matches" subtitle={`Crops sowable within 60 days with ≥ ${Math.round(s._meta.min_agronomic * 100)}% suitability rank first; the rest follow, labelled not eligible.`} bodyClassName="p-0 divide-y divide-hairline"
              footer={<div className="flex flex-wrap gap-x-4 gap-y-1">{climateSourceTag(s)}{soilSourceTag(s)}<SourceTag label="Crop rules" source={s._meta.rules_version} state="historical" /></div>}>
              {crops.slice(0, 6).map((c) => (
                <CropRow key={c.crop} c={c} rank={c.rank} area={s.request.area} emphasis={c.rank === 1} selected={selected === c.crop} onSelect={() => setSelected(c.crop)} />
              ))}
            </Panel>
          )}

          {view === 'economic' && (
            <>
              <Panel icon="payments" title="Financial crop analysis" subtitle={`Expected yield × current regional price − estimated production cost, for ${fmtArea(s.request.area)}. Select a row for its build-up.`} bodyClassName="p-0"
                footer={<SourceTag label="Market" source="Agmarknet via data.gov.in" time={s.sources.agmarknet?.fetched_at as number | null}
                  state={tagState(providerRow(s, 'agmarknet').state)}
                  note={`${s.sources.agmarknet?.live ?? 0}/${s.sources.agmarknet?.total ?? 0} crops with live prices`} />}>
                <EconomicTable crops={crops} selected={selected} onSelect={setSelected} />
              </Panel>
              <Panel icon="receipt_long" title={`Cost & revenue build-up: ${sel.crop}`} actions={economicBadge(sel)}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <Eyebrow className="mb-1">Revenue</Eyebrow>
                    <KV label={<span className="flex items-center gap-2">Expected yield <DataKind kind={sel.yield.method === 'ml' ? 'Model-derived' : 'Estimated'} /></span>} value={fmtYield(sel.financials.yield_t_ha)} mono />
                    <KV label="Farm area" value={fmtArea(s.request.area)} mono />
                    <KV label="Expected production" value={isNum(sel.financials.production_t) ? `${fmtNum(sel.financials.production_t, 2)} t` : 'Unavailable'} mono />
                    <KV label={<span className="flex items-center gap-2">Price <DataKind kind={sel.financials.price_basis === 'live' || sel.financials.price_basis === 'last_observed' ? 'Observed' : sel.financials.price_basis === 'reference' ? 'Reference' : 'Unavailable'} /></span>}
                      value={isNum(sel.financials.price_per_t) ? `${fmtINR(sel.financials.price_per_t)} / t` : 'Unavailable'} mono />
                    <KV label="Gross revenue" value={fmtINR(sel.financials.gross_revenue)} mono />
                    <div className="mt-2 text-body-sm text-on-surface-variant">
                      {sel.financials.price_basis === 'live' && <>{MARKET_BASIS_LABEL[sel.market.basis ?? ''] ?? 'Live'}: {sel.market.market} ({fmtAgDate(sel.market.arrival_date)}), modal ₹{sel.market.modal_price?.toLocaleString('en-IN')}/qtl, fetched {fmtRelative(sel.market.fetched_at)}.</>}
                      {sel.financials.price_basis === 'last_observed' && <>Last observed Agmarknet price at {sel.market.market} ({fmtAgDate(sel.market.arrival_date)}); live feed unavailable.</>}
                      {sel.financials.price_basis === 'reference' && <>Static national reference price, <strong>not a market observation</strong>. {sel.market.reason}</>}
                    </div>
                  </div>
                  <div>
                    <Eyebrow className="mb-1">Production cost</Eyebrow>
                    {Object.entries(sel.financials.cost_components).map(([k, v]) => (
                      <KV key={k} label={COST_LABELS[k] ?? k} value={isNum(v) ? fmtINR(v) : <span className="text-outline font-normal">Cost unavailable</span>} />
                    ))}
                    <KV label={<span className="flex items-center gap-2"><strong className="text-on-surface">Total cost</strong> <DataKind kind="Reference" /></span>} value={fmtINR(sel.financials.cost_total)} mono />
                    <KV label={<strong className="text-on-surface">Estimated net return</strong>} value={sel.economic.observed_price
                      ? <span className={isNum(sel.financials.net_return) && sel.financials.net_return < 0 ? 'text-critical' : 'text-[#15803D]'}>{fmtINR(sel.financials.net_return)}</span>
                      : <span className="text-outline">Not assessable (no observed price)</span>} mono />
                    <p className="mt-2 text-body-sm text-on-surface-variant">{sel.financials.cost_basis ?? 'No cost source available.'} No connected source publishes itemised costs, so none are estimated.</p>
                  </div>
                </div>
              </Panel>
            </>
          )}

          {view === 'tradeoff' && (
            <Panel icon="scatter_plot" title="Agronomic vs economic trade-off" subtitle="Each crop with an observed mandi price, positioned by agronomic suitability and estimated net return per hectare. The two dimensions are not combined into one score.">
              <TradeoffChart crops={crops} canonical={canon.crop} />
            </Panel>
          )}
        </div>

        <aside className="space-y-6 min-w-0">
          <MlOpinionPanel ml={s.ml_opinion} />

          <Panel icon="query_stats" title={`Why ${sel.crop}?`} subtitle="Agronomic Rules Engine: exact rule penalties (not SHAP)">
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-body-sm text-on-surface-variant">Agronomic suitability</span>
              <span className={`text-title-lg font-telemetry-metric ${TONE_TEXT[scoreTone(sel.agronomic_score)]}`}>{fmtPct01(sel.agronomic_score)}</span>
            </div>
            <FactorAttribution items={sel.attribution} />
            {sel.excluded_factors.length > 0 && (
              <Callout tone="neutral" icon="info" className="mt-3">
                {sel.excluded_factors.join(', ')} not evaluated: no measured value. <Link to="/farm-profile" className="font-semibold text-forest hover:underline">Enter soil test</Link>
              </Callout>
            )}
          </Panel>

          <Panel icon="dataset" title="Inputs used" subtitle={`For ${sel.crop}, over its growing months`}>
            {Object.keys(FEATURE_LABELS).map((k) => (
              <div key={k} className="py-1.5 border-b border-hairline last:border-0">
                <div className="flex justify-between gap-2 text-body-sm">
                  <span className="text-on-surface-variant">{FEATURE_LABELS[k][0]}</span>
                  <span className="font-label-md tabular text-on-surface">{featureValue(k, sel.features[k])}</span>
                </div>
                {sel.feature_sources[k] && <div className="text-[11px] font-label-sm text-outline">{sel.feature_sources[k]}</div>}
              </div>
            ))}
          </Panel>

          <Panel icon="science" title="What-if scenario" subtitle="Simulation only. The baseline recommendation is never changed.">
            <div className="space-y-5">
              <label className="block">
                <span className="flex justify-between text-body-sm font-semibold text-on-surface mb-1.5">
                  <span>Seasonal rainfall</span>
                  <span className="font-label-md tabular text-[#0369A1]">{fmtMm(rain ?? baseRain, 0)}</span>
                </span>
                <input type="range" min={0} max={3000} step={25} className="w-full accent-forest"
                  value={rain ?? baseRain ?? 500} onChange={(e) => setRain(Number(e.target.value))} aria-label="Simulated seasonal rainfall" />
              </label>
              <label className="block">
                <span className="flex justify-between text-body-sm font-semibold text-on-surface mb-1.5">
                  <span>Mean temperature</span>
                  <span className="font-label-md tabular text-[#B45309]">{isNum(temp ?? baseTemp) ? `${fmtNum(convTemp(temp ?? baseTemp), 1)} ${tempUnit()}` : 'Unavailable'}</span>
                </span>
                <input type="range" min={5} max={45} step={0.5} className="w-full accent-forest"
                  value={temp ?? baseTemp ?? 25} onChange={(e) => setTemp(Number(e.target.value))} aria-label="Simulated mean temperature" />
              </label>
              {simulating && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Eyebrow>Baseline vs simulation</Eyebrow>
                    {scenarioState === 'loading' && <span className="text-label-sm text-on-surface-variant">Calculating…</span>}
                    {scenarioState === 'error' && <span className="text-label-sm text-[#B91C1C]">Failed</span>}
                  </div>
                  <table className="w-full text-body-sm">
                    <thead><tr className="text-[10px] font-label-sm uppercase tracking-wider text-on-surface-variant"><th className="text-left py-1">Crop</th><th className="text-right">Base</th><th className="text-right">Sim.</th><th className="text-right">Δ pts</th></tr></thead>
                    <tbody>
                      {crops.slice(0, 6).map((c) => {
                        const sim = simByCrop[c.crop];
                        const d = sim ? Math.round((sim.agronomic_score - c.agronomic_score) * 100) : null;
                        return (
                          <tr key={c.crop} className="border-t border-hairline">
                            <td className="py-1">{c.crop}</td>
                            <td className="text-right font-label-md tabular">{fmtPct01(c.agronomic_score)}</td>
                            <td className="text-right font-label-md tabular">{sim ? fmtPct01(sim.agronomic_score) : '–'}</td>
                            <td className={`text-right font-label-md tabular ${d === null ? '' : d > 0 ? 'text-[#15803D]' : d < 0 ? 'text-[#B91C1C]' : ''}`}>{d === null ? '–' : `${d > 0 ? '+' : ''}${d}`}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {scenario && scenario.recommendation.canonical !== s.recommendation.canonical && (
                    <p className="mt-2 text-body-sm text-[#B45309]">Under this scenario the top agronomic match would be {scenario.recommendation.canonical} (simulated).</p>
                  )}
                </div>
              )}
              <Button className="w-full" icon="restart_alt" disabled={!simulating} onClick={() => { setRain(null); setTemp(null); }}>Reset to baseline</Button>
            </div>
          </Panel>
        </aside>
      </div>
    </>
  );
};

const CropAdvisorPage: React.FC = () => (
  <SummaryGate>{(s) => (s.recommendation.canonical ? <CropAdvisorView s={s} /> : <NoRecommendation s={s} title="Crop suitability advisor" />)}</SummaryGate>
);

export default CropAdvisorPage;
