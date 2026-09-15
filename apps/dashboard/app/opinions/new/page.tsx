'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { EMPTY_OPINION_FORM, OpinionEditor } from '@/components/OpinionEditor';
import { useAuth } from '@/shared/api/auth';

export default function NewOpinionPage() {
  const t = useTranslations('opinions');
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
          trail={[{ href: '/', label: 'Home' }, { href: '/opinions', label: t('title') }, { label: t('new') }]}
        />
        <h1>{t('new')}</h1>
        <OpinionEditor
          mode="create"
          initial={EMPTY_OPINION_FORM}
          onSaved={(id) => router.push(`/opinions/${id}`)}
          onDeleted={() => router.push('/opinions')}
        />
      </main>
    </RequireAuth>
  );
}
