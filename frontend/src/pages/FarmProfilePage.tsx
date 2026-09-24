import React, { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useFarmStore, farmLabel, type FarmContext } from '../store/useFarmStore';
import { useSummary } from '../hooks/useSummary';
import { CURRENT_CROP_OPTIONS, IRRIGATION_TYPES } from '../lib/presets';
import { Badge, Button, Callout, Eyebrow, Icon, KV, PageHeader, Panel } from '../components/ui';
import { fmtArea, fmtCoord, fmtDateTime, fmtMm, fmtRelative, fmtTemp, isNum } from '../lib/format';
import { areaToHa, areaUnit, convArea, localizeText } from '../lib/units';
import { Link } from 'react-router-dom';
import { DOT, providerRow } from '../lib/providerStatus';

const areaText = (ha: number) => String(Math.round((convArea(ha) ?? ha) * 1000) / 1000);

const ClickPicker: React.FC<{ onPick: (lat: number, lon: number) => void }> = ({ onPick }) => {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
};

const Recenter: React.FC<{ lat: number; lon: number }> = ({ lat, lon }) => {
  const map = useMap();
  useEffect(() => { map.setView([lat, lon], map.getZoom()); }, [lat, lon, map]);
  return null;
};

const input = 'w-full px-3 py-2 rounded-lg border border-field bg-white text-body-md text-on-surface outline-none focus:border-forest focus:ring-[3px] focus:ring-forest/10';

const Field: React.FC<{ label: string; unit?: string; hint?: string; children: React.ReactNode }> = ({ label, unit, hint, children }) => (
  <label className="block">
    <span className="block text-body-sm text-on-surface-variant mb-1">{label}</span>
    <span className="relative block">
      {children}
      {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-label-sm font-label-sm text-outline pointer-events-none">{unit}</span>}
    </span>
    {hint && <span className="block text-[11px] text-outline mt-1">{hint}</span>}
  </label>
);

const numOrNull = (v: string) => (v.trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v));

const rainfallRegime = (mm: number) =>
  mm < 500 ? 'Arid / dry (< 500 mm/yr)' : mm < 1000 ? 'Semi-arid (500–1000 mm/yr)' : mm < 1500 ? 'Sub-humid (1000–1500 mm/yr)' : 'Humid (> 1500 mm/yr)';

