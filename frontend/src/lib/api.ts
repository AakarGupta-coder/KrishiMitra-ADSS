import type { FarmContext } from '../store/useFarmStore';

export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:8000';

export const farmParams = (farm: FarmContext, extra: Record<string, string | number | null | undefined> = {}) => {
  const p = new URLSearchParams({
    lat: farm.lat.toFixed(4),
    lon: farm.lon.toFixed(4),
    area: String(farm.area > 0 ? farm.area : 1),
    irrigation_type: farm.irrigationType || 'Rainfed',
  });
  if (farm.currentCrop) p.set('current_crop', farm.currentCrop);
  const st = farm.soilTest || {};
  (['N', 'P', 'K'] as const).forEach((k) => {
    const v = st[k];
    if (typeof v === 'number' && Number.isFinite(v)) p.set(k.toLowerCase(), String(v));
  });
  if (typeof st.ph === 'number' && Number.isFinite(st.ph)) p.set('ph', String(st.ph));
  Object.entries(extra).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') p.set(k, String(v));
  });
  return p;
};

export const farmKey = (farm: FarmContext | null) => (farm ? farmParams(farm).toString() : null);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiGet<T>(path: string, params?: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const url = `${API_BASE}${path}${params ? `?${params}` : ''}`;
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError('The KRISHIMITRA backend is not reachable. Start it with `python -m uvicorn api.main:app` and retry.', 0);
  }
  if (!res.ok) throw new ApiError(`Backend returned ${res.status} for ${path}`, res.status);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, params?: URLSearchParams): Promise<T> {
  const res = await fetch(`${API_BASE}${path}${params ? `?${params}` : ''}`, { method: 'POST' });
  if (!res.ok) throw new ApiError(`Backend returned ${res.status} for ${path}`, res.status);
  return res.json() as Promise<T>;
}
