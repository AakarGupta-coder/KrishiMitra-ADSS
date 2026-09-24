import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DailyForecast, FarmSummary } from '../lib/types';
import {
  CHART, ChartTooltip, Eyebrow, Icon, Legend, Metric, MetricStrip, PageHeader, Panel, SummaryGate, UnavailableBlock, axisProps, useIsNarrow,
} from '../components/ui';
import { FarmContextBar, ForecastStrip, climateSourceTag, totalRain, weatherSourceTag } from '../components/widgets';
import { MONTHS, fmtDateTime, fmtDayLabel, fmtMm, fmtNum, fmtTemp, fmtUnit, fmtWeekday, isNum, numRain, numTemp } from '../lib/format';
import { convRain, convTemp, localizeText, rainUnit, tempUnit } from '../lib/units';
import { weatherIcon, weatherLabel } from '../lib/weather';

const tick = (v: number) => (Number.isInteger(v) ? String(v) : v < 1 ? v.toFixed(2) : v.toFixed(1));

const SmallMultiple: React.FC<{ title: string; unit: string; data: DailyForecast[]; dataKey: keyof DailyForecast; color: string; kind: 'bar' | 'line'; decimals?: number; convert?: (v: number | null) => number | null }> = ({ title, unit, data: raw, dataKey, color, kind, decimals = 1, convert }) => {
  const narrow = useIsNarrow();
  const data = raw.map((d) => ({ ...d, [dataKey]: convert ? convert(d[dataKey] as number | null) : d[dataKey] }));
  const hasAny = data.some((d) => isNum(d[dataKey]));
  const interval = narrow ? 1 : 0;
  return (
    <div className="bg-white p-4 min-w-0">
      <div className="flex items-baseline justify-between">
        <Eyebrow>{title}</Eyebrow>
        <span className="text-label-sm font-label-sm text-outline">{unit}</span>
      </div>
      {!hasAny ? (
        <div className="h-36 grid place-items-center text-body-sm text-outline">Unavailable</div>
      ) : (
        <div className="h-36 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            {kind === 'bar' ? (
              <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="date" {...axisProps} interval={interval} tickFormatter={(d) => fmtWeekday(d).slice(0, 2)} />
                <YAxis {...axisProps} width={42} tickFormatter={tick} />
                <Tooltip cursor={{ fill: '#F1F5EE' }} content={<ChartTooltip labelFormatter={(l) => fmtDayLabel(String(l))} valueFormatter={(v) => fmtUnit(v, unit, decimals)} />} />
                <Bar isAnimationActive={false} dataKey={dataKey as string} name={title} fill={color} radius={[4, 4, 0, 0]} maxBarSize={16} />
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="date" {...axisProps} interval={interval} tickFormatter={(d) => fmtWeekday(d).slice(0, 2)} />
                <YAxis {...axisProps} width={42} domain={['auto', 'auto']} tickFormatter={tick} />
                <Tooltip content={<ChartTooltip labelFormatter={(l) => fmtDayLabel(String(l))} valueFormatter={(v) => fmtUnit(v, unit, decimals)} />} />
                <Line isAnimationActive={false} dataKey={dataKey as string} name={title} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} connectNulls={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const WeatherView: React.FC<{ s: FarmSummary }> = ({ s }) => {
  const narrow = useIsNarrow();
  const w = s.weather;
  if (w.status !== 'ok') {
    return (
      <>
        <PageHeader title="Weather intelligence" />
        <FarmContextBar s={s} />
        <UnavailableBlock icon="cloud_off" title="Open-Meteo is unavailable" reason={`No forecast could be retrieved for this location${w.error ? ` (${w.error})` : ''}. No values are shown in its place. Retry from Settings → Data Sources.`} />
      </>
    );
  }
  const daily = w.daily;
  const cur = w.current;
  const rain = totalRain(s);
  const wettest = daily.reduce((a, b) => ((a.precip ?? -1) >= (b.precip ?? -1) ? a : b));
  const hottest = daily.reduce((a, b) => ((a.tmax ?? -99) >= (b.tmax ?? -99) ? a : b));
  const meanMax = daily.filter((d) => isNum(d.tmax)).reduce((a, d, _, arr) => a + (d.tmax as number) / arr.length, 0);

  const month = Number(s.season.date.slice(5, 7));
  const tempData = daily.map((d) => ({ date: d.date, tmax: convTemp(d.tmax), tmin: convTemp(d.tmin) }));
  const clim = s.climate.monthly.map((m) => ({ ...m, label: MONTHS[m.month - 1], current: m.month === month }));
  const climMonth = clim.find((m) => m.current);
  const dim = new Date(Number(s.season.date.slice(0, 4)), month, 0).getDate();
  const climWeek = climMonth && isNum(climMonth.precip_mm) ? (climMonth.precip_mm / dim) * daily.length : null;
  const climPace = climMonth && isNum(climMonth.precip_mm) ? climMonth.precip_mm / dim : null;
  let run = 0;
  const accum = daily.map((d, i) => {
    run += d.precip ?? 0;
    return { date: d.date, cum: convRain(run), pace: climPace ? convRain(climPace * (i + 1)) : null };
  });
  const meanT = daily.filter((d) => isNum(d.tmax) && isNum(d.tmin));
  const weekMean = meanT.length ? meanT.reduce((a, d) => a + ((d.tmax as number) + (d.tmin as number)) / 2, 0) / meanT.length : null;
  const tAnom = isNum(weekMean) && climMonth && isNum(climMonth.t2m) ? weekMean - climMonth.t2m : null;
  const rAnom = isNum(climWeek) && climWeek > 0 ? rain / climWeek : null;
  const tempDelta = (dC: number) => (tempUnit() === '°F' ? dC * 9 / 5 : dC);
  const et0Week = daily.reduce((a, d) => a + (d.et0 ?? 0), 0);
  const implications: string[] = [];
  if (rain < 5) implications.push(`Only ${rain.toFixed(1)} mm of rain is forecast: sowing of rainfed crops should wait for soil moisture, and irrigated fields will depend on scheduled watering.`);
  else if (rain >= 64.5) implications.push(`${rain.toFixed(0)} mm of rain this week: postpone fertiliser and spray applications before rainy days and keep drainage clear.`);
  else implications.push(`${rain.toFixed(1)} mm of rain this week is useful for field preparation; avoid spraying on the wettest day (${fmtDayLabel(wettest.date)}).`);
  if (et0Week > 0) implications.push(`Reference evapotranspiration totals ${et0Week.toFixed(1)} mm (${(et0Week / daily.length).toFixed(1)} mm/day), the atmospheric water demand a well-watered crop must meet.`);
  if (isNum(hottest.tmax) && hottest.tmax >= 35) implications.push(`Heat up to ${hottest.tmax.toFixed(1)} °C on ${fmtDayLabel(hottest.date)}: avoid transplanting and irrigate in the early morning.`);
  const humid = daily.filter((d) => isNum(d.rh_mean) && (d.rh_mean as number) >= 80).length;
  if (humid >= 3) implications.push(`${humid} days with mean humidity ≥ 80 %: favourable for fungal disease, so scout crops after the humid spell.`);
  const windy = daily.filter((d) => isNum(d.wind_max) && (d.wind_max as number) >= 25);
  if (windy.length) implications.push(`Wind up to ${Math.max(...windy.map((d) => d.wind_max as number)).toFixed(0)} km/h on ${windy.length} day(s): spray drift risk.`);

  return (
    <>
      <PageHeader eyebrow="Meteorology" title="Weather intelligence" subtitle="Current conditions, the 7-day forecast and long-term climatology for the selected farm." />
      <FarmContextBar s={s} />

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6">
        <Panel icon="thermostat" title="Current conditions" subtitle={cur ? `Model analysis for ${fmtDateTime(cur.time)} (${w.timezone})` : undefined} footer={weatherSourceTag(s)}>
          {cur ? (
            <>
              <div className="flex items-center gap-4">
                <Icon name={weatherIcon(cur.weather_code)} className="!text-[48px] text-caution" />
                <div>
                  <div className="text-[40px] leading-[44px] font-telemetry-metric font-semibold text-forest">{fmtTemp(cur.temperature)}</div>
                  <div className="text-body-md text-on-surface-variant">{weatherLabel(cur.weather_code)}</div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <Metric size="sm" label="Humidity" value={fmtNum(cur.humidity, 0)} unit="%" />
                <Metric size="sm" label="Wind" value={fmtNum(cur.wind_speed, 0)} unit="km/h" />
                <Metric size="sm" label="Precip." value={numRain(cur.precipitation, 1)} unit={rainUnit()} />
              </div>
            </>
          ) : (
            <div className="text-body-md text-on-surface-variant">Current conditions unavailable.</div>
          )}
        </Panel>

        <Panel icon="calendar_view_week" title="7-day forecast" subtitle={`${fmtDayLabel(daily[0].date)} – ${fmtDayLabel(daily[daily.length - 1].date)}`}>
          <ForecastStrip s={s} />
          <MetricStrip cols="grid-cols-2 md:grid-cols-4" className="mt-4">
            <Metric size="sm" label="Total rainfall" value={numRain(rain, 1)} unit={rainUnit()} tone="water" />
            <Metric size="sm" label="Wettest day" value={isNum(wettest.precip) ? fmtWeekday(wettest.date) : 'Unavailable'} sub={isNum(wettest.precip) ? fmtMm(wettest.precip) : undefined} />
            <Metric size="sm" label="Hottest day" value={isNum(hottest.tmax) ? fmtWeekday(hottest.date) : 'Unavailable'} sub={isNum(hottest.tmax) ? fmtTemp(hottest.tmax) : undefined} />
            <Metric size="sm" label="Mean max temp" value={numTemp(meanMax, 1)} unit={tempUnit()} sub={climMonth && isNum(climMonth.t2m) ? `NASA ${MONTHS[month - 1]} mean ${fmtTemp(climMonth.t2m)}` : undefined} />
          </MetricStrip>
        </Panel>
      </section>

      <Panel icon="device_thermostat" title="Temperature" subtitle={`Daily maximum and minimum (${tempUnit()})`} footer={weatherSourceTag(s)}>
        <Legend items={[{ label: 'Max', color: CHART.heat, shape: 'line' }, { label: 'Min', color: CHART.rain, shape: 'line' }]} />
        <div className="h-64 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tempData} margin={{ top: 10, right: 28, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="date" {...axisProps} interval={narrow ? 1 : 0} tickFormatter={(d) => narrow ? fmtWeekday(d) : `${fmtWeekday(d)} ${Number(String(d).slice(8, 10))}`} />
              <YAxis {...axisProps} width={44} domain={['dataMin - 2', 'dataMax + 2']} tickFormatter={(v) => `${Math.round(v)}°`} />
              <Tooltip content={<ChartTooltip labelFormatter={(l) => fmtDayLabel(String(l))} valueFormatter={(v) => `${fmtNum(v, 1)} ${tempUnit()}`} />} />
              <Line isAnimationActive={false} dataKey="tmax" name="Max" stroke={CHART.heat} strokeWidth={2} dot={{ r: 4, fill: CHART.heat, stroke: '#fff', strokeWidth: 2 }} />
              <Line isAnimationActive={false} dataKey="tmin" name="Min" stroke={CHART.rain} strokeWidth={2} dot={{ r: 4, fill: CHART.rain, stroke: '#fff', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6">
        <Panel icon="stacked_bar_chart" title="Rainfall accumulation" subtitle={climMonth && isNum(climMonth.precip_mm) ? `Cumulative forecast rain vs ${MONTHS[month - 1]} climatological pace (NASA POWER)` : 'Cumulative forecast rain'}>
          <Legend items={[{ label: 'Cumulative forecast', color: CHART.rain, shape: 'line' }, ...(climPace ? [{ label: 'Climatological pace', color: CHART.muted, shape: 'line' as const }] : [])]} />
          <div className="h-56 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accum} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="date" {...axisProps} interval={narrow ? 1 : 0} tickFormatter={fmtWeekday} />
                <YAxis {...axisProps} width={44} tickFormatter={tick} />
                <Tooltip content={<ChartTooltip labelFormatter={(l) => fmtDayLabel(String(l))} valueFormatter={(v) => `${fmtNum(v, rainUnit() === 'in' ? 2 : 1)} ${rainUnit()}`} />} />
                <Line isAnimationActive={false} dataKey="cum" name="Cumulative forecast" stroke={CHART.rain} strokeWidth={2} dot={{ r: 3, fill: CHART.rain }} />
                {climPace && <Line isAnimationActive={false} dataKey="pace" name="Climatological pace" stroke={CHART.muted} strokeDasharray="4 4" strokeWidth={2} dot={false} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel icon="agriculture" title="Anomalies & agricultural implications" subtitle="Forecast week compared with NASA POWER climatology for this month">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Metric size="sm" label="Temperature anomaly" value={isNum(tAnom) ? `${tAnom > 0 ? '+' : ''}${fmtNum(tempDelta(tAnom), 1)}` : 'Unavailable'} unit={isNum(tAnom) ? tempUnit() : undefined}
              sub={isNum(tAnom) ? `week mean vs ${MONTHS[month - 1]} mean` : 'Climatology unavailable'} tone={isNum(tAnom) && Math.abs(tAnom) >= 2 ? 'caution' : undefined} />
            <Metric size="sm" label="Rainfall vs normal" value={isNum(rAnom) ? `${Math.round(rAnom * 100)}%` : 'Unavailable'}
              sub={isNum(rAnom) ? `of the ${fmtMm(climWeek, 0)} a normal week brings` : 'Climatology unavailable'} tone={isNum(rAnom) && (rAnom < 0.5 || rAnom > 2) ? 'caution' : undefined} />
          </div>
          <ul className="space-y-2">
            {implications.map((t) => <li key={t} className="flex gap-2 text-body-sm text-on-surface"><Icon name="eco" className="!text-[16px] text-chlorophyll mt-px" />{localizeText(t)}</li>)}
          </ul>
        </Panel>
      </section>

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px bg-hairline rounded-xl border border-hairline overflow-hidden">
          <SmallMultiple title="Rainfall" unit={rainUnit()} data={daily} dataKey="precip" color={CHART.rain} kind="bar" convert={convRain} decimals={rainUnit() === 'in' ? 2 : 1} />
          <SmallMultiple title="Rain probability" unit="%" data={daily} dataKey="precip_prob" color={CHART.rain} kind="line" decimals={0} />
          <SmallMultiple title="Mean humidity" unit="%" data={daily} dataKey="rh_mean" color={CHART.rain} kind="line" decimals={0} />
          <SmallMultiple title="ET₀ (FAO-56)" unit={rainUnit()} data={daily} dataKey="et0" color={CHART.heat} kind="bar" convert={convRain} decimals={2} />
        </div>
        <div className="mt-2">{weatherSourceTag(s)}</div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
        <Panel icon="table_rows" title="Daily detail" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-body-sm">
              <thead>
                <tr className="text-left text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant border-b border-hairline">
                  {['Date', 'Conditions', 'Max / Min', 'Rain', 'Prob.', 'RH', 'Wind', 'ET₀'].map((h, i) => (
                    <th key={h} className={`py-2 font-medium ${i === 0 ? 'pl-5 pr-3' : i < 2 ? 'px-3' : 'px-3 text-right'} ${i === 7 ? 'pr-5' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daily.map((d) => (
                  <tr key={d.date} className="border-b border-hairline last:border-0">
                    <td className="py-2 pl-5 pr-3 font-semibold whitespace-nowrap">{fmtDayLabel(d.date)}</td>
                    <td className="py-2 px-3"><span className="inline-flex items-center gap-1.5"><Icon name={weatherIcon(d.weather_code)} className="!text-[16px] text-on-surface-variant" />{weatherLabel(d.weather_code)}</span></td>
                    <td className="py-2 px-3 text-right font-label-md tabular whitespace-nowrap">{isNum(d.tmax) ? `${fmtNum(d.tmax, 1)}°` : '–'} / {isNum(d.tmin) ? `${fmtNum(d.tmin, 1)}°` : '–'}</td>
                    <td className="py-2 px-3 text-right font-label-md tabular">{fmtMm(d.precip)}</td>
                    <td className="py-2 px-3 text-right font-label-md tabular">{fmtUnit(d.precip_prob, '%', 0)}</td>
                    <td className="py-2 px-3 text-right font-label-md tabular">{fmtUnit(d.rh_mean, '%', 0)}</td>
                    <td className="py-2 px-3 text-right font-label-md tabular">{fmtUnit(d.wind_max, 'km/h', 0)}</td>
                    <td className="py-2 pl-3 pr-5 text-right font-label-md tabular">{fmtMm(d.et0, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel icon="history" title="Monthly climatology" subtitle={s.climate.status === 'ok' ? `NASA POWER ${s.climate.period} mean monthly rainfall. Current month highlighted.` : undefined} footer={climateSourceTag(s)}>
          {s.climate.status !== 'ok' ? (
            <UnavailableBlock icon="history" title="Climatology unavailable" reason={s.climate.error ?? undefined} />
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clim.map((m) => ({ ...m, precip: convRain(m.precip_mm) }))} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="label" {...axisProps} interval={0} tickFormatter={(v) => v.slice(0, 1)} />
                    <YAxis {...axisProps} width={44} />
                    <Tooltip cursor={{ fill: '#F1F5EE' }} content={<ChartTooltip valueFormatter={(v) => `${fmtNum(v, rainUnit() === 'in' ? 1 : 0)} ${rainUnit()}`} />} />
                    <Bar isAnimationActive={false} dataKey="precip" name="Mean rainfall" radius={[4, 4, 0, 0]} maxBarSize={18}>
                      {clim.map((m) => <Cell key={m.month} fill={m.current ? CHART.rain : '#9CCBE3'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {climMonth && (
                <p className="mt-2 text-body-sm text-on-surface-variant">
                  {MONTHS[month - 1]} averages {fmtMm(climMonth.precip_mm, 0)} of rain and {fmtTemp(climMonth.t2m)} mean temperature. This week&apos;s forecast brings {fmtMm(rain)}.
                </p>
              )}
            </>
          )}
        </Panel>
      </section>
    </>
  );
};

const WeatherIntelligencePage: React.FC = () => <SummaryGate>{(s) => <WeatherView s={s} />}</SummaryGate>;

export default WeatherIntelligencePage;
