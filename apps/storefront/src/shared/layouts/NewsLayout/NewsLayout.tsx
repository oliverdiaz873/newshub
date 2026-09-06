'use client';

import React from 'react';

interface NewsLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}

/**
 * NewsLayout
 * 
 * Layout estructural compartido para páginas de noticias.
 * Implementa una cuadrícula de dos columnas:
 * - Principal: Ocupa 9/12 si hay sidebar, o 12/12 (full width) si no lo hay.
 * - Lateral (3/12): Sidebar con noticias relacionadas o recientes.
 * 
 * Se ajusta automáticamente a 1320px de ancho máximo.
 */
export const NewsLayout = ({ children, sidebar, className = '' }: NewsLayoutProps) => {
  return (
    <main className={`min-h-[calc(100vh-200px)] px-4 py-8 lg:px-4 ${className}`}>
      <div className="mx-auto max-w-[1320px]">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Columna Principal */}
          <div className={sidebar ? "lg:col-span-9" : "lg:col-span-12"}>
            {children}
          </div>

          {/* Columna Lateral (Opcional) */}
          {sidebar && (
            <aside className="lg:col-span-3">
              {sidebar}
            </aside>
          )}
        </div>
      </div>
    </main>
  );
};
