import { useCallback } from 'react';
import { farmKey } from '../lib/api';
import { useFarmDataStore } from '../store/useFarmDataStore';
import { useFarmStore } from '../store/useFarmStore';

export function useSummary() {
  const farm = useFarmStore((s) => s.selectedFarm);
  const { summary, key, status, error, lastFetched, fetchSummary } = useFarmDataStore();
  const matches = !!farm && key === farmKey(farm);
  const refresh = useCallback(() => {
    if (farm) void fetchSummary(farm);
  }, [farm, fetchSummary]);
  return {
    farm,
    summary: matches ? summary : null,
    status: matches ? status : farm ? 'loading' : 'idle',
    error: matches ? error : null,
    lastFetched,
    refresh,
  } as const;
}

export const canonicalCrop = (s: ReturnType<typeof useSummary>['summary']) =>
  s ? s.crops.find((c) => c.crop === s.recommendation.canonical) ?? null : null;
