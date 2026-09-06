import type { FullNewsArticle } from '../newsModels';

export const justiciaArticles: FullNewsArticle[] = [
  {
    id: 'justicia-condena-criminal',
    title: 'Condenan a cadena perpetua a líder de organización criminal internacional',
    href: '/news/justicia/condenan-cadena-perpetua-lider-organizacion-criminal',
    category: 'Justicia',
    date: '11 de octubre de 2025',
    datetime: '2025-10-11',
    summary: 'El líder de una organización criminal internacional ha sido condenado a cadena perpetua tras un largo proceso judicial que se extendió por varios años.',
    imageUrl: '/images/news/justicia/condena.jpg',
    alt: 'Sala de tribunal durante la sentencia de un líder criminal internacional',
    content: [
      'La sentencia fue dictada por un tribunal especializado en delitos de crimen organizado, luego de que se presentaran pruebas contundentes que vinculan al acusado con actividades ilícitas a nivel mundial, incluyendo tráfico de drogas, lavado de dinero y corrupción.',
      
      'Durante el juicio, se presentaron testimonios de exintegrantes de la organización y evidencia financiera que demostró la magnitud de las operaciones ilegales lideradas por el condenado.',
      
      'Las autoridades destacaron la importancia de esta condena como un paso clave en la lucha contra el crimen organizado internacional y aseguraron que continuarán trabajando para desmantelar las redes criminales asociadas.',
      
      'El tribunal señaló que la severidad de la sentencia responde al alto riesgo que representaba el acusado para la seguridad pública y a la necesidad de enviar un mensaje contundente sobre la intolerancia hacia la criminalidad organizada.',
      
      'Expertos legales han indicado que este fallo podría sentar un precedente para futuros casos de crimen internacional, reforzando la cooperación entre países y organismos internacionales en la persecución de delitos transnacionales.',
      
      'La familia del condenado y sus abogados anunciaron que evaluarán posibles recursos, aunque reconocieron que las evidencias presentadas durante el juicio dificultan cualquier posibilidad de reducción de la pena.',
      
      'La comunidad internacional ha recibido la noticia con atención, destacando la importancia de aplicar la justicia de manera efectiva y coordinada en casos de alta criminalidad y alcance global.',
      
      'Mientras tanto, las autoridades continúan investigando y monitoreando las operaciones de la organización para asegurar que no queden cabos sueltos que puedan permitir la continuidad de actividades ilícitas.'
    ],
    relatedNews: [
      {
        id: 'justicia-fraude',
        title: 'Detienen a exfuncionario acusado de fraude financiero millonario',
        href: '/news/justicia/detienen-exfuncionario-fraude-financiero-millonario',
        category: 'Justicia',
        date: '11 de octubre de 2025',
        datetime: '2025-10-11',
        summary: 'Arrestan a directivos involucrados en evasión de impuestos.',
        imageUrl: '/images/news/justicia/arrested.jpg',
        alt: 'Exfuncionario esposado siendo conducido por las autoridades'
      },
      {
        id: 'justicia-tribunal-supremo',
        title: 'Tribunal Supremo confirma sentencia',
        href: '/news/justicia/tribunal-supremo-confirma-sentencia',
        category: 'Justicia',
        date: '10 de octubre de 2025',
        datetime: '2025-10-10',
        summary: 'Caso de corrupción política llega a su fin con ratificación de penas.',
        imageUrl: '/images/news/justicia/tribunal.jpg',
        alt: 'Tribunal Supremo confirma sentencia'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Justicia',
      current: 'Condenan a cadena perpetua a líder de organización criminal internacional'
    }
  },
  {
    id: 'justicia-fraude',
    title: 'Detienen a exfuncionario acusado de fraude financiero millonario',
    href: '/news/justicia/detienen-exfuncionario-fraude-financiero-millonario',
    category: 'Justicia',
    date: '11 de octubre de 2025',
    datetime: '2025-10-11',
    summary: 'Las autoridades arrestaron este viernes a un exfuncionario público acusado de participar en un esquema de fraude financiero que habría desviado millones de dólares de fondos estatales.',
    imageUrl: '/images/news/justicia/arrested.jpg',
    alt: 'Exfuncionario esposado siendo conducido por las autoridades',
    content: [
      'La detención se produjo tras una extensa investigación encabezada por la fiscalía especializada en delitos económicos. De acuerdo con el informe preliminar, el exfuncionario presuntamente utilizó una red de empresas fantasma para desviar recursos destinados a programas de desarrollo social.',
      
      'Las autoridades afirman que el dinero fue transferido a cuentas en el extranjero y utilizado para la compra de propiedades de lujo. El detenido fue trasladado a un centro de detención preventiva, donde permanecerá bajo custodia mientras se formalizan los cargos.',
      
      'La fiscalía ha solicitado prisión preventiva por considerar que existe riesgo de fuga y posibilidad de obstrucción de la investigación. Durante una conferencia de prensa, el fiscal general declaró que este arresto representa un avance significativo en la lucha contra la corrupción.',
      
      'La defensa del exfuncionario ha manifestado que su cliente es inocente y que demostrará su falta de participación en los hechos durante el proceso judicial. Solicitaron que se respete el principio de presunción de inocencia mientras avanzan las investigaciones.',
      
      'Este caso ha generado gran repercusión en la opinión pública, ya que el acusado ocupó cargos de alto nivel en la administración anterior. Diversas organizaciones civiles han exigido que se garantice la transparencia del proceso y que los responsables rindan cuentas ante la justicia.',
      
      'Las autoridades financieras informaron que continúan las auditorías para rastrear el destino final de los fondos desviados, mientras el gobierno anunció nuevas medidas para fortalecer los mecanismos de control y supervisión del gasto público.'
    ],
    relatedNews: [
      {
        id: 'justicia-condena-criminal',
        title: 'Condenan a cadena perpetua a líder criminal',
        href: '/news/justicia/condenan-cadena-perpetua-lider-organizacion-criminal',
        category: 'Justicia',
        date: '11 de octubre de 2025',
        datetime: '2025-10-11',
        summary: 'Líder de organización internacional recibe sentencia máxima.',
        imageUrl: '/images/news/justicia/condena.jpg',
        alt: 'Condenan a cadena perpetua a líder criminal'
      },
      {
        id: 'justicia-tribunal-supremo',
        title: 'Tribunal Supremo confirma sentencia',
        href: '/news/justicia/tribunal-supremo-confirma-sentencia',
        category: 'Justicia',
        date: '10 de octubre de 2025',
        datetime: '2025-10-10',
        summary: 'Caso de corrupción política llega a su fin con ratificación de penas.',
        imageUrl: '/images/news/justicia/tribunal.jpg',
        alt: 'Tribunal Supremo confirma sentencia'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Justicia',
      current: 'Detienen a exfuncionario acusado de fraude financiero millonario'
    }
  },
  {
    id: 'justicia-tribunal-supremo',
    title: 'Tribunal Supremo confirma sentencia histórica en caso de corrupción',
    href: '/news/justicia/tribunal-supremo-confirma-sentencia',
    category: 'Justicia',
    date: '10 de octubre de 2025',
    datetime: '2025-10-10',
    summary: 'El Tribunal Supremo ha confirmado la sentencia dictada en un caso de corrupción política que ha conmocionado al país, estableciendo un precedente importante en la lucha contra la impunidad.',
    imageUrl: '/images/news/justicia/tribunal.jpg',
    alt: 'Jueces ingresando al Tribunal Supremo para una sentencia histórica',
    content: [
      'La decisión del máximo tribunal del país fue unánime y ratifica las condenas impuestas por tribunales inferiores contra varios funcionarios de alto nivel involucrados en actos de corrupción.',
      
      'El caso, que se ha extendido por más de tres años, ha sido uno de los más mediáticos de la última década, revelando una red de sobornos y favoritismo que afectó la adjudicación de contratos públicos por millones de dólares.',
      
      'Los magistrados del Tribunal Supremo destacaron en su fallo la importancia de mantener la integridad de la función pública y sendear un mensaje claro sobre las consecuencias de la corrupción.',
      
      'Organizaciones de la sociedad civil han celebrado la decisión, considerándola una victoria para el estado de derecho y un paso fundamental en la consolidación de instituciones democráticas fuertes.',
      
      'Los abogados defensores han anunciado que presentarán recursos internacionales, argumentando violaciones al debido proceso durante las diferentes etapas del juicio.',
      
      'El gobierno ha destacado que esta sentencia demuestra la independencia del poder judicial y el compromiso de las instituciones con la transparencia y la rendición de cuentas.',
      
      'Expertos legales consideran que este fallo fortalecerá los mecanismos de prevención de la corrupción y servirá como disuasivo para futuros funcionarios públicos.'
    ],
    relatedNews: [
      {
        id: 'justicia-condena-criminal',
        title: 'Condenan a cadena perpetua a líder criminal',
        href: '/news/justicia/condenan-cadena-perpetua-lider-organizacion-criminal',
        category: 'Justicia',
        date: '11 de octubre de 2025',
        datetime: '2025-10-11',
        summary: 'Líder de organización internacional recibe sentencia máxima.',
        imageUrl: '/images/news/justicia/condena.jpg',
        alt: 'Condenan a cadena perpetua a líder criminal'
      },
      {
        id: 'justicia-fraude',
        title: 'Detienen a exfuncionario acusado de fraude financiero millonario',
        href: '/news/justicia/detienen-exfuncionario-fraude-financiero-millonario',
        category: 'Justicia',
        date: '11 de octubre de 2025',
        datetime: '2025-10-11',
        summary: 'Arrestan a directivos involucrados en evasión de impuestos.',
        imageUrl: '/images/news/justicia/arrested.jpg',
        alt: 'Exfuncionario esposado siendo conducido por las autoridades'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Justicia',
      current: 'Tribunal Supremo confirma sentencia histórica en caso de corrupción'
    }
  },
  {
    id: 'justicia-homicidio',
    title: 'Investigan homicidio en el centro de la ciudad',
    href: '/news/justicia/investigan-homicidio-centro-ciudad',
    category: 'Justicia',
    date: '11 de octubre de 2025',
    datetime: '2025-10-11',
    summary: 'La policía local ha iniciado una investigación tras un homicidio ocurrido en el centro de la ciudad durante la madrugada del viernes, generando alarma en la comunidad.',
    imageUrl: '/images/news/justicia/homicidio.jpg',
    alt: 'Policía acordonando una calle durante la investigación de un homicidio',
    content: [
      'Las autoridades informaron que el incidente tuvo lugar cerca de la intersección de las avenidas principales, en un área con alta actividad comercial. Testigos presentes en el lugar relataron haber escuchado gritos y detonaciones antes de que llegaran los primeros equipos de emergencia.',
      
      'Los oficiales encontraron a la víctima con heridas graves y confirmaron su fallecimiento en el sitio. Las fuerzas del orden han acordonado la zona para preservar la evidencia y permitir que los peritos realicen las diligencias correspondientes.',
      
      'Se espera que se tomen fotografías, huellas y grabaciones de cámaras de seguridad cercanas para ayudar en la identificación de los responsables. El alcalde de la ciudad emitió un comunicado expresando su preocupación por el aumento de la violencia en el área central.',
      
      'La víctima, cuya identidad no ha sido revelada oficialmente, sería un hombre de entre 25 y 35 años. La policía hace un llamado a cualquier persona que haya presenciado los hechos a acercarse a las autoridades para brindar información.',
      
      'Vecinos y comerciantes de la zona manifestaron su temor y pidieron mayor presencia policial durante la noche. El departamento de policía informó que se esperan actualizaciones sobre la investigación en las próximas horas.',
      
      'Mientras tanto, se aconseja a los ciudadanos evitar transitar por la zona durante las horas nocturnas y reportar cualquier actividad sospechosa al número de emergencia local. Este hecho ha reabierto el debate sobre la seguridad urbana y las políticas de prevención del crimen.'
    ],
    relatedNews: [
      {
        id: 'justicia-condena-criminal',
        title: 'Condenan a cadena perpetua a líder criminal',
        href: '/news/justicia/condenan-cadena-perpetua-lider-organizacion-criminal',
        category: 'Justicia',
        date: '11 de octubre de 2025',
        datetime: '2025-10-11',
        summary: 'Líder de organización internacional recibe sentencia máxima.',
        imageUrl: '/images/news/justicia/condena.jpg',
        alt: 'Condenan a cadena perpetua a líder criminal'
      },
      {
        id: 'justicia-fraude',
        title: 'Detienen a exfuncionario acusado de fraude financiero millonario',
        href: '/news/justicia/detienen-exfuncionario-fraude-financiero-millonario',
        category: 'Justicia',
        date: '11 de octubre de 2025',
        datetime: '2025-10-11',
        summary: 'Acusado de desviar fondos millonarios a cuentas en el extranjero.',
        imageUrl: '/images/news/justicia/arrested.jpg',
        alt: 'Exfuncionario esposado siendo conducido por las autoridades'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Justicia',
      current: 'Investigan homicidio en el centro de la ciudad'
    }
  },
  {
    id: 'justicia-fiscalia-empresa',
    title: 'Fiscalía inicia juicio contra empresa por evasión fiscal millonaria',
    href: '/news/justicia/fiscalia-inicia-juicio-empresa-evasion-fiscal-millonaria',
    category: 'Justicia',
    date: '11 de octubre de 2025',
    datetime: '2025-10-11',
    summary: 'La Fiscalía General ha iniciado un juicio contra una importante empresa nacional acusada de evasión fiscal millonaria, lo que podría derivar en sanciones históricas.',
    imageUrl: '/images/news/justicia/juicio.jpg',
    alt: 'Edificio corporativo con investigadores de la fiscalía ingresando',
    content: [
      'Según los informes preliminares, la compañía habría omitido declarar ingresos significativos durante varios años, generando un perjuicio económico al Estado. El caso se abrió luego de una investigación de la unidad especializada en delitos financieros.',
      
      'Durante la audiencia inicial, los representantes de la empresa negaron las acusaciones, asegurando que todos los registros contables cumplen con la normativa vigente. Sin embargo, la Fiscalía presentó documentos y pruebas que evidencian la supuesta evasión.',
      
      'El juez a cargo del caso estableció un calendario de audiencias para escuchar a testigos y expertos. La opinión pública ha mostrado gran interés en el caso, dada la relevancia de la empresa en la economía nacional.',
      
      'Si se confirman las acusaciones, la empresa podría enfrentar multas millonarias y responsabilidades penales para sus directivos. Las autoridades recalcan la importancia de este juicio como un mensaje de rigor.',
      
      'Se espera que las próximas semanas sean decisivas para determinar el futuro de la compañía y el impacto de este caso en el sector empresarial.'
    ],
    relatedNews: [
      {
        id: 'justicia-condena-criminal',
        title: 'Condenan a cadena perpetua a líder criminal',
        href: '/news/justicia/condenan-cadena-perpetua-lider-organizacion-criminal',
        category: 'Justicia',
        date: '11 de octubre de 2025',
        datetime: '2025-10-11',
        summary: 'Líder de organización internacional recibe sentencia máxima.',
        imageUrl: '/images/news/justicia/condena.jpg',
        alt: 'Condenan a cadena perpetua a líder criminal'
      },
      {
        id: 'justicia-fraude',
        title: 'Detienen a exfuncionario acusado de fraude financiero millonario',
        href: '/news/justicia/detienen-exfuncionario-fraude-financiero-millonario',
        category: 'Justicia',
        date: '11 de octubre de 2025',
        datetime: '2025-10-11',
        summary: 'Acusado de desviar fondos millonarios a cuentas en el extranjero.',
        imageUrl: '/images/news/justicia/arrested.jpg',
        alt: 'Exfuncionario esposado siendo conducido por las autoridades'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Justicia',
      current: 'Fiscalía inicia juicio contra empresa por evasión fiscal millonaria'
    }
  },
  {
    id: 'justicia-juez-homicidio-multiple',
    title: 'Juez ordena prisión preventiva para acusado de homicidio múltiple',
    href: '/news/justicia/juez-ordena-prision-preventiva-acusado-homicidio-multiple',
    category: 'Justicia',
    date: '11 de octubre de 2025',
    datetime: '2025-10-11',
    summary: 'El juez del caso ha dictado prisión preventiva contra el acusado, considerando necesario asegurar su presencia en el juicio debido a la gravedad de los cargos y el riesgo de fuga.',
    imageUrl: '/images/news/justicia/juez.jpg',
    alt: 'Juez revisando expedientes de un caso de homicidio múltiple',
    content: [
      'La decisión se tomó luego de una audiencia en la que se presentaron pruebas contundentes que vinculan al acusado con varios homicidios ocurridos en la ciudad durante los últimos meses. El fiscal argumentó que la libertad del imputado representaría un peligro para la sociedad.',
      
      'La defensa del acusado manifestó que respetará la decisión del juez, pero adelantó que presentará recursos legales para solicitar una revisión de la medida. Mientras tanto, el acusado permanecerá en un centro de detención de máxima seguridad.',
      
      'Familiares de las víctimas han recibido con alivio la decisión, destacando la importancia de que el proceso judicial avance sin contratiempos. Las autoridades han reforzado la seguridad en torno al caso para evitar incidentes.',
      
      'Expertos legales señalan que la prisión preventiva es una medida excepcional pero justificada en casos de extrema gravedad como este. El juicio está programado para comenzar en los próximos meses, y se espera que sea uno de los más mediáticos del año.',
      
      'La comunidad sigue atenta al desarrollo de los acontecimientos, esperando que se haga justicia para las víctimas y sus familias.'
    ],
    relatedNews: [
      {
        id: 'justicia-condena-criminal',
        title: 'Condenan a cadena perpetua a líder criminal',
        href: '/news/justicia/condenan-cadena-perpetua-lider-organizacion-criminal',
        category: 'Justicia',
        date: '11 de octubre de 2025',
        datetime: '2025-10-11',
        summary: 'Líder de organización internacional recibe sentencia máxima.',
        imageUrl: '/images/news/justicia/condena.jpg',
        alt: 'Condenan a cadena perpetua a líder criminal'
      },
      {
        id: 'justicia-fraude',
        title: 'Detienen a exfuncionario acusado de fraude financiero millonario',
        href: '/news/justicia/detienen-exfuncionario-fraude-financiero-millonario',
        category: 'Justicia',
        date: '11 de octubre de 2025',
        datetime: '2025-10-11',
        summary: 'Acusado de desviar fondos millonarios a cuentas en el extranjero.',
        imageUrl: '/images/news/justicia/arrested.jpg',
        alt: 'Exfuncionario esposado siendo conducido por las autoridades'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Justicia',
      current: 'Juez ordena prisión preventiva para acusado de homicidio múltiple'
    }
  }
];
