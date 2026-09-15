'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { useToast } from '@/shared/components/Toasts';
import { listScheduledArticles } from '@/features/articles/services/articleService';
import { listScheduledOpinions } from '@/features/opinions/services/opinionService';

export interface ScheduledItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  updatedAt?: string;
}

export type ScheduledKind = 'article' | 'opinion';

export interface ScheduledConfirm {
  kind: ScheduledKind;
  action: 'cancel' | 'publish';
  item: ScheduledItem;
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(handle);
  }, [intervalMs]);
  return now;
}

export function useScheduled() {
  const t = useTranslations('scheduling');
  const ta = useTranslations('articles');
  const tc = useTranslations('common');
  const { apiFetch } = useAuth();
  const { notify } = useToast();
  const now = useNow(30_000);

  const [articles, setArticles] = useState<ScheduledItem[]>([]);
  const [opinions, setOpinions] = useState<ScheduledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ScheduledConfirm | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [arts, ops] = await Promise.all([
        listScheduledArticles(apiFetch),
        listScheduledOpinions(apiFetch),
      ]);
      if (arts.status === 401 || ops.status === 401) {
        setError(tc('sessionRequired'));
        return;
      }
      if (!arts.ok || !ops.ok) throw new Error(`HTTP ${arts.status}/${ops.status}`);
      setArticles(((await arts.json()) as { data: ScheduledItem[] }).data);
      setOpinions(((await ops.json()) as { data: ScheduledItem[] }).data);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('networkError'));
    } finally {
      setLoading(false);
    }
  }, [apiFetch, tc]);

  useEffect(() => {
    // Initial scheduled fetch (single parallel load by design).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function cancel(item: ScheduledItem, kind: ScheduledKind) {
    const base = kind === 'opinion' ? '/opinions' : '/articles';
    setBusy(true);
    try {
      const res = await apiFetch(`${base}/${item.id}/schedule`, { method: 'DELETE' });
      if (!res.ok) {
        notify(`HTTP ${res.status}`, 'err');
        return;
      }
      notify(t('clearedOk'), 'ok');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function publishNow(item: ScheduledItem, kind: ScheduledKind) {
    const base = kind === 'opinion' ? '/opinions' : '/articles';
    setBusy(true);
    try {
      const res = await apiFetch(`${base}/${item.id}/publish`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string } | null;
        notify(body?.code === 'invalid_transition' ? ta('invalidTransition') : `HTTP ${res.status}`, 'err');
        return;
      }
      notify(ta('publishedOk'), 'ok');
      await load();
    } finally {
      setBusy(false);
    }
  }

  return {
    articles,
    opinions,
    loading,
    error,
    busy,
    confirm,
    setConfirm,
    load,
    cancel,
    publishNow,
    now,
  };
}
