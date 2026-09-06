import type { NewsArticle } from './newsModels';

export const breakingNews = {
  href: '/news/justicia/detienen-exfuncionario-fraude-financiero-millonario',
  text: 'Detienen a exfuncionario acusado de fraude financiero millonario',
};

export const featuredPrimary: NewsArticle = {
  id: 'economia-inflacion',
  title: 'Incremento de la inflación impacta a los mercados',
  href: '/news/economia/incremento-inflacion-impacta-mercados',
  category: 'Economía',
  date: '4 de octubre de 2025',
  datetime: '2025-10-04',
  summary:
    'El aumento sostenido de la inflación genera incertidumbre en los mercados financieros y afecta el poder adquisitivo de los ciudadanos. Los precios de productos básicos y servicios esenciales continúan incrementándose, obligando a empresas y familias a ajustar presupuestos. Analistas advierten que, de no implementarse políticas económicas efectivas, esta tendencia podría persistir, impactando la inversión, el empleo y la estabilidad económica del país a mediano plazo.',
  imageUrl: '/images/news/economia/inflacion.jpg',
  alt: 'Incremento de la inflación impacta a los mercados',
  isBreaking: true,
};

export const featuredSecondary: [NewsArticle, NewsArticle] = [
  {
    id: 'deporte-equipo-local',
    title: 'Gran victoria del equipo local',
    href: '/news/deporte/gran-victoria-equipo-local-futbol',
    category: 'Deporte',
    date: '4 de octubre de 2025',
    datetime: '2025-10-04',
    summary:
      'El equipo local consiguió una importante victoria que lo acerca a la clasificación tras un intenso partido. Los jugadores mostraron un rendimiento excepcional, con goles decisivos y una defensa sólida que mantuvo al rival en constante presión durante todo el encuentro.',
    imageUrl: '/images/news/deporte/futbol.jpg',
    alt: 'Gran victoria del equipo local',
  },
  {
    id: 'internacional-guerra',
    title: 'La guerra de Ucrania llega a su fin',
    href: '/news/internacional/guerra-ucrania-llega-fin',
    category: 'Internacional',
    date: '4 de octubre de 2025',
    datetime: '2025-10-04',
    summary:
      'Tras meses de negociaciones diplomáticas, el conflicto llega a su fin generando expectativas de estabilidad y reconstrucción en la región.',
    imageUrl: '/images/news/internacional/guerra.jpg',
    alt: 'La guerra de Ucrania llega a su fin',
  },
];

export const featuredGrid: NewsArticle[] = [
  {
    id: 'politica-protestas',
    title: 'Protestas por corrupción',
    href: '/news/politica/protestas-corrupcion',
    category: 'Política',
    date: '4 de octubre de 2025',
    datetime: '2025-10-04',
    summary:
      'Miles de ciudadanos se manifestaron en distintas ciudades exigiendo transparencia y sanciones contra los responsables.',
    imageUrl: '/images/news/politica/protestas.jpg',
    alt: 'Protestas por corrupción en el país',
  },
  {
    id: 'salud-contaminacion',
    title: 'Descubren un nuevo virus que alerta a científicos',
    href: '/news/salud/contaminacion-aire-aumenta-riesgo-enfermedades-respiratorias',
    category: 'Salud',
    date: '9 de octubre de 2025',
    datetime: '2025-10-09',
    summary:
      'Investigadores internacionales analizan un nuevo virus que podría representar un riesgo para la salud pública global.',
    imageUrl: '/images/news/salud/virus.jpg',
    alt: 'Descubren un nuevo virus que alerta a científicos',
    isBreaking: true,
  },
  {
    id: 'justicia-homicidio',
    title: 'Investigan homicidio en el centro de la ciudad',
    href: '/news/justicia/investigan-homicidio-centro-ciudad',
    category: 'Justicia',
    date: '11 de octubre de 2025',
    datetime: '2025-10-11',
    summary:
      'Las autoridades iniciaron una investigación para esclarecer las circunstancias del crimen ocurrido en una zona concurrida.',
    imageUrl: '/images/news/justicia/homicidio.jpg',
    alt: 'Investigan homicidio en el centro de la ciudad',
  },
  {
    id: 'clima-huracan',
    title: 'Huracán se fortalece en el Atlántico y genera alertas en la costa este de EE.UU.',
    href: '/news/clima/huracan-se-forma-atlantico-amenaza-costa-este',
    category: 'Clima',
    date: '11 de octubre de 2025',
    datetime: '2025-10-11',
    summary:
      'El fenómeno meteorológico continúa intensificándose y obliga a emitir alertas preventivas en varias zonas costeras.',
    imageUrl: '/images/news/clima/ciclon.jpg',
    alt: 'Huracán se fortalece en el Atlántico y genera alertas en la costa este de EE.UU.',
    isBreaking: true,
  },
  {
    id: 'justicia-fraude',
    title: 'Detienen a exfuncionario acusado de fraude financiero millonario',
    href: '/news/justicia/detienen-exfuncionario-fraude-financiero-millonario',
    category: 'Justicia',
    date: '11 de octubre de 2025',
    datetime: '2025-10-11',
    summary:
      'El exfuncionario fue arrestado tras ser vinculado a un esquema de fraude que habría causado pérdidas millonarias al Estado.',
    imageUrl: '/images/news/justicia/arrested.jpg',
    alt: 'Detienen a exfuncionario acusado de fraude financiero millonario',
    isBreaking: true,
  },
  {
    id: 'economia-bolsa',
    title: 'La bolsa de valores cierra en alza tras jornada de optimismo inversor',
    href: '/news/economia/bolsa-valores-cierra-alza-optimismo-inversor',
    category: 'Economía',
    date: '4 de octubre de 2025',
    datetime: '2025-10-04',
    summary:
      'Los mercados cerraron la jornada con ganancias impulsadas por el optimismo de los inversores y buenos indicadores económicos.',
    imageUrl: '/images/news/economia/bolsa-de-valores.avif',
    alt: 'La bolsa de valores cierra en alza tras jornada de optimismo inversor',
  },
];

