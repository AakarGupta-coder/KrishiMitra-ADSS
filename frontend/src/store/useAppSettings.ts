import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '../lib/storage';

export type RefreshInterval = 5 | 10 | 30 | 0;

interface AppSettings {
  refreshMinutes: RefreshInterval;
  farmAlerts: boolean;
  systemAlerts: boolean;
  set: (patch: Partial<Pick<AppSettings, 'refreshMinutes' | 'farmAlerts' | 'systemAlerts'>>) => void;
}

export const useAppSettings = create<AppSettings>()(
  persist(
    (set) => ({
      refreshMinutes: 10,
      farmAlerts: true,
      systemAlerts: true,
      set: (patch) => set(patch),
    }),
    { name: 'krishimitra-settings', version: 1, storage: createJSONStorage(() => safeStorage) },
  ),
);
