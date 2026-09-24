import React, { useEffect, useRef, useState } from 'react';
import { LOCATION_PRESETS, type LocationPreset } from '../lib/presets';
import { useFarmStore, farmLabel, type FarmContext } from '../store/useFarmStore';
import { Icon } from './ui';
import Popover from './Popover';
import { fmtCoord, fmtArea } from '../lib/format';

interface NominatimPlace {
  place_id: number;
  lat: string;
  lon: string;
  name: string;
  display_name: string;
  addresstype?: string;
  address?: Record<string, string>;
}

const placeName = (a: Record<string, string> | undefined, fallback: string) =>
  a?.village || a?.town || a?.city || a?.suburb || a?.county || a?.state_district || a?.state || fallback;

const SOURCE_LABEL: Record<FarmContext['locationSource'], string> = {
  device: 'Device location', search: 'Search', map: 'Map', saved: 'Saved farm', preset: 'Preset', default: 'Default',
};
export const sourceLabel = (s: FarmContext['locationSource']) => SOURCE_LABEL[s] ?? s;

async function reverseName(lat: number, lon: number) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1&accept-language=en`);
    if (!res.ok) throw new Error(String(res.status));
    const d = await res.json();
    return { name: placeName(d.address, 'Current location'), region: d.address?.state ?? null, district: d.address?.state_district ?? d.address?.county ?? null };
  } catch {
    return { name: 'Current location', region: null, district: null };
  }
}

export function useChooseLocation(onDone?: () => void) {
  const { selectedFarm, setFarm } = useFarmStore();
  const [geoState, setGeoState] = useState<'idle' | 'locating' | 'error'>('idle');
  const [geoError, setGeoError] = useState<string | null>(null);

  const base = (): Pick<FarmContext, 'area' | 'unit' | 'irrigationType' | 'currentCrop' | 'soilTest' | 'farmId'> => ({
    area: selectedFarm?.area ?? 1,
    unit: 'ha',
    irrigationType: selectedFarm?.irrigationType ?? 'Rainfed',
    currentCrop: selectedFarm?.currentCrop ?? null,
    soilTest: {},
    farmId: null,
  });

  const choose = (farm: FarmContext) => {
    setFarm(farm);
    onDone?.();
  };

  const pickPreset = (p: LocationPreset, source: FarmContext['locationSource'] = 'preset') =>
    choose({
      ...base(), id: `preset-${p.id}`, name: p.name, region: p.region, district: p.district, lat: p.lat, lon: p.lon,
      area: p.area, irrigationType: 'Rainfed', currentCrop: null, locationSource: source, presetId: p.id, context: p.context,
    });

  const pickPlace = (p: NominatimPlace) =>
    choose({
      ...base(), id: `osm-${p.place_id}`, name: placeName(p.address, p.name || p.display_name.split(',')[0]),
      region: p.address?.state ?? null, district: p.address?.state_district ?? p.address?.county ?? null,
      lat: Number(p.lat), lon: Number(p.lon), locationSource: 'search', presetId: null, context: null,
    });

  const useDevice = (onFail?: (msg: string) => void, opts: { onlyIfEmpty?: boolean } = {}) => {
    const stillEmpty = () => !opts.onlyIfEmpty || !useFarmStore.getState().selectedFarm;
    if (!navigator.geolocation) {
      const msg = 'This browser does not support geolocation.';
      setGeoState('error');
      setGeoError(msg);
      onFail?.(msg);
      return;
    }
    setGeoState('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const g = await reverseName(lat, lon);
        setGeoState('idle');
        if (!stillEmpty()) return;
        choose({ ...base(), id: 'device', ...g, lat, lon, locationSource: 'device', presetId: null, context: null });
      },
      (err) => {
        const msg = err.code === err.PERMISSION_DENIED ? 'Location permission was denied.' : 'Could not determine the device location.';
        setGeoState('error');
        setGeoError(msg);
        if (stillEmpty()) onFail?.(msg);
      },
      { timeout: 12000, enableHighAccuracy: false },
    );
  };

  return { choose, pickPreset, pickPlace, useDevice, geoState, geoError };
}

function useNominatimSearch(query: string) {
  const [results, setResults] = useState<NominatimPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setError(null);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=7&accept-language=en&q=${encodeURIComponent(query)}`,
          { signal: ctl.signal },
        );
        if (!res.ok) throw new Error(`Search service returned ${res.status}`);
        setResults(await res.json());
        setError(null);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError('Location search is unavailable right now.');
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [query]);
  return { results, searching, error };
}

