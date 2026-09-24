import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { FarmSummary } from '../lib/types';
import { apiPost } from '../lib/api';
import { useFarmStore } from '../store/useFarmStore';
import {
  Badge, Button, Callout, Eyebrow, Icon, KV, Metric, MetricStrip, PageHeader, Panel, SummaryGate, TONE_TEXT, UnavailableBlock,
} from '../components/ui';
import { FarmContextBar, soilSourceTag } from '../components/widgets';
import { fmtCoord, fmtNum, isNum } from '../lib/format';
import { useSummary } from '../hooks/useSummary';

const TEXTURE_COLORS = { sand: '#D9A55B', silt: '#A8A29E', clay: '#8B5E3C' };

const SoilView: React.FC<{ s: FarmSummary }> = ({ s }) => {
  const farm = useFarmStore((st) => st.selectedFarm)!;
  const { refresh } = useSummary();
  const [retrying, setRetrying] = useState(false);
  const soil = s.soil;
  const interp = soil.interpretation;
  const has = soil.status === 'ok' || soil.status === 'fallback';
  const st = farm.soilTest || {};
  const canon = s.crops.find((c) => c.crop === s.recommendation.canonical) ?? null;
  const phAttr = canon?.attribution.find((a) => a.factor === 'ph');

  const retry = async () => {
    setRetrying(true);
    try {
      await apiPost('/api/sources/hwsd/refresh', new URLSearchParams({ lat: String(s.request.lat), lon: String(s.request.lon) }));
    } catch {
      setRetrying(false);
    }
    setRetrying(false);
    refresh();
  };

  const ph = isNum(st.ph) ? st.ph : soil.phh2o;
  const phFit = isNum(ph)
    ? s.crops.filter((c) => c.attribution.some((a) => a.factor === 'ph' && a.status === 'in_range')).map((c) => c.crop)
    : [];

  return (
    <>
      <PageHeader
        eyebrow="Pedology"
        title="Soil intelligence"
        subtitle="Topsoil properties, texture and their agronomic implications for this farm."
        actions={<Button icon="refresh" busy={retrying} onClick={retry}>{soil.status === 'unavailable' ? 'Retry soil lookup' : 'Refresh soil data'}</Button>}
      />
      <FarmContextBar s={s} />

      <Panel icon="my_location" title="Location resolution" footer={soilSourceTag(s)}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Metric size="sm" label="Status" value={{ ok: 'Farm cell (~1 km)', fallback: 'Nearby cell', pending: 'Still loading', unavailable: soil.result_code === 'NO_SOIL_DATA' ? 'No soil data' : 'Unavailable' }[soil.status]}
            tone={soil.status === 'ok' ? 'ok' : soil.status === 'fallback' ? 'caution' : soil.status === 'pending' ? 'water' : 'critical'} />
          <Metric size="sm" label="Requested coordinate" value={fmtCoord(soil.requested_lat, soil.requested_lon)} />
          <Metric size="sm" label="Resolved coordinate" value={has ? fmtCoord(soil.resolved_lat, soil.resolved_lon) : 'Unavailable'} />
          <Metric size="sm" label="Fallback distance" value={has ? (soil.fallback_used ? fmtNum(soil.distance_km, 1) : '0') : 'Unavailable'} unit="km" />
        </div>
        {soil.fallback_used && (
          <Callout tone="caution" icon="warning" title="Not local soil data" className="mt-4">
            {soil.fallback_reason} Values describe the resolved ~1 km HWSD cell, not your field. Treat them as regional context and confirm with a soil test.
          </Callout>
        )}
        {soil.status === 'pending' && <Callout tone="water" icon="hourglass_top" className="mt-4">{soil.fallback_reason} This page updates automatically when it completes.</Callout>}
        {soil.status === 'unavailable' && (
          <Callout tone="critical" icon="cloud_off" title={soil.result_code === 'NO_SOIL_DATA' ? 'No HWSD soil data here' : 'HWSD v2.0 soil data unavailable'} className="mt-4">
            {soil.fallback_reason} {soil.error ? `(${soil.error})` : ''} Soil pH and texture are excluded from crop scoring; irrigation uses assumed loam water-holding values.
          </Callout>
        )}
      </Panel>

      {has ? (
        <>
          <MetricStrip cols="grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
            <Metric label="Soil pH (H₂O)" value={fmtNum(soil.phh2o, 1)} sub={interp.ph_class ? <span className={TONE_TEXT[interp.ph_class.tone === 'ok' ? 'ok' : interp.ph_class.tone]}>{interp.ph_class.label}</span> : undefined} />
            <Metric label="Texture" value={interp.texture ?? 'Unavailable'} size="sm" sub={soil.texture_class_hwsd ? `USDA · HWSD "${soil.texture_class_hwsd}"` : 'USDA class'} />
            <Metric label="Sand" value={fmtNum(soil.sand, 1)} unit="%" />
            <Metric label="Silt" value={fmtNum(soil.silt, 1)} unit="%" />
            <Metric label="Clay" value={fmtNum(soil.clay, 1)} unit="%" />
            <Metric label="Organic carbon" value={fmtNum(interp.organic_carbon_pct, 2)} unit="%" sub={isNum(soil.soc) ? `${fmtNum(soil.soc, 1)} g/kg` : undefined} />
            <Metric label="CEC" value={fmtNum(soil.cec, 1)} unit="cmol/kg" />
          </MetricStrip>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel icon="layers" title="Texture composition" subtitle={`Depth ${soil.depth.replace('-', '–')} · particle-size fractions`}>
              {isNum(soil.sand) && isNum(soil.clay) ? (
                <>
                  <div className="flex h-8 rounded-lg overflow-hidden border border-hairline">
                    {(['sand', 'silt', 'clay'] as const).map((k) => isNum(soil[k]) && (
                      <div key={k} className="h-full grid place-items-center text-[11px] font-label-sm text-white" style={{ width: `${soil[k]}%`, background: TEXTURE_COLORS[k] }} title={`${k} ${soil[k]}%`}>
                        {(soil[k] as number) >= 12 ? `${Math.round(soil[k] as number)}%` : ''}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-4 text-body-sm text-on-surface-variant">
                    {(['sand', 'silt', 'clay'] as const).map((k) => (
                      <span key={k} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: TEXTURE_COLORS[k] }} />{k[0].toUpperCase() + k.slice(1)} {fmtNum(soil[k], 1)}%</span>
                    ))}
                  </div>
                  <div className="mt-4">
                    <KV label="Total nitrogen" value={isNum(soil.nitrogen) ? `${fmtNum(soil.nitrogen, 2)} g/kg` : 'Unavailable'} mono />
                    <p className="text-body-sm text-outline mt-1">Total N is not plant-available N and is not used as a fertiliser recommendation.</p>
                    <KV label="Soil unit (dominant)" value={soil.soil_unit ? `${soil.soil_unit}${isNum(soil.component_share) ? ` · ${soil.component_share}% of map unit` : ''}` : 'Unavailable'} />
                    <KV label="Bulk density" value={isNum(soil.bulk_density) ? `${fmtNum(soil.bulk_density, 2)} g/cm³` : 'Unavailable'} mono />
                    <KV label="Available water capacity" value={isNum(soil.available_water_capacity) ? `${fmtNum(soil.available_water_capacity, 0)} mm (rootable depth)` : 'Unavailable'} mono />
                    <KV label="Rooting depth · drainage" value={soil.rooting_depth || soil.drainage ? [soil.rooting_depth, soil.drainage].filter(Boolean).join(' · ') : 'Unavailable'} />
                  </div>
                </>
              ) : (
                <UnavailableBlock title="Texture unavailable" reason="HWSD v2.0 has no particle-size fractions for this soil unit." />
              )}
            </Panel>

            <Panel icon="rule" title="Suitability interpretation">
              {interp.constraints.length > 0 ? (
                <div className="space-y-2">
                  <Eyebrow>Potential constraints</Eyebrow>
                  {interp.constraints.map((c) => (
                    <div key={c.text} className="flex gap-2 text-body-sm text-on-surface">
                      <Icon name="warning" className={`!text-[16px] mt-px ${c.severity === 'critical' ? 'text-critical' : 'text-caution'}`} />{c.text}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-body-md text-[#15803D]"><Icon name="check_circle" />No pH, texture, organic-carbon or CEC constraint detected.</div>
              )}
              {interp.implications.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  <Eyebrow>Crop implications</Eyebrow>
                  {interp.implications.map((t) => <div key={t} className="flex gap-2 text-body-sm text-on-surface"><Icon name="eco" className="!text-[16px] text-chlorophyll mt-px" />{t}</div>)}
                </div>
              )}
              <div className="mt-4">
                <Eyebrow>Recommended amendments</Eyebrow>
                {interp.amendments.length ? (
                  interp.amendments.map((a) => <div key={a} className="mt-1.5 flex gap-2 text-body-sm text-on-surface"><Icon name="science" className="!text-[16px] text-water mt-px" />{a}</div>)
                ) : (
                  <p className="mt-1 text-body-sm text-on-surface-variant">None. No measured value crosses an amendment rule.</p>
                )}
              </div>
            </Panel>
          </section>
        </>
      ) : null}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel icon="eco" title="Implications for crop choice">
          {isNum(ph) ? (
            <>
              <p className="text-body-md text-on-surface">
                At pH {fmtNum(ph, 1)} ({isNum(st.ph) ? 'your soil test' : soil.fallback_used ? 'HWSD v2.0, nearby cell' : 'HWSD v2.0'}), {phFit.length} of {s.crops.length} evaluated crops are within their preferred pH band.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.crops.map((c) => {
                  const fit = phFit.includes(c.crop);
                  return <Badge key={c.crop} tone={fit ? 'ok' : 'neutral'} icon={fit ? 'check' : 'close'}>{c.crop}</Badge>;
                })}
              </div>
              {canon && phAttr && (
                <p className="mt-3 text-body-sm text-on-surface-variant">Recommended crop <strong>{canon.crop}</strong> prefers pH {phAttr.min}–{phAttr.max}: {phAttr.status === 'in_range' ? 'within range.' : `${phAttr.status === 'low' ? 'too acidic' : 'too alkaline'}, −${Math.round((1 - phAttr.multiplier) * 100)} suitability points.`}</p>
              )}
            </>
          ) : (
            <UnavailableBlock title="No pH value" reason="Soil pH is unavailable from HWSD v2.0 and no soil test has been entered, so pH-based crop filtering is not applied." />
          )}
        </Panel>

        <Panel icon="biotech" title="Soil test (farm-entered)" subtitle="Measured values (FARM_MEASURED) override HWSD v2.0 and add N, P, K to crop scoring" actions={<Link to="/farm-profile" className="text-body-sm font-semibold text-forest hover:underline">Edit</Link>}>
          <KV label="Available N" value={isNum(st.N) ? `${st.N} kg/ha` : <span className="text-outline font-normal">Not provided</span>} mono />
          <KV label="Available P" value={isNum(st.P) ? `${st.P} kg/ha` : <span className="text-outline font-normal">Not provided</span>} mono />
          <KV label="Available K" value={isNum(st.K) ? `${st.K} kg/ha` : <span className="text-outline font-normal">Not provided</span>} mono />
          <KV label="pH" value={isNum(st.ph) ? st.ph : <span className="text-outline font-normal">Not provided</span>} mono />
          <p className="mt-2 text-body-sm text-on-surface-variant">HWSD v2.0 does not publish available P or K. Those factors stay unevaluated until a soil test is entered.</p>
        </Panel>
      </section>
    </>
  );
};

const SoilIntelligencePage: React.FC = () => <SummaryGate>{(s) => <SoilView s={s} />}</SummaryGate>;

export default SoilIntelligencePage;
