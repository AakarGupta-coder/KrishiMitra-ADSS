import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from './storage';

export type TempUnit = 'C' | 'F';
export type RainUnit = 'mm' | 'in';
export type AreaUnit = 'ha' | 'acre';
export type YieldUnit = 't_ha' | 'q_ha' | 't_acre' | 'q_acre';

export interface UnitPrefs {
  temperature: TempUnit;
  rainfall: RainUnit;
  area: AreaUnit;
  yield: YieldUnit;
}

export const DEFAULT_UNITS: UnitPrefs = { temperature: 'C', rainfall: 'mm', area: 'ha', yield: 't_ha' };

interface UnitStore extends UnitPrefs {
  setUnit: <K extends keyof UnitPrefs>(key: K, value: UnitPrefs[K]) => void;
  reset: () => void;
}

export const useUnitStore = create<UnitStore>()(
  persist(
    (set) => ({
      ...DEFAULT_UNITS,
      setUnit: (key, value) => set({ [key]: value } as Partial<UnitPrefs>),
      reset: () => set(DEFAULT_UNITS),
    }),
    { name: 'krishimitra-units', version: 1, storage: createJSONStorage(() => safeStorage) },
  ),
);

const prefs = (): UnitPrefs => {
  const s = useUnitStore.getState();
  return { temperature: s.temperature, rainfall: s.rainfall, area: s.area, yield: s.yield };
};

export const unitSignature = (p: UnitPrefs) => `${p.temperature}|${p.rainfall}|${p.area}|${p.yield}`;

const HA_PER_ACRE = 0.40468564224;
const MM_PER_IN = 25.4;

const ok = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const convTemp = (c: number | null | undefined) => (ok(c) ? (prefs().temperature === 'F' ? c * 9 / 5 + 32 : c) : null);
export const convRain = (mm: number | null | undefined) => (ok(mm) ? (prefs().rainfall === 'in' ? mm / MM_PER_IN : mm) : null);
export const convArea = (ha: number | null | undefined) => (ok(ha) ? (prefs().area === 'acre' ? ha / HA_PER_ACRE : ha) : null);
export const areaToHa = (v: number) => (prefs().area === 'acre' ? v * HA_PER_ACRE : v);
export const convYield = (tHa: number | null | undefined) => {
  if (!ok(tHa)) return null;
  switch (prefs().yield) {
    case 'q_ha': return tHa * 10;
    case 't_acre': return tHa * HA_PER_ACRE;
    case 'q_acre': return tHa * 10 * HA_PER_ACRE;
    default: return tHa;
  }
};
export const convVolume = (m3: number | null | undefined) => (ok(m3) ? m3 : null);

export const tempUnit = () => (prefs().temperature === 'F' ? '°F' : '°C');
export const rainUnit = () => prefs().rainfall;
export const areaUnit = () => (prefs().area === 'acre' ? 'acre' : 'ha');
export const yieldUnit = () => ({ t_ha: 't/ha', q_ha: 'q/ha', t_acre: 't/acre', q_acre: 'q/acre' })[prefs().yield];
export const rainDecimals = (metricDecimals = 1) => (prefs().rainfall === 'in' ? Math.max(2, metricDecimals + 1) : metricDecimals);

const n = (v: number, d: number) => {
  const s = v.toFixed(d);
  return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s;
};

export function localizeText(text: string | null | undefined): string {
  if (!text) return '';
  const p = prefs();
  let out = text.replace(/(\d{4})-(\d{2})-(\d{2})/g, (_m, y, mo, d) =>
    new Date(Number(y), Number(mo) - 1, Number(d)).toLocaleDateString(typeof navigator !== 'undefined' ? navigator.language : 'en-IN', { weekday: 'short', day: 'numeric', month: 'short' }));
  if (p.temperature === 'F') {
    out = out.replace(/(-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)\s*°C/g, (_m, a, b) => `${n(Number(a) * 9 / 5 + 32, 0)}–${n(Number(b) * 9 / 5 + 32, 0)} °F`);
    out = out.replace(/(-?\d+(?:\.\d+)?)\s*°C/g, (_m, a) => `${n(Number(a) * 9 / 5 + 32, 1)} °F`);
  }
  if (p.rainfall === 'in') {
    out = out.replace(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*mm\b/g, (_m, a, b) => `${n(Number(a) / MM_PER_IN, 1)}–${n(Number(b) / MM_PER_IN, 1)} in`);
    out = out.replace(/(\d+(?:\.\d+)?)\s*mm\b/g, (_m, a) => `${n(Number(a) / MM_PER_IN, 2)} in`);
  }
  if (p.yield !== 't_ha') {
    out = out.replace(/(\d+(?:\.\d+)?)\s*t\/ha\b/g, (_m, a) => `${n(convYield(Number(a)) as number, 2)} ${yieldUnit()}`);
  }
  if (p.area === 'acre') {
    out = out.replace(/(\d+(?:\.\d+)?)\s*ha\b(?!\/)/g, (_m, a) => `${n(Number(a) / HA_PER_ACRE, 2)} acre`);
  }
  return out;
}
