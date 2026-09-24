import React, { useEffect, useState } from 'react';
import InfoButton from '../components/InfoButton';
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiGet, farmParams } from '../lib/api';
import type { FarmSummary, YieldDetail } from '../lib/types';
import { useFarmStore } from '../store/useFarmStore';
import {
  Badge, CHART, Callout, ChartTooltip, DataTable, ErrorBlock, Eyebrow, FactorAttribution, KV, Legend, LoadingBlock, Metric, PageHeader, Panel,
  SummaryGate, UnavailableBlock, axisProps, type Column,
} from '../components/ui';
import { FarmContextBar, climateSourceTag, soilSourceTag } from '../components/widgets';
import { fmtArea, fmtINRCompact, fmtMm, fmtNum, fmtPct01, fmtTemp, fmtYield, isNum, numYield } from '../lib/format';
import { convYield, localizeText, yieldUnit } from '../lib/units';

const YieldView: React.FC<{ s: FarmSummary }> = ({ s }) => {
  const farm = useFarmStore((st) => st.selectedFarm)!;
  const [crop, setCrop] = useState(s.recommendation.canonical ?? s.crops[0].crop);
  const [detail, setDetail] = useState<YieldDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);

  useEffect(() => { setCrop(s.recommendation.canonical ?? s.crops[0].crop); }, [s.recommendation.canonical, s.request.lat, s.request.lon]);

  useEffect(() => {
    const ctl = new AbortController();
    setState('loading');
    apiGet<YieldDetail>('/api/advisory/yield', farmParams(farm, { crop }), ctl.signal)
      .then((d) => { setDetail(d); setState('ready'); })
      .catch((e) => { if (e.name !== 'AbortError') { setError(e.message); setState('error'); } });
    return () => ctl.abort();
  }, [crop, farm, nonce, s._meta.generated_at]);

  const isCanonical = crop === s.recommendation.canonical;
  const cropOptions = [...s.crops].sort((a, b) => a.crop.localeCompare(b.crop));

  return (
    <>
      <PageHeader
        eyebrow="Production forecast"
        title="Yield prediction"
        subtitle="Expected yield for the selected crop on this farm, with the exact inputs, method and data behind the estimate."
        actions={
          <label className="flex items-center gap-2 text-body-sm">
            <span className="text-on-surface-variant">Crop</span>
            <select value={crop} onChange={(e) => setCrop(e.target.value)}
              className="px-3 py-2 rounded-lg border border-field bg-white text-body-md font-semibold text-forest focus:border-forest focus:ring-[3px] focus:ring-forest/10 outline-none">
              {cropOptions.map((c) => (
                <option key={c.crop} value={c.crop}>{c.crop}{c.crop === s.recommendation.canonical ? ' (recommended)' : ''}</option>
              ))}
            </select>
          </label>
        }
      />
      <FarmContextBar s={s} />

      {state === 'loading' && !detail && <LoadingBlock label={`Running the yield estimate for ${crop}…`} />}
      {state === 'error' && <ErrorBlock message={error} onRetry={() => setNonce((n) => n + 1)} />}
      {detail && <YieldBody s={s} d={detail} isCanonical={isCanonical} loading={state === 'loading'} />}
    </>
  );
};

interface FeatureRow { key: string; label: string; value: string; source: string; resolution: string; used: boolean }

const featureColumns: Column<FeatureRow>[] = [
  { key: 'label', header: 'Feature', primary: true, render: (r) => <span className="font-semibold text-on-surface">{r.label}</span> },
  { key: 'value', header: 'Value', align: 'right', render: (r) => <span className={r.value === 'Not provided' || r.value === 'Unavailable' ? 'text-outline' : ''}>{r.value}</span> },
  { key: 'source', header: 'Source', render: (r) => <span className="text-on-surface-variant">{r.source}</span> },
  { key: 'res', header: 'Resolution / time', render: (r) => <span className="text-on-surface-variant">{r.resolution}</span> },
  { key: 'used', header: 'Used by method', render: (r) => <Badge tone={r.used ? 'ok' : 'neutral'}>{r.used ? 'Yes' : 'Reported only'}</Badge> },
];

