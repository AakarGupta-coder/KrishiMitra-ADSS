import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore, notificationKey, type AppNotification } from '../store/useNotificationStore';
import { useFarmStore, farmLabel } from '../store/useFarmStore';
import { useAppSettings } from '../store/useAppSettings';
import { categoryOf } from '../lib/notifications';
import { Badge, Icon, severityIcon, severityTone, TONE_TEXT } from './ui';
import Popover from './Popover';
import { fmtDateTime, fmtRelative } from '../lib/format';
import { localizeText } from '../lib/units';

export const locationKeyOf = (lat: number, lon: number) => `${lat.toFixed(4)},${lon.toFixed(4)}`;

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

const Item: React.FC<{ n: AppNotification; onOpen: (n: AppNotification) => void }> = ({ n, onOpen }) => {
  const markRead = useNotificationStore((s) => s.markRead);
  const dismiss = useNotificationStore((s) => s.dismiss);
  const key = notificationKey(n);
  const tone = severityTone(n.severity);
  return (
    <div className={`px-4 py-3 border-b border-hairline last:border-0 ${n.read ? '' : 'bg-canvas'} ${n.active ? '' : 'opacity-60'}`}>
      <div className="flex items-start gap-2.5">
        <Icon name={severityIcon(n.severity)} className={`${TONE_TEXT[tone]} !text-[20px] mt-0.5`} fill />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className={`text-body-md ${n.read ? 'font-medium' : 'font-bold'} text-on-surface`}>{localizeText(n.title)}</div>
            {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-water shrink-0" aria-label="Unread" />}
          </div>
          <div className="text-body-sm text-on-surface-variant mt-0.5">{localizeText(n.message)}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={tone}>{n.severity.toUpperCase()}</Badge>
            {!n.active && <Badge tone="neutral" icon="check">Resolved</Badge>}
            <span className="text-label-sm font-label-sm text-on-surface-variant" title={`First detected ${fmtDateTime(n.createdAt)}${n.dataTime ? ` · data from ${fmtDateTime(n.dataTime)}` : ''}`}>
              {n.source} · {fmtRelative(n.updatedAt)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-body-sm">
            <button className="font-semibold text-forest hover:underline" onClick={() => onOpen(n)}>View module</button>
            {!n.read && <button className="text-on-surface-variant hover:text-on-surface" onClick={() => markRead(key)}>Mark read</button>}
            <button className="ml-auto text-on-surface-variant hover:text-[#B91C1C]" onClick={() => dismiss(key)} aria-label="Clear notification">Clear</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationCenter: React.FC = () => {
  const farm = useFarmStore((s) => s.selectedFarm);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const list = useLocationNotifications();
  const navigate = useNavigate();
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'farm' | 'system'>('farm');
  // Badge counts unread notifications whose condition is still current; resolved ones stay listed but do not count.
  const pending = (n: AppNotification) => !n.read && n.active;
  const unread = list.filter(pending).length;
  const worstUnread = list.find(pending);
  const farmItems = list.filter((n) => categoryOf(n.id) === 'farm');
  const systemItems = list.filter((n) => categoryOf(n.id) === 'system');
  const shown = tab === 'farm' ? farmItems : systemItems;

  const openModule = (n: AppNotification) => {
    markRead(notificationKey(n));
    setOpen(false);
    navigate(n.module);
  };

  return (
    <>
      <button
        ref={anchor}
        className={`relative w-9 h-9 grid place-items-center rounded-lg transition-colors ${open ? 'bg-surface-container text-on-surface' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'}`}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon name="notifications" fill={unread > 0} />
        {unread > 0 && (
          <span className={`absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] leading-4 font-bold text-white text-center ${worstUnread && (worstUnread.severity === 'critical' || worstUnread.severity === 'warning') ? 'bg-critical' : worstUnread?.severity === 'caution' ? 'bg-caution' : 'bg-water'}`}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <Popover anchor={anchor} open={open} onClose={() => setOpen(false)} width={420} label="Notifications">
        <div className="px-4 pt-3 pb-2 border-b border-hairline">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-title-md font-title-md text-forest">Notifications</div>
              <div className="text-body-sm text-on-surface-variant truncate">{farmLabel(farm)} · evaluated from live data</div>
            </div>
            <button className="text-body-sm font-semibold text-forest hover:underline disabled:opacity-40 disabled:no-underline shrink-0" disabled={!unread || !farm}
              onClick={() => farm && markAllRead(locationKeyOf(farm.lat, farm.lon))}>
              Mark all read
            </button>
          </div>
          <div className="mt-2 flex gap-1" role="tablist">
            {([['farm', 'Active farm alerts', farmItems], ['system', 'Data & system', systemItems]] as const).map(([id, label, items]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`px-2.5 py-1 rounded-md text-body-sm font-semibold ${tab === id ? 'bg-sage text-forest' : 'text-on-surface-variant hover:bg-surface-container-low'}`}>
                {label} · {items.filter(pending).length}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto min-h-0">
          {shown.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Icon name="notifications_off" className="text-outline !text-[28px]" />
              <div className="mt-2 text-body-md font-semibold text-on-surface">{tab === 'farm' ? 'No farm alerts for this location' : 'No data or system events'}</div>
              <div className="text-body-sm text-on-surface-variant">
                {tab === 'farm'
                  ? 'Alerts appear when forecast, irrigation, crop, yield, soil or market conditions cross their thresholds.'
                  : 'Source outages, fallbacks and forecast updates appear here. An outage is not an agronomic risk.'}
              </div>
            </div>
          ) : (
            shown.map((n) => <Item key={notificationKey(n)} n={n} onOpen={openModule} />)
          )}
        </div>
      </Popover>
    </>
  );
};

export default NotificationCenter;
