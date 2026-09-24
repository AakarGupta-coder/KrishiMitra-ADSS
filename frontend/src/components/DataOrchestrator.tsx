import { useEffect, useRef } from 'react';
import { useFarmStore, farmLabel } from '../store/useFarmStore';
import { useFarmDataStore } from '../store/useFarmDataStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { evaluateNotifications } from '../lib/notifications';
import { farmKey } from '../lib/api';
import { locationKeyOf } from './NotificationCenter';
import { useAppSettings } from '../store/useAppSettings';

const PENDING_RETRY_MS = 20 * 1000;
const MAX_PENDING_RETRIES = 6;

export default function DataOrchestrator() {
  const farm = useFarmStore((s) => s.selectedFarm);
  const { fetchSummary, clear, summary, key } = useFarmDataStore();
  const sync = useNotificationStore((s) => s.sync);
  const pendingRetries = useRef(0);
  const refreshMinutes = useAppSettings((s) => s.refreshMinutes);
  const POLL_MS = refreshMinutes * 60 * 1000;
  const k = farmKey(farm);

  useEffect(() => {
    if (!farm) {
      clear();
      return;
    }
    pendingRetries.current = 0;
    void fetchSummary(farm);
    const tick = () => {
      if (document.visibilityState === 'visible') void fetchSummary(farm, { background: true });
    };
    const id = POLL_MS > 0 ? window.setInterval(tick, POLL_MS) : undefined;
    const onVis = () => {
      const last = useFarmDataStore.getState().lastFetched;
      if (POLL_MS > 0 && document.visibilityState === 'visible' && last && Date.now() - last > POLL_MS) tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [k, POLL_MS]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!summary || !farm || key !== k) return;
    sync(locationKeyOf(farm.lat, farm.lon), farmLabel(farm), evaluateNotifications(summary));
    if (summary.soil.status === 'pending' && pendingRetries.current < MAX_PENDING_RETRIES) {
      pendingRetries.current += 1;
      const t = window.setTimeout(() => void fetchSummary(farm, { background: true }), PENDING_RETRY_MS);
      return () => window.clearTimeout(t);
    }
  }, [summary]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
