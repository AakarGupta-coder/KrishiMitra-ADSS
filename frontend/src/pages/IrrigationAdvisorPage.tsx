import React from 'react';
import InfoButton from '../components/InfoButton';
import { Link } from 'react-router-dom';
import { Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FarmSummary } from '../lib/types';
import {
  Badge, CHART, Callout, ChartTooltip, Eyebrow, Icon, Legend, Metric, MetricStrip, PageHeader, Panel, SummaryGate, TONE_TEXT, UnavailableBlock, axisProps, type Tone,
} from '../components/ui';
import { FarmContextBar, irrigationHeadline, soilSourceTag, weatherSourceTag } from '../components/widgets';
import { fmtArea, fmtDayLabel, fmtDayMonth, fmtMm, fmtNum, fmtWeekday, isNum, numRain } from '../lib/format';
import { convRain, localizeText, rainUnit } from '../lib/units';

type Kind = 'Forecast' | 'Estimated' | 'Model-derived' | 'Observed';
const KIND_TONE: Record<Kind, Tone> = { Forecast: 'water', Estimated: 'neutral', 'Model-derived': 'caution', Observed: 'ok' };
const KindBadge: React.FC<{ k: Kind }> = ({ k }) => <Badge tone={KIND_TONE[k]}>{k}</Badge>;