const FarmProfilePage: React.FC = () => {
  const { selectedFarm, saveFarm } = useFarmStore();
  const { summary, status } = useSummary();
  const farm = selectedFarm!;

  const [draft, setDraft] = useState(() => ({
    name: farm.name, region: farm.region ?? '', district: farm.district ?? '',
    lat: farm.lat, lon: farm.lon, area: areaText(farm.area), irrigationType: farm.irrigationType,
    currentCrop: farm.currentCrop ?? '', farmId: farm.farmId ?? '',
    N: farm.soilTest?.N?.toString() ?? '', P: farm.soilTest?.P?.toString() ?? '', K: farm.soilTest?.K?.toString() ?? '', ph: farm.soilTest?.ph?.toString() ?? '',
    locationSource: farm.locationSource,
  }));
  const [geocoding, setGeocoding] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft((d) => ({
      ...d, name: farm.name, region: farm.region ?? '', district: farm.district ?? '', lat: farm.lat, lon: farm.lon,
      locationSource: farm.locationSource, area: areaText(farm.area), irrigationType: farm.irrigationType, currentCrop: farm.currentCrop ?? '', farmId: farm.farmId ?? '',
      N: farm.soilTest?.N?.toString() ?? '', P: farm.soilTest?.P?.toString() ?? '', K: farm.soilTest?.K?.toString() ?? '', ph: farm.soilTest?.ph?.toString() ?? '',
    }));
  }, [farm]);

  const pick = async (lat: number, lon: number) => {
    setDraft((d) => ({ ...d, lat, lon, locationSource: 'map' }));
    setGeocoding(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1&accept-language=en`);
      const d = await r.json();
      const a = d.address || {};
      setDraft((x) => ({ ...x, name: a.city || a.town || a.village || a.county || 'Selected point', region: a.state ?? '', district: a.state_district ?? a.county ?? '' }));
    } catch {
      setDraft((x) => ({ ...x, name: 'Selected point', region: '', district: '' }));
    } finally {
      setGeocoding(false);
    }
  };

  const areaInput = numOrNull(draft.area);
  const area = areaInput === null ? null : areaToHa(areaInput);
  const ph = numOrNull(draft.ph);
  const errors = [
    area === null || area <= 0 ? `Area must be a positive number of ${areaUnit() === 'acre' ? 'acres' : 'hectares'}.` : null,
    ph !== null && (ph < 3 || ph > 11) ? 'Soil pH must be between 3 and 11.' : null,
    ...(['N', 'P', 'K'] as const).map((k) => { const v = numOrNull(draft[k]); return v !== null && (v < 0 || v > 2000) ? `${k} must be 0–2000 kg/ha.` : null; }),
    !draft.name.trim() ? 'Farm name is required.' : null,
  ].filter(Boolean) as string[];

  const locationChanged = Math.abs(draft.lat - farm.lat) > 1e-6 || Math.abs(draft.lon - farm.lon) > 1e-6;
  const dirty = useMemo(() => locationChanged || draft.name !== farm.name || areaText(farm.area) !== draft.area || draft.irrigationType !== farm.irrigationType
    || (draft.farmId.trim() || null) !== (farm.farmId ?? null)
    || (draft.currentCrop || null) !== (farm.currentCrop ?? null)
    || (['N', 'P', 'K', 'ph'] as const).some((k) => numOrNull(draft[k]) !== (farm.soilTest?.[k] ?? null)),
  [draft, farm, locationChanged]);

  const save = () => {
    if (errors.length) return;
    const next: FarmContext = {
      ...farm,
      id: locationChanged ? `farm-${Date.now()}` : farm.id,
      name: draft.name.trim(),
      region: draft.region || null,
      district: draft.district || null,
      lat: draft.lat,
      lon: draft.lon,
      area: area!,
      irrigationType: draft.irrigationType,
      currentCrop: draft.currentCrop || null,
      farmId: draft.farmId.trim() || null,
      soilTest: { N: numOrNull(draft.N), P: numOrNull(draft.P), K: numOrNull(draft.K), ph },
      locationSource: locationChanged ? 'map' : farm.locationSource === 'preset' || farm.locationSource === 'device' || farm.locationSource === 'search' ? farm.locationSource : 'saved',
      presetId: locationChanged ? null : farm.presetId,
    };
    saveFarm(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  const annualRain = summary?.climate.status === 'ok' ? summary.climate.monthly.reduce((a, m) => a + (m.precip_mm ?? 0), 0) : null;
  const annualTemp = summary?.climate.status === 'ok' ? summary.climate.monthly.reduce((a, m) => a + (m.t2m ?? 0), 0) / 12 : null;

  return (
    <>
      <PageHeader eyebrow="Configuration" title="Farm profile" subtitle="The farm's location, size, irrigation and soil test. Saving recomputes every module, alert and report for this farm."
        actions={<>
          {saved && <Badge tone="ok" icon="check">Saved, recomputing</Badge>}
          <Button variant="primary" icon="save" onClick={save} disabled={!dirty || errors.length > 0}>Save farm</Button>
        </>} />

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-6">
        <div className="space-y-6 min-w-0">
          <Panel icon="edit_note" title="Farm details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Farm identifier (optional)" hint="Your own reference, e.g. survey number. Leave blank if none.">
                <input className={input} value={draft.farmId} placeholder="None" onChange={(e) => setDraft({ ...draft, farmId: e.target.value })} />
              </Field>
              <div>
                <Field label="Farm / place name"><input className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
              </div>
              <Field label="Area" unit={areaUnit()}><input className={`${input} pr-10`} inputMode="decimal" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} /></Field>
              <Field label="Irrigation system">
                <select className={input} value={draft.irrigationType} onChange={(e) => setDraft({ ...draft, irrigationType: e.target.value })}>
                  {IRRIGATION_TYPES.map((t) => <option key={t} value={t}>{t === 'Rainfed' ? 'Rainfed (no irrigation)' : t}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Current (standing) crop" hint="Used for the irrigation crop coefficient. The recommendation covers the next season.">
                  <select className={input} value={draft.currentCrop} onChange={(e) => setDraft({ ...draft, currentCrop: e.target.value })}>
                    <option value="">Not known / fallow</option>
                    {CURRENT_CROP_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          </Panel>

          <Panel icon="biotech" title="Soil test (optional)" subtitle="Laboratory values for this field. They override HWSD v2.0 pH and enable N, P, K scoring.">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['N', 'P', 'K'] as const).map((k) => (
                <Field key={k} label={`Available ${k}`} unit="kg/ha"><input className={`${input} pr-14`} inputMode="decimal" placeholder="—" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} /></Field>
              ))}
              <Field label="pH"><input className={input} inputMode="decimal" placeholder="—" value={draft.ph} onChange={(e) => setDraft({ ...draft, ph: e.target.value })} /></Field>
            </div>
            <p className="mt-2 text-body-sm text-outline">Leave blank if not measured. Blank values are excluded, never assumed.</p>
          </Panel>

          {errors.length > 0 && <Callout tone="critical" icon="error">{errors.map((e) => <div key={e}>{e}</div>)}</Callout>}
        </div>

        <Panel icon="map" title="Farm location" subtitle="Click the map to move the farm; save to apply" bodyClassName="p-0"
          footer={<div className="flex flex-wrap items-center justify-between gap-2 text-label-sm font-label-sm text-on-surface-variant">
            <span>{fmtCoord(draft.lat, draft.lon)} {geocoding ? '· resolving place…' : draft.region ? `· ${draft.name}, ${draft.region}` : ''}</span>
            <span>Map © OpenStreetMap contributors</span>
          </div>}>
          <div className="h-[420px] xl:h-full xl:min-h-[520px] relative rounded-none overflow-hidden">
            <MapContainer center={[draft.lat, draft.lon]} zoom={8} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <CircleMarker center={[draft.lat, draft.lon]} radius={9} pathOptions={{ color: '#fff', weight: 2, fillColor: '#114232', fillOpacity: 1 }} />
              {locationChanged && <CircleMarker center={[farm.lat, farm.lon]} radius={6} pathOptions={{ color: '#114232', weight: 2, dashArray: '3', fillOpacity: 0 }} />}
              <ClickPicker onPick={pick} />
              <Recenter lat={farm.lat} lon={farm.lon} />
            </MapContainer>
            {locationChanged && (
              <div className="absolute left-3 right-3 bottom-3 z-[500]">
                <Callout tone="caution" icon="pin_drop" title="Unsaved location">Save the farm to fetch data for {fmtCoord(draft.lat, draft.lon)}.</Callout>
              </div>
            )}
          </div>
        </Panel>
      </section>

      <Panel icon="agriculture" title="Farm context" subtitle="Derived from the current data for the saved location">
        {!summary ? (
          <div className="text-body-md text-on-surface-variant">{status === 'error' ? 'Farm data unavailable.' : 'Loading farm context…'}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
            <div>
              <Eyebrow className="mb-1">Location</Eyebrow>
              <KV label="Farm" value={farmLabel(farm)} />
              <KV label="Farm identifier" value={farm.farmId ?? <span className="text-outline font-normal">None recorded</span>} />
              <KV label="District" value={summary.location.district ?? 'Unavailable'} />
              <KV label="State" value={summary.location.state ?? 'Unavailable'} />
              <KV label="Coordinates" value={fmtCoord(farm.lat, farm.lon)} mono />
              <KV label="Timezone" value={summary.location.timezone ?? 'Unavailable'} />
              <KV label="Location source" value={{ device: 'Device location', search: 'Search', map: 'Map selection', saved: 'Saved farm', preset: 'Location preset', default: 'Default (device location unavailable)' }[farm.locationSource]} />
            </div>
            <div>
              <Eyebrow className="mb-1">Operation</Eyebrow>
              <KV label="Area" value={fmtArea(farm.area)} mono />
              <KV label="Irrigation" value={farm.irrigationType} />
              <KV label="Current crop" value={farm.currentCrop ?? 'Not recorded'} />
              <KV label="Season" value={summary.season.current_label} />
              <KV label="Planning for" value={`${summary.season.planning_label} · ${summary.recommendation.canonical}`} />
            </div>
            <div>
              <Eyebrow className="mb-1">Environment</Eyebrow>
              <KV label="Soil type (texture)" value={summary.soil.interpretation.texture ?? (summary.soil.status === 'unavailable' ? 'Unavailable' : 'Not resolved')} />
              <KV label="Soil pH" value={isNum(farm.soilTest?.ph) ? `${farm.soilTest!.ph} (soil test)` : isNum(summary.soil.phh2o) ? `${summary.soil.phh2o}${summary.soil.fallback_used ? ' (fallback)' : ''}` : 'Unavailable'} />
              <KV label="Annual rainfall" value={fmtMm(annualRain, 0)} mono />
              <KV label="Mean temperature" value={fmtTemp(annualTemp)} mono />
              <KV label="Rainfall regime" value={isNum(annualRain) ? localizeText(rainfallRegime(annualRain)) : 'Unavailable'} />
            </div>
          </div>
        )}
        {summary && (
          <div className="mt-4 pt-4 border-t border-hairline grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div>
              <Eyebrow className="mb-1">Synchronisation</Eyebrow>
              <KV label="Last synchronisation" value={`${fmtDateTime(summary._meta.generated_at)} (${fmtRelative(summary._meta.generated_at)})`} />
              <KV label="Rules engine" value={summary._meta.rules_version} mono />
            </div>
            <div>
              <Eyebrow className="mb-1">Data sources for this farm</Eyebrow>
              {([['open_meteo', 'Weather'], ['nasa_power', 'Climate'], ['hwsd', 'Soil'], ['agmarknet', 'Market']] as const).map(([k, label]) => {
                const r = providerRow(summary, k);
                return <KV key={k} label={label} value={<span className="inline-flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${DOT[r.state]}`} />{r.text}</span>} />;
              })}
              <Link to="/settings#sources" className="mt-1 inline-block text-body-sm font-semibold text-forest hover:underline">Data sources & provenance</Link>
            </div>
          </div>
        )}
        {summary && <p className="mt-3 text-body-sm text-outline flex items-center gap-1"><Icon name="info" className="!text-[14px]" />Rainfall regime is derived from NASA POWER {summary.climate.period ?? ''} annual totals.</p>}
      </Panel>
    </>
  );
};

export default FarmProfilePage;
