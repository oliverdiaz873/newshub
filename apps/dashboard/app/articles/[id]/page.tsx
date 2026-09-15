'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { RequireAuth } from '@/components/RequireAuth';
import { ErrorState, Skeleton } from '@/components/States';
import { ArticleEditor } from '@/components/ArticleEditor';
import type { ArticleFormValue } from '@/lib/validate-article';

interface EditorialRead {
  id: string;
  status: string;
  scheduledAt: string | null;
  firstPublishedAt?: string | null;
  updatedAt?: string | null;
  categoryId: string;
  authorId: string | null;
  coverMediaId: string | null;
  isBreaking: boolean;
  isFeatured: boolean;
  translations: Array<{ locale: string; slug: string; title: string; summary: string; content: string[] }>;
}

function toForm(row: EditorialRead): ArticleFormValue {
  const es = row.translations.find((tr) => tr.locale === 'es');
  const en = row.translations.find((tr) => tr.locale === 'en');
  return {
    categoryId: row.categoryId,
    authorId: row.authorId ?? '',
    coverMediaId: row.coverMediaId ?? '',
    isBreaking: row.isBreaking ?? false,
    isFeatured: row.isFeatured ?? false,
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
  const t = useTranslations('articles');
  const tc = useTranslations('common');
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<ArticleFormValue | null>(null);
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
      const res = await apiFetch(`/editorial/articles/${id}`);
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
        trail={[{ href: '/', label: 'Home' }, { href: '/articles', label: t('title') }, { label: title }]}
      />
      <h1>{t('edit')}</h1>
        <ArticleEditor
          key={status}
          mode="edit"
          articleId={id}
          initial={form}
          status={status}
          scheduledAt={scheduledAt}
          firstPublishedAt={firstPublishedAt}
          updatedAt={updatedAt}
        onSaved={() => {
          void load();
        }}
        onDeleted={() => router.push('/articles')}
      />
    </main>
  );
}

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <EditBody id={id} />
    </RequireAuth>
  );
}
