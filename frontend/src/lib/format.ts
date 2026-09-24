
import { areaUnit, convArea, convRain, convTemp, convYield, rainDecimals, rainUnit, tempUnit, yieldUnit } from './units';

export const UNAVAILABLE = 'Unavailable';

export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const fix = (v: number, d: number) => {
  const s = v.toFixed(d);
  return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s;
};

export const fmtNum = (v: unknown, d = 1, fallback = UNAVAILABLE): string =>
  isNum(v) ? Number(fix(v, d)).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d }) : fallback;

export const fmtUnit = (v: unknown, unit: string, d = 1, fallback = UNAVAILABLE): string =>
  isNum(v) ? `${fmtNum(v, d)}${unit.startsWith('°') || unit === '%' ? '' : ' '}${unit}` : fallback;

export const fmtTemp = (v: unknown, d = 1) => fmtUnit(convTemp(isNum(v) ? v : null), tempUnit(), d);
export const fmtMm = (v: unknown, d = 1) => fmtUnit(convRain(isNum(v) ? v : null), rainUnit(), rainDecimals(d));
export const fmtArea = (v: unknown, d = 2) => fmtUnit(convArea(isNum(v) ? v : null), areaUnit(), d);
export const fmtYield = (v: unknown, d = 2) => fmtUnit(convYield(isNum(v) ? v : null), yieldUnit(), d);
export const numTemp = (v: unknown, d = 1) => fmtNum(convTemp(isNum(v) ? v : null), d);
export const numRain = (v: unknown, d = 1) => fmtNum(convRain(isNum(v) ? v : null), rainDecimals(d));
export const numArea = (v: unknown, d = 2) => fmtNum(convArea(isNum(v) ? v : null), d);
export const numYield = (v: unknown, d = 2) => fmtNum(convYield(isNum(v) ? v : null), d);

export const fmtPct01 = (v: unknown, d = 0, fallback = UNAVAILABLE) => (isNum(v) ? `${fmtNum(v * 100, d)}%` : fallback);

export const fmtINR = (v: unknown, fallback = UNAVAILABLE): string =>
  isNum(v)
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(v) || 0)
    : fallback;

export const fmtINRCompact = (v: unknown, fallback = UNAVAILABLE): string => {
  if (!isNum(v)) return fallback;
  const a = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (a >= 1e7) return `${sign}₹${fix(a / 1e7, 2)} Cr`;
  if (a >= 1e5) return `${sign}₹${fix(a / 1e5, 2)} L`;
  return `${sign}₹${Math.round(a).toLocaleString('en-IN')}`;
};

export const parseDay = (iso: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

export const parseAgDate = (s?: string): Date | null => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || '');
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
};

const loc = () => (typeof navigator !== 'undefined' ? navigator.language : 'en-IN');

export const fmtWeekday = (iso: string) => {
  const d = parseDay(iso);
  return d ? d.toLocaleDateString(loc(), { weekday: 'short' }) : UNAVAILABLE;
};
export const fmtDayMonth = (iso: string) => {
  const d = parseDay(iso);
  return d ? d.toLocaleDateString(loc(), { day: 'numeric', month: 'short' }) : UNAVAILABLE;
};
export const fmtDayLabel = (iso: string) => {
  const d = parseDay(iso);
  return d ? d.toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short' }) : UNAVAILABLE;
};
export const fmtLongDate = (d: Date = new Date()) =>
  d.toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const fmtAgDate = (s?: string) => {
  const d = parseAgDate(s);
  return d ? d.toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' }) : UNAVAILABLE;
};

const toMs = (t: number | string | null | undefined): number | null => {
  if (t === null || t === undefined) return null;
  if (typeof t === 'number') return t < 1e12 ? t * 1000 : t;
  const ms = Date.parse(t);
  return Number.isNaN(ms) ? null : ms;
};

export const fmtRelative = (t: number | string | null | undefined, fallback = 'No recent data'): string => {
  const ms = toMs(t);
  if (ms === null) return fallback;
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  if (h < 48) return 'Yesterday';
  return `${Math.round(h / 24)} d ago`;
};

export const fmtDateTime = (t: number | string | null | undefined, fallback = 'Never'): string => {
  const ms = toMs(t);
  return ms === null ? fallback : new Date(ms).toLocaleString(loc(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const fmtCoord = (lat?: number | null, lon?: number | null) =>
  isNum(lat) && isNum(lon) ? `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}` : UNAVAILABLE;

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const MARKET_BASIS_LABEL: Record<string, string> = {
  local_district: 'Local district market',
  nearest_in_state: 'Nearest available market (same state)',
  nearest_national: 'Nearest available market (other state)',
  state_median: 'Median of state markets (distance unknown)',
  national_median: 'Median of reporting markets (distance unknown)',
  last_observed: 'Last observed price (live feed unavailable)',
};
