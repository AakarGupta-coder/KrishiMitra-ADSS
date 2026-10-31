import { useState } from 'react';
import type { LocationPreset } from '../lib/presets';
import { useFarmStore, type FarmContext } from '../store/useFarmStore';
import { placeName, reverseName, type NominatimPlace } from '../lib/location';

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

  const locateDevice = (onFail?: (msg: string) => void, opts: { onlyIfEmpty?: boolean } = {}) => {
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

  return { choose, pickPreset, pickPlace, locateDevice, geoState, geoError };
}