const IrrigationView: React.FC<{ s: FarmSummary }> = ({ s }) => {
  const irr = s.irrigation;
  const head = irrigationHeadline(s);

  if (irr.status === 'unavailable') {
    return (
      <>
        <PageHeader title="Irrigation advisor" subtitle="Root-zone water balance from forecast evapotranspiration and rainfall." />
        <FarmContextBar s={s} />
        <UnavailableBlock icon="water_drop" title="Water balance unavailable" reason={irr.reason ?? 'The ET₀ forecast is unavailable, so no irrigation requirement can be computed. Nothing is estimated in its place.'} />
      </>
    );
  }

  const byDate = Object.fromEntries(s.weather.daily.map((d) => [d.date, d]));
  const chart = irr.days.map((d) => ({
    ...d,
    rain: convRain(d.rain),
    etc: convRain(d.etc),
    irrigation_gross: convRain(d.irrigation_gross),
    depletion: convRain(d.depletion) as number,
  }));
  const raw = convRain(irr.raw_mm) as number;
  const u = rainUnit();
  const yTick = (v: number) => (u === 'in' ? v.toFixed(1) : String(v));
  const n = irr.next_irrigation;
  const windOnDay = n ? byDate[n.date]?.wind_max : null;

  return (
    <>
      <PageHeader
        eyebrow="Water management"
        title="Irrigation advisor"
        subtitle="Daily root-zone water balance (FAO-56) from forecast reference evapotranspiration, rainfall and modelled soil moisture."
      />
      <FarmContextBar s={s} />

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-6">
        <Panel accent={head.tone === 'critical' ? 'critical' : head.tone === 'caution' ? 'caution' : 'water'} bodyClassName="p-6">
          <Eyebrow>Current irrigation status</Eyebrow>
          <div className={`mt-2 flex items-center gap-2 text-headline-md font-headline-md ${TONE_TEXT[head.tone]}`}>
            <Icon name={head.icon} fill className="!text-[28px]" />
            {head.text}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <Metric label="Next irrigation" value={n ? `${fmtWeekday(n.date)} ${fmtDayMonth(n.date)}` : 'None in window'} size="sm" />
            <Metric label={irr.efficiency ? 'Gross depth' : 'Net depth'} value={n ? numRain(n.gross_mm, 0) : 'Not needed'} unit={n ? u : undefined} size="sm" tone="water" />
            <Metric label="Water volume" value={fmtNum(irr.volume_m3, 0)} unit="m³" size="sm" sub={`for ${fmtArea(s.request.area)} over ${irr.horizon_days} days${irr.volume_m3 === 0 ? ' (calculated: none required)' : ''}`} />
            <Metric label="7-day deficit" value={numRain(irr.deficit_mm, 1)} unit={u} size="sm" sub="ETc − effective rain (before soil storage)" />
          </div>
          <div className="mt-5 pt-4 border-t border-hairline text-body-sm text-on-surface space-y-1.5">
            <div className="font-semibold text-forest">Recommended timing</div>
            {n ? (
              <>
                <p>Irrigate on <strong>{fmtDayLabel(n.date)}</strong>, when depletion first exceeds the readily available water ({fmtMm(irr.raw_mm, 0)}). Apply about {fmtMm(n.gross_mm, 0)}{irr.efficiency ? ` with ${irr.irrigation_type} (${Math.round(irr.efficiency * 100)}% efficiency)` : ' net (no irrigation system on record)'}.</p>
                <p className="text-on-surface-variant">Irrigate early morning or evening to cut evaporation losses{isNum(windOnDay) && windOnDay >= 20 && irr.irrigation_type === 'Sprinkler' ? `; gusts up to ${fmtNum(windOnDay, 0)} km/h forecast that day will cause sprinkler drift` : ''}.</p>
              </>
            ) : (
              <p>No irrigation required within the {irr.horizon_days}-day forecast. Depletion stays below {fmtMm(irr.raw_mm, 0)}.</p>
            )}
            {irr.irrigation_type === 'Rainfed' && (
              <p className="text-on-surface-variant">This farm is recorded as rainfed. <Link to="/farm-profile" className="font-semibold text-forest hover:underline">Set the irrigation system</Link> to get gross application depths.</p>
            )}
          </div>
        </Panel>

        <Panel icon="water" title="7-day water balance" actions={<InfoButton id="irrigation" label="the irrigation water balance" />} subtitle={`All series in ${u}/day on one axis, aligned to the forecast dates`}
          footer={<div className="flex flex-wrap gap-x-4 gap-y-1">{weatherSourceTag(s)}{soilSourceTag(s)}</div>}>
          <Legend items={[
            { label: 'Forecast rainfall', color: CHART.rain, shape: 'bar' },
            { label: 'Recommended irrigation', color: CHART.green, shape: 'bar' },
            { label: `Crop water use ETc (Kc ${irr.kc})`, color: CHART.heat, shape: 'line' },
          ]} />
          <div className="h-72 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} margin={{ top: 10, right: 8, left: -16, bottom: 0 }} barGap={2}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="date" {...axisProps} interval={0} tickFormatter={(d) => `${fmtWeekday(d)} ${Number(String(d).slice(8, 10))}`} />
                <YAxis {...axisProps} width={44} tickFormatter={yTick} />
                <Tooltip content={<ChartTooltip labelFormatter={(l) => fmtDayLabel(String(l))} valueFormatter={(v) => `${fmtNum(v, u === 'in' ? 2 : 1)} ${u}`} />} />
                <Bar isAnimationActive={false} dataKey="rain" name="Rainfall (forecast)" fill={CHART.rain} radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar isAnimationActive={false} dataKey="irrigation_gross" name="Irrigation (recommended)" fill={CHART.green} radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Line isAnimationActive={false} dataKey="etc" name="ETc (estimated)" stroke={CHART.heat} strokeWidth={2} dot={{ r: 3, fill: CHART.heat }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <MetricStrip cols="grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <Metric size="sm" label="ET₀ (7 days)" value={numRain(irr.totals.et0, 1)} unit={u} sub={<KindBadge k="Forecast" />} />
        <Metric size="sm" label="Crop requirement ETc" value={numRain(irr.totals.etc, 1)} unit={u} sub={<KindBadge k="Estimated" />} />
        <Metric size="sm" label="Forecast rainfall" value={numRain(irr.totals.rain, 1)} unit={u} sub={<KindBadge k="Forecast" />} />
        <Metric size="sm" label="Effective rainfall" value={numRain(irr.totals.eff_rain, 1)} unit={u} sub={<KindBadge k="Estimated" />} />
        <Metric size="sm" label="Soil moisture 9–27 cm" value={s.weather.soil_moisture ? fmtNum(s.weather.soil_moisture.value, 3) : 'Unavailable'} unit="m³/m³" sub={<KindBadge k="Model-derived" />} />
        <Metric size="sm" label="Readily available water" value={numRain(irr.raw_mm, 0)} unit={u} sub={<><KindBadge k="Estimated" /> of {fmtMm(irr.taw_mm, 0)} TAW</>} />
      </MetricStrip>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel icon="stacked_line_chart" title="Root-zone depletion vs threshold" subtitle="Depletion after each day's balance; resets to 0 on an irrigation day">
          <Legend items={[{ label: 'Depletion (estimated)', color: CHART.rain, shape: 'line' }, { label: 'Irrigation threshold (RAW)', color: CHART.muted, shape: 'line' }]} />
          <div className="h-56 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="date" {...axisProps} interval={0} tickFormatter={fmtWeekday} />
                <YAxis {...axisProps} width={44} tickFormatter={yTick} domain={[0, Math.max(raw * 1.3, ...chart.map((c) => c.depletion)) * 1.02]} />
                <Tooltip content={<ChartTooltip labelFormatter={(l) => fmtDayLabel(String(l))} valueFormatter={(v) => `${fmtNum(v, u === 'in' ? 2 : 1)} ${u}`} />} />
                <ReferenceLine y={raw} stroke={CHART.muted} strokeDasharray="4 4" label={{ value: `RAW ${fmtMm(irr.raw_mm, 0)}`, position: 'insideTopRight', fill: CHART.axis, fontSize: 11 }} />
                <Area isAnimationActive={false} dataKey="depletion" name="Depletion" stroke={CHART.rain} fill={CHART.rain} fillOpacity={0.12} strokeWidth={2} dot={{ r: 3, fill: CHART.rain }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel icon="rule" title="Method & assumptions" actions={<InfoButton id="irrigation" label="the irrigation water balance" />}>
          <ul className="space-y-1.5 text-body-sm text-on-surface">
            {irr.assumptions.map((a) => <li key={a} className="flex gap-2"><Icon name="check" className="!text-[16px] text-outline mt-px" />{localizeText(a)}</li>)}
            <li className="flex gap-2"><Icon name="check" className="!text-[16px] text-outline mt-px" />Growth stage not recorded: the mid-season crop coefficient is applied throughout.</li>
          </ul>
          {!irr.crop && (
            <Callout tone="caution" icon="grass" className="mt-4">
              No standing crop is recorded, so the balance uses reference ET₀. <Link to="/farm-profile" className="font-semibold text-forest hover:underline">Set the current crop</Link> to apply its FAO-56 crop coefficient.
            </Callout>
          )}
        </Panel>
      </section>

      <Panel icon="table_rows" title="Daily balance" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-body-sm">
            <thead>
              <tr className="text-left text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant border-b border-hairline">
                {['Date', 'Rain', 'Effective rain', 'ET₀', 'ETc', 'Balance', 'Depletion', 'Irrigation'].map((h, i) => (
                  <th key={h} className={`py-2 font-medium ${i === 0 ? 'pl-5 pr-3' : 'px-3 text-right'} ${i === 7 ? 'pr-5' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {irr.days.map((d) => (
                <tr key={d.date} className={`border-b border-hairline last:border-0 ${d.irrigation_gross > 0 ? 'bg-[#F0FDF4]' : ''}`}>
                  <td className="py-2 pl-5 pr-3 font-semibold text-on-surface whitespace-nowrap">{fmtDayLabel(d.date)}</td>
                  <td className="py-2 px-3 text-right font-label-md tabular">{fmtMm(d.rain)}</td>
                  <td className="py-2 px-3 text-right font-label-md tabular">{fmtMm(d.effective_rain)}</td>
                  <td className="py-2 px-3 text-right font-label-md tabular">{fmtMm(d.et0, 2)}</td>
                  <td className="py-2 px-3 text-right font-label-md tabular">{fmtMm(d.etc, 2)}</td>
                  <td className={`py-2 px-3 text-right font-label-md tabular ${d.balance < 0 ? 'text-[#B45309]' : 'text-[#0369A1]'}`}>{d.balance > 0 ? '+' : ''}{fmtMm(d.balance, 2)}</td>
                  <td className="py-2 px-3 text-right font-label-md tabular">{fmtMm(d.depletion)}</td>
                  <td className="py-2 pl-3 pr-5 text-right font-label-md tabular font-semibold text-[#15803D]">{d.irrigation_gross > 0 ? fmtMm(d.irrigation_gross) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
};

const IrrigationAdvisorPage: React.FC = () => <SummaryGate>{(s) => <IrrigationView s={s} />}</SummaryGate>;

export default IrrigationAdvisorPage;
