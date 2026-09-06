import type { ArticleContent } from '../newsModels';

export const opinionEconomiaContent: ArticleContent = {
  id: 'opinion-economia',
  title: 'Hacia donde va la economia global?',
  href: '/opiniones/opinion-economia',
  date: '3 de octubre de 2025',
  datetime: '2025-10-03',
  category: 'Opinion',
  summary: 'Analizamos los factores que marcaran el rumbo economico en los proximos anos.',
  imageUrl: '/images/opiniones/opinion-economia.jpg',
  alt: 'Representación visual de tendencias económicas globales y tecnología de IA',
  breadcrumb: {
    home: 'Inicio',
    category: 'Opinion',
    current: 'Opinion economica',
  },
  content: [
    'Nos encontramos en un punto de inflexion sin precedentes en la historia economica contemporanea. La globalizacion, tal como la conociamos, esta siendo redefinida por tensiones geopoliticas, la transicion energetica y la irrupcion masiva de la inteligencia artificial. Estos factores no solo estan cambiando el que producimos, sino el como y donde lo hacemos.',
    'La inflacion, aunque parece estar bajo control en algunas regiones, ha dejado una huella profunda en la estructura de costes de las empresas y en el presupuesto de las familias. El gran reto de los bancos centrales sera navegar este nuevo entorno sin sofocar el crecimiento necesario para financiar la transicion hacia una economia verde.',
    'A largo plazo, la sostenibilidad sera el motor principal del valor economico. Aquellos paises y empresas que no logren adaptar sus modelos de negocio a los limites del planeta se veran marginados. La economia global del futuro no sera solo digital, sera fundamentalmente regenerativa o no sera.',
  ],
  relatedNews: [],
};
