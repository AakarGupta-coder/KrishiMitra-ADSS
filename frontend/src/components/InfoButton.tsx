import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModelCard } from '../lib/modelCards';
import type { ClassifierVariant, ModelCard } from '../lib/types';
import { fmtNum } from '../lib/format';
import { Badge, Callout, Eyebrow, Icon, LoadingBlock, Segmented } from './ui';

const pct = (v: number | null | undefined, d = 1) => (typeof v === 'number' && Number.isFinite(v) ? `${(v * 100).toFixed(d)}%` : '–');

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h3 className="text-body-md font-semibold text-forest">{title}</h3>
    {children}
  </section>
);

const Bullets: React.FC<{ items: string[]; ordered?: boolean }> = ({ items, ordered }) => {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={`space-y-1 text-body-sm text-on-surface pl-5 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-outline`}>
      {items.map((t) => <li key={t}>{t}</li>)}
    </Tag>
  );
};

const Chips: React.FC<{ items: string[]; muted?: (s: string) => boolean }> = ({ items, muted }) => (
  <div className="flex flex-wrap gap-1">
    {items.map((v) => (
      <span key={v} className={`px-1.5 py-0.5 rounded border text-[11px] font-label-sm ${muted?.(v) ? 'bg-white border-hairline text-outline' : 'bg-surface-container-low border-hairline text-on-surface'}`}>{v}</span>
    ))}
  </div>
);

const Tile: React.FC<{ label: string; value: string; hint: string }> = ({ label, value, hint }) => (
  <div className="rounded-lg border border-hairline bg-white p-3 min-w-0" title={hint}>
    <Eyebrow>{label}</Eyebrow>
    <div className="mt-0.5 text-title-lg font-telemetry-metric tabular text-forest">{value}</div>
    <div className="text-[11px] leading-4 text-on-surface-variant">{hint}</div>
  </div>
);

const METRIC_HELP = {
  accuracy: 'Share of test rows predicted correctly.',
  precision: 'Of the rows predicted as a crop, the share that really were that crop. Averaged over crops (macro).',
  recall: 'Of the rows that really were a crop, the share the model found. Averaged over crops (macro).',
  f1: 'Harmonic mean of precision and recall; low if either is low. Averaged over crops (macro).',
};