const PlaceResults: React.FC<{ results: NominatimPlace[]; onPick: (p: NominatimPlace) => void }> = ({ results, onPick }) => (
  <div className="py-1">
    {results.map((p) => {
      const a = p.address || {};
      const region = [a.state_district || a.county, a.state].filter(Boolean).join(', ');
      return (
        <button key={p.place_id} className="w-full text-left px-3 py-2 hover:bg-sage flex items-start gap-2.5" onClick={() => onPick(p)}>
          <Icon name="location_on" className="text-forest !text-[18px] mt-0.5" />
          <span className="min-w-0 flex-1">
            <span className="block text-body-md font-semibold text-on-surface truncate">{placeName(p.address, p.name)}</span>
            <span className="block text-body-sm text-on-surface-variant truncate">{region || p.display_name}{a.country ? ` · ${a.country}` : ''}</span>
          </span>
          {p.addresstype && <span className="text-[10px] font-label-sm uppercase text-outline mt-1">{p.addresstype}</span>}
        </button>
      );
    })}
  </div>
);

export const LocationSearch: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLLabelElement>(null);
  const { results, searching, error } = useNominatimSearch(query);
  const { pickPlace } = useChooseLocation(() => {
    setQuery('');
    setOpen(false);
  });
  const show = open && query.trim().length >= 3;

  return (
    <div className={className}>
      <label ref={anchor} className="flex items-center gap-2 h-9 px-3 rounded-lg border border-hairline bg-canvas focus-within:bg-white focus-within:border-forest focus-within:ring-[3px] focus-within:ring-forest/10 transition-colors">
        <Icon name="search" className="text-on-surface-variant !text-[18px]" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search city, town, or village..."
          className="flex-1 min-w-0 bg-transparent text-body-md outline-none placeholder:text-outline"
          aria-label="Search location"
        />
        {searching && <Icon name="progress_activity" className="animate-spin text-forest !text-[16px]" />}
      </label>
      <Popover anchor={anchor} open={show} onClose={() => setOpen(false)} align="start" width={440} label="Location search results">
        <div className="overflow-y-auto">
          {error && <div className="px-4 py-3 text-body-sm text-[#B91C1C]">{error}</div>}
          {!error && results.length > 0 && <PlaceResults results={results} onPick={pickPlace} />}
          {!error && !searching && results.length === 0 && <div className="px-4 py-3 text-body-sm text-on-surface-variant">No matching places.</div>}
          {searching && results.length === 0 && <div className="px-4 py-3 text-body-sm text-on-surface-variant">Searching…</div>}
        </div>
      </Popover>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div className="px-3 pt-2 pb-1 text-[10px] font-label-sm uppercase tracking-wider text-on-surface-variant">{title}</div>
    {children}
  </div>
);

