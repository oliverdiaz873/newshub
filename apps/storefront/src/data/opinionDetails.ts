import type { ArticleContent } from './newsModels';

import { opinionPoliticaContent } from './opinionContent/opinion-politica';
import { opinionEconomiaContent } from './opinionContent/opinion-economia';
import { opinionSaludContent } from './opinionContent/opinion-salud';

/**
 * Diccionario de contenidos detallados para artículos de opinión.
 * Se utiliza para renderizar la página completa de una columna de opinión.
 */
export const opinionDetails: Record<string, ArticleContent> = {
  'opinion-politica': opinionPoliticaContent,
  'opinion-economia': opinionEconomiaContent,
  'opinion-salud': opinionSaludContent,
};
