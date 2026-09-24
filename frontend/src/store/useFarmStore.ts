import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '../lib/storage';

export interface SoilTest {
  N?: number | null;
  P?: number | null;
  K?: number | null;
  ph?: number | null;
}

export interface FarmContext {
  id: string;
  name: string;
  region?: string | null;
  district?: string | null;
  lat: number;
  lon: number;
  area: number;
  unit: 'ha';
  irrigationType: string;
  locationSource: 'device' | 'search' | 'map' | 'saved' | 'preset' | 'default';
  farmId?: string | null;
  presetId?: string | null;
  context?: string | null;
  currentCrop?: string | null;
  soilTest?: SoilTest;
}

interface FarmStore {
  selectedFarm: FarmContext | null;
  savedFarm: FarmContext | null;
  recent: FarmContext[];
  deviceAttempted: boolean;
  setDeviceAttempted: () => void;
  setFarm: (farm: FarmContext) => void;
  updateFarm: (patch: Partial<FarmContext>) => void;
  saveFarm: (farm: FarmContext) => void;
  clearFarm: () => void;
}

const sameSpot = (a: FarmContext, b: FarmContext) => Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lon - b.lon) < 1e-4;
const pushRecent = (list: FarmContext[], farm: FarmContext) => [farm, ...list.filter((f) => !sameSpot(f, farm))].slice(0, 6);

export const farmLabel = (f: Pick<FarmContext, 'name' | 'region'> | null | undefined) =>
  f ? (f.region && !f.name.includes(f.region) ? `${f.name}, ${f.region}` : f.name) : 'No location selected';

export const useFarmStore = create<FarmStore>()(
  persist(
    (set) => ({
      selectedFarm: null,
      savedFarm: null,
      recent: [],
      deviceAttempted: false,
      setDeviceAttempted: () => set({ deviceAttempted: true }),
      setFarm: (farm) => set((s) => ({ selectedFarm: farm, recent: pushRecent(s.recent, farm) })),
      updateFarm: (patch) => set((s) => ({ selectedFarm: s.selectedFarm ? { ...s.selectedFarm, ...patch } : null })),
      saveFarm: (farm) => set((s) => ({ selectedFarm: farm, savedFarm: farm, recent: pushRecent(s.recent, farm) })),
      clearFarm: () => set({ selectedFarm: null }),
    }),
    {
      name: 'krishimitra-farm',
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ selectedFarm: s.selectedFarm, savedFarm: s.savedFarm, recent: s.recent, deviceAttempted: s.deviceAttempted }),
    },
  ),
);
