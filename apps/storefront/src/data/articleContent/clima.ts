import type { FullNewsArticle } from '../newsModels';

export const climaArticles: FullNewsArticle[] = [
  {
    id: 'clima-tormenta',
    title: 'Tormenta tropical se aproxima al Caribe y alerta a varios países',
    href: '/news/clima/tormenta-tropical-aproxima-caribe-alerta-paises',
    category: 'Clima',
    date: '11 de octubre de 2025',
    datetime: '2025-10-11',
    summary: 'Una tormenta tropical se aproxima al Caribe, generando alertas en varios países de la región. Los meteorólogos han emitido avisos para que la población se prepare ante posibles lluvias intensas.',
    imageUrl: '/images/news/clima/tormenta.jpg',
    alt: 'Imagen satelital de una tormenta tropical sobre el mar Caribe',
    content: [
      'Una tormenta tropical se aproxima al Caribe, generando alertas en varios países de la región. Los meteorólogos han emitido avisos para que la población se prepare ante posibles lluvias intensas.',
      
      'Las autoridades meteorológicas han emitido advertencias de evacuación y han recomendado a los ciudadanos tomar medidas de seguridad, especialmente en zonas costeras bajas. Se espera que la tormenta se debilite en las próximas horas.',
      
      'Los expertos en ciclones tropicales monitorean de cerca la evolución del fenómeno, sugiriendo que podría convertirse en un huracán si las condiciones atmosféricas se mantienen. Los residentes están siendo instados a permanecer en refugios seguros hasta que pase el peligro.',
      
      'Las aerolíneas han cancelado varios vuelos y han reprogramado rutas para evitar la tormenta. El turismo en la región se ha visto afectado, con cancelaciones de hoteles y cruceros que dependen del clima.',
      
      'En resumen, la situación meteorológica actual requiere máxima atención de las autoridades y la población, ya que los efectos de la tormenta podrían ser devastadores si no se toman las precauciones necesarias.'
    ],
    relatedNews: [
      {
        id: 'clima-calor',
        title: 'Ola de calor extremo afecta a varias regiones del país',
        href: '/news/clima/ola-calor-extremo-afecta-regiones-pais',
        category: 'Clima',
        date: '11 de octubre de 2025',
        datetime: '2025-10-11',
        summary: 'Las temperaturas máximas superan los 40 grados en varias provincias, generando alertas por riesgos para la salud.',
        imageUrl: '/images/news/clima/calor.jpg',
        alt: 'Termómetro marcando temperatura extrema en un paisaje urbano'
      },
      {
        id: 'clima-tornado',
        title: 'Tornado causa graves daños en el centro del país',
        href: '/news/clima/tornado-causa-graves-danos-centro-pais',
        category: 'Clima',
        date: '10 de octubre de 2025',
        datetime: '2025-10-10',
        summary: 'Un tornado de categoría F3 ha dejado un rastro de destrucción en varias comunidades del interior.',
        imageUrl: '/images/news/clima/tornado.jpg',
        alt: 'Tornado F3 tocando tierra en una zona residencial'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Clima',
      current: 'Tormenta tropical se aproxima al Caribe y alerta a varios países'
    }
  },
  {
    id: 'clima-calor',
    title: 'Ola de calor extremo afecta a varias regiones del país',
    href: '/news/clima/ola-calor-extremo-afecta-regiones-pais',
    category: 'Clima',
    date: '11 de octubre de 2025',
    datetime: '2025-10-11',
    summary: 'Las temperaturas máximas superan los 40 grados en varias provincias, generando alertas por riesgos para la salud.',
    imageUrl: '/images/news/clima/calor.jpg',
    alt: 'Termómetro marcando temperatura extrema en un paisaje urbano',
    content: [
      'Una ola de calor histórica afecta a gran parte de Europa, provocando temperaturas récord en varias ciudades.',
      
      'Las autoridades han emitido alertas para extremar precauciones, especialmente para ancianos y personas con enfermedades crónicas.',
      
      'Se esperan temperaturas superiores a los 40 °C en regiones del sur de Europa durante los próximos días.',
      
      'Los servicios de salud recomiendan mantenerse hidratado, evitar la exposición prolongada al sol y seguir las instrucciones locales de protección.',
      
      'Varios países han activado planes de emergencia para enfrentar los riesgos asociados al calor extremo, incluyendo el uso de refugios climáticos.',
      
      'Se prevé que la ola de calor continúe durante al menos una semana, mientras los meteorólogos monitorean el avance y la intensidad del fenómeno.'
    ],
    relatedNews: [
      {
        id: 'clima-tormenta',
        title: 'Tormenta tropical se aproxima al Caribe',
        href: '/news/clima/tormenta-tropical-aproxima-caribe-alerta-paises',
        category: 'Clima',
        date: '11 de octubre de 2025',
        datetime: '2025-10-11',
        summary: 'Una tormenta tropical se aproxima al Caribe, generando alertas en varios países de la región.',
        imageUrl: '/images/news/clima/tormenta.jpg',
        alt: 'Imagen satelital de una tormenta tropical sobre el mar Caribe'
      },
      {
        id: 'clima-tornado',
        title: 'Tornado causa graves daños en el centro del país',
        href: '/news/clima/tornado-causa-graves-danos-centro-pais',
        category: 'Clima',
        date: '10 de octubre de 2025',
        datetime: '2025-10-10',
        summary: 'Un tornado de categoría F3 ha dejado un rastro de destrucción en varias comunidades del interior.',
        imageUrl: '/images/news/clima/tornado.jpg',
        alt: 'Tornado F3 tocando tierra en una zona residencial'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Clima',
      current: 'Ola de calor extremo afecta a varias regiones del país'
    }
  },
  {
    id: 'clima-tornado',
    title: 'Tornado causa graves daños en el centro del país',
    href: '/news/clima/tornado-causa-graves-danos-centro-pais',
    category: 'Clima',
    date: '10 de octubre de 2025',
    datetime: '2025-10-10',
    summary: 'Un tornado de categoría F3 ha dejado un rastro de destrucción en varias comunidades del interior, causando daños materiales significativos y afectando a cientos de familias.',
    imageUrl: '/images/news/clima/tornado.jpg',
    alt: 'Tornado F3 tocando tierra en una zona residencial',
    content: [
      'Un poderoso tornado de categoría F3 azotó varias comunidades del centro del país, dejando un rastro de destrucción que ha afectado a más de 500 familias y causado daños estimados en millones de dólares.',
      
      'Las autoridades de protección civil han desplegado equipos de rescate y asistencia humanitaria en las zonas más afectadas, donde numerosas viviendas han sido destruidas o dañadas severamente.',
      
      'El servicio meteorológico nacional había emitido alertas de tormentas severas horas antes del paso del tornado, permitiendo que muchas personas pudieran buscar refugio a tiempo.',
      
      'Los equipos de emergencia continúan trabajando en las labores de limpieza y evaluación de daños, mientras las autoridades locales establecen centros de acopio para los damnificados.',
      
      'El gobierno ha declarado el estado de emergencia en las municipalidades más afectadas y ha prometido recursos para la reconstrucción y asistencia a las víctimas.',
      
      'Expertos en fenómenos meteorológicos advierten sobre la posibilidad de nuevos eventos severos en las próximas horas debido a las condiciones atmosféricas inestables en la región.'
    ],
    relatedNews: [
      {
        id: 'clima-tormenta',
        title: 'Tormenta tropical se aproxima al Caribe',
        href: '/news/clima/tormenta-tropical-aproxima-caribe-alerta-paises',
        category: 'Clima',
        date: '11 de octubre de 2025',
        datetime: '2025-10-11',
        summary: 'Una tormenta tropical se aproxima al Caribe, generando alertas en varios países de la región.',
        imageUrl: '/images/news/clima/tormenta.jpg',
        alt: 'Imagen satelital de una tormenta tropical sobre el mar Caribe'
      },
      {
        id: 'clima-calor',
        title: 'Ola de calor extremo afecta a varias regiones',
        href: '/news/clima/ola-calor-extremo-afecta-regiones-pais',
        category: 'Clima',
        date: '11 de octubre de 2025',
        datetime: '2025-10-11',
        summary: 'Las temperaturas máximas superan los 40 grados en varias provincias, generando alertas por riesgos para la salud.',
        imageUrl: '/images/news/clima/calor.jpg',
        alt: 'Termómetro marcando temperatura extrema en un paisaje urbano'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Clima',
      current: 'Tornado causa graves daños en el centro del país'
    }
  },
  {
    id: 'clima-huracan',
    title: 'Huracán se forma en el Atlántico y amenaza la costa este',
    href: '/news/clima/huracan-se-forma-atlantico-amenaza-costa-este',
    category: 'Clima',
    date: '11 de octubre de 2025',
    datetime: '2025-10-11',
    summary: 'Las autoridades han emitido alertas de evacuación ante la aproximación de un huracán categoría 3.',
    imageUrl: '/images/news/clima/ciclon.jpg',
    alt: 'Imagen satelital de un huracán aproximándose a la costa',
    content: [
      'El huracán, que se formó hace varios días en el Atlántico central, ha ganado fuerza rápidamente debido a las altas temperaturas del mar y a las condiciones atmosféricas favorables. Los meteorólogos del Centro Nacional de Huracanes de Estados Unidos informaron que el sistema alcanzó categoría 3 durante la madrugada y podría intensificarse aún más en las próximas horas.',
      
      'Los vientos sostenidos ya superan los 200 kilómetros por hora, con ráfagas aún más fuertes en las zonas cercanas al ojo del huracán. El fenómeno se desplaza hacia el noroeste a una velocidad aproximada de 20 kilómetros por hora, acercándose peligrosamente a la costa este estadounidense.',
      
      'Las autoridades de Florida, Georgia, Carolina del Sur y Carolina del Norte han emitido alertas de huracán y advertencias de evacuación preventiva en las áreas costeras más expuestas. Se espera que el oleaje alcance alturas de entre tres y cinco metros, lo que podría causar inundaciones severas y erosión de playas.',
      
      'Los expertos advierten que, si el huracán mantiene su intensidad actual, podría llegar a categoría 4 antes de tocar tierra, lo que lo convertiría en uno de los ciclones más potentes de la temporada. La presión atmosférica continúa descendiendo, un indicador de que el sistema sigue fortaleciéndose.',
      
      'El presidente de Estados Unidos ha ordenado la movilización de la Guardia Nacional y la coordinación con las agencias de manejo de emergencias estatales. Asimismo, instó a los ciudadanos a seguir las indicaciones de las autoridades locales y evitar desplazamientos innecesarios en las zonas bajo alerta.',
      
      'En varias ciudades costeras, los supermercados y estaciones de combustible han registrado una alta demanda de suministros. Muchos residentes han comenzado a proteger sus viviendas con tablones y a preparar kits de emergencia con alimentos no perecederos, linternas y baterías.',
      
      'Los aeropuertos de la región también se preparan para posibles cancelaciones de vuelos, mientras que los puertos han suspendido temporalmente las operaciones marítimas. Las compañías eléctricas trabajan en planes de contingencia ante la posibilidad de cortes de energía a gran escala.',
      
      'Los servicios meteorológicos pronostican que el huracán podría comenzar a debilitarse ligeramente una vez que toque tierra, aunque las lluvias torrenciales podrían extenderse hacia el interior del país, afectando zonas urbanas y rurales por igual.',
      
      'El Centro Nacional de Huracanes continuará monitoreando de cerca la evolución del fenómeno y actualizará los boletines oficiales cada tres horas. Se recomienda a la población mantenerse atenta a los reportes y no difundir información no verificada en redes sociales.',
      
      'El fenómeno reafirma las preocupaciones de los científicos sobre el impacto del cambio climático, ya que las aguas más cálidas del océano están contribuyendo a la formación de huracanes más intensos y frecuentes en el Atlántico.'
    ],
    relatedNews: [
      {
        id: 'clima-calor',
        title: 'Ola de calor extremo afecta a varias regiones del país',
        href: '/news/clima/ola-calor-extremo-afecta-regiones-pais',
        category: 'Clima',
        date: '11 de octubre de 2025',
        datetime: '2025-10-11',
        summary: 'Las temperaturas máximas superan los 40 grados en varias provincias, generando alertas por riesgos para la salud.',
        imageUrl: '/images/news/clima/calor.jpg',
        alt: 'Termómetro marcando temperatura extrema en un paisaje urbano'
      },
      {
        id: 'clima-tornado',
        title: 'Tornado causa graves daños en el centro del país',
        href: '/news/clima/tornado-causa-graves-danos-centro-pais',
        category: 'Clima',
        date: '10 de octubre de 2025',
        datetime: '2025-10-10',
        summary: 'Un tornado de categoría F3 ha dejado un rastro de destrucción en varias comunidades del interior.',
        imageUrl: '/images/news/clima/tornado.jpg',
        alt: 'Tornado F3 tocando tierra en una zona residencial'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Clima',
      current: 'Huracán se forma en el Atlántico y amenaza la costa este'
    }
  },
  {
    id: 'clima-inundaciones',
    title: 'Inundaciones afectan a miles de personas en el sur',
    href: '/news/clima/inundaciones-afectan-miles-personas-sur',
    category: 'Clima',
    date: '11 de octubre de 2025',
    datetime: '2025-10-11',
    summary: 'Las lluvias torrenciales han causado desbordamiento de ríos, afectando a comunidades enteras.',
    imageUrl: '/images/news/clima/inundacion.jpg',
    alt: 'Calles inundadas en una ciudad sudamericana tras lluvias torrenciales',
    content: [
      'Fuertes lluvias han azotado en los últimos días a varias regiones de Sudamérica, provocando graves inundaciones que han afectado a miles de personas y dejado importantes daños materiales.',
      
      'Los países más golpeados por las intensas precipitaciones son Brasil, Argentina, Paraguay, Bolivia y Perú, donde se han reportado desbordamientos de ríos, deslizamientos de tierra y cortes de carreteras.',
      
      'En el sur de Brasil, las lluvias torrenciales causaron el desbordamiento del río Taquari, inundando decenas de municipios del estado de Rio Grande do Sul. Las autoridades locales informaron que cientos de familias tuvieron que ser evacuadas y se han habilitado refugios temporales para los damnificados.',
      
      'En Paraguay, el río Paraguay superó su nivel crítico y anegó varias zonas de Asunción y localidades ribereñas. La Secretaría de Emergencia Nacional desplegó equipos de rescate y distribuyó alimentos y agua potable a las familias afectadas.',
      
      'Mientras tanto, en Bolivia, las fuertes precipitaciones han ocasionado deslizamientos de tierra en zonas montañosas, bloqueando caminos y afectando comunidades rurales. El gobierno declaró alerta naranja en varios departamentos debido al riesgo de nuevos deslizamientos.',
      
      'En el norte de Argentina, las provincias de Misiones y Corrientes también enfrentan serios problemas por la acumulación de agua. Los campos agrícolas se encuentran inundados, lo que genera preocupación en el sector agropecuario ante posibles pérdidas de cosechas.',
      
      'Los servicios meteorológicos de la región advierten que las lluvias continuarán durante los próximos días debido a un sistema de baja presión combinado con corrientes cálidas provenientes del Atlántico, lo que podría agravar la situación en las zonas más vulnerables.',
      
      'Las autoridades han recomendado a la población mantenerse informada, evitar circular por zonas inundadas y acatar las indicaciones de los organismos de emergencia.',
      
      'Organizaciones internacionales, como la Cruz Roja y la ONU, han manifestado su disposición para brindar apoyo humanitario, enviando equipos de asistencia y recursos para atender a las comunidades afectadas.',
      
      'Los gobiernos de la región trabajan de manera conjunta para coordinar esfuerzos y mitigar el impacto de las lluvias, mientras se evalúan los daños y se planifican estrategias de recuperación a largo plazo.',
      
      'Las intensas precipitaciones ponen nuevamente sobre la mesa el debate sobre los efectos del cambio climático en Sudamérica, donde los eventos meteorológicos extremos se han vuelto cada vez más frecuentes e impredecibles.',
      
      'La situación continúa siendo monitoreada de cerca por las autoridades, que piden solidaridad y cooperación para enfrentar una de las emergencias climáticas más severas de los últimos años en la región.'
    ],
    relatedNews: [
      {
        id: 'clima-calor',
        title: 'Ola de calor extremo afecta a varias regiones del país',
        href: '/news/clima/ola-calor-extremo-afecta-regiones-pais',
        category: 'Clima',
        date: '11 de octubre de 2025',
        datetime: '2025-10-11',
        summary: 'Las temperaturas máximas superan los 40 grados en varias provincias, generando alertas por riesgos para la salud.',
        imageUrl: '/images/news/clima/calor.jpg',
        alt: 'Termómetro marcando temperatura extrema en un paisaje urbano'
      },
      {
        id: 'clima-tornado',
        title: 'Tornado causa graves daños en el centro del país',
        href: '/news/clima/tornado-causa-graves-danos-centro-pais',
        category: 'Clima',
        date: '10 de octubre de 2025',
        datetime: '2025-10-10',
        summary: 'Un tornado de categoría F3 ha dejado un rastro de destrucción en varias comunidades del interior.',
        imageUrl: '/images/news/clima/tornado.jpg',
        alt: 'Tornado F3 tocando tierra en una zona residencial'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Clima',
      current: 'Inundaciones afectan a miles de personas en el sur'
    }
  },
  {
    id: 'clima-nevadas',
    title: 'Nevadas históricas paralizan el norte del país',
    href: '/news/clima/nevadas-historicas-paralizan-norte-pais',
    category: 'Clima',
    date: '11 de octubre de 2025',
    datetime: '2025-10-11',
    summary: 'Las nevadas más intensas en décadas han dejado incomunicadas a varias poblaciones del norte.',
    imageUrl: '/images/news/clima/winter.jpg',
    alt: 'Carreteras y edificios cubiertos de nieve en el norte de Europa',
    content: [
      'Nevadas intensas están afectando el norte de Europa, causando interrupciones significativas en el transporte y generando riesgos para la población en varias regiones.',
      
      'Las fuertes precipitaciones de nieve han acumulado grandes cantidades en carreteras, calles y autopistas, lo que ha obligado a las autoridades a implementar cierres temporales para garantizar la seguridad de los conductores.',
      
      'Se han reportado retrasos y cancelaciones de vuelos en aeropuertos internacionales y regionales, así como interrupciones en servicios de trenes y transporte público debido a vías bloqueadas por la nieve y el hielo.',
      
      'Las condiciones extremas han provocado accidentes de tráfico y dificultades para los vehículos de emergencia, lo que ha llevado a que los servicios de rescate y mantenimiento trabajen sin descanso para despejar las rutas principales.',
      
      'Se recomienda a los ciudadanos evitar desplazamientos innecesarios y utilizar transporte público solo cuando sea seguro, además de seguir las indicaciones de las autoridades locales y los informes meteorológicos actualizados.',
      
      'Los gobiernos regionales han activado planes de contingencia, que incluyen refugios temporales, asistencia a personas vulnerables y distribución de equipos de protección y suministros esenciales en zonas afectadas.',
      
      'Los meteorólogos advierten que las nevadas podrían continuar durante varios días, y que se esperan bajas temperaturas y posibles tormentas de nieve que podrían agravar la situación, especialmente en zonas rurales y montañosas.',
      
      'Las autoridades han solicitado colaboración de la población para reportar cualquier incidente, mantenerse informado a través de canales oficiales y tomar precauciones adicionales para protegerse del frío extremo.',
      
      'Además, se ha recomendado a los conductores equipar sus vehículos con neumáticos de invierno, cadenas y kits de emergencia, y mantenerse alerta ante cambios bruscos en el clima que puedan afectar la seguridad en carretera.',
      
      'En general, las nevadas están generando un impacto considerable en la vida cotidiana, obligando a muchas personas a trabajar desde casa y a planificar sus desplazamientos con anticipación para evitar riesgos innecesarios.'
    ],
    relatedNews: [
      {
        id: 'clima-calor',
        title: 'Ola de calor extremo afecta a varias regiones del país',
        href: '/news/clima/ola-calor-extremo-afecta-regiones-pais',
        category: 'Clima',
        date: '11 de octubre de 2025',
        datetime: '2025-10-11',
        summary: 'Las temperaturas máximas superan los 40 grados en varias provincias, generando alertas por riesgos para la salud.',
        imageUrl: '/images/news/clima/calor.jpg',
        alt: 'Termómetro marcando temperatura extrema en un paisaje urbano'
      },
      {
        id: 'clima-tornado',
        title: 'Tornado causa graves daños en el centro del país',
        href: '/news/clima/tornado-causa-graves-danos-centro-pais',
        category: 'Clima',
        date: '10 de octubre de 2025',
        datetime: '2025-10-10',
        summary: 'Un tornado de categoría F3 ha dejado un rastro de destrucción en varias comunidades del interior.',
        imageUrl: '/images/news/clima/tornado.jpg',
        alt: 'Tornado F3 tocando tierra en una zona residencial'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Clima',
      current: 'Nevadas históricas paralizan el norte del país'
    }
  }
];
