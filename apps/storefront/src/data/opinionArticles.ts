import type { OpinionArticle } from './newsModels';

/**
 * Listado centralizado de artículos de opinión.
 * Estos datos alimentan el OpinionSidebar en la Home y otras secciones.
 */
export const opinionArticles: OpinionArticle[] = [
  {
    id: 'opinion-politica',
    title: 'La democracia y el resto de la transparencia',
    href: '/opiniones/opinion-politica',
    category: 'Opinión',
    slug: 'opinion-politica',
    summary:
      'La confianza ciudadana depende cada vez más de instituciones abiertas y responsables.',
    imageUrl: '/images/news/politica/congreso.avif',
    alt: 'La democracia y el reto de la transparencia',
    date: '4 de octubre de 2025',
    datetime: '2025-10-04',
  },
  {
    id: 'opinion-economia',
    title: 'Hacia dónde va la economía global?',
    href: '/opiniones/opinion-economia',
    category: 'Opinión',
    slug: 'opinion-economia',
    summary:
      'Analizamos los factores que marcarán el rumbo económico en los próximos años.',
    imageUrl: '/images/opiniones/opinion-economia.jpg',
    alt: 'Hacia dónde va la economía global?',
    date: '3 de octubre de 2025',
    datetime: '2025-10-03',
  },
  {
    id: 'opinion-salud',
    title: 'La importancia de la salud preventiva',
    href: '/opiniones/opinion-salud',
    category: 'Opinión',
    slug: 'opinion-salud',
    summary:
      'Invertir en prevención es fundamental para mantener una población saludable y reducir gastos sanitarios.',
    imageUrl: '/images/news/salud/antibioticos.avif',
    alt: 'La importancia de la salud preventiva',
    date: '2 de octubre de 2025',
    datetime: '2025-10-02',
  },
];
