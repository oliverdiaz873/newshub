'use client';

import React from 'react';
import { Link } from '@/i18n/routing';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText?: string;
  buttonLink?: string;
}

/**
 * EmptyState
 * 
 * Componente genérico para mostrar estados vacíos (sin resultados, carrito vacío, etc.)
 */
export const EmptyState = ({ 
  icon, 
  title, 
  description, 
  buttonText, 
  buttonLink = "/" 
}: EmptyStateProps) => {
  return (
    <div className="flex w-full flex-col items-center justify-center py-16 px-4 text-center mx-auto">
      <div className="mb-6 inline-flex h-32 w-32 items-center justify-center rounded-full bg-gray-50 p-6 dark:bg-gray-800/50">
        {icon}
      </div>

      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
        {description}
      </p>
      {buttonText && (
        <Link 
          href={buttonLink} 
          className="inline-block bg-[#dc3545] text-white px-8 py-3 rounded-md font-bold hover:bg-[#c82333] transition-all transform hover:-translate-y-px no-underline"
        >
          {buttonText}
        </Link>
      )}
    </div>
  );
};
