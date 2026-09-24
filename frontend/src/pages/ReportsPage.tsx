import React, { useState } from 'react';
import type { FarmSummary } from '../lib/types';
import { useFarmStore, farmLabel } from '../store/useFarmStore';
import { REPORT_SECTIONS, type SectionId } from '../lib/reportSections';
import { Badge, Button, Callout, Eyebrow, Icon, PageHeader, Panel, SummaryGate, type Tone } from '../components/ui';
import { FarmContextBar } from '../components/widgets';
import { fmtDateTime, fmtRelative } from '../lib/format';

interface Generated { file: string; at: number; sections: number; kind: 'PDF' | 'JSON'; size: number }

const readiness = (s: FarmSummary, id: SectionId): { tone: Tone; label: string; note: string } => {
  const ok = (note: string) => ({ tone: 'ok' as Tone, label: 'Ready', note });
  const partial = (note: string) => ({ tone: 'caution' as Tone, label: 'Partial', note });
  const none = (note: string) => ({ tone: 'critical' as Tone, label: 'Unavailable', note });
  const canon = s.crops.find((c) => c.crop === s.recommendation.canonical);
  if (!canon && (id === 'crop' || id === 'yield')) return none('Recommendation unavailable');
  switch (id) {
    case 'profile': return s.location.state ? ok(`${s.location.district ?? ''}, ${s.location.state}`) : partial('District/state unresolved');
    case 'weather': return s.weather.status === 'ok' ? ok(`${s.weather.daily.length}-day forecast, ${fmtRelative(s.weather.fetched_at)}`) : none('Open-Meteo unavailable');
    case 'soil': return s.soil.status === 'ok' ? ok('HWSD v2.0 cell at farm (~1 km)') : s.soil.status === 'fallback' ? partial('Nearby HWSD v2.0 cell') : none(s.soil.status === 'pending' ? 'Still loading' : 'No HWSD soil data');
    case 'crop': return canon!.coverage >= 0.85 ? ok(`${canon!.crop}, full rule coverage`) : partial(`${canon!.crop}, ${Math.round(canon!.coverage * 100)}% of rule inputs`);
    case 'yield': return canon!.yield.method === 'ml' ? ok('ML model') : partial('Reference method (indicative)');
    case 'irrigation': return s.irrigation.status !== 'unavailable' ? ok(`${s.irrigation.horizon_days}-day water balance`) : none('ET₀ unavailable');
    case 'financial': {
      const live = s.crops.filter((c) => c.financials.price_basis === 'live').length;
      return live === s.crops.length ? ok('All prices live') : live ? partial(`${live}/${s.crops.length} live prices; costs are reference`) : partial('Reference prices only');
    }
    case 'risk': return s.risk.available === s.risk.total ? ok('All 6 categories rated') : partial(`${s.risk.available}/${s.risk.total} categories rated`);
    case 'actions': return ok('Derived from risks and recommendation');
    case 'sources': return ok('Status of every source');
  }
};

