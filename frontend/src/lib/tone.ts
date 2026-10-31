import type { RiskLevel, Severity } from './types';

export type Tone = 'ok' | 'water' | 'caution' | 'critical' | 'neutral' | 'brand';

export const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-[#15803D]',
  water: 'text-[#0369A1]',
  caution: 'text-[#B45309]',
  critical: 'text-[#B91C1C]',
  neutral: 'text-on-surface-variant',
  brand: 'text-forest',
};

export const severityTone = (s: Severity | string): Tone =>
  s === 'critical' ? 'critical' : s === 'warning' ? 'critical' : s === 'caution' ? 'caution' : s === 'info' ? 'water' : 'neutral';

export const severityIcon = (s: Severity | string) =>
  s === 'critical' ? 'error' : s === 'warning' ? 'warning' : s === 'caution' ? 'report' : 'info';

export const riskTone = (l: RiskLevel): Tone => (l === 'high' ? 'critical' : l === 'moderate' ? 'caution' : l === 'low' ? 'ok' : 'neutral');
export const riskLabel = (l: RiskLevel) => (l === 'unavailable' ? 'No data' : `${l[0].toUpperCase()}${l.slice(1)}`);
