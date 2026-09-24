import React from 'react';
import InfoButton from '../components/InfoButton';
import { Link } from 'react-router-dom';
import type { FarmSummary, RiskCategory } from '../lib/types';
import {
  Badge, Callout, Eyebrow, FactorAttribution, Icon, PageHeader, Panel, SummaryGate, TONE_TEXT, UnavailableBlock, riskLabel, riskTone, type Tone,
} from '../components/ui';
import { FarmContextBar, RiskMatrix, climateSourceTag, soilSourceTag, weatherSourceTag } from '../components/widgets';
import { fmtAgDate, fmtDayLabel, fmtDayMonth, fmtMm, fmtNum, fmtPct01, fmtWeekday, isNum } from '../lib/format';
import { localizeText } from '../lib/units';

interface Insight { id: string; tone: Tone; icon: string; title: string; detail: string; data: string; to: string }

function buildInsights(s: FarmSummary): Insight[] {
  const out: Insight[] = [];
  const canon = s.crops.find((c) => c.crop === s.recommendation.canonical);
  if (!canon) {
    out.push({ id: 'norec', tone: 'caution', icon: 'block', title: 'Recommendation unavailable', detail: s.recommendation.explanation[0] ?? '', data: 'Data sources', to: '/settings#sources' });
    return out;
  }
  const daily = s.weather.daily;

  if (daily.length) {
    const rain = daily.reduce((a, d) => a + (d.precip ?? 0), 0);
    const wet = daily.filter((d) => (d.precip ?? 0) >= 2.5);
    out.push({
      id: 'rain', tone: rain >= 64.5 ? 'caution' : 'water', icon: 'rainy',
      title: `Rainfall forecast: ${fmtMm(rain)} over ${daily.length} days`,
      detail: wet.length ? `${wet.length} rainy day(s), heaviest ${fmtMm(Math.max(...daily.map((d) => d.precip ?? 0)))} on ${fmtDayLabel(daily.reduce((a, b) => ((a.precip ?? 0) >= (b.precip ?? 0) ? a : b)).date)}.` : 'No day with meaningful rain (≥ 2.5 mm) is forecast.',
      data: 'Open-Meteo forecast', to: '/weather-intelligence',
    });
    const tmaxes = daily.map((d) => d.tmax).filter(isNum);
    if (tmaxes.length) {
      const t = canon.attribution.find((a) => a.factor === 'temperature');
      out.push({
        id: 'temp', tone: Math.max(...tmaxes) >= 35 ? 'caution' : 'neutral', icon: 'thermostat',
        title: `Current temperature is ${fmtNum(s.weather.current?.temperature, 1)} °C; week maxima ${fmtNum(Math.min(...tmaxes), 0)}–${fmtNum(Math.max(...tmaxes), 0)} °C`,
        detail: t && isNum(t.value) ? `${canon.crop} prefers a ${t.min}–${t.max} °C growing-season mean; the NASA POWER climatology for its growing months is ${t.value} °C.` : 'Growing-season temperature could not be evaluated.',
        data: 'Open-Meteo current + NASA POWER', to: '/weather-intelligence',
      });
    }
  }

  if (s.irrigation.status !== 'unavailable') {
    const n = s.irrigation.next_irrigation;
    out.push({
      id: 'water', tone: n ? 'water' : 'ok', icon: 'water_drop',
      title: n ? `Irrigation needed on ${fmtDayLabel(n.date)}` : 'No irrigation needed in the forecast window',
      detail: `7-day crop water use ${fmtMm(s.irrigation.totals.etc)} against ${fmtMm(s.irrigation.totals.eff_rain)} effective rain.`,
      data: 'Open-Meteo ET₀ · FAO-56', to: '/irrigation-advisor',
    });
  }

  const ph = canon.attribution.find((a) => a.factor === 'ph');
  if (ph && isNum(ph.value)) {
    out.push({
      id: 'ph', tone: ph.status === 'in_range' ? 'ok' : 'caution', icon: 'science',
      title: ph.status === 'in_range' ? `Soil pH ${ph.value} suits ${canon.crop}` : `Soil pH ${ph.value} may limit ${canon.crop}`,
      detail: `Preferred range ${ph.min}–${ph.max}. Source: ${ph.source}.`,
      data: ph.source ?? 'Soil', to: '/soil-intelligence',
    });
  } else {
    out.push({ id: 'ph', tone: 'neutral', icon: 'science', title: 'Soil pH is not being evaluated', detail: 'HWSD v2.0 has no pH for this location and no soil test is recorded, so pH-sensitive crops are not filtered.', data: 'FAO/IIASA HWSD v2.0', to: '/soil-intelligence' });
  }

  const mk = canon.market;
  if (mk.status === 'live' && isNum(mk.modal_price)) {
    const prev = mk.previous;
    out.push({
      id: 'market', tone: prev && mk.modal_price < prev.modal_price ? 'caution' : 'ok', icon: 'storefront',
      title: `${canon.crop} trades at ₹${fmtNum(mk.modal_price / 100, 2)}/kg at ${mk.market}`,
      detail: prev
        ? `Market price trend: ${((mk.modal_price - prev.modal_price) / prev.modal_price * 100).toFixed(1)}% vs ${fmtAgDate(prev.arrival_date)} (₹${fmtNum(prev.modal_price / 100, 2)}/kg).`
        : `First observation for this market (${fmtAgDate(mk.arrival_date)}); a trend needs at least two daily observations. Range across ${mk.markets_considered} markets ₹${fmtNum((mk.pool_min ?? 0) / 100, 2)}–₹${fmtNum((mk.pool_max ?? 0) / 100, 2)}/kg.`,
      data: 'Agmarknet', to: '/crop-advisor',
    });
  }

  if (canon.sowing.status === 'open' || canon.sowing.status === 'upcoming') {
    out.push({
      id: 'sowing', tone: 'ok', icon: 'event_available',
      title: canon.sowing.status === 'open' ? `${canon.crop} sowing window is open` : `${canon.crop} sowing window opens in ${canon.sowing.days_to_open} days`,
      detail: `Window ${canon.sowing.window_label}. Prepare seed and land now.`,
      data: 'KRISHIMITRA crop calendar', to: '/crop-advisor',
    });
  }
  const rank: Record<Tone, number> = { critical: 0, caution: 1, water: 2, brand: 3, neutral: 4, ok: 5 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

const whenLabel = (w: string) => (/^\d{4}-\d{2}-\d{2}$/.test(w) ? fmtDayLabel(w) : w);
const whenLabelInText = (t: string) => t.replace(/\d{4}-\d{2}-\d{2}/g, (d) => fmtDayLabel(d));

const FLAG_ICON: Record<string, string> = { heat: 'thermostat', frost: 'ac_unit', rain: 'rainy', disease: 'coronavirus', wind: 'air', irrigation: 'water_drop' };

const RiskTimeline: React.FC<{ s: FarmSummary }> = ({ s }) => {
  const tl = s.risk.timeline ?? [];
  if (!tl.length) return <div className="text-body-sm text-on-surface-variant">Forecast unavailable, so no timeline can be built.</div>;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      {tl.map((d) => (
        <div key={d.date} className={`rounded-lg border px-2.5 py-2 min-h-[96px] ${d.flags.some((f) => f.severity === 'critical') ? 'border-[#FECACA] bg-[#FEF2F2]' : d.flags.some((f) => f.severity === 'caution') ? 'border-[#FDE68A] bg-[#FFFBEB]' : 'border-hairline bg-white'}`}>
          <div className="text-label-sm font-label-sm text-on-surface">{fmtWeekday(d.date)} <span className="text-outline">{fmtDayMonth(d.date)}</span></div>
          <div className="mt-1.5 space-y-1">
            {d.flags.length === 0 && <div className="text-body-sm text-outline">No flags</div>}
            {d.flags.map((f) => (
              <div key={f.type} className={`flex items-center gap-1 text-body-sm ${f.severity === 'critical' ? 'text-[#B91C1C]' : f.severity === 'caution' ? 'text-[#B45309]' : 'text-[#0369A1]'}`}>
                <Icon name={FLAG_ICON[f.type] ?? 'flag'} className="!text-[14px]" />{localizeText(f.label)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const RiskDetail: React.FC<{ c: RiskCategory }> = ({ c }) => {
  const tone = riskTone(c.level);
  return (
    <article className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] gap-4 px-5 py-5">
      <div>
        <div className="text-title-md font-title-md text-on-surface">{c.label} risk</div>
        <Badge tone={tone} className="mt-1.5">{riskLabel(c.level)}</Badge>
        <div className="mt-2"><Link to={c.module} className="text-body-sm font-semibold text-forest hover:underline">Open module</Link></div>
      </div>
      <div className="min-w-0">
        <ul className="space-y-1">
          {c.evidence.map((e) => <li key={e} className="flex gap-2 text-body-sm text-on-surface"><Icon name="fiber_manual_record" className={`!text-[10px] mt-1.5 ${TONE_TEXT[tone]}`} />{localizeText(e)}</li>)}
        </ul>
        {c.level !== 'unavailable' && (
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-body-sm">
            <span><span className="text-on-surface-variant">When to act: </span><span className="font-semibold text-on-surface">{c.when ? whenLabel(c.when) : 'No action scheduled'}</span></span>
            <span><span className="text-on-surface-variant">Confidence: </span><span className="text-on-surface">{c.confidence ?? 'Unavailable'}</span></span>
          </div>
        )}
        {c.level !== 'unavailable' && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-px bg-hairline rounded-lg border border-hairline overflow-hidden text-body-sm">
            <div className="bg-canvas p-3"><Eyebrow className="mb-1">Why this matters</Eyebrow>{c.why}</div>
            <div className="bg-canvas p-3"><Eyebrow className="mb-1">What to watch</Eyebrow>{c.watch ?? 'Unavailable'}</div>
            <div className="bg-canvas p-3"><Eyebrow className="mb-1">Recommended action</Eyebrow><span className="font-semibold text-forest">{localizeText(whenLabelInText(c.action ?? 'None'))}</span></div>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-label-sm font-label-sm text-on-surface-variant">Data used:</span>
          {c.data_used.map((d) => <Badge key={d} tone="neutral">{d}</Badge>)}
        </div>
      </div>
    </article>
  );
};

const InsightsView: React.FC<{ s: FarmSummary }> = ({ s }) => {
  const risk = s.risk;
  const insights = buildInsights(s);
  const canon = s.crops.find((c) => c.crop === s.recommendation.canonical) ?? null;
  const ordered = [...risk.categories].sort((a, b) => ({ high: 0, moderate: 1, low: 2, unavailable: 3 }[a.level] - { high: 0, moderate: 1, low: 2, unavailable: 3 }[b.level]));

  return (
    <>
      <PageHeader eyebrow="Intelligence center" title="AI insights & risk" subtitle="Evidence-backed farm risk across climate, water, crop suitability, yield, pest & disease, soil and market, with the data behind every statement." />
      <FarmContextBar s={s} />

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-6">
        <Panel accent={risk.overall === 'high' ? 'critical' : risk.overall === 'moderate' ? 'caution' : 'forest'} bodyClassName="p-6">
          <Eyebrow>Current farm risk</Eyebrow>
          <div className={`mt-2 text-[40px] leading-[44px] font-semibold ${TONE_TEXT[riskTone(risk.overall)]}`}>{riskLabel(risk.overall)}</div>
          <p className="mt-2 text-body-sm text-on-surface-variant">Highest level across {risk.available} rated categories ({risk.total - risk.available} without data). Each level comes from explicit thresholds on the data listed with it.</p>
          <div className="mt-4 space-y-1.5">
            {(['high', 'moderate', 'low', 'unavailable'] as const).map((l) => {
              const n = risk.categories.filter((c) => c.level === l).length;
              return (
                <div key={l} className="flex items-center justify-between text-body-sm">
                  <Badge tone={riskTone(l)}>{riskLabel(l)}</Badge>
                  <span className="font-label-md tabular text-on-surface">{n}</span>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel icon="grid_view" title="Risk matrix" actions={<InfoButton id="risk_engine" label="the risk engine" />} subtitle="Select a category to open its module">
          <RiskMatrix categories={risk.categories} />
        </Panel>
      </section>

      <Panel icon="date_range" title="Risk timeline" subtitle="Day-by-day flags from the 7-day forecast and the water balance" footer={weatherSourceTag(s)}>
        <RiskTimeline s={s} />
      </Panel>

      <Panel icon="tips_and_updates" title="Top actionable insights" subtitle="Each insight is computed from a value in the current data">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((i) => (
            <Link key={i.id} to={i.to} className="flex gap-3 rounded-lg border border-hairline p-4 hover:bg-canvas transition-colors">
              <Icon name={i.icon} className={`${TONE_TEXT[i.tone]} !text-[22px]`} />
              <div className="min-w-0">
                <div className="text-body-md font-semibold text-on-surface">{localizeText(i.title)}</div>
                <div className="mt-0.5 text-body-sm text-on-surface-variant">{localizeText(i.detail)}</div>
                <div className="mt-1.5 text-label-sm font-label-sm text-outline">Data: {i.data}</div>
              </div>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel icon="fact_check" title="Risk evidence" bodyClassName="p-0 divide-y divide-hairline"
        footer={<div className="flex flex-wrap gap-x-4 gap-y-1">{weatherSourceTag(s)}{climateSourceTag(s)}{soilSourceTag(s)}</div>}>
        {ordered.map((c) => <RiskDetail key={c.id} c={c} />)}
      </Panel>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {canon ? (
          <Panel icon="query_stats" title={`Explainability: ${canon.crop}`} actions={<InfoButton id="rules_engine" label="the agronomic rules engine" />} subtitle={`Agronomic suitability ${fmtPct01(canon.agronomic_score)}, as exact rule-factor penalties`}>
            <FactorAttribution items={canon.attribution} />
          </Panel>
        ) : (
          <Panel icon="query_stats" title="Explainability">
            <UnavailableBlock icon="block" title="Recommendation unavailable" reason={s.recommendation.explanation[0]} />
          </Panel>
        )}
        <Panel icon="model_training" title="Model transparency">
          <div className="space-y-3 text-body-sm text-on-surface">
            <Callout tone="neutral" icon="info" title="Why no SHAP for crop ranking">
              Crop ranking uses the transparent rules engine above, whose factor penalties are exact rather than approximated, so SHAP is not needed. The crop classifier (XGBoost) is shown separately as the ML opinion in Crop Advisor and never changes the ranking.
            </Callout>
            <ul className="divide-y divide-hairline">
              {([['rules_engine', 'Agronomic rules engine', 'Crop suitability and recommendation'], ['crop_classifier', 'Crop classifier (XGBoost)', 'ML opinion · precision, recall, F1, confusion matrix'],
                ['yield_model', 'Yield model (XGBoost + reference)', 'MAE, RMSE, R² · SHAP'], ['irrigation', 'FAO-56 water balance', 'Irrigation schedule'],
                ['soil_rules', 'Soil interpretation rules', 'Constraints and amendments'], ['risk_engine', 'Risk engine', '7 threshold-based categories']] as const).map(([id, name, what]) => (
                <li key={id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="min-w-0"><span className="font-semibold">{name}</span> <span className="text-on-surface-variant">· {what}</span></span>
                  <InfoButton id={id} label={name} />
                </li>
              ))}
            </ul>
            <p>
              Yield: {!canon ? 'no recommended crop.' : canon.yield.method === 'ml'
                ? <>the XGBoost yield model supports {canon.crop}; its SHAP explanation is on the <Link to="/yield-prediction" className="font-semibold text-forest hover:underline">Yield Prediction</Link> page.</>
                : <>{canon.crop} is not covered by the yield model, so the estimate uses the labelled reference-yield method (no SHAP available).</>}
            </p>
            <p className="text-on-surface-variant">Agronomic Rules Engine {s._meta.rules_version}. The recommendation is the most suitable crop that can be sown now; economic outlook is shown separately and never merged into the suitability score. No deep-learning model is used anywhere in KRISHIMITRA.</p>
          </div>
        </Panel>
      </section>
    </>
  );
};

const AIInsightsPage: React.FC = () => <SummaryGate>{(s) => <InsightsView s={s} />}</SummaryGate>;

export default AIInsightsPage;
