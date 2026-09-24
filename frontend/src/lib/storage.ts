import type { StateStorage } from 'zustand/middleware';

const memory: Record<string, string> = {};

export const safeStorage: StateStorage = {
  getItem: (k) => {
    try { return window.localStorage.getItem(k); } catch { return memory[k] ?? null; }
  },
  setItem: (k, v) => {
    try { window.localStorage.setItem(k, v); } catch { memory[k] = v; }
  },
  removeItem: (k) => {
    try { window.localStorage.removeItem(k); } catch { delete memory[k]; }
  },
};
