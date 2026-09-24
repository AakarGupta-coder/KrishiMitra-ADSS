import React from 'react';
import { Link } from 'react-router-dom';
import type { Attribution, FarmSummary, RiskLevel, Severity } from '../lib/types';
import { fmtRelative, isNum } from '../lib/format';
import { localizeText } from '../lib/units';
import { useSummary } from '../hooks/useSummary';


export const Icon: React.FC<{ name: string; className?: string; fill?: boolean; title?: string }> = ({ name, className = '', fill, title }) => (
  <span className={`material-symbols-outlined select-none ${fill ? 'fill-icon' : ''} ${className}`} aria-hidden={title ? undefined : true} title={title}>
    {name}
  </span>
);

export type Tone = 'ok' | 'water' | 'caution' | 'critical' | 'neutral' | 'brand';

const TONE_BADGE: Record<Tone, string> = {
  ok: 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]',
  water: 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]',
  caution: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
  critical: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
  neutral: 'bg-surface-container-low text-on-surface-variant border-hairline',
  brand: 'bg-forest text-white border-forest',
};

export const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-[#15803D]',
  water: 'text-[#0369A1]',
  caution: 'text-[#B45309]',
  critical: 'text-[#B91C1C]',
  neutral: 'text-on-surface-variant',
  brand: 'text-forest',
};

export const Badge: React.FC<{ tone?: Tone; icon?: string; children: React.ReactNode; className?: string; title?: string }> = ({ tone = 'neutral', icon, children, className = '', title }) => (
  <span title={title} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-label-sm font-label-sm whitespace-nowrap ${TONE_BADGE[tone]} ${className}`}>
    {icon && <Icon name={icon} className="!text-[13px]" />}
    {children}
  </span>
);

export const severityTone = (s: Severity | string): Tone =>
  s === 'critical' ? 'critical' : s === 'warning' ? 'critical' : s === 'caution' ? 'caution' : s === 'info' ? 'water' : 'neutral';

export const severityIcon = (s: Severity | string) =>
  s === 'critical' ? 'error' : s === 'warning' ? 'warning' : s === 'caution' ? 'report' : 'info';

export const riskTone = (l: RiskLevel): Tone => (l === 'high' ? 'critical' : l === 'moderate' ? 'caution' : l === 'low' ? 'ok' : 'neutral');
export const riskLabel = (l: RiskLevel) => (l === 'unavailable' ? 'No data' : `${l[0].toUpperCase()}${l.slice(1)}`);

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-forest text-white border border-[#0D3528] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-forest-hover',
  secondary: 'bg-white text-forest border border-hairline hover:bg-sage',
  ghost: 'bg-transparent text-forest border border-transparent hover:bg-sage',
  danger: 'bg-critical text-white border border-critical hover:bg-[#B91C1C]',
};

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; icon?: string; busy?: boolean; size?: 'sm' | 'md' }> = ({
  variant = 'secondary', icon, busy, size = 'md', className = '', children, disabled, ...rest
}) => (
  <button
    {...rest}
    disabled={disabled || busy}
    className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
      size === 'sm' ? 'px-2.5 py-1 text-body-sm' : 'px-3.5 py-2 text-body-md'
    } ${BTN[variant]} ${className}`}
  >
    {(icon || busy) && <Icon name={busy ? 'progress_activity' : icon!} className={`!text-[18px] ${busy ? 'animate-spin' : ''}`} />}
    {children}
  </button>
);


