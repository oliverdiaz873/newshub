import type { ArticleContent } from '../newsModels';

export const opinionPoliticaContent: ArticleContent = {
  id: 'opinion-politica',
  title: 'La democracia y el reto de la transparencia',
  href: '/opiniones/opinion-politica',
  date: '4 de octubre de 2025',
  datetime: '2025-10-04',
  category: 'Opinion',
  summary: 'La confianza ciudadana depende cada vez mas de instituciones abiertas y responsables.',
  imageUrl: '/images/news/politica/congreso.avif',
  alt: 'Ilustración de instituciones democráticas y conceptos de transparencia',
  breadcrumb: {
    home: 'Inicio',
    category: 'Opinion',
    current: 'Opinion politica',
  },
  content: [
    'En el complejo escenario politico actual, la transparencia se ha consolidado no solo como un requisito etico, sino como el pilar fundamental que sostiene la legitimidad de las democracias modernas. La confianza de los ciudadanos en sus representantes e instituciones se ha visto erosionada por anos de opacidad y falta de rendicion de cuentas, creando una brecha que solo puede cerrarse con luz y honestidad.',
    'La verdadera transparencia va mas alla de publicar documentos en portales web; implica una voluntad real de exponer los procesos de toma de decisiones al escrutinio publico. Cuando los gobiernos ocultan las razones detras de sus politicas o los detalles de su gasto, fomentan un clima de sospecha que alimenta el populismo y la desafeccion politica.',
    'Es imperativo que nuestras instituciones adopten tecnologias abiertas y procesos de auditoria ciudadana. Una democracia que teme a la transparencia es una democracia que duda de su propio valor. El reto es enorme, pero el costo de la opacidad es, sencillamente, inasumible para una sociedad que aspira a ser verdaderamente libre.',
  ],
  relatedNews: [],
};
