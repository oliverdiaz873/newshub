import type { FullNewsArticle } from '../newsModels';

export const economiaArticles: FullNewsArticle[] = [
  {
    id: 'economia-bolsa',
    title: 'La bolsa de valores cierra en alza tras jornada de optimismo inversor',
    href: '/news/economia/bolsa-valores-cierra-alza-optimismo-inversor',
    category: 'Economía',
    date: '4 de octubre de 2025',
    datetime: '2025-10-04',
    summary: 'La bolsa de valores cerró en alza este jueves, impulsada por un renovado optimismo entre los inversores y la publicación de resultados financieros positivos de varias empresas líderes.',
    imageUrl: '/images/news/economia/bolsa-de-valores.avif',
    alt: 'Pantalla de la bolsa mostrando números positivos del S&P 500 y Nasdaq',
    content: [
      'El índice S&P 500 subió un 1,2%, mientras que el Dow Jones y el Nasdaq registraron incrementos del 1% y 1,5% respectivamente. Este comportamiento refleja la confianza de los inversores en la estabilidad económica y en las perspectivas de ganancias corporativas a corto plazo.',
      
      'Los analistas señalan que la combinación de estímulos monetarios, el avance en acuerdos comerciales y la reducción de incertidumbres políticas ha contribuido a la recuperación del mercado. Además, el sector tecnológico lideró las ganancias, con varias compañías superando las expectativas de los analistas.',
      
      'Por su parte, los inversores extranjeros también mostraron interés en los mercados estadounidenses, incrementando la demanda de acciones y fortaleciendo la tendencia alcista. Esta dinámica ha reforzado la percepción de que la economía se mantiene resiliente frente a desafíos globales.',
      
      'En conclusión, la jornada positiva en la bolsa refleja un entorno de confianza y expectativas favorables. No obstante, los expertos advierten que la volatilidad podría regresar si se presentan cambios inesperados en la política económica o en los indicadores financieros clave.'
    ],
    relatedNews: [
      {
        id: 'economia-inflacion',
        title: 'Inflación sigue en aumento y preocupa a expertos',
        href: '/news/economia/incremento-inflacion-impacta-mercados',
        category: 'Economía',
        date: '4 de octubre de 2025',
        datetime: '2025-10-04',
        summary: 'Los indicadores económicos muestran que la inflación continúa su tendencia alcista, afectando el poder adquisitivo.',
        imageUrl: '/images/news/economia/inflacion.jpg',
        alt: 'Inflación sigue en aumento y preocupa a expertos'
      },
      {
        id: 'economia-dolar',
        title: 'Dólar alcanza máximo del año frente a otras monedas',
        href: '/news/economia/dolar-alcanza-maximo-ano-frente-monedas',
        category: 'Economía',
        date: '3 de octubre de 2025',
        datetime: '2025-10-03',
        summary: 'La moneda estadounidense se fortalece significativamente ante la incertidumbre global y la política monetaria.',
        imageUrl: '/images/news/economia/dolar.avif',
        alt: 'Billetes de dólar estadounidense y gráficos de tipo de cambio global'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Economía',
      current: 'La bolsa de valores cierra en alza tras jornada de optimismo inversor'
    }
  },
  {
    id: 'economia-inflacion',
    title: 'Incremento de la inflación impacta a los mercados',
    href: '/news/economia/incremento-inflacion-impacta-mercados',
    category: 'Economía',
    date: '4 de octubre de 2025',
    datetime: '2025-10-04',
    summary:
      'El aumento sostenido de la inflación genera incertidumbre en los mercados financieros y afecta el poder adquisitivo de los ciudadanos. Los precios de productos básicos y servicios esenciales continúan incrementándose, obligando a empresas y familias a ajustar presupuestos. Analistas advierten que, de no implementarse políticas económicas efectivas, esta tendencia podría persistir, impactando la inversión, el empleo y la estabilidad económica del país a mediano plazo.',
    imageUrl: '/images/news/economia/inflacion.jpg',
    alt: 'Pantallas financieras mostrando gráficos de inflación y datos de mercado',
    content: [
      'Según los informes más recientes, la inflación anual en las principales economías ha superado las expectativas de los analistas, impulsada por el aumento en los costos de la energía, los alimentos y el transporte. En varios países europeos, los precios registraron su mayor alza en más de un año, mientras que en Estados Unidos la tasa inflacionaria se mantiene por encima del objetivo del 2% establecido por la Reserva Federal.',
      
      'Las bolsas internacionales reaccionaron con volatilidad. El índice S&P 500 cayó más de un 1%, mientras que el Euro Stoxx 50 y el Nikkei japonés registraron descensos similares. Los inversores temen que los bancos centrales puedan retrasar los recortes de tasas de interés o incluso aplicar nuevas medidas restrictivas para contener el alza de precios.',
      
      'El economista principal del Fondo Monetario Internacional, Jonathan Reeves, señaló que la persistencia de la inflación "refleja desequilibrios estructurales que van más allá del ciclo económico". También advirtió que "si las expectativas inflacionarias no se estabilizan pronto, los mercados podrían enfrentar un periodo prolongado de incertidumbre".',
      
      'En América Latina, los efectos también se hacen sentir. Países con economías dependientes de importaciones han visto cómo el costo de los bienes básicos se eleva, afectando directamente el poder adquisitivo de las familias. En algunos casos, los bancos centrales de la región han tenido que subir sus tasas para evitar una depreciación acelerada de sus monedas.',
      
      'Por su parte, los precios del petróleo y del gas natural se mantienen en niveles elevados, lo que añade presión a las cadenas de suministro y a los costos de producción. Las empresas manufactureras y de transporte reportan márgenes de ganancia más ajustados, mientras intentan trasladar parte de los aumentos al consumidor final.',
      
      'Los analistas coinciden en que, si bien la inflación podría moderarse en los próximos meses, los mercados seguirán expuestos a la incertidumbre. Factores como la inestabilidad geopolítica, los conflictos comerciales y la transición energética global seguirán influyendo en el comportamiento de los precios.',
      
      'En conclusión, el incremento de la inflación no solo está afectando a las economías domésticas, sino que también está redefiniendo la estrategia de los inversores y de los bancos centrales. La clave, según los expertos, será encontrar un equilibrio entre controlar los precios y evitar una desaceleración económica más profunda.'
    ],
    relatedNews: [
      {
        id: 'economia-bolsa',
        title: 'La bolsa de valores cierra en alza',
        href: '/news/economia/bolsa-valores-cierra-alza-optimismo-inversor',
        category: 'Economía',
        date: '4 de octubre de 2025',
        datetime: '2025-10-04',
        summary: 'Los principales índices bursátiles cierran con ganancias significativas impulsados por buenos resultados empresariales.',
        imageUrl: '/images/news/economia/bolsa-de-valores.avif',
        alt: 'La bolsa de valores cierra en alza'
      },
      {
        id: 'economia-dolar',
        title: 'Dólar alcanza máximo del año frente a otras monedas',
        href: '/news/economia/dolar-alcanza-maximo-ano-frente-monedas',
        category: 'Economía',
        date: '3 de octubre de 2025',
        datetime: '2025-10-03',
        summary: 'La moneda estadounidense se fortalece significativamente ante la incertidumbre global y la política monetaria.',
        imageUrl: '/images/news/economia/dolar.avif',
        alt: 'Billetes de dólar estadounidense y gráficos de tipo de cambio global'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Economía',
      current: 'Incremento de la inflación impacta a los mercados'
    }
  },
  {
    id: 'economia-dolar',
    title: 'Dólar alcanza máximo del año frente a otras monedas',
    href: '/news/economia/dolar-alcanza-maximo-ano-frente-monedas',
    category: 'Economía',
    date: '3 de octubre de 2025',
    datetime: '2025-10-03',
    summary: 'El dólar estadounidense ha alcanzado su máximo nivel del año frente a las principales divisas mundiales, impulsado por la incertidumbre global y las expectativas de política monetaria.',
    imageUrl: '/images/news/economia/dolar.avif',
    alt: 'Billetes de dólar estadounidense y gráficos de tipo de cambio global',
    content: [
      'El índice del dólar, que mide el rendimiento de la moneda estadounidense frente a una cesta de seis divisas importantes, ha subido un 2.3% en la última semana, posicionándose en su nivel más alto desde enero.',
      
      'Los analistas atribuyen este fortalecimiento a múltiples factores, incluyendo la persistente inflación que podría llevar a la Reserva Federal a mantener las tasas de interés altas por más tiempo de lo esperado.',
      
      'El euro ha sido una de las monedas más afectadas, cayendo por debajo de 1.05 dólares por primera vez en varios meses. La libra esterlina y el yen japonés también han registrado pérdidas significativas frente al billete verde.',
      
      'Los mercados emergentes están sintiendo particularmente el impacto, con varias monedas de América Latina y Asia alcanzando mínimos históricos frente al dólar, lo que aumenta la preocupación sobre la deuda externa y la inflación importada.',
      
      'Los expertos financieros advierten que esta tendencia podría continuar si los datos económicos de Estados Unidos siguen mostrando resiliencia, mientras que otras economías enfrentan desaceleraciones más pronunciadas.',
      
      'Las corporaciones multinacionales están ajustando sus proyecciones de ganancias ante la volatilidad cambiaria, mientras que los inversores buscan refugio en activos denominados en dólares.'
    ],
    relatedNews: [
      {
        id: 'economia-bolsa',
        title: 'La bolsa de valores cierra en alza',
        href: '/news/economia/bolsa-valores-cierra-alza-optimismo-inversor',
        category: 'Economía',
        date: '4 de octubre de 2025',
        datetime: '2025-10-04',
        summary: 'Los principales índices bursátiles cierran con ganancias significativas impulsados por buenos resultados empresariales.',
        imageUrl: '/images/news/economia/bolsa-de-valores.avif',
        alt: 'La bolsa de valores cierra en alza'
      },
      {
        id: 'economia-inflacion',
        title: 'Incremento de la inflación impacta a los mercados',
        href: '/news/economia/incremento-inflacion-impacta-mercados',
        category: 'Economía',
        date: '4 de octubre de 2025',
        datetime: '2025-10-04',
        summary: 'La inflación vuelve a ocupar el centro de atención con nuevos datos que muestran incremento sostenido de precios.',
        imageUrl: '/images/news/economia/inflacion.jpg',
        alt: 'Pantallas financieras mostrando gráficos de inflación y datos de mercado'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Economía',
      current: 'Dólar alcanza máximo del año frente a otras monedas'
    }
  },
  {
    id: 'economia-euro',
    title: 'El euro alcanza su valor más alto frente al dólar en seis meses',
    href: '/news/economia/euro-alcanza-valor-mas-alto-frente-dolar-seis-meses',
    category: 'Economía',
    date: '4 de octubre de 2025',
    datetime: '2025-10-04',
    summary: 'El euro alcanzó este jueves su valor más alto frente al dólar en los últimos seis meses, superando la barrera de los 1,12 dólares por primera vez desde abril. Este fortalecimiento de la moneda europea refleja un cambio en la dinámica económica global y un aumento de la confianza de los mercados en la estabilidad de la zona euro.',
    imageUrl: '/images/news/economia/euro.jpg',
    alt: 'Monedas y billetes de euro con gráfico de tipo de cambio frente al dólar',
    content: [
      'Los analistas atribuyen este repunte a una combinación de factores, entre ellos las señales de una posible pausa en las subidas de tasas de interés por parte de la Reserva Federal de Estados Unidos. La desaceleración económica en el país norteamericano ha reducido la demanda del dólar como activo refugio, lo que ha favorecido la recuperación del euro en los mercados internacionales.',
      
      'Al mismo tiempo, los datos recientes de la economía europea han mostrado una ligera mejora en la actividad industrial y en los índices de confianza empresarial. Países como Alemania, Francia y España han presentado indicadores más sólidos de lo esperado, lo que ha impulsado el optimismo sobre el crecimiento en la eurozona durante los próximos meses.',
      
      'Expertos del sector financiero destacan que el aumento del valor del euro también responde a una menor presión inflacionaria en Europa. El Banco Central Europeo (BCE) ha señalado que mantendrá una política monetaria prudente, aunque no descarta realizar ajustes si los precios vuelven a acelerarse. Esta postura ha sido interpretada por los mercados como una señal de estabilidad y control.',
      
      'Por su parte, el dólar estadounidense ha mostrado debilidad ante los temores de una recesión leve y la posibilidad de que la Reserva Federal reduzca las tasas antes de lo previsto. El diferencial de políticas monetarias entre ambas regiones ha sido determinante para el fortalecimiento del euro.',
      
      'En los mercados financieros, el movimiento ha sido bien recibido. Los inversores ven en el euro una oportunidad atractiva frente al dólar, especialmente en un contexto de volatilidad global. Algunas entidades financieras prevén que, si las condiciones actuales se mantienen, la moneda europea podría alcanzar los 1,15 dólares antes de que termine el año.',
      
      'El repunte del euro tiene implicaciones directas para el comercio internacional, ya que encarece las exportaciones europeas pero abarata las importaciones. Esto podría beneficiar a los consumidores de la eurozona, aunque representa un desafío para las empresas exportadoras, que podrían ver reducida su competitividad en los mercados externos.',
      
      'En conclusión, el fortalecimiento del euro frente al dólar refleja un reequilibrio en la economía global, donde la confianza en la estabilidad europea y la cautela de la Reserva Federal están marcando el rumbo de las principales divisas. Los próximos meses serán clave para determinar si esta tendencia alcista se consolida o si el dólar logra recuperar terreno.'
    ],
    relatedNews: [
      {
        id: 'economia-inflacion',
        title: 'Incremento de la inflación impacta a los mercados',
        href: '/news/economia/incremento-inflacion-impacta-mercados',
        category: 'Economía',
        date: '4 de octubre de 2025',
        datetime: '2025-10-04',
        summary: 'Los indicadores económicos muestran que la inflación continúa su tendencia alcista, afectando el poder adquisitivo.',
        imageUrl: '/images/news/economia/inflacion.jpg',
        alt: 'Pantallas financieras mostrando gráficos de inflación y datos de mercado'
      },
      {
        id: 'economia-dolar',
        title: 'Dólar alcanza máximo del año frente a otras monedas',
        href: '/news/economia/dolar-alcanza-maximo-ano-frente-monedas',
        category: 'Economía',
        date: '3 de octubre de 2025',
        datetime: '2025-10-03',
        summary: 'La moneda estadounidense se fortalece significativamente ante la incertidumbre global y la política monetaria.',
        imageUrl: '/images/news/economia/dolar.avif',
        alt: 'Billetes de dólar estadounidense y gráficos de tipo de cambio global'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Economía',
      current: 'El euro alcanza su valor más alto frente al dólar en seis meses'
    }
  },
  {
    id: 'economia-petroleo',
    title: 'Petróleo registra fuerte repunte y preocupa a consumidores y empresas',
    href: '/news/economia/petroleo-registra-fuerte-repunte-preocupa-consumidores-empresas',
    category: 'Economía',
    date: '4 de octubre de 2025',
    datetime: '2025-10-04',
    summary: 'El precio del petróleo registró un fuerte repunte este jueves, alcanzando niveles no vistos en los últimos meses y generando preocupación tanto entre los consumidores como entre las empresas a nivel global. Este aumento se atribuye a una combinación de factores, incluyendo tensiones geopolíticas en regiones productoras y restricciones en la oferta por parte de algunos países miembros de la OPEP.',
    imageUrl: '/images/news/economia/petroleo.avif',
    alt: 'Barriles de petróleo y gráfico de precios en alza en una pantalla financiera',
    content: [
      'Los analistas indican que la subida del crudo podría tener un impacto significativo en los costos de transporte y en los precios de bienes y servicios, afectando directamente el presupuesto de las familias. Los combustibles, que representan un gasto esencial en muchas economías, podrían registrar incrementos en el corto plazo, aumentando la presión sobre el poder adquisitivo de los ciudadanos.',
      
      'Por el lado empresarial, las compañías de transporte, logística y producción enfrentan un aumento en sus costos operativos. Varias empresas han comenzado a ajustar precios y revisar contratos de suministro para mitigar los efectos del incremento del petróleo en sus márgenes de ganancia.',
      
      'Los expertos advierten que, si el precio del crudo se mantiene en niveles elevados, podrían surgir presiones inflacionarias adicionales a nivel global. Esto también podría influir en las decisiones de los bancos centrales respecto a las tasas de interés y políticas monetarias, generando un escenario de incertidumbre en los mercados financieros.',
      
      'En el plano internacional, el repunte del petróleo ha sido impulsado principalmente por la reducción de inventarios en Estados Unidos y la tensión política en Oriente Medio. Además, algunos países exportadores han optado por limitar temporalmente la producción para sostener los precios, lo que ha intensificado la preocupación de los mercados.',
      
      'En conclusión, el alza del petróleo representa un desafío económico tanto para consumidores como para empresas. La evolución de los precios dependerá de factores geopolíticos, decisiones de los países productores y la capacidad de adaptación de los mercados ante la volatilidad de los costos energéticos.'
    ],
    relatedNews: [
      {
        id: 'economia-inflacion',
        title: 'Incremento de la inflación impacta a los mercados',
        href: '/news/economia/incremento-inflacion-impacta-mercados',
        category: 'Economía',
        date: '4 de octubre de 2025',
        datetime: '2025-10-04',
        summary: 'Los indicadores económicos muestran que la inflación continúa su tendencia alcista, afectando el poder adquisitivo.',
        imageUrl: '/images/news/economia/inflacion.jpg',
        alt: 'Pantallas financieras mostrando gráficos de inflación y datos de mercado'
      },
      {
        id: 'economia-dolar',
        title: 'Dólar alcanza máximo del año frente a otras monedas',
        href: '/news/economia/dolar-alcanza-maximo-ano-frente-monedas',
        category: 'Economía',
        date: '3 de octubre de 2025',
        datetime: '2025-10-03',
        summary: 'La moneda estadounidense se fortalece significativamente ante la incertidumbre global y la política monetaria.',
        imageUrl: '/images/news/economia/dolar.avif',
        alt: 'Billetes de dólar estadounidense y gráficos de tipo de cambio global'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Economía',
      current: 'Petróleo registra fuerte repunte y preocupa a consumidores y empresas'
    }
  },
  {
    id: 'economia-pib',
    title: 'El PIB crece un 3,5% en el último trimestre impulsado por el consumo y la inversión',
    href: '/news/economia/pib-crece-35-ultimo-trimestre-impulsado-consumo-inversion',
    category: 'Economía',
    date: '9 de octubre de 2025',
    datetime: '2025-10-09',
    summary: 'El Producto Interno Bruto (PIB) creció un 3,5% en el último trimestre, según los datos publicados por el gobierno, impulsado principalmente por un aumento en el consumo interno y en la inversión privada.',
    imageUrl: '/images/news/economia/pib.jpg',
    alt: 'Gráfico de barras del PIB mostrando un incremento del 3,5%',
    content: [
      'El gasto de los hogares mostró un comportamiento positivo, con un incremento en la demanda de bienes duraderos y servicios, lo que refleja la confianza de los consumidores en la economía. Este crecimiento del consumo contribuyó significativamente al avance general del PIB.',
      
      'Por su parte, la inversión empresarial también experimentó un aumento notable. Las empresas han incrementado sus gastos en infraestructura, tecnología y expansión de operaciones, lo que ha generado un efecto multiplicador sobre el empleo y la producción.',
      
      'Los analistas destacan que la combinación de consumo sólido e inversión creciente ha permitido a la economía mantenerse en una senda de crecimiento estable, a pesar de la incertidumbre internacional y la volatilidad de los mercados financieros.',
      
      'En conclusión, el incremento del PIB del 3,5% refleja un trimestre de dinamismo económico, impulsado tanto por la confianza de los consumidores como por la decisión de las empresas de fortalecer su capacidad productiva y su presencia en el mercado.'
    ],
    relatedNews: [
      {
        id: 'economia-inflacion',
        title: 'Incremento de la inflación impacta a los mercados',
        href: '/news/economia/incremento-inflacion-impacta-mercados',
        category: 'Economía',
        date: '4 de octubre de 2025',
        datetime: '2025-10-04',
        summary: 'Los indicadores económicos muestran que la inflación continúa su tendencia alcista, afectando el poder adquisitivo.',
        imageUrl: '/images/news/economia/inflacion.jpg',
        alt: 'Pantallas financieras mostrando gráficos de inflación y datos de mercado'
      },
      {
        id: 'economia-dolar',
        title: 'Dólar alcanza máximo del año frente a otras monedas',
        href: '/news/economia/dolar-alcanza-maximo-ano-frente-monedas',
        category: 'Economía',
        date: '3 de octubre de 2025',
        datetime: '2025-10-03',
        summary: 'La moneda estadounidense se fortalece significativamente ante la incertidumbre global y la política monetaria.',
        imageUrl: '/images/news/economia/dolar.avif',
        alt: 'Billetes de dólar estadounidense y gráficos de tipo de cambio global'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Economía',
      current: 'El PIB crece un 3,5% en el último trimestre impulsado por el consumo y la inversión'
    }
  }
];
