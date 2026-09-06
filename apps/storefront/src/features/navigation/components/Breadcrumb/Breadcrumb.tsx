import { Link } from '@/i18n/routing';

interface BreadcrumbProps {
  home: string;
  category: string;
  categoryPath: string;
  current: string;
}

/**
 * Breadcrumb
 * 
 * Este componente es el encargado de la navegación jerárquica (miga de pan).
 * Proporciona un camino claro desde el Inicio hasta la noticia actual,
 * mejorando la usabilidad y el SEO de la página.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {string} props.home - Texto para el enlace de inicio (ej. "Inicio").
 * @param {string} props.category - Nombre visual de la categoría (ej. "Política").
 * @param {string} props.categoryPath - Ruta URL a la página de la categoría.
 * @param {string} props.current - Título de la noticia actual que se muestra sin enlace.
 * @returns {JSX.Element} El componente de navegación por miga de pan.
 */
export const Breadcrumb = ({ home, category, categoryPath, current }: BreadcrumbProps) => {
  return (
    <nav aria-label="breadcrumb" className="w-full bg-white dark:bg-[#242424] border-b border-gray-200 dark:border-[#404040]">
      <div className="mx-auto max-w-[1320px] px-4 md:px-[0.1rem] lg:px-4 py-3">
        <ol className="flex flex-nowrap list-none p-0 m-0 text-sm font-sans overflow-hidden min-w-0">
          <li className="flex items-center flex-shrink-0">
            <Link 
              href="/" 
              className="text-gray-600 dark:text-[var(--color-text-primary)] hover:text-[#ff2929] transition-colors duration-200 font-medium"
            >
              {home}
            </Link>
            <span className="mx-2 text-xs text-gray-400 select-none">/</span>
          </li>
          <li className="flex items-center flex-shrink-0">
            <Link 
              href={categoryPath} 
              className="text-gray-600 dark:text-[var(--color-text-primary)] hover:text-[#ff2929] transition-colors duration-200 font-medium"
            >
              {category}
            </Link>
            <span className="mx-2 text-xs text-gray-400 select-none">/</span>
          </li>
          <li className="text-gray-500 dark:text-[#adb5bd] truncate min-w-0" aria-current="page">
            {current}
          </li>
        </ol>
      </div>
    </nav>
  );
};
