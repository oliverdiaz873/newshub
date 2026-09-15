'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { ErrorState, Skeleton } from '@/shared/components/States';
import { OpinionEditor } from '@/components/OpinionEditor';
import type { OpinionFormValue } from '@/lib/validate-opinion';

interface EditorialRead {
  id: string;
  status: string;
  scheduledAt: string | null;
  firstPublishedAt?: string | null;
  updatedAt?: string | null;
  authorId: string;
  coverMediaId: string | null;
  translations: Array<{ locale: string; slug: string; title: string; summary: string; content: string[] }>;
}

function toForm(row: EditorialRead): OpinionFormValue {
  const es = row.translations.find((tr) => tr.locale === 'es');
  const en = row.translations.find((tr) => tr.locale === 'en');
  return {
    authorId: row.authorId,
    coverMediaId: row.coverMediaId ?? '',
    es: {
      slug: es?.slug ?? '',
      title: es?.title ?? '',
      summary: es?.summary ?? '',
      content: (es?.content ?? []).join('\n\n'),
    },
    en: {
      slug: en?.slug ?? '',
      title: en?.title ?? '',
      summary: en?.summary ?? '',
      content: (en?.content ?? []).join('\n\n'),
    },
  };
}

function EditBody({ id }: { id: string }) {
  const t = useTranslations('opinions');
  const tc = useTranslations('common');
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<OpinionFormValue | null>(null);
  const [status, setStatus] = useState('draft');
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [firstPublishedAt, setFirstPublishedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/editorial/opinions/${id}`);
      if (res.status === 401) {
        setError(tc('sessionRequired'));
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const row = (await res.json()) as EditorialRead;
      setForm(toForm(row));
      setStatus(row.status);
      setScheduledAt(row.scheduledAt ?? null);
      setFirstPublishedAt(row.firstPublishedAt ?? null);
      setUpdatedAt(row.updatedAt ?? null);
      setTitle(row.translations.find((tr) => tr.locale === 'es')?.title ?? id);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('networkError'));
    } finally {
      setLoading(false);
    }
  }, [apiFetch, id, tc]);

  useEffect(() => {
    // Single editorial read per mount/id.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (loading) {
    return (
      <main>
        <Skeleton lines={8} />
      </main>
    );
  }

  if (error || !form) {
    return (
      <main>
        <ErrorState message={error ?? tc('networkError')} onRetry={() => void load()} />
      </main>
    );
  }

  return (
    <main>
      <Breadcrumbs
        trail={[{ href: '/', label: 'Home' }, { href: '/opinions', label: t('title') }, { label: title }]}
      />
      <h1>{t('edit')}</h1>
      <OpinionEditor
        key={status}
        mode="edit"
        opinionId={id}
        initial={form}
        status={status}
        scheduledAt={scheduledAt}
        firstPublishedAt={firstPublishedAt}
        updatedAt={updatedAt}
        onSaved={() => {
          void load();
        }}
        onDeleted={() => router.push('/opinions')}
      />
    </main>
  );
}

export default function EditOpinionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <EditBody id={id} />
    </RequireAuth>
  );
}