export const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant ${className}`}>{children}</div>
);

export const PageHeader: React.FC<{ title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; eyebrow?: string }> = ({ title, subtitle, actions, eyebrow }) => (
  <section className="flex flex-col md:flex-row md:items-end justify-between gap-3">
    <div className="min-w-0">
      {eyebrow && <Eyebrow className="mb-1">{eyebrow}</Eyebrow>}
      <h1 className="text-headline-lg-mobile md:text-headline-md font-headline-md text-forest">{title}</h1>
      {subtitle && <p className="mt-1 text-body-md text-on-surface-variant max-w-3xl">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </section>
);

export const Panel: React.FC<{
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  accent?: 'forest' | 'water' | 'caution' | 'critical';
  id?: string;
}> = ({ title, subtitle, icon, actions, footer, children, className = '', bodyClassName = 'p-5', accent, id }) => {
  const accentCls = accent
    ? { forest: 'border-t-[3px] border-t-forest', water: 'border-t-[3px] border-t-water', caution: 'border-t-[3px] border-t-caution', critical: 'border-t-[3px] border-t-critical' }[accent]
    : '';
  return (
    <section id={id} className={`bg-white rounded-xl border border-hairline shadow-[0_1px_2px_rgba(17,66,50,0.04)] flex flex-col min-w-0 ${accentCls} ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-hairline">
          <div className="min-w-0">
            {title && (
              <h2 className="text-title-md font-title-md text-forest flex items-center gap-2">
                {icon && <Icon name={icon} className="text-forest !text-[20px]" />}
                <span className="truncate">{title}</span>
              </h2>
            )}
            {subtitle && <p className="text-body-sm text-on-surface-variant mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={`flex-1 min-w-0 ${bodyClassName}`}>{children}</div>
      {footer && <footer className="px-5 py-2.5 border-t border-hairline bg-canvas/60 rounded-b-xl">{footer}</footer>}
    </section>
  );
};

