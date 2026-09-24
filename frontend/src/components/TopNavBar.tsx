import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useFarmStore, farmLabel } from '../store/useFarmStore';
import { useSummary } from '../hooks/useSummary';
import { routeTitle } from '../lib/routes';
import { fmtArea, fmtRelative } from '../lib/format';
import LocationPicker, { LocationSearch, sourceLabel } from './LocationPicker';
import NotificationCenter from './NotificationCenter';
import Popover from './Popover';
import { Icon } from './ui';
import { DOT, completenessNotes, providerRows } from '../lib/providerStatus';


const USER = { name: 'Aakar', role: 'Lead Agronomist' };

const iconBtn = 'w-9 h-9 grid place-items-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors';

const TopNavBar: React.FC<{ onMenu: () => void }> = ({ onMenu }) => {
  const farm = useFarmStore((s) => s.selectedFarm);
  const { summary, status, error, refresh } = useSummary();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState<'farm' | 'status' | 'profile' | null>(null);
  const farmRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLButtonElement>(null);
  const profileRef = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(null);

  const rows = summary ? providerRows(summary) : [];
  const degraded = rows.filter((r) => r.state === 'unavailable' || r.state === 'partial');
  const notes = summary ? completenessNotes(summary) : [];
  let pill: { dot: string; text: string };
  if (status === 'loading') pill = { dot: 'bg-water animate-pulse', text: 'Loading' };
  else if (status === 'refreshing') pill = { dot: 'bg-water animate-pulse', text: 'Updating' };
  else if (error && summary) pill = { dot: 'bg-outline', text: 'Offline · cached' };
  else if (status === 'error') pill = { dot: 'bg-critical', text: 'Offline' };
  else if (summary && degraded.length) pill = { dot: 'bg-caution', text: 'Partial data' };
  else if (summary) pill = { dot: 'bg-chlorophyll', text: 'Live' };
  else pill = { dot: 'bg-outline', text: 'No data' };

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center gap-2 sm:gap-4 px-3 sm:px-6 border-b border-hairline bg-white/95 backdrop-blur">
      <button className={`lg:hidden -ml-1 ${iconBtn}`} onClick={onMenu} aria-label="Open navigation"><Icon name="menu" /></button>
      <div className="hidden sm:block min-w-0 shrink-0 w-[180px]">
        <div className="text-[10px] font-label-sm uppercase tracking-wider text-outline leading-none">KRISHIMITRA</div>
        <div className="text-title-md font-title-md text-forest truncate">{routeTitle(pathname)}</div>
      </div>

      <LocationSearch className="hidden md:block flex-1 max-w-md" />

      <div className="ml-auto flex items-center gap-1 sm:gap-2 min-w-0">
        <button
          ref={farmRef}
          onClick={() => setOpen(open === 'farm' ? null : 'farm')}
          aria-expanded={open === 'farm'}
          className="flex items-center gap-2 h-10 pl-2.5 pr-1.5 rounded-lg border border-hairline hover:bg-sage transition-colors min-w-0 max-w-[260px]"
        >
          <Icon name="agriculture" className="text-forest !text-[18px]" />
          <span className="min-w-0 text-left leading-tight">
            <span className="block text-body-sm font-semibold text-forest truncate">{farmLabel(farm)}</span>
            <span className="block text-[11px] font-label-sm text-on-surface-variant truncate">
              {farm ? `${fmtArea(farm.area)} · ${sourceLabel(farm.locationSource)}` : 'Select a location'}
            </span>
          </span>
          <Icon name="expand_more" className="text-on-surface-variant !text-[18px]" />
        </button>
        <Popover anchor={farmRef} open={open === 'farm'} onClose={close} width={420} label="Choose farm location">
          <LocationPicker compact onDone={close} />
        </Popover>

        <button
          ref={statusRef}
          onClick={() => setOpen(open === 'status' ? null : 'status')}
          className="hidden sm:flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-label-sm font-label-sm text-on-surface-variant hover:bg-surface-container-low"
          aria-label={`Data status: ${pill.text}`}
          title={notes.length ? `${pill.text}: ${notes.join('; ')}` : undefined}
        >
          <span className={`w-2 h-2 rounded-full ${pill.dot}`} />
          <span className="hidden xl:inline">{pill.text}</span>
        </button>
        <Popover anchor={statusRef} open={open === 'status'} onClose={close} width={340} label="Data status">
          <div className="px-4 pt-3 pb-2 border-b border-hairline">
            <div className="text-title-md font-title-md text-forest">Data status</div>
            <div className="text-body-sm text-on-surface-variant">
              {summary ? `Summary built ${fmtRelative(summary._meta.generated_at)} for ${farmLabel(farm)}` : status === 'loading' ? 'Loading data for this location…' : 'No data loaded'}
            </div>
            {error && <div className="mt-1 text-body-sm text-[#B91C1C]">{error}</div>}
          </div>
          <ul className="py-1">
            {rows.map((r) => (
              <li key={r.id} className="grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-x-2 px-4 py-1.5 text-body-sm" title={r.detail ?? undefined}>
                <span className={`w-2 h-2 rounded-full ${DOT[r.state]}`} />
                <span className="text-on-surface truncate">{r.label}</span>
                <span className={`font-label-sm text-label-sm whitespace-nowrap ${r.state === 'ok' ? 'text-on-surface-variant' : r.state === 'unavailable' ? 'text-[#B91C1C]' : 'text-[#B45309]'}`}>{r.text}</span>
                {r.detail && <span className="col-start-2 col-span-2 text-label-sm font-label-sm text-outline">{r.detail}</span>}
              </li>
            ))}
          </ul>
          {notes.some((n) => n.startsWith('Not evaluated')) && (
            <p className="px-4 pb-2 text-label-sm font-label-sm text-outline">
              Crop scores use the available factors only. {notes.find((n) => n.startsWith('Not evaluated'))}.
            </p>
          )}
          <div className="px-4 py-2 border-t border-hairline flex items-center justify-between">
            <button className="text-body-sm font-semibold text-forest hover:underline disabled:opacity-40" disabled={status === 'loading' || status === 'refreshing'} onClick={() => { refresh(); close(); }}>Refresh now</button>
            <Link to="/settings#sources" onClick={close} className="text-body-sm font-semibold text-forest hover:underline">Data sources</Link>
          </div>
        </Popover>

        <div className="hidden sm:block w-px h-6 bg-hairline" />
        <NotificationCenter />
        <Link to="/settings" className={`hidden sm:grid ${iconBtn}`} aria-label="Settings"><Icon name="settings" /></Link>

        <button ref={profileRef} onClick={() => setOpen(open === 'profile' ? null : 'profile')} className="flex items-center gap-2 h-10 pl-1 pr-1.5 rounded-lg hover:bg-surface-container-low" aria-label="Profile menu">
          <span className="w-8 h-8 rounded-full bg-forest text-white grid place-items-center text-label-md font-label-md">{USER.name[0]}</span>
          <span className="hidden 2xl:block text-left leading-tight">
            <span className="block text-body-sm font-semibold text-on-surface">{USER.name}</span>
            <span className="block text-[11px] text-on-surface-variant">{USER.role}</span>
          </span>
        </button>
        <Popover anchor={profileRef} open={open === 'profile'} onClose={close} width={280} label="Profile">
          <div className="px-4 py-3 border-b border-hairline flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-forest text-white grid place-items-center text-title-md">{USER.name[0]}</span>
            <div>
              <div className="text-body-md font-semibold text-on-surface">{USER.name}</div>
              <div className="text-body-sm text-on-surface-variant">{USER.role}</div>
            </div>
          </div>
          <div className="px-4 py-2 border-b border-hairline">
            <div className="text-[10px] font-label-sm uppercase tracking-wider text-on-surface-variant">Selected farm</div>
            <div className="text-body-sm font-semibold text-on-surface">{farmLabel(farm)}</div>
            {farm && <div className="text-label-sm font-label-sm text-on-surface-variant">{fmtArea(farm.area)} · {farm.irrigationType}</div>}
          </div>
          <div className="py-1">
            {([['agriculture', 'Farm profile', '/farm-profile'], ['settings', 'Settings', '/settings'], ['verified', 'Data sources', '/settings#sources'], ['straighten', 'Units', '/settings#units']] as const).map(([icon, label, to]) => (
              <button key={to} className="w-full text-left px-4 py-2 text-body-md hover:bg-sage flex items-center gap-2.5" onClick={() => { close(); navigate(to); }}>
                <Icon name={icon} className="text-forest !text-[18px]" />{label}
              </button>
            ))}
          </div>
        </Popover>
      </div>
    </header>
  );
};

export default TopNavBar;