function featureRows(s: FarmSummary, d: YieldDetail): FeatureRow[] {
  const f = d.features;
  const src = d.feature_sources;
  const ml = d.estimate.method === 'ml';
  const clim = s.climate.status === 'ok' ? `0.5° grid · ${s.climate.period} climatology` : 'Unavailable';
  const soilRes = s.soil.status === 'ok' ? `~1 km cell · ${s.soil.depth.replace('-', '–')}` : s.soil.status === 'fallback' ? `Nearby cell ${fmtNum(s.soil.distance_km, 1)} km away` : 'Unavailable';
  const hist = d.historical.series.filter((h) => !h.placeholder_like);
  const row = (key: string, label: string, value: string, source: string | undefined, resolution: string, used: boolean): FeatureRow =>
    ({ key, label, value, source: source ?? 'Not available', resolution, used });
  return [
    row('crop', 'Crop', d.crop, 'Recommendation / user selection', '–', true),
    row('season', 'Season', `${s.season.planning_label} · sowing ${d.agronomic.sowing.window_label ?? 'unknown'}`, 'Indian crop calendar (rules)', 'Month', !ml),
    row('temperature', 'Temperature', isNum(f.temperature) ? fmtTemp(f.temperature) : 'Unavailable', src.temperature, clim, !ml),
    row('rainfall', 'Rainfall', isNum(f.rainfall) ? fmtMm(f.rainfall, 0) : 'Unavailable', src.rainfall, clim, !ml),
    row('humidity', 'Humidity', isNum(f.humidity) ? `${fmtNum(f.humidity, 0)}%` : 'Unavailable', src.humidity, clim, !ml),
    row('solar', 'Solar radiation', isNum(f.solar) ? `${fmtNum(f.solar, 1)} MJ/m²/day` : 'Unavailable', src.solar, clim, false),
    row('ph', 'Soil pH', isNum(f.ph) ? fmtNum(f.ph, 1) : 'Not provided', src.ph, isNum(f.ph) && src.ph?.startsWith('Soil test') ? 'Field sample' : soilRes, !ml),
    row('N', 'Soil nitrogen', isNum(f.N) ? `${f.N} kg/ha` : 'Not provided', src.N ?? (isNum(s.soil.nitrogen) ? 'HWSD total N is not plant-available N' : undefined), isNum(f.N) ? 'Field sample' : '–', !ml && isNum(f.N)),
    row('texture', 'Soil texture', s.soil.interpretation.texture ?? 'Unavailable', s.soil.interpretation.texture ? 'FAO/IIASA HWSD v2.0 (USDA class)' : undefined, soilRes, false),
    row('suitability', 'Agronomic suitability', `${fmtPct01(d.agronomic.agronomic_score)} (${d.agronomic.confidence} confidence)`, 'KRISHIMITRA Agronomic Rules Engine', '–', !ml),
    row('area', 'Farm area', fmtArea(s.request.area), 'Farm Profile', '–', true),
    row('history', 'Historical yield', hist.length ? `${fmtYield(Math.min(...hist.map((h) => h.yield_t_ha)))} – ${fmtYield(Math.max(...hist.map((h) => h.yield_t_ha)))}` : 'Unavailable',
      d.historical.status === 'ok' ? d.historical.source : d.historical.reason, hist.length ? `${hist[0].year}–${hist[hist.length - 1].year}, national` : '–', false),
    row('year', 'Year', s.season.date.slice(0, 4), 'System date', '–', ml),
  ];
}