const LocationPicker: React.FC<{ onDone?: () => void; compact?: boolean }> = ({ onDone, compact }) => {
  const { selectedFarm, savedFarm, recent } = useFarmStore();
  const [query, setQuery] = useState('');
  const { results, searching, error } = useNominatimSearch(query);
  const { choose, pickPreset, pickPlace, useDevice, geoState, geoError } = useChooseLocation(onDone);

  const row = 'w-full text-left px-3 py-2 rounded-lg hover:bg-sage flex items-start gap-2.5 transition-colors';
  const isActive = (lat: number, lon: number) => !!selectedFarm && Math.abs(selectedFarm.lat - lat) < 1e-4 && Math.abs(selectedFarm.lon - lon) < 1e-4;
  const recentOthers = recent.filter((r) => !(savedFarm && Math.abs(r.lat - savedFarm.lat) < 1e-4 && Math.abs(r.lon - savedFarm.lon) < 1e-4) && !r.presetId).slice(0, 4);

  const farmRow = (f: FarmContext, icon: string) => (
    <button key={`${f.lat},${f.lon}`} className={row} onClick={() => choose(f)}>
      <Icon name={icon} className="text-forest !text-[18px] mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="block text-body-md font-semibold text-on-surface truncate">{farmLabel(f)}</span>
        <span className="block text-label-sm font-label-sm text-on-surface-variant truncate">{fmtCoord(f.lat, f.lon)} · {fmtArea(f.area)} · {sourceLabel(f.locationSource)}</span>
      </span>
      {isActive(f.lat, f.lon) && <Icon name="check" className="text-chlorophyll !text-[18px]" />}
    </button>
  );

  return (
    <div className={`flex flex-col min-h-0 ${compact ? 'max-h-[inherit]' : ''}`}>
      <div className="p-3 border-b border-hairline">
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-field bg-white focus-within:border-forest focus-within:ring-[3px] focus-within:ring-forest/10">
          <Icon name="search" className="text-on-surface-variant !text-[18px]" />
          <input
            autoFocus={compact}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, town, village or district"
            className="flex-1 min-w-0 bg-transparent text-body-md outline-none placeholder:text-outline"
            aria-label="Search location"
          />
          {searching && <Icon name="progress_activity" className="animate-spin text-forest !text-[18px]" />}
        </label>
        {error && <div className="mt-2 text-body-sm text-[#B91C1C]">{error}</div>}
        {results.length > 0 && <div className="mt-1 -mx-3"><PlaceResults results={results} onPick={pickPlace} /></div>}
        {query.trim().length >= 3 && !searching && !error && results.length === 0 && (
          <div className="mt-2 text-body-sm text-on-surface-variant">No matching places.</div>
        )}
      </div>

      <div className="p-2 space-y-1 overflow-y-auto min-h-0">
        <Section title="Current location">
          <button className={row} onClick={() => useDevice()} disabled={geoState === 'locating'}>
            <Icon name={geoState === 'locating' ? 'progress_activity' : 'my_location'} className={`text-water !text-[18px] mt-0.5 ${geoState === 'locating' ? 'animate-spin' : ''}`} />
            <span>
              <span className="block text-body-md font-semibold text-on-surface">Use my current location</span>
              <span className="block text-body-sm text-on-surface-variant">{geoState === 'locating' ? 'Waiting for the browser…' : 'Asks the browser for this device’s position'}</span>
            </span>
          </button>
          {geoState === 'error' && <div className="px-3 pb-1 text-body-sm text-[#B91C1C]">{geoError}</div>}
        </Section>

        {(savedFarm || recentOthers.length > 0) && (
          <Section title="Saved & recent">
            {savedFarm && farmRow(savedFarm, 'agriculture')}
            {recentOthers.map((f) => farmRow(f, 'history'))}
          </Section>
        )}

        <Section title="Location presets">
          <div className={compact ? '' : 'grid sm:grid-cols-2 gap-1'}>
            {LOCATION_PRESETS.map((p) => (
              <button key={p.id} className={row} onClick={() => pickPreset(p)}>
                <Icon name="pin_drop" className="text-on-surface-variant !text-[18px] mt-0.5" />
                <span className="min-w-0 flex-1">
                  <span className="block text-body-md font-semibold text-on-surface">{p.name}, {p.region}</span>
                  <span className="block text-body-sm text-on-surface-variant truncate">{fmtCoord(p.lat, p.lon)} · {p.context}</span>
                </span>
                {isActive(p.lat, p.lon) && <Icon name="check" className="text-chlorophyll !text-[18px]" />}
              </button>
            ))}
          </div>
          <div className="px-3 pt-1 pb-2 text-body-sm text-outline">Presets start at {fmtArea(1)}, Rainfed. Edit area and irrigation in Farm Profile.</div>
        </Section>
      </div>
    </div>
  );
};

export default LocationPicker;
