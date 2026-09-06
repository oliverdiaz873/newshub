import { getTranslations } from 'next-intl/server'
import { LegalLayout } from '@/shared/layouts';

export async function Terms() {
  const t = await getTranslations('legal');
  
  const sections = t.raw('terms.sections') as Array<{
    id: string
    title: string
    content: string
    email?: string
  }>

  return (
    <>
      <LegalLayout title={t('terms.title')} date={t('terms.date')}>
      <p>{t('terms.intro')}</p>
      {sections.map(section => (
        <div key={section.id}>
          <h2>{section.title}</h2>
          <p>
            {section.content}
            {section.email && <strong>{section.email}</strong>}
          </p>
        </div>
      ))}
    </LegalLayout>
    </>
  )
}