const ConfusionMatrix: React.FC<{ matrix: number[][]; names: string[] }> = ({ matrix, names }) => {
  const short = (n: string) => (n.length > 9 ? `${n.slice(0, 8)}…` : n);
  return (
    <div className="overflow-auto rounded-lg border border-hairline max-h-[460px]">
      <table className="border-collapse text-[11px] font-label-sm tabular">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-20 bg-white p-1 text-left text-[10px] text-outline font-normal">true ↓ / predicted →</th>
            {names.map((n) => (
              <th key={n} scope="col" title={n} className="sticky top-0 z-10 bg-white p-1 h-[84px] align-bottom font-normal text-on-surface-variant">
                <span className="inline-block [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">{short(n)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => {
            const total = row.reduce((a, b) => a + b, 0) || 1;
            return (
              <tr key={names[i]}>
                <th scope="row" className="sticky left-0 z-10 bg-white px-1.5 py-0.5 text-left font-normal text-on-surface whitespace-nowrap">{names[i]}</th>
                {row.map((v, j) => {
                  const share = v / total;
                  const bg = v === 0 ? 'transparent' : i === j ? `rgba(21,128,61,${0.15 + 0.75 * share})` : `rgba(185,28,28,${0.2 + 0.6 * share})`;
                  return (
                    <td key={j} title={`True ${names[i]}, predicted ${names[j]}: ${v}`}
                      className={`w-7 h-6 text-center border border-hairline/60 ${v === 0 ? 'text-outline/40' : i === j && share > 0.5 ? 'text-white' : 'text-on-surface'}`}
                      style={{ background: bg }}>{v}</td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const ClassifierEvaluation: React.FC<{ card: ModelCard }> = ({ card }) => {
  const names = Object.keys(card.variants ?? {});
  const [variant, setVariant] = useState(names[0]);
  const v: ClassifierVariant | undefined = card.variants?.[variant];
  const nameOf = Object.fromEntries((card.classes ?? []).map((c) => [c.label, c.name]));
  if (!v) return null;
  const rows = [...v.per_class].sort((a, b) => a.f1 - b.f1);
  return (
    <Section title="Evaluation on the held-out test set">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-body-sm text-on-surface-variant">Inputs: {v.features.join(', ')}</span>
        {names.length > 1 && (
          <Segmented ariaLabel="Model variant" value={variant} onChange={setVariant}
            options={names.map((n) => ({ value: n, label: n === 'full' ? 'Full (soil test)' : n === 'climate' ? 'Climate + pH' : n }))} />
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Tile label="Accuracy" value={pct(v.accuracy)} hint={METRIC_HELP.accuracy} />
        <Tile label="Precision" value={pct(v.precision_macro)} hint={METRIC_HELP.precision} />
        <Tile label="Recall" value={pct(v.recall_macro)} hint={METRIC_HELP.recall} />
        <Tile label="F1 score" value={pct(v.f1_macro)} hint={METRIC_HELP.f1} />
      </div>
      <p className="text-body-sm text-on-surface-variant">
        Weighted averages: precision {pct(v.precision_weighted)}, recall {pct(v.recall_weighted)}, F1 {pct(v.f1_score)} (equal to macro here because every crop has the same number of test rows).
        {typeof v.cv_accuracy_mean === 'number' && <> Cross-validation accuracy {pct(v.cv_accuracy_mean)} ± {pct(v.cv_accuracy_std ?? 0)} checks that the single split was not a lucky draw.</>}
      </p>

      <Eyebrow className="pt-2">Per-crop precision, recall and F1 (weakest first)</Eyebrow>
      <div className="overflow-auto rounded-lg border border-hairline max-h-[260px]">
        <table className="w-full text-body-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-[10px] font-label-sm uppercase tracking-wider text-on-surface-variant">
              <th className="text-left px-3 py-1.5">Crop</th><th className="text-right px-3">Precision</th><th className="text-right px-3">Recall</th><th className="text-right px-3">F1</th><th className="text-right px-3">Test rows</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-hairline">
                <td className="px-3 py-1">{nameOf[r.label] ?? r.label}</td>
                {[r.precision, r.recall, r.f1].map((x, i) => (
                  <td key={i} className={`text-right px-3 font-label-md tabular ${x < 0.9 ? 'text-[#B45309]' : 'text-on-surface'}`}>{pct(x)}</td>
                ))}
                <td className="text-right px-3 font-label-md tabular text-on-surface-variant">{r.support}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Eyebrow className="pt-2">Confusion matrix</Eyebrow>
      <p className="text-body-sm text-on-surface-variant">Each row is the true crop, each column the predicted crop. Green diagonal cells are correct predictions; red cells show which crops the model confuses.</p>
      <ConfusionMatrix matrix={v.confusion_matrix} names={v.per_class.map((r) => nameOf[r.label] ?? r.label)} />
    </Section>
  );
};

const RegressionEvaluation: React.FC<{ card: ModelCard }> = ({ card }) => {
  const r = card.regression!;
  return (
    <Section title="Evaluation on the held-out test set">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Tile label="MAE" value={`${fmtNum(r.mae_t_ha, 3)} t/ha`} hint="Mean absolute error: average size of a prediction miss." />
        <Tile label="RMSE" value={r.rmse_t_ha === null ? '–' : `${fmtNum(r.rmse_t_ha, 3)} t/ha`} hint="Root mean squared error: like MAE but punishes large misses more." />
        <Tile label="R²" value={fmtNum(r.r2, 2)} hint="1 is perfect; 0 equals predicting the average; below 0 is worse than the average." />
        <Tile label="Test rows" value={String(r.test_predictions.length)} hint="Rows held out from training." />
      </div>
      <Callout tone="neutral" icon="info">
        Precision, recall, F1 and a confusion matrix apply only to classification. This model predicts a number (t/ha), so it is evaluated with MAE, RMSE and R².
      </Callout>
      {r.test_predictions.length > 0 && (
        <table className="w-full text-body-sm">
          <thead>
            <tr className="text-[10px] font-label-sm uppercase tracking-wider text-on-surface-variant">
              <th className="text-left py-1">Year</th><th className="text-left">Crop</th><th className="text-right">Actual</th><th className="text-right">Predicted</th><th className="text-right">Error</th>
            </tr>
          </thead>
          <tbody>
            {r.test_predictions.map((p) => (
              <tr key={`${p.year}-${p.crop}`} className="border-t border-hairline">
                <td className="py-1 tabular">{p.year}</td><td>{p.crop}</td>
                <td className="text-right font-label-md tabular">{fmtNum(p.actual_t_ha, 2)} t/ha</td>
                <td className="text-right font-label-md tabular">{fmtNum(p.predicted_t_ha, 2)} t/ha</td>
                <td className="text-right font-label-md tabular">{fmtNum(p.predicted_t_ha - p.actual_t_ha, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
};

const CardBody: React.FC<{ card: ModelCard }> = ({ card }) => (
  <div className="space-y-5">
    <p className="text-body-md text-on-surface">{card.summary}</p>
    {!card.available && <Callout tone="caution" icon="warning">This model is not trained or its files are missing.</Callout>}
    <Section title="Why this approach"><Bullets items={card.why} /></Section>
    <Section title="How it works"><Bullets items={card.how} ordered /></Section>
    {(card.algorithm || card.hyperparameters) && (
      <p className="text-body-sm text-on-surface-variant">
        {card.algorithm}
        {card.hyperparameters && <> · {Object.entries(card.hyperparameters).map(([k, v]) => `${k} = ${v}`).join(', ')}</>}
        {card.trained_at && <> · trained {card.trained_at}</>}
      </p>
    )}
    {card.categories && (
      <Section title="Classes and categories">
        {Object.entries(card.categories).map(([k, items]) => (
          <div key={k}><Eyebrow className="mb-1">{k}</Eyebrow><Chips items={items} /></div>
        ))}
      </Section>
    )}
    {card.dataset && (
      <Section title="Dataset">
        <div className="text-body-sm space-y-1.5">
          <div className="font-semibold text-on-surface">{card.dataset.name}</div>
          {card.dataset.collection && <p><span className="font-semibold">Collection method:</span> {card.dataset.collection}</p>}
          {typeof card.dataset.rows === 'number' && (
            <p><span className="font-semibold">Size:</span> {card.dataset.rows.toLocaleString('en-IN')} rows
              {typeof card.dataset.train_rows === 'number' && <> ({card.dataset.train_rows.toLocaleString('en-IN')} train / {card.dataset.test_rows?.toLocaleString('en-IN')} test)</>}
              {card.dataset.year_min && <>, years {card.dataset.year_min}–{card.dataset.year_max}</>}
            </p>
          )}
          {card.dataset.split && <p><span className="font-semibold">Split:</span> {card.dataset.split}</p>}
          {card.dataset.quality && <p className="text-[#B45309]"><span className="font-semibold">Data quality:</span> {card.dataset.quality}</p>}
          {card.dataset.categories && <Bullets items={card.dataset.categories} />}
        </div>
        {card.classes && (
          <div>
            <Eyebrow className="mb-1">Classes ({card.classes.length}) · greyed = not in the rules engine</Eyebrow>
            <Chips items={card.classes.map((c) => c.name)} muted={(n) => !card.classes!.find((c) => c.name === n)?.in_rules} />
          </div>
        )}
        {!card.classes && card.dataset.classes && (
          <div><Eyebrow className="mb-1">Classes</Eyebrow><Chips items={card.dataset.classes} /></div>
        )}
      </Section>
    )}
    {card.variants && <ClassifierEvaluation card={card} />}
    {card.regression && <RegressionEvaluation card={card} />}
    {card.evaluation && <Section title="Evaluation"><Callout tone="neutral" icon="rule">{card.evaluation}</Callout></Section>}
    <Section title="Limitations"><Bullets items={card.limitations} /></Section>
    <div className="flex flex-wrap items-center gap-1.5 text-body-sm text-on-surface-variant">Used in: {card.used_in.map((u) => <Badge key={u} tone="neutral">{u}</Badge>)}</div>
  </div>
);

const InfoDialog: React.FC<{ id: string; onClose: () => void }> = ({ id, onClose }) => {
  const { card, error } = useModelCard(id, true);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-forest/35 backdrop-blur-[8px]" onClick={onClose} role="dialog" aria-modal="true" aria-label={card?.title ?? 'Model information'}>
      <div className="w-full min-w-0 max-w-4xl max-h-[88vh] flex flex-col bg-white rounded-xl border border-hairline shadow-[0_20px_48px_-8px_rgba(17,66,50,0.16)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 py-3 border-b border-hairline">
          <div className="min-w-0">
            <div className="text-title-md font-title-md text-forest">{card?.title ?? 'Model information'}</div>
            {card && <div className="text-label-sm font-label-sm text-on-surface-variant">{card.kind}</div>}
          </div>
          <button className="p-1.5 rounded-lg hover:bg-surface-container-low" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="overflow-auto min-w-0 p-4 sm:p-5">
          {error ? <Callout tone="critical" icon="error">{error}</Callout> : card ? <CardBody card={card} /> : <LoadingBlock label="Loading model information…" className="h-32" />}
        </div>
      </div>
    </div>,
    document.body,
  );
};

// "i" button that opens the model card for a model or rule engine (see src/services/model_cards.py).
export const InfoButton: React.FC<{ id: string; label: string; className?: string }> = ({ id, label, className = '' }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`About ${label}`} title={`About ${label}: method, data and metrics`}
        className={`inline-grid place-items-center w-7 h-7 shrink-0 rounded-full text-forest hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${className}`}>
        <Icon name="info" className="!text-[20px]" />
      </button>
      {open && <InfoDialog id={id} onClose={() => setOpen(false)} />}
    </>
  );
};

export default InfoButton;
