import React, { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import type { FarmSummary, SourceEntry } from '../lib/types';
import { useFarmStore, farmLabel } from '../store/useFarmStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useSummary } from '../hooks/useSummary';
import { Link } from 'react-router-dom';
import { Badge, Button, Callout, ErrorBlock, Eyebrow, Icon, KV, LoadingBlock, PageHeader, Panel, Segmented, type Tone } from '../components/ui';
import { MARKET_BASIS_LABEL, fmtArea, fmtCoord, fmtDateTime, fmtNum, fmtRelative } from '../lib/format';
import { useUnitStore } from '../lib/units';
import { useAppSettings, type RefreshInterval } from '../store/useAppSettings';
import { sourceLabel } from '../components/LocationPicker';
import InfoButton from '../components/InfoButton';

const STATUS: Record<SourceEntry['status'], { tone: Tone; label: string; icon: string }> = {
  connected: { tone: 'ok', label: 'Connected', icon: 'check_circle' },
  available: { tone: 'ok', label: 'Available (local)', icon: 'inventory_2' },
  degraded: { tone: 'caution', label: 'Degraded', icon: 'warning' },
  unavailable: { tone: 'critical', label: 'Unavailable', icon: 'error' },
  not_queried: { tone: 'neutral', label: 'Not yet queried', icon: 'schedule' },
};

function applicability(id: string, s: FarmSummary | null): { text: string; fallback?: string } | null {
  if (!s) return null;
  const src = s.sources;
  switch (id) {
    case 'open_meteo':
      return s.weather.status === 'ok'
        ? { text: `${s.weather.daily.length}-day forecast. Requested ${fmtCoord(s.request.lat, s.request.lon)}, resolved to model grid ${fmtCoord(s.weather.grid?.lat, s.weather.grid?.lon)} (${fmtNum(src.open_meteo?.distance_km as number, 1)} km away, ${s.weather.timezone}); fetched ${fmtRelative(s.weather.fetched_at)}` }
        : { text: 'Not available for this location', fallback: 'None. Weather-dependent results are shown as unavailable.' };
    case 'nasa_power':
      return s.climate.status === 'ok'
        ? { text: `Monthly climatology ${s.climate.period} for ${fmtCoord(s.request.lat, s.request.lon)} (0.5° × 0.625° grid cell containing the point)` }
        : { text: 'Not available for this location', fallback: '7-day forecast mean used for temperature and humidity; rainfall excluded.' };
    case 'hwsd': {
      const so = s.soil;
      const unit = so.hwsd_smu_id != null ? `mapping unit ${so.hwsd_smu_id}${so.soil_unit ? ` (${so.soil_unit})` : ''}` : 'no mapping unit';
      if (so.status === 'ok') return { text: `~1 km cell containing the farm, centre ${fmtCoord(so.resolved_lat, so.resolved_lon)}; ${unit}; depth ${so.depth.replace('-', '–')}` };
      if (so.status === 'fallback') return { text: `Nearby cell ${fmtCoord(so.resolved_lat, so.resolved_lon)}, ${fmtNum(so.distance_km, 1)} km from the farm; ${unit}; depth ${so.depth.replace('-', '–')}`, fallback: so.fallback_reason ?? 'Nearby cell' };
      if (so.status === 'pending') return { text: 'Lookup still running', fallback: so.fallback_reason ?? undefined };
      return { text: so.result_code === 'NO_SOIL_DATA' ? 'No HWSD soil data for this location' : 'HWSD v2.0 lookup unavailable', fallback: `${so.fallback_reason ?? so.error ?? ''} Soil factors excluded; loam water-holding values assumed for irrigation.` };
    }
    case 'agmarknet': {
      const a = src.agmarknet;
      const bases = s.crops.reduce<Record<string, number>>((acc, c) => {
        const k = c.market.status === 'live' ? c.market.basis ?? 'live' : c.market.status === 'stale' ? 'last_observed' : 'reference';
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});
      const parts = Object.entries(bases).map(([k, v]) => `${v} × ${k === 'reference' ? 'static reference price' : MARKET_BASIS_LABEL[k] ?? k}`);
      return { text: `${a?.live ?? 0}/${a?.total ?? 0} crops priced from live mandi data for ${String(a?.district ?? '?')}, ${String(a?.state ?? '?')}`, fallback: parts.join('; ') };
    }
    case 'nominatim':
      return s.location.status === 'ok' ? { text: `${s.location.district ?? ''}, ${s.location.state ?? ''}` } : { text: 'District/state unresolved', fallback: 'Market matching falls back to national markets.' };
    case 'rules':
      return { text: `Evaluated ${s.crops.length} crops for ${s.season.planning_label}` };
    case 'yield_model': {
      const c = s.crops.find((x) => x.crop === s.recommendation.canonical);
      return { text: c?.yield.method === 'ml' ? `Used for ${c.crop}` : `Not used for ${c?.crop} (unsupported crop)`, fallback: c?.yield.method === 'ml' ? undefined : 'Reference yield × suitability' };
    }
    case 'faostat':
      return { text: 'National (India) series; not location-specific' };
    case 'crop_dataset':
      return { text: 'Training data for the ML opinion; not used for the recommendation' };
    case 'crop_model': {
      const ml = s.ml_opinion;
      return ml?.status === 'ok'
        ? { text: `${ml.variant === 'full' ? 'Full variant (soil test)' : 'Climate + pH variant (no soil test)'}; top prediction ${ml.top_crop}` }
        : { text: 'No ML opinion for this location', fallback: ml?.reason };
    }
    default:
      return null;
  }
}

const RawModal: React.FC<{ title: string; data: unknown; state: 'loading' | 'ready' | 'error'; onClose: () => void }> = ({ title, data, state, onClose }) => {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4 bg-forest/35 backdrop-blur-[8px]" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-white rounded-xl border border-hairline shadow-[0_20px_48px_-8px_rgba(17,66,50,0.16)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-hairline">
          <div className="text-title-md font-title-md text-forest">{title}</div>
          <button className="p-1.5 rounded-lg hover:bg-surface-container-low" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="overflow-auto p-5">
          {state === 'loading' && <LoadingBlock label="Fetching source payload…" className="h-32" />}
          {state === 'error' && <Callout tone="critical" icon="error">The backend could not return this source.</Callout>}
          {state === 'ready' && <pre className="text-[12px] leading-5 font-label-md whitespace-pre-wrap break-words text-on-surface">{JSON.stringify(data, null, 2)}</pre>}
        </div>
      </div>
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const farm = useFarmStore((s) => s.selectedFarm)!;
  const clearFarm = useFarmStore((s) => s.clearFarm);
  const { summary, refresh } = useSummary();
  const [sources, setSources] = useState<SourceEntry[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, string>>({});
  const [raw, setRaw] = useState<{ title: string; data: unknown; state: 'loading' | 'ready' | 'error' } | null>(null);
  const [health, setHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  const [confirmReset, setConfirmReset] = useState(false);
  const notifCount = useNotificationStore((s) => s.items.length);
  const recent = useFarmStore((s) => s.recent);
  const setFarm = useFarmStore((s) => s.setFarm);
  const units = useUnitStore();
  const appSettings = useAppSettings();

  const load = useCallback(async () => {
    try {
      const r = await apiGet<{ sources: SourceEntry[] }>('/api/sources');
      setSources(r.sources);
      setLoadErr(null);
    } catch (e) {
      setLoadErr((e as Error).message);
    }
  }, []);

  useEffect(() => { void load(); }, [load, summary?._meta.generated_at]);
  useEffect(() => {
    apiGet('/api/health').then(() => setHealth('online')).catch(() => setHealth('offline'));
  }, [summary?._meta.generated_at]);

  const coords = new URLSearchParams({ lat: farm.lat.toFixed(4), lon: farm.lon.toFixed(4) });

  const refreshSource = async (id: string) => {
    setBusy(id);
    try {
      const r = await apiPost<{ last_status: string; last_error: string | null; result_status: string }>(`/api/sources/${id}/refresh`, coords);
      setResult((m) => ({ ...m, [id]: r.last_status === 'ok' ? `Refreshed: ${r.result_status}` : `Still failing: ${r.last_error ?? r.result_status}` }));
    } catch (e) {
      setResult((m) => ({ ...m, [id]: (e as Error).message }));
    }
    setBusy(null);
    refresh();
    void load();
  };

  const viewRaw = async (e: SourceEntry) => {
    setRaw({ title: `${e.name}: raw payload for ${farmLabel(farm)}`, data: null, state: 'loading' });
    try {
      const params = new URLSearchParams(coords);
      if (e.id === 'agmarknet' && summary) params.set('crop', summary.recommendation.canonical ?? summary.crops[0].crop);
      const d = await apiGet(`/api/sources/${e.id}/raw`, params);
      setRaw((r) => r && { ...r, data: d, state: 'ready' });
    } catch {
      setRaw((r) => r && { ...r, state: 'error' });
    }
  };

  const viewLocal = (e: SourceEntry) => setRaw({ title: `${e.name}: catalogue entry`, data: e, state: 'ready' });

  return (
    <>
      <PageHeader eyebrow="System" title="Settings" subtitle="Farm, location, units, notifications, data refresh, data sources and model information." />

      <nav className="flex flex-wrap gap-2" aria-label="Settings sections">
        {[['farm', 'Farm & location'], ['units', 'Units'], ['notifications', 'Notifications'], ['refresh', 'Data refresh'], ['sources', 'Data sources'], ['models', 'Models'], ['app', 'Application']].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="px-3 py-1.5 rounded-lg border border-hairline bg-white text-body-sm font-semibold text-forest hover:bg-sage">{label}</a>
        ))}
      </nav>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel id="farm" icon="agriculture" title="Farm & location" actions={<Link to="/farm-profile" className="text-body-sm font-semibold text-forest hover:underline">Edit farm</Link>}>
          <KV label="Active location" value={farmLabel(farm)} />
          <KV label="Coordinates" value={fmtCoord(farm.lat, farm.lon)} mono />
          <KV label="Area" value={fmtArea(farm.area)} mono />
          <KV label="Irrigation" value={farm.irrigationType} />
          <KV label="Location source" value={sourceLabel(farm.locationSource)} />
          <KV label="Timezone" value={summary?.location.timezone ?? 'Unavailable'} />
          <div className="mt-3">
            <Eyebrow className="mb-1">Recent locations</Eyebrow>
            {recent.length === 0 ? <p className="text-body-sm text-on-surface-variant">None yet.</p> : (
              <ul className="divide-y divide-hairline">
                {recent.map((r) => (
                  <li key={`${r.lat},${r.lon}`} className="flex items-center gap-2 py-1.5 text-body-sm">
                    <span className="flex-1 min-w-0 truncate">{farmLabel(r)} <span className="text-outline font-label-sm">{fmtCoord(r.lat, r.lon)}</span></span>
                    <button className="font-semibold text-forest hover:underline disabled:opacity-40" disabled={Math.abs(r.lat - farm.lat) < 1e-4 && Math.abs(r.lon - farm.lon) < 1e-4} onClick={() => setFarm(r)}>Switch</button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-body-sm text-outline">The selected location is saved in this browser and restored on reload. Device location is only used on first run or when you choose it.</p>
          </div>
        </Panel>

        <Panel id="units" icon="straighten" title="Units" subtitle="Applied instantly across every page, chart, alert and report">
          {([
            ['temperature', 'Temperature', [['C', '°C'], ['F', '°F']]],
            ['rainfall', 'Rainfall & water depth', [['mm', 'mm'], ['in', 'inches']]],
            ['area', 'Area', [['ha', 'hectares'], ['acre', 'acres']]],
            ['yield', 'Yield', [['t_ha', 't/ha'], ['q_ha', 'q/ha'], ['t_acre', 't/acre'], ['q_acre', 'q/acre']]],
          ] as const).map(([key, label, opts]) => (
            <div key={key} className="flex items-center justify-between gap-3 py-2 border-b border-hairline last:border-0">
              <span className="text-body-md text-on-surface">{label}</span>
              <Segmented ariaLabel={label} value={units[key] as string} onChange={(v) => units.setUnit(key, v as never)}
                options={opts.map(([value, l]) => ({ value, label: l }))} />
            </div>
          ))}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-body-sm text-on-surface-variant">Soil nutrients stay in kg/ha; prices in ₹.</span>
            <Button size="sm" onClick={units.reset}>Reset to metric</Button>
          </div>
        </Panel>

        <Panel id="notifications" icon="notifications" title="Notifications">
          <label className="flex items-center justify-between gap-3 py-2 border-b border-hairline">
            <span>
              <span className="block text-body-md text-on-surface">Active farm alerts</span>
              <span className="block text-body-sm text-on-surface-variant">Weather, irrigation, crop, yield, soil and market conditions</span>
            </span>
            <input type="checkbox" className="w-[18px] h-[18px] accent-forest" checked={appSettings.farmAlerts} onChange={(e) => appSettings.set({ farmAlerts: e.target.checked })} />
          </label>
          <label className="flex items-center justify-between gap-3 py-2 border-b border-hairline">
            <span>
              <span className="block text-body-md text-on-surface">Data & system status</span>
              <span className="block text-body-sm text-on-surface-variant">Source outages, fallbacks and forecast updates</span>
            </span>
            <input type="checkbox" className="w-[18px] h-[18px] accent-forest" checked={appSettings.systemAlerts} onChange={(e) => appSettings.set({ systemAlerts: e.target.checked })} />
          </label>
          <div className="flex items-start justify-between gap-4 py-2">
            <div>
              <div className="text-body-md text-on-surface">Notification history</div>
              <div className="text-body-sm text-on-surface-variant">{notifCount} stored alert(s) across locations, kept in this browser.</div>
            </div>
            <Button size="sm" onClick={() => useNotificationStore.setState({ items: [], dismissed: {} })} disabled={!notifCount}>Clear history</Button>
          </div>
        </Panel>

        <Panel id="refresh" icon="sync" title="Data refresh">
          <div className="flex items-center justify-between gap-3 py-2 border-b border-hairline">
            <span>
              <span className="block text-body-md text-on-surface">Automatic refresh</span>
              <span className="block text-body-sm text-on-surface-variant">While this tab is visible. Weather is cached for 15 min on the server.</span>
            </span>
            <Segmented ariaLabel="Refresh interval" value={String(appSettings.refreshMinutes)} onChange={(v) => appSettings.set({ refreshMinutes: Number(v) as RefreshInterval })}
              options={[{ value: '5', label: '5 min' }, { value: '10', label: '10 min' }, { value: '30', label: '30 min' }, { value: '0', label: 'Off' }]} />
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <span>
              <span className="block text-body-md text-on-surface">Refresh now</span>
              <span className="block text-body-sm text-on-surface-variant">Last summary {summary ? fmtRelative(summary._meta.generated_at) : 'not loaded'}</span>
            </span>
            <Button size="sm" icon="refresh" onClick={refresh}>Refresh</Button>
          </div>
        </Panel>
      </section>

      <Panel id="sources" icon="verified" title="Data sources & provenance" accent="forest"
        subtitle={`Every source KRISHIMITRA uses, its live status and what it contributed for ${farmLabel(farm)}. Status comes from real request outcomes, never assumed.`}
        actions={<Button size="sm" icon="refresh" onClick={() => { refresh(); void load(); }}>Reload status</Button>}
        bodyClassName="p-0">
        {loadErr ? (
          <div className="p-5"><ErrorBlock message={loadErr} onRetry={() => void load()} /></div>
        ) : !sources ? (
          <LoadingBlock label="Loading source registry…" className="h-40" />
        ) : (
          <div className="divide-y divide-hairline">
            {sources.map((e) => {
              const st = STATUS[e.status];
              const app = applicability(e.id, summary);
              const failing = e.status === 'unavailable' || e.status === 'degraded';
              return (
                <article key={e.id} className="px-5 py-4 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_200px] gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon name={st.icon} fill className={`!text-[18px] ${{ ok: 'text-chlorophyll', caution: 'text-caution', critical: 'text-critical', neutral: 'text-outline', water: 'text-water', brand: 'text-forest' }[st.tone]}`} />
                      <span className="text-title-md font-title-md text-on-surface">{e.name}</span>
                    </div>
                    <div className="mt-0.5 text-body-sm text-on-surface-variant">{e.category}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      <Badge tone="neutral">{e.kind === 'remote' ? 'Remote API' : 'Local'}</Badge>
                    </div>
                  </div>

                  <div className="min-w-0 text-body-sm">
                    <p className="text-on-surface">{e.purpose}</p>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6">
                      {e.kind === 'remote' ? (
                        <>
                          <KV label="Last successful update" value={e.last_success ? `${fmtDateTime(e.last_success)} (${fmtRelative(e.last_success)})` : 'Never'} />
                          <KV label="Last attempt" value={e.last_attempt ? fmtDateTime(e.last_attempt) : 'Never'} />
                        </>
                      ) : (
                        <>
                          <KV label="File updated" value={e.file?.modified ? fmtDateTime(e.file.modified) : e.rule_updated ?? 'Unavailable'} />
                          <KV label="Dataset / version" value={e.dataset ?? e.rule_version ?? 'Unavailable'} />
                        </>
                      )}
                      {e.resolution && <KV label="Resolution" value={e.resolution} />}
                      {e.coverage && <KV label="Coverage" value={e.coverage} />}
                      {e.cache_ttl && <KV label="Cache" value={e.cache_ttl} />}
                      {e.used_by.length > 0 && <KV label="Used by" value={e.used_by.join(', ')} />}
                    </div>
                    {(e.variables || e.features) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(e.variables ?? e.features ?? []).map((v) => <span key={v} className="px-1.5 py-0.5 rounded bg-surface-container-low border border-hairline text-[11px] font-label-sm text-on-surface-variant">{v}</span>)}
                      </div>
                    )}
                    {(e.collection || e.split || e.classes || e.categories || e.quality) && (
                      <details className="mt-2 group">
                        <summary className="cursor-pointer list-none inline-flex items-center gap-1 font-semibold text-forest hover:underline">
                          <Icon name="expand_more" className="!text-[18px] group-open:rotate-180 transition-transform" /> Collection method, split and classes
                        </summary>
                        <div className="mt-1.5 space-y-1.5 text-on-surface">
                          {e.collection && <p><span className="font-semibold">Collection method:</span> {e.collection}</p>}
                          {e.split && <p><span className="font-semibold">Split:</span> {e.split}</p>}
                          {e.quality && <p className="text-[#B45309]"><span className="font-semibold">Data quality:</span> {e.quality}</p>}
                          {e.categories && (
                            <div><span className="font-semibold">Categories:</span>
                              <ul className="list-disc pl-5 text-on-surface-variant">{e.categories.map((c) => <li key={c}>{c}</li>)}</ul>
                            </div>
                          )}
                          {e.classes && (
                            <div>
                              <span className="font-semibold">Classes ({e.classes.length}):</span>
                              <div className="mt-1 flex flex-wrap gap-1">{e.classes.map((c) => <span key={c} className="px-1.5 py-0.5 rounded bg-surface-container-low border border-hairline text-[11px] font-label-sm">{c}</span>)}</div>
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                    {app && (
                      <div className="mt-2 rounded-lg bg-canvas border border-hairline px-3 py-2">
                        <div className="text-on-surface"><span className="font-semibold">This location:</span> {app.text}</div>
                        {app.fallback && <div className="text-[#B45309] mt-0.5"><span className="font-semibold">Fallback:</span> {app.fallback}</div>}
                      </div>
                    )}
                    {e.last_error && failing && <div className="mt-2 text-[#B91C1C] break-words"><span className="font-semibold">Last error:</span> {e.last_error}</div>}
                    {e.notes?.map((n) => <div key={n} className="mt-1 text-on-surface-variant flex gap-1.5"><Icon name="info" className="!text-[14px] mt-0.5" />{n}</div>)}
                    {result[e.id] && <div className="mt-1 text-forest font-semibold">{result[e.id]}</div>}
                  </div>

                  <div className="flex lg:flex-col gap-2 lg:items-stretch">
                    <Button size="sm" icon="data_object" onClick={() => (e.kind === 'remote' || e.id === 'hwsd' ? viewRaw(e) : viewLocal(e))}>View raw source details</Button>
                    {e.kind === 'remote' && (
                      failing
                        ? <Button size="sm" variant="primary" icon="replay" busy={busy === e.id} onClick={() => refreshSource(e.id)}>Retry failed source</Button>
                        : <Button size="sm" icon="refresh" busy={busy === e.id} onClick={() => refreshSource(e.id)}>Refresh source</Button>
                    )}
                    {e.url && <a href={e.url} target="_blank" rel="noreferrer" className="text-body-sm font-semibold text-forest hover:underline inline-flex items-center gap-1 px-1">Provider site <Icon name="open_in_new" className="!text-[14px]" /></a>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel id="models" icon="model_training" title="Model information" subtitle="Select i for the method, data, split and evaluation metrics">
          {([
            ['rules_engine', 'Crop recommendation', `Agronomic Rules Engine ${summary?._meta.rules_version ?? ''}`],
            ['crop_classifier', 'ML opinion', 'crop_xgb · XGBoost classifier, 22 crops'],
            ['yield_model', 'Yield', 'yield_xgb (Rice, Wheat) · reference × suitability (others)'],
            ['economics', 'Economic outlook', 'Yield × observed mandi price − reference cost'],
            ['irrigation', 'Irrigation', 'FAO-56 root-zone water balance'],
            ['soil_rules', 'Soil', 'Soil interpretation rules'],
            ['risk_engine', 'Risk', 'Threshold rules (IMD, FAO-56)'],
          ] as const).map(([id, label, value]) => (
            <div key={id} className="flex items-center gap-2 py-1 border-b border-hairline last:border-0 text-body-sm">
              <span className="w-36 shrink-0 text-on-surface-variant">{label}</span>
              <span className="flex-1 min-w-0 text-on-surface font-medium">{value}</span>
              <InfoButton id={id} label={label} />
            </div>
          ))}
          <p className="mt-2 text-body-sm text-on-surface-variant">No deep-learning model is used. Crop scores are explained by exact rule penalties; SHAP explains the XGBoost yield model.</p>
        </Panel>
        <Panel id="app" icon="dns" title="Application">
          <KV label="API status" value={<Badge tone={health === 'online' ? 'ok' : health === 'offline' ? 'critical' : 'neutral'}>{health === 'online' ? 'Online' : health === 'offline' ? 'Unreachable' : 'Checking…'}</Badge>} />
          <KV label="Summary version" value={summary ? `v${summary._meta.version}` : 'Unavailable'} mono />
          <KV label="Rules engine" value={summary?._meta.rules_version ?? 'Unavailable'} mono />
          <KV label="Last summary" value={summary ? `${fmtDateTime(summary._meta.generated_at)} · ${summary._meta.build_ms} ms` : 'Unavailable'} />
        </Panel>

        <Panel icon="tune" title="Application state" className="lg:col-span-2">
          <div className="flex items-start justify-between gap-4 py-2 border-b border-hairline">
            <div>
              <div className="text-body-md font-semibold text-on-surface">Active farm</div>
              <div className="text-body-sm text-on-surface-variant">{farmLabel(farm)} · {fmtCoord(farm.lat, farm.lon)}. Restored on reload.</div>
            </div>
            {confirmReset ? (
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={() => setConfirmReset(false)}>Cancel</Button>
                <Button size="sm" variant="danger" onClick={() => clearFarm()}>Clear</Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setConfirmReset(true)}>Choose again</Button>
            )}
          </div>

        </Panel>
      </section>

      {raw && <RawModal {...raw} onClose={() => setRaw(null)} />}
    </>
  );
};

export default SettingsPage;
