import { useEffect, useState } from 'react';
import { apiGet } from './api';
import type { ModelCard } from './types';

// Model cards change only when models are retrained, so one fetch per page load is enough.
let cache: Promise<Record<string, ModelCard>> | null = null;

const loadCards = () => {
  cache ??= apiGet<{ models: Record<string, ModelCard> }>('/api/models').then((r) => r.models).catch((e) => {
    cache = null;
    throw e;
  });
  return cache;
};

export function useModelCard(id: string, enabled: boolean) {
  const [state, setState] = useState<{ card: ModelCard | null; error: string | null }>({ card: null, error: null });
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    loadCards()
      .then((cards) => { if (live) setState({ card: cards[id] ?? null, error: cards[id] ? null : `No information for ${id}.` }); })
      .catch((e) => { if (live) setState({ card: null, error: (e as Error).message }); });
    return () => { live = false; };
  }, [id, enabled]);
  return state;
}
