import type { FarmSummary } from './types';
import { fmtDayMonth, fmtWeekday, isNum } from './format';
import type { Tone } from './tone';

export const placeLabel = (s: FarmSummary, fallbackName?: string) => {
  const l = s.location;
  const name = fallbackName || l.place || 'Selected location';
  return l.state && !name.includes(l.state) ? `${name}, ${l.state}` : name;
};

export const totalRain = (s: FarmSummary) => s.weather.daily.reduce((a, d) => a + (isNum(d.precip) ? d.precip : 0), 0);

export const irrigationHeadline = (s: FarmSummary): { text: string; tone: Tone; icon: string } => {
  const st = s.irrigation.status;
  if (st === 'unavailable') return { text: 'Unavailable', tone: 'neutral', icon: 'cloud_off' };
  if (st === 'irrigate_now') return { text: 'Irrigate now', tone: 'critical', icon: 'water_drop' };
  if (st === 'irrigate_soon') return { text: 'Irrigate within 3 days', tone: 'caution', icon: 'water_drop' };
  if (st === 'scheduled') return { text: `Irrigate ${fmtWeekday(s.irrigation.next_irrigation!.date)} ${fmtDayMonth(s.irrigation.next_irrigation!.date)}`, tone: 'water', icon: 'event' };
  return { text: 'Not needed this week', tone: 'ok', icon: 'check_circle' };
};
