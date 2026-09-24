import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { NotificationCandidate } from '../lib/notifications';
import { safeStorage } from '../lib/storage';

export interface AppNotification extends NotificationCandidate {
  locationKey: string;
  locationLabel: string;
  createdAt: number;
  updatedAt: number;
  read: boolean;
  active: boolean;
}

interface NotificationState {
  items: AppNotification[];
  dismissed: Record<string, string>;
  sync: (locationKey: string, locationLabel: string, candidates: NotificationCandidate[]) => void;
  markRead: (key: string) => void;
  markAllRead: (locationKey: string) => void;
  dismiss: (key: string) => void;
}

export const notificationKey = (n: Pick<AppNotification, 'locationKey' | 'id'>) => `${n.locationKey}|${n.id}`;

const MAX_ITEMS = 60;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      items: [],
      dismissed: {},

      sync: (locationKey, locationLabel, candidates) =>
        set((state) => {
          const now = Date.now();
          const seen = new Set<string>();
          const byKey = new Map(state.items.map((n) => [notificationKey(n), n]));
          for (const c of candidates) {
            const key = `${locationKey}|${c.id}`;
            seen.add(key);
            if (state.dismissed[key] === c.fingerprint) continue;
            const prev = byKey.get(key);
            // Same condition still present: update in place and keep its read state (no duplicate on reload/poll).
            // A resolved condition that returns, or a changed condition, is a new unread event.
            if (prev && prev.fingerprint === c.fingerprint && prev.active) {
              byKey.set(key, { ...prev, ...c, active: true, locationLabel });
            } else {
              byKey.set(key, {
                ...c,
                locationKey,
                locationLabel,
                createdAt: prev?.createdAt && prev.active ? prev.createdAt : now,
                updatedAt: now,
                read: false,
                active: true,
              });
            }
          }
          for (const [key, n] of byKey) {
            if (n.locationKey === locationKey && !seen.has(key) && n.active) {
              byKey.set(key, { ...n, active: false, updatedAt: now });
            }
          }
          const items = [...byKey.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_ITEMS);
          return { items };
        }),

      markRead: (key) => set((s) => ({ items: s.items.map((n) => (notificationKey(n) === key ? { ...n, read: true } : n)) })),
      markAllRead: (locationKey) =>
        set((s) => ({ items: s.items.map((n) => (n.locationKey === locationKey ? { ...n, read: true } : n)) })),
      dismiss: (key) =>
        set((s) => {
          const n = s.items.find((x) => notificationKey(x) === key);
          return {
            items: s.items.filter((x) => notificationKey(x) !== key),
            dismissed: n ? { ...s.dismissed, [key]: n.fingerprint } : s.dismissed,
          };
        }),
    }),
    {
      name: 'krishimitra-notifications',
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      // v2: soil moved from ISRIC SoilGrids to HWSD v2.0 and market alerts now follow provider health.
      // Drop persisted alerts produced by the old rules so they cannot resurface as current.
      migrate: (persisted, version) => {
        const st = (persisted ?? {}) as Partial<NotificationState>;
        if (version >= 2) return st as NotificationState;
        const legacy = (id: string, source?: string) =>
          id === 'data:soilgrids' || id === 'data:agmarknet' || id === 'data:hwsd' || /SoilGrids/i.test(source ?? '');
        return {
          ...st,
          items: (st.items ?? []).filter((n) => !legacy(n.id, n.source)),
          dismissed: Object.fromEntries(Object.entries(st.dismissed ?? {}).filter(([k]) => !legacy(k.split('|')[1] ?? ''))),
        } as NotificationState;
      },
    },
  ),
);
