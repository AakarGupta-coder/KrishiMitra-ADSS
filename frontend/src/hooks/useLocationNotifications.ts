import { useMemo } from 'react';
import { useNotificationStore, type AppNotification } from '../store/useNotificationStore';
import { useFarmStore } from '../store/useFarmStore';
import { useAppSettings } from '../store/useAppSettings';
import { categoryOf, locationKeyOf } from '../lib/notifications';

const SEVERITY_RANK = { critical: 0, warning: 1, caution: 2, info: 3 } as const;

export function useLocationNotifications() {
  const farm = useFarmStore((s) => s.selectedFarm);
  const items = useNotificationStore((s) => s.items);
  const farmAlerts = useAppSettings((s) => s.farmAlerts);
  const systemAlerts = useAppSettings((s) => s.systemAlerts);
  return useMemo(() => {
    if (!farm) return [] as AppNotification[];
    const lk = locationKeyOf(farm.lat, farm.lon);
    return items
      .filter((n) => n.locationKey === lk)
      .filter((n) => (categoryOf(n.id) === 'farm' ? farmAlerts : systemAlerts))
      .sort((a, b) =>
        a.active !== b.active ? (a.active ? -1 : 1)
          : a.read !== b.read ? (a.read ? 1 : -1)
            : SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.updatedAt - a.updatedAt);
  }, [farm, items, farmAlerts, systemAlerts]);
}