export const Metric: React.FC<{
  label: string;
  value: React.ReactNode;
  unit?: string;
  sub?: React.ReactNode;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ label, value, unit, sub, tone, size = 'md', className = '' }) => {
  const unavailable = value === 'Unavailable' || value === 'Not provided' || value === 'No recent data';
  const sizeCls = size === 'lg' ? 'text-[34px] leading-[38px]' : size === 'sm' ? 'text-title-lg' : 'text-telemetry-metric';
  return (
    <div className={`min-w-0 ${className}`}>
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-1 flex items-baseline gap-1.5 min-w-0">
        <span className={`font-telemetry-metric tabular ${unavailable ? 'text-body-md font-body-md text-outline' : `${sizeCls} font-semibold ${tone ? TONE_TEXT[tone] : 'text-forest'}`} truncate`}>
          {value}
        </span>
        {unit && !unavailable && <span className="text-label-md font-label-md text-on-surface-variant">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-body-sm text-on-surface-variant">{sub}</div>}
    </div>
  );
};

export const MetricStrip: React.FC<{ children: React.ReactNode; cols?: string; className?: string }> = ({ children, cols = 'grid-cols-2 lg:grid-cols-4', className = '' }) => (
  <div className={`grid ${cols} gap-px bg-hairline rounded-xl border border-hairline overflow-hidden ${className}`}>
    {React.Children.toArray(children).filter(Boolean).map((c, i) => (
      <div key={i} className="bg-white p-4 min-w-0">{c}</div>
    ))}
  </div>
);

export const ContextBar: React.FC<{ items: { icon: string; label: string; value: React.ReactNode; title?: string }[] }> = ({ items }) => (
  <div className="flex flex-wrap items-stretch rounded-xl border border-hairline bg-white divide-x divide-hairline overflow-hidden">
    {items.map((it) => (
      <div key={it.label} className="flex items-center gap-2 px-4 py-2.5 min-w-0 flex-1 basis-[180px]" title={it.title}>
        <Icon name={it.icon} className="text-forest !text-[18px]" />
        <div className="min-w-0">
          <div className="text-[10px] font-label-sm uppercase tracking-wider text-on-surface-variant">{it.label}</div>
          <div className="text-body-sm font-semibold text-on-surface truncate">{it.value}</div>
        </div>
      </div>
    ))}
  </div>
);

export const SourceTag: React.FC<{ label: string; source: string; time?: number | string | null; note?: string; state?: 'ok' | 'fallback' | 'unavailable' | 'stale' | 'pending' | 'historical' }> = ({ label, source, time, note, state = 'ok' }) => {
  const dot = { ok: 'bg-chlorophyll', fallback: 'bg-caution', stale: 'bg-caution', pending: 'bg-water animate-pulse', unavailable: 'bg-critical', historical: 'bg-outline' }[state];
  return (
    <div className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-label-sm font-label-sm text-on-surface-variant">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="text-on-surface">{label}:</span>
      <span>{source}</span>
      {state === 'historical' ? <span>• historical dataset</span> : time !== undefined && <span>• updated {fmtRelative(time)}</span>}
      {note && <span className={state === 'ok' ? '' : 'text-[#B45309]'}>• {note}</span>}
    </div>
  );
};

export const Callout: React.FC<{ tone?: Tone; icon?: string; title?: React.ReactNode; children?: React.ReactNode; className?: string }> = ({ tone = 'water', icon, title, children, className = '' }) => {
  const bg = { ok: 'bg-[#F0FDF4] border-[#BBF7D0]', water: 'bg-[#F0F9FF] border-[#BAE6FD]', caution: 'bg-[#FFFBEB] border-[#FDE68A]', critical: 'bg-[#FEF2F2] border-[#FECACA]', neutral: 'bg-surface-container-low border-hairline', brand: 'bg-sage border-hairline' }[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 ${bg} ${className}`}>
      {icon && <Icon name={icon} className={`${TONE_TEXT[tone]} !text-[18px] mt-0.5`} />}
      <div className="text-body-sm text-on-surface min-w-0">
        {title && <div className={`font-bold ${TONE_TEXT[tone]}`}>{title}</div>}
        {children}
      </div>
    </div>
  );
};

export const KV: React.FC<{ label: React.ReactNode; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-hairline last:border-0 text-body-sm">
    <span className="text-on-surface-variant">{label}</span>
    <span className={`text-right text-on-surface font-medium ${mono ? 'font-label-md tabular' : ''}`}>{value}</span>
  </div>
);

export const Segmented = <T extends string>({ options, value, onChange, ariaLabel }: { options: { value: T; label: string; icon?: string }[]; value: T; onChange: (v: T) => void; ariaLabel: string }) => (
  <div role="tablist" aria-label={ariaLabel} className="inline-flex p-0.5 rounded-lg bg-surface-container-low border border-hairline">
    {options.map((o) => (
      <button
        key={o.value}
        role="tab"
        aria-selected={value === o.value}
        onClick={() => onChange(o.value)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-body-sm font-semibold transition-colors ${
          value === o.value ? 'bg-white text-forest shadow-sm border border-hairline' : 'text-on-surface-variant hover:text-on-surface border border-transparent'
        }`}
      >
        {o.icon && <Icon name={o.icon} className="!text-[16px]" />}
        {o.label}
      </button>
    ))}
  </div>
);

export const Progress: React.FC<{ value: number | null; tone?: 'forest' | 'ok' | 'caution' | 'critical' | 'water'; className?: string }> = ({ value, tone = 'forest', className = '' }) => {
  const color = { forest: 'bg-forest', ok: 'bg-chlorophyll', caution: 'bg-caution', critical: 'bg-critical', water: 'bg-water' }[tone];
  return (
    <div className={`h-1.5 rounded-full bg-surface-container ${className}`}>
      {isNum(value) && <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }} />}
    </div>
  );
};