const ReportsView: React.FC<{ s: FarmSummary }> = ({ s }) => {
  const farm = useFarmStore((st) => st.selectedFarm)!;
  const [selected, setSelected] = useState<Set<SectionId>>(new Set(REPORT_SECTIONS.map((x) => x.id)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Generated[]>([]);

  const slug = `${farm.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'farm';
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

  const generatePdf = () => {
    setBusy(true);
    setError(null);
    setTimeout(async () => {
      try {
        const { buildFarmReport } = await import('../lib/report');
        const doc = buildFarmReport(s, farm, selected);
        const file = `krishimitra_${slug}_${stamp}.pdf`;
        const blob = doc.output('blob');
        doc.save(file);
        setHistory((h) => [{ file, at: Date.now(), sections: selected.size, kind: 'PDF' as const, size: blob.size }, ...h].slice(0, 8));
      } catch (e) {
        setError(`PDF generation failed: ${(e as Error).message}`);
      } finally {
        setBusy(false);
      }
    }, 30);
  };

  const exportJson = () => {
    const payload = { exported_at: new Date().toISOString(), farm, summary: s };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const file = `krishimitra_${slug}_${stamp}.json`;
    a.href = url;
    a.download = file;
    a.click();
    URL.revokeObjectURL(url);
    setHistory((h) => [{ file, at: Date.now(), sections: 0, kind: 'JSON' as const, size: blob.size }, ...h].slice(0, 8));
  };

  const toggle = (id: SectionId) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <>
      <PageHeader eyebrow="Report center" title="Farm intelligence reports" subtitle={`Generate a PDF report for ${farmLabel(farm)} from the data currently loaded. Every figure matches what the modules show.`} />
      <FarmContextBar s={s} />

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6 items-start">
        <Panel icon="picture_as_pdf" title="Generate farm intelligence report" accent="forest"
          subtitle={`Snapshot of the summary built ${fmtDateTime(s._meta.generated_at)}`}
          footer={<div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" icon="download" busy={busy} disabled={selected.size === 0} onClick={generatePdf}>{busy ? 'Building PDF…' : 'Download PDF report'}</Button>
            <Button icon="data_object" onClick={exportJson}>Export JSON data</Button>
            <span className="text-body-sm text-on-surface-variant">{selected.size} of {REPORT_SECTIONS.length} sections · A4</span>
          </div>}>
          <div className="flex items-center justify-between mb-2">
            <Eyebrow>Sections & data readiness</Eyebrow>
            <div className="flex gap-3 text-body-sm">
              <button className="font-semibold text-forest hover:underline" onClick={() => setSelected(new Set(REPORT_SECTIONS.map((x) => x.id)))}>All</button>
              <button className="font-semibold text-forest hover:underline" onClick={() => setSelected(new Set())}>None</button>
            </div>
          </div>
          <div className="divide-y divide-hairline border border-hairline rounded-lg">
            <div className="flex items-center gap-3 px-3 py-2.5 bg-canvas">
              <Icon name="lock" className="!text-[18px] text-outline" />
              <span className="flex-1 text-body-md font-semibold text-on-surface">Executive summary & timestamp</span>
              <Badge tone="neutral">Always included</Badge>
            </div>
            {REPORT_SECTIONS.map((sec) => {
              const r = readiness(s, sec.id);
              return (
                <label key={sec.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-canvas">
                  <input type="checkbox" checked={selected.has(sec.id)} onChange={() => toggle(sec.id)} className="w-[18px] h-[18px] accent-forest" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-body-md font-semibold text-on-surface">{sec.label}</span>
                    <span className="block text-body-sm text-on-surface-variant truncate">{r.note}</span>
                  </span>
                  <Badge tone={r.tone}>{r.label}</Badge>
                </label>
              );
            })}
          </div>
          {error && <Callout tone="critical" icon="error" className="mt-3">{error}</Callout>}
        </Panel>

        <div className="space-y-6">
          <Panel icon="description" title="What the report contains">
            <ul className="space-y-2 text-body-sm text-on-surface">
              <li className="flex gap-2"><Icon name="check" className="!text-[16px] text-chlorophyll mt-px" /><span>Canonical recommendation <strong>{s.recommendation.canonical ?? 'unavailable'}</strong> with the same scores as Crop Advisor</span></li>
              <li className="flex gap-2"><Icon name="check" className="!text-[16px] text-chlorophyll mt-px" />Forecast table with real dates from Open-Meteo</li>
              <li className="flex gap-2"><Icon name="check" className="!text-[16px] text-chlorophyll mt-px" />Market source, market name and arrival date for every price</li>
              <li className="flex gap-2"><Icon name="check" className="!text-[16px] text-chlorophyll mt-px" />Unavailable and fallback data stated explicitly, never filled in</li>
              <li className="flex gap-2"><Icon name="check" className="!text-[16px] text-chlorophyll mt-px" />Source status table and generation timestamp on every page</li>
            </ul>
          </Panel>
          <Panel icon="history" title="Generated this session">
            {history.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">No reports generated yet.</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {history.map((h) => (
                  <li key={h.file + h.at} className="py-2 flex items-center gap-2 text-body-sm">
                    <Icon name={h.kind === 'PDF' ? 'picture_as_pdf' : 'data_object'} className="!text-[18px] text-forest" />
                    <span className="flex-1 min-w-0 truncate font-label-md">{h.file}</span>
                    <span className="text-on-surface-variant whitespace-nowrap">{(h.size / 1024).toFixed(0)} KB · {fmtRelative(h.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </section>
    </>
  );
};

const ReportsPage: React.FC = () => <SummaryGate>{(s) => <ReportsView s={s} />}</SummaryGate>;

export default ReportsPage;
