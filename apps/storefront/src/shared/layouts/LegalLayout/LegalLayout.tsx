import React from 'react'
import { getTranslations } from 'next-intl/server'

interface LegalLayoutProps {
  title: string
  date: string
  children: React.ReactNode
}

/**
 * LegalLayout
 * 
 * Layout estructural para páginas legales (Privacidad, Términos).
 * Centra el contenido y aplica estilos específicos de lectura legal.
 */
export async function LegalLayout({ title, date, children }: LegalLayoutProps) {
  const t = await getTranslations('legal');

  return (
    <main className="legal-main">
      <div className="container">
        <div className="legal-content">
          <h1 className="legal-title">{title}</h1>
          <p className="legal-updated">
            <small>{t('lastUpdated')} {date}</small>
          </p>
          {children}
        </div>
      </div>
    </main>
  )
}