export const LoadingBlock: React.FC<{ label?: string; className?: string }> = ({ label = 'Loading…', className = 'h-48' }) => (
  <div className={`flex items-center justify-center gap-2 text-body-md text-on-surface-variant ${className}`} role="status">
    <Icon name="progress_activity" className="animate-spin text-forest" />
    {label}
  </div>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-24' }) => <div className={`rounded-xl bg-surface-container-low animate-pulse ${className}`} />;

export const UnavailableBlock: React.FC<{ title?: string; reason?: React.ReactNode; action?: React.ReactNode; icon?: string; className?: string }> = ({ title = 'Unavailable', reason, action, icon = 'cloud_off', className = '' }) => (
  <div className={`flex flex-col items-center justify-center text-center gap-2 rounded-lg border border-dashed border-field bg-canvas px-6 py-8 ${className}`}>
    <Icon name={icon} className="text-outline !text-[28px]" />
    <div className="text-title-md text-on-surface">{title}</div>
    {reason && <div className="text-body-sm text-on-surface-variant max-w-md">{reason}</div>}
    {action}
  </div>
);

export const ErrorBlock: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <UnavailableBlock
    icon="error"
    title="Could not load farm intelligence"
    reason={message}
    action={onRetry && <Button variant="primary" icon="refresh" onClick={onRetry} className="mt-2">Retry</Button>}
  />
);

export const SummaryGate: React.FC<{ children: (s: FarmSummary) => React.ReactNode; loadingLabel?: string }> = ({ children, loadingLabel = 'Fetching live telemetry for this location…' }) => {
  const { farm, summary, status, error, refresh } = useSummary();
  if (!farm) return <UnavailableBlock icon="location_off" title="No farm location selected" reason="Choose a location from the farm selector in the top bar." />;
  if (summary) return <>{children(summary)}</>;
  if (status === 'error') return <ErrorBlock message={error || 'Unknown error'} onRetry={refresh} />;
  return (
    <div className="space-y-4">
      <LoadingBlock label={loadingLabel} className="h-16" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
};

export const ModuleLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link to={to} className="inline-flex items-center gap-1 text-body-sm font-semibold text-forest hover:underline">
    {children}
    <Icon name="arrow_forward" className="!text-[16px]" />
  </Link>
);


export const FactorAttribution: React.FC<{ items: Attribution[] }> = ({ items }) => (
  <div className="space-y-2.5">
    {items.map((a) => {
      const penalty = 1 - a.multiplier;
      const bad = a.status === 'low' || a.status === 'high' || a.status === 'off_season';
      const unit = a.unit && a.unit !== '%' ? ` ${a.unit}` : a.unit || '';
      return (
        <div key={a.factor}>
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <span className="text-body-sm font-semibold text-on-surface">{a.label}</span>
              <span className="ml-2 text-label-sm font-label-sm text-on-surface-variant">
                {localizeText(`${a.value !== null && a.value !== undefined ? `${a.value}${unit}` : 'next sowing window'}${a.min !== undefined ? ` · pref. ${a.min}–${a.max}${unit}` : ''}`)}
              </span>
            </div>
            <div className={`shrink-0 text-label-sm font-label-sm tabular ${bad ? 'text-[#B45309]' : a.status === 'met_by_irrigation' ? 'text-[#0369A1]' : 'text-[#15803D]'}`}>
              {bad ? `−${Math.round(penalty * 100)} pts` : a.status === 'met_by_irrigation' ? 'Met by irrigation' : 'In range'}
            </div>
          </div>
          <div className="relative mt-1 h-2 rounded-full bg-surface-container">
            <div className="absolute right-0 top-[-3px] bottom-[-3px] border-r border-dashed border-[#94A3B8]" />
            {bad && <div className="absolute right-0 h-full rounded-l-full bg-caution" style={{ width: `${Math.max(3, penalty * 100)}%` }} />}
            {a.status === 'in_range' && <div className="absolute right-0 h-full w-[3%] rounded-l-full bg-chlorophyll" />}
          </div>
        </div>
      );
    })}
  </div>
);


export const CHART = {
  rain: '#0284C7',
  heat: '#D97706',
  green: '#16A34A',
  forest: '#114232',
  grid: '#E2E8DE',
  axis: '#414944',
  muted: '#717974',
};

export const axisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fill: CHART.axis, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' },
} as const;