const YieldBody: React.FC<{ s: FarmSummary; d: YieldDetail; isCanonical: boolean; loading: boolean }> = ({ s, d, isCanonical, loading }) => {
  const e = d.estimate;
  const hist = d.historical.series.filter((h) => !h.placeholder_like);
  const histAll = d.historical.series.map((h) => ({ ...h, y: convYield(h.yield_t_ha) }));
  const histMin = hist.length ? Math.min(...hist.map((h) => h.yield_t_ha)) : null;
  const histMax = hist.length ? Math.max(...hist.map((h) => h.yield_t_ha)) : null;

  return (
    <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6">
        <Panel accent="forest" bodyClassName="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow>Predicted yield · {d.crop}</Eyebrow>
            {isCanonical && <Badge tone="ok">Canonical recommendation</Badge>}
            <Badge tone={e.method === 'ml' ? 'water' : 'neutral'} icon={e.method === 'ml' ? 'model_training' : 'menu_book'}>{e.method === 'ml' ? 'ML model' : 'Reference method'}</Badge>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-[52px] leading-[56px] font-telemetry-metric font-semibold text-forest">{numYield(e.value_t_ha, 2)}</span>
            {isNum(e.value_t_ha) && <span className="text-title-lg text-on-surface-variant font-label-md">{yieldUnit()}</span>}
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Metric size="sm" label="Prediction range" value={isNum(e.low_t_ha) && isNum(e.high_t_ha) ? `${numYield(e.low_t_ha, 2)}–${numYield(e.high_t_ha, 2)}` : 'Unavailable'} unit={yieldUnit()}
              sub={e.range_basis ?? 'Not supported by this method'} />
            <Metric size="sm" label="Reliability" value={e.reliability ?? 'Unavailable'} sub={e.method === 'ml' ? `R² ${fmtNum(d.model.r2, 2)}` : 'Heuristic'} tone={e.reliability === 'Low' ? 'caution' : undefined} />
            <Metric size="sm" label={`Farm output · ${fmtArea(s.request.area)}`} value={fmtNum(d.production_t, 2)} unit="t" />
          </div>
          <Callout tone={e.method === 'ml' ? 'water' : 'neutral'} icon="info" className="mt-4">{e.method_label}. {localizeText(e.note)}</Callout>
        </Panel>

        <Panel icon="fact_check" title="Data used in this prediction">
          <KV label="Weather" value="Open-Meteo 7-day forecast" />
          <KV label="Growing-season climate" value={s.climate.status === 'ok' ? `NASA POWER ${s.climate.period}` : 'Unavailable (forecast used)'} />
          <KV label="Soil" value={s.soil.status === 'ok' ? 'FAO/IIASA HWSD v2.0' : s.soil.status === 'fallback' ? 'FAO/IIASA HWSD v2.0 (nearby cell)' : 'Unavailable'} />
          <KV label="Historical" value={d.historical.status === 'ok' ? d.historical.source : `None for ${d.crop}`} />
          <KV label="Model" value={e.method === 'ml' ? `${d.model.name} ${d.model.version ?? ''}` : 'Reference yield × agronomic suitability'} />
          <KV label="Market (revenue)" value={d.financials.price_basis === 'live' ? 'Agmarknet (live)' : d.financials.price_basis === 'last_observed' ? 'Agmarknet (last observed)' : 'Reference price'} />
          <KV label="Est. gross revenue" value={fmtINRCompact(d.financials.gross_revenue)} mono />
        </Panel>
      </section>

      <Panel icon="sensors" title="Yield prediction data" subtitle="Every input feature with its value, source and resolution. Missing values are excluded, never filled with defaults." bodyClassName="p-0"
        footer={<div className="flex flex-wrap gap-x-4 gap-y-1">{climateSourceTag(s)}{soilSourceTag(s)}</div>}>
        <DataTable columns={featureColumns} rows={featureRows(s, d)} rowKey={(r) => r.key} minWidth={760} />
      </Panel>

      <Panel icon="model_training" title="Model" subtitle="What produced this number" actions={<InfoButton id="yield_model" label="the yield model" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <KV label="Method" value={e.method === 'ml' ? 'Machine Learning Model' : e.method === 'reference' ? 'Statistical estimate (reference × suitability)' : 'Unavailable'} />
            <KV label="Model" value={e.method === 'ml' ? `${d.model.name} ${d.model.version ?? ''}` : 'KRISHIMITRA reference yield table'} />
            <KV label="Training / reference data" value={e.method === 'ml' ? 'FAOSTAT sample (India, national, local CSV)' : 'Static knowledge base (national reference yields)'} />
          </div>
          <div>
            <KV label="Prediction" value={fmtYield(e.value_t_ha)} mono />
            <KV label="Uncertainty" value={isNum(e.low_t_ha) && isNum(e.high_t_ha) ? `${fmtYield(e.low_t_ha)} – ${fmtYield(e.high_t_ha)} (${e.range_basis})` : 'Not supported by this method'} />
            <KV label="Hold-out quality" value={e.method === 'ml' && isNum(d.model.r2) ? `R² ${fmtNum(d.model.r2, 2)}, MAE ${fmtYield(d.model.mae_t_ha, 3)}` : 'Not a trained model'} />
          </div>
        </div>
      </Panel>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel icon="timeline" title="Historical yield trend" subtitle={d.historical.status === 'ok' ? `${d.historical.source}` : undefined}>
          {d.historical.status !== 'ok' ? (
            <UnavailableBlock icon="history" title="No historical series" reason={d.historical.reason} />
          ) : (
            <>
              <Legend items={[{ label: `FAOSTAT yield (${yieldUnit()})`, color: CHART.forest, shape: 'line' }, { label: 'Current prediction', color: CHART.heat }]} />
              <div className="h-64 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={histAll} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="year" type="number" domain={['dataMin', 'dataMax']} allowDecimals={false} {...axisProps} />
                    <YAxis {...axisProps} domain={['auto', 'auto']} width={48} />
                    <Tooltip content={<ChartTooltip labelFormatter={(l, p) => `${l}${p?.placeholder_like ? ' · placeholder-like value' : ''}`} valueFormatter={(v) => `${fmtNum(v, 2)} ${yieldUnit()}`} />} />
                    <Line isAnimationActive={false} dataKey="y" name="Yield" stroke={CHART.forest} strokeWidth={2}
                      dot={(p: { cx?: number; cy?: number; payload?: { placeholder_like: boolean; year: number } }) => (
                        <circle key={p.payload?.year} cx={p.cx} cy={p.cy} r={4} fill={p.payload?.placeholder_like ? '#fff' : CHART.forest} stroke={CHART.forest} strokeWidth={1.5} />
                      )} />
                    {isNum(e.value_t_ha) && <ReferenceLine y={convYield(e.value_t_ha) as number} stroke={CHART.heat} strokeDasharray="4 4" />}
                    {isNum(e.value_t_ha) && <ReferenceDot x={Number(s.season.date.slice(0, 4))} y={convYield(e.value_t_ha) as number} r={5} fill={CHART.heat} stroke="#fff" ifOverflow="extendDomain" />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {(d.historical.placeholder_rows ?? 0) > 0 && (
                <p className="mt-2 text-body-sm text-on-surface-variant">
                  Hollow points ({d.historical.placeholder_rows}) repeat an identical value in the local sample file and look like placeholders. They are excluded from the historical range.
                </p>
              )}
            </>
          )}
        </Panel>

        <Panel icon="compare_arrows" title="Prediction vs historical range">
          {histMin === null || !isNum(e.value_t_ha) ? (
            <UnavailableBlock icon="compare_arrows" title="Comparison unavailable" reason={d.historical.status === 'ok' ? 'No non-placeholder history for this crop.' : d.historical.reason} />
          ) : (
            <div className="space-y-4">
              <div className="relative h-10">
                {(() => {
                  const lo = Math.min(histMin, e.value_t_ha) * 0.95;
                  const hi = Math.max(histMax!, e.value_t_ha) * 1.05;
                  const pct = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
                  return (
                    <>
                      <div className="absolute top-4 left-0 right-0 h-2 rounded-full bg-surface-container" />
                      <div className="absolute top-4 h-2 rounded-full bg-forest/40" style={{ left: pct(histMin), width: `calc(${pct(histMax!)} - ${pct(histMin)})` }} />
                      <div className="absolute top-1.5 w-3 h-7 -ml-1.5 rounded bg-caution border-2 border-white" style={{ left: pct(e.value_t_ha) }} title="Prediction" />
                    </>
                  );
                })()}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Metric size="sm" label="Historical min" value={numYield(histMin, 2)} unit={yieldUnit()} />
                <Metric size="sm" label="Historical max" value={numYield(histMax, 2)} unit={yieldUnit()} />
                <Metric size="sm" label="Prediction" value={numYield(e.value_t_ha, 2)} unit={yieldUnit()} tone="caution" />
              </div>
              <p className="text-body-sm text-on-surface-variant">National (India) FAOSTAT yields, not farm-level records.</p>
            </div>
          )}
        </Panel>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel icon="tune" title="Yield sensitivity" subtitle={d.sensitivity ? 'Estimate vs agronomic suitability (reference method)' : undefined}>
          {d.sensitivity ? (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d.sensitivity.map((p) => ({ ...p, y: convYield(p.yield_t_ha) }))} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="suitability" type="number" domain={[40, 100]} ticks={[40, 50, 60, 70, 80, 90, 100]} tickFormatter={(v) => `${v}%`} {...axisProps} />
                  <YAxis {...axisProps} width={48} />
                  <Tooltip content={<ChartTooltip labelFormatter={(l) => `Suitability ${l}%`} valueFormatter={(v) => `${fmtNum(v, 2)} ${yieldUnit()}`} />} />
                  <Line isAnimationActive={false} dataKey="y" name="Yield" stroke={CHART.forest} strokeWidth={2} dot={{ r: 3, fill: CHART.forest }} />
                  <ReferenceDot x={Math.round(d.agronomic.agronomic_score * 100)} y={convYield(e.value_t_ha) ?? 0} r={6} fill={CHART.heat} stroke="#fff" ifOverflow="extendDomain" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <UnavailableBlock icon="tune" title="Sensitivity not supported" reason="The ML model uses only year and crop, so local conditions do not change its output." />
          )}
        </Panel>

        <Panel icon="insights" title={e.shap ? 'Model explanation (SHAP)' : 'Important factors'} actions={<InfoButton id="yield_model" label="the yield model" />} subtitle={e.shap ? `Base value ${fmtYield(e.shap.base_t_ha, 3)}` : 'Rule-factor attribution driving the suitability-scaled estimate (not SHAP)'}>
          {e.shap ? (
            <div className="space-y-2">
              {e.shap.contributions.map((c) => (
                <div key={c.feature} className="grid grid-cols-[120px_1fr_80px] items-center gap-3 text-body-sm">
                  <span className="font-label-md truncate">{c.feature} = {c.value}</span>
                  <div className="relative h-2 bg-surface-container rounded-full">
                    <div className="absolute left-1/2 top-[-3px] bottom-[-3px] border-l border-dashed border-[#94A3B8]" />
                    <div className={`absolute h-full rounded-full ${c.shap_t_ha >= 0 ? 'bg-chlorophyll left-1/2' : 'bg-caution right-1/2'}`}
                      style={{ width: `${Math.min(50, (Math.abs(c.shap_t_ha) / Math.max(...e.shap!.contributions.map((x) => Math.abs(x.shap_t_ha)), 1e-6)) * 50)}%` }} />
                  </div>
                  <span className="font-label-md tabular text-right">{c.shap_t_ha >= 0 ? '+' : ''}{fmtNum(c.shap_t_ha, 3)}</span>
                </div>
              ))}
            </div>
          ) : (
            <FactorAttribution items={d.agronomic.attribution} />
          )}
        </Panel>
      </section>
    </div>
  );
};

const YieldPredictionPage: React.FC = () => <SummaryGate>{(s) => <YieldView s={s} />}</SummaryGate>;

export default YieldPredictionPage;
