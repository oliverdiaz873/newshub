import type { ArticleContent } from '../newsModels';

export const opinionSaludContent: ArticleContent = {
  id: 'opinion-salud',
  title: 'La importancia de la salud preventiva',
  href: '/opiniones/opinion-salud',
  date: '2 de octubre de 2025',
  datetime: '2025-10-02',
  category: 'Opinion',
  summary: 'Invertir en prevencion es fundamental para mantener una poblacion saludable y reducir gastos sanitarios.',
  imageUrl: '/images/news/salud/antibioticos.avif',
  alt: 'Ilustración de cuidados médicos preventivos y chequeos de salud',
  breadcrumb: {
    home: 'Inicio',
    category: 'Opinion',
    current: 'Opinion salud',
  },
  content: [
    'El sistema sanitario global ha estado historicamente enfocado en la cura, reaccionando ante la enfermedad una vez que esta se manifiesta. Sin embargo, la verdadera revolucion medica del siglo XXI reside en la prevencion. Invertir en salud preventiva no es solo una cuestion de bienestar individual, es una estrategia de supervivencia para los sistemas publicos de salud.',
    'Cada euro invertido en campanas de vacunacion, deteccion temprana y promocion de habitos saludables ahorra miles de euros en tratamientos cronicos y hospitalizaciones complejas. La tecnologia hoy nos permite monitorear nuestra salud en tiempo real, ofreciendonos una oportunidad unica para intervenir antes de que el dano sea irreversible.',
    'La salud preventiva requiere un cambio de paradigma cultural: pasar de ser pacientes pasivos a ser gestores activos de nuestro propio bienestar. Solo a traves de la educacion y el acceso equitativo a servicios preventivos podremos garantizar una longevidad que sea verdaderamente saludable y digna para todos.',
  ],
  relatedNews: [],
};