interface TooltipRow { name?: string | number; value?: unknown; color?: string; unit?: string; dataKey?: unknown; payload?: Record<string, unknown> }

export const ChartTooltip: React.FC<{ active?: boolean; payload?: TooltipRow[]; label?: unknown; labelFormatter?: (l: unknown, p?: Record<string, unknown>) => React.ReactNode; valueFormatter?: (v: unknown, name: string) => string }> = ({ active, payload, label, labelFormatter, valueFormatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-field bg-white px-3 py-2 shadow-[0_8px_24px_-4px_rgba(17,66,50,0.08),0_2px_6px_-1px_rgba(17,66,50,0.04)]">
      <div className="text-label-sm font-label-sm text-on-surface mb-1">{labelFormatter ? labelFormatter(label, payload[0]?.payload) : String(label)}</div>
      {payload.map((p) => (
        <div key={String(p.dataKey ?? p.name)} className="flex items-center gap-2 text-body-sm">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-on-surface-variant">{p.name}</span>
          <span className="ml-auto pl-3 font-label-md tabular text-on-surface">
            {valueFormatter ? valueFormatter(p.value, String(p.name)) : isNum(p.value) ? p.value.toFixed(1) : 'Unavailable'}
          </span>
        </div>
      ))}
    </div>
  );
};

export const Legend: React.FC<{ items: { label: string; color: string; shape?: 'dot' | 'line' | 'bar' }[] }> = ({ items }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-on-surface-variant">
    {items.map((i) => (
      <span key={i.label} className="inline-flex items-center gap-1.5">
        {i.shape === 'line' ? (
          <span className="w-4 h-0.5 rounded" style={{ background: i.color }} />
        ) : (
          <span className={`${i.shape === 'bar' ? 'w-2.5 h-3 rounded-sm' : 'w-2 h-2 rounded-full'}`} style={{ background: i.color }} />
        )}
        {i.label}
      </span>
    ))}
  </div>
);

export function useIsNarrow(maxWidth = 640) {
  const query = `(max-width: ${maxWidth}px)`;
  const [narrow, setNarrow] = React.useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return narrow;
}

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
  primary?: boolean;
  className?: string;
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, selectedKey, minWidth = 640, rowClassName }: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedKey?: string;
  minWidth?: number;
  rowClassName?: (row: T) => string;
}) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary);
  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-body-sm" style={{ minWidth }}>
          <thead>
            <tr className="text-left text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant border-b border-hairline">
              {columns.map((c, i) => (
                <th key={c.key} className={`py-2 font-medium ${i === 0 ? 'pl-5 pr-3' : 'px-3'} ${i === columns.length - 1 ? 'pr-5' : ''} ${c.align === 'right' ? 'text-right' : ''}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const k = rowKey(r);
              return (
                <tr key={k} onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={`border-b border-hairline last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-canvas' : ''} ${selectedKey === k ? 'bg-sage' : ''} ${rowClassName?.(r) ?? ''}`}>
                  {columns.map((c, i) => (
                    <td key={c.key} className={`py-2.5 ${i === 0 ? 'pl-5 pr-3' : 'px-3'} ${i === columns.length - 1 ? 'pr-5' : ''} ${c.align === 'right' ? 'text-right font-label-md tabular' : ''} ${c.className ?? ''}`}>{c.render(r)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="md:hidden divide-y divide-hairline">
        {rows.map((r) => {
          const k = rowKey(r);
          return (
            <div key={k} onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={`px-4 py-3 ${onRowClick ? 'cursor-pointer' : ''} ${selectedKey === k ? 'bg-sage' : ''} ${rowClassName?.(r) ?? ''}`}>
              <div className="text-body-md font-semibold text-on-surface">{primary.render(r)}</div>
              <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1">
                {rest.map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-[10px] font-label-sm uppercase tracking-wider text-on-surface-variant">{c.header}</dt>
                    <dd className="text-body-sm text-on-surface font-label-md tabular break-words">{c.render(r)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </>
  );
}
