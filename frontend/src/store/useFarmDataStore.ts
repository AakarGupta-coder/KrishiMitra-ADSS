import { create } from 'zustand';
import { apiGet, farmKey, farmParams } from '../lib/api';
import type { FarmSummary } from '../lib/types';
import type { FarmContext } from './useFarmStore';

export type DataStatus = 'idle' | 'loading' | 'refreshing' | 'ready' | 'error';

interface FarmDataState {
  summary: FarmSummary | null;
  key: string | null;
  status: DataStatus;
  error: string | null;
  lastFetched: number | null;
  fetchSummary: (farm: FarmContext, opts?: { background?: boolean }) => Promise<void>;
  clear: () => void;
}

let seq = 0;
let controller: AbortController | null = null;

export const useFarmDataStore = create<FarmDataState>((set, get) => ({
  summary: null,
  key: null,
  status: 'idle',
  error: null,
  lastFetched: null,

  fetchSummary: async (farm, opts = {}) => {
    const key = farmKey(farm);
    const sameKey = key === get().key && get().summary !== null;
    const id = ++seq;
    controller?.abort();
    controller = new AbortController();

    if (sameKey) {
      set({ status: 'refreshing', error: null });
    } else if (!opts.background) {
      set({ summary: null, key, status: 'loading', error: null });
    }

    try {
      const data = await apiGet<FarmSummary>('/api/farm/summary', farmParams(farm), controller.signal);
      if (id !== seq) return;
      set({ summary: data, key, status: 'ready', error: null, lastFetched: Date.now() });
    } catch (e) {
      if ((e as Error).name === 'AbortError' || id !== seq) return;
      set((s) => ({
        status: s.summary && s.key === key ? 'ready' : 'error',
        error: (e as Error).message,
      }));
    }
  },

  clear: () => {
    controller?.abort();
    seq++;
    set({ summary: null, key: null, status: 'idle', error: null, lastFetched: null });
  },
}));
