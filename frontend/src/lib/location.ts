import type { FarmContext } from '../store/useFarmStore';

export interface NominatimPlace {
  place_id: number;
  lat: string;
  lon: string;
  name: string;
  display_name: string;
  addresstype?: string;
  address?: Record<string, string>;
}

export const placeName = (a: Record<string, string> | undefined, fallback: string) =>
  a?.village || a?.town || a?.city || a?.suburb || a?.county || a?.state_district || a?.state || fallback;

const SOURCE_LABEL: Record<FarmContext['locationSource'], string> = {
  device: 'Device location', search: 'Search', map: 'Map', saved: 'Saved farm', preset: 'Preset', default: 'Default',
};
export const sourceLabel = (s: FarmContext['locationSource']) => SOURCE_LABEL[s] ?? s;

export async function reverseName(lat: number, lon: number) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1&accept-language=en`);
    if (!res.ok) throw new Error(String(res.status));
    const d = await res.json();
    return { name: placeName(d.address, 'Current location'), region: d.address?.state ?? null, district: d.address?.state_district ?? d.address?.county ?? null };
  } catch {
    return { name: 'Current location', region: null, district: null };
  }
}