export const latestNews: NewsArticle[] = [
  {
    id: 'clima-tormenta',
    title: 'Tormenta tropical se aproxima al Caribe y alerta a varios países',
    href: '/news/clima/tormenta-tropical-aproxima-caribe-alerta-paises',
    category: 'Clima',
    date: '11 de octubre de 2025',
    datetime: '2025-10-11',
    summary:
      'Una tormenta tropical se aproxima al Caribe, generando alerta en varios países de la región. Las autoridades emiten avisos de lluvias intensas y vientos fuertes.',
    imageUrl: '/images/news/clima/tormenta.jpg',
    alt: 'Tormenta tropical se aproxima al Caribe',
  },
  {
    id: 'deporte-nba',
    title: 'Los Lakers se imponen a los Celtics en un vibrante partido de la NBA',
    href: '/news/deporte/lakers-vencen-celtics-nba',
    category: 'Deporte',
    date: '7 de octubre de 2025',
    datetime: '2025-10-07',
    summary:
      'En un emocionante enfrentamiento, los Lakers lograron imponerse a los Celtics con marcador de 112-107. LeBron James lideró con 28 puntos y 9 asistencias.',
    imageUrl: '/images/news/deporte/nba.jpg',
    alt: 'Los Lakers vencen a los Celtics',
  },
  {
    id: 'politica-encuesta',
    title: 'Encuestas revelan incremento en la popularidad del presidente',
    href: '/news/politica/encuestas-revelan-incremento-popularidad-presidente',
    category: 'Política',
    date: '4 de octubre de 2025',
    datetime: '2025-10-04',
    summary:
      'Las últimas encuestas muestran un aumento significativo en la popularidad del presidente, reflejando respaldo creciente hacia sus políticas y gestión gubernamental.',
    imageUrl: '/images/news/politica/presidente.avif',
    alt: 'Encuesta de popularidad presidencial',
  },
  {
    id: 'deporte-atletas',
    title: 'Atletas internacionales brillan en ceremonia inaugural de los Juegos Olímpicos',
    href: '/news/deporte/atletas-rompen-records-mundiales',
    category: 'Deporte',
    date: '4 de octubre de 2025',
    datetime: '2025-10-04',
    summary:
      'La ceremonia inaugural reunió a atletas de más de 200 países en un espectáculo que combinó tradición, arte y emoción deportiva con el encendido del pebetero.',
    imageUrl: '/images/news/deporte/atletismo.jpg',
    alt: 'Ceremonia inaugural Juegos Olímpicos',
  },
  {
    id: 'salud-antibioticos',
    title: 'Aumenta la preocupación por la resistencia a los antibióticos',
    href: '/news/salud/aumenta-preocupacion-resistencia-antibioticos-mundial',
    category: 'Salud',
    date: '9 de octubre de 2025',
    datetime: '2025-10-09',
    summary:
      'La resistencia a los antibióticos continúa siendo una amenaza creciente para la salud pública. Expertos alertan sobre el uso excesivo e inadecuado de estos medicamentos.',
    imageUrl: '/images/news/salud/antibioticos.avif',
    alt: 'Resistencia a antibióticos',
  },
  {
    id: 'economia-dolar',
    title: 'El dólar se fortalece ante incertidumbre económica global',
    href: '/news/economia/dolar-alcanza-maximo-ano-frente-monedas',
    category: 'Economía',
    date: '4 de octubre de 2025',
    datetime: '2025-10-04',
    summary:
      'El dólar estadounidense se fortaleció frente a las principales divisas, impulsado por la incertidumbre económica global y la búsqueda de refugio por parte de los inversores.',
    imageUrl: '/images/news/economia/dolar.avif',
    alt: 'El dólar se fortalece',
  },
];

