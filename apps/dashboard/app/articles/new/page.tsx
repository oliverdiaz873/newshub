'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { ArticleEditor, EMPTY_FORM } from '@/components/ArticleEditor';
import { useAuth } from '@/shared/api/auth';

export default function NewArticlePage() {
  const t = useTranslations('articles');
  const tc = useTranslations('common');
  const router = useRouter();
  const { user, ready } = useAuth();
  if (ready && user?.role === 'reviewer') {
    return (
      <RequireAuth>
        <main>
          <p role="alert">{tc('insufficientRole')}</p>
        </main>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <main>
        <Breadcrumbs
          trail={[{ href: '/', label: 'Home' }, { href: '/articles', label: t('title') }, { label: t('new') }]}
        />
        <h1>{t('new')}</h1>
        <ArticleEditor
          mode="create"
          initial={EMPTY_FORM}
          onSaved={(id) => router.push(`/articles/${id}`)}
          onDeleted={() => router.push('/articles')}
        />
      </main>
    </RequireAuth>
  );
}
