import type { FullNewsArticle } from '../newsModels';

export const deporteArticles: FullNewsArticle[] = [
  {
    id: 'deporte-nba',
    title: 'Los Lakers vencen a los Celtics 112-107 en un emocionante partido de la NBA',
    href: '/news/deporte/lakers-vencen-celtics-nba',
    category: 'Deporte',
    date: '4 de octubre de 2025',
    datetime: '2025-10-04',
    summary: 'Los Lakers de Los Ángeles derrotaron a los Boston Celtics 112-107 en un partido lleno de emoción y jugadas espectaculares que mantuvo a los fanáticos al borde de sus asientos.',
    imageUrl: '/images/news/deporte/nba.jpg',
    alt: 'LeBron James de los Lakers lanzando contra la defensa de los Celtics',
    content: [
      'El partido comenzó con una intensidad inusual desde el primer cuarto, con ambos equipos intercambiando jugadas y mostrando por qué son considerados dos de los mejores franchises de la historia de la NBA.',
      
      'LeBron James fue la figura destacada para los Lakers, contribuyendo con 28 puntos, 8 rebotes y 7 asistencias en una actuación que demuestra que todavía está en la cima de su carrera.',
      
      'Por su parte, Jayson Tatum lideró a los Celtics con 25 puntos y 10 rebotes, pero no fue suficiente para evitar la derrota en un partido que se definió en los últimos minutos.',
      
      'El tercer cuarto fue decisivo para el resultado final, con los Lakers imponiendo su ritmo defensivo y logrando una parcial de 32-24 que les dio una ventaja cómoda para el último periodo.',
      
      'Los Celtics intentaron una remontada épica en los últimos minutos, llegando a estar a solo dos puntos de diferencia a falta de 30 segundos, pero las decisiones clave de los Lakers en los posesiones finales sellaron la victoria.',
      
      'El entrenador de los Lakers, Darvin Ham, destacó la importancia de esta victoria para la confianza del equipo: "Este tipo de partidos nos preparan para los momentos decisivos de la postemporada".',
      
      'Con este resultado, los Lakers mejoran su récord a 3-1 en la temporada, mientras que los Celtics sufren su segunda derrota y quedan con un balance de 2-2.',
      
      'El próximo partido para los Lakers será contra los Warriors de Golden State, en otro enfrentamiento que promete ser un clásico más de la temporada regular.'
    ],
    relatedNews: [
      {
        id: 'deporte-atletas',
        title: 'Atletas Rompen Récords Mundiales',
        href: '/news/deporte/atletas-rompen-records-mundiales',
        category: 'Deporte',
        date: '3 de octubre de 2025',
        datetime: '2025-10-03',
        summary: 'Atletas establecen nuevas plusmarcas mundiales en competencias internacionales.',
        imageUrl: '/images/news/deporte/atletas.jpg',
        alt: 'Atletas Rompen Récords Mundiales'
      },
      {
        id: 'deporte-baseball',
        title: 'Serie Mundial de Baseball Comienza',
        href: '/news/deporte/serie-mundial-baseball-comienza',
        category: 'Deporte',
        date: '2 de octubre de 2025',
        datetime: '2025-10-02',
        summary: 'Los mejores equipos de baseball se enfrentan en la Serie Mundial.',
        imageUrl: '/images/news/deporte/baseball.jpg',
        alt: 'Serie Mundial de Baseball Comienza'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Deporte',
      current: 'Los Lakers vencen a los Celtics 112-107 en un emocionante partido de la NBA'
    }
  },
  {
    id: 'deporte-atletas',
    title: 'Atletas Rompen Récords Mundiales en Campeonato Internacional',
    href: '/news/deporte/atletas-rompen-records-mundiales',
    category: 'Deporte',
    date: '3 de octubre de 2025',
    datetime: '2025-10-03',
    summary: 'Atletas de diferentes países establecieron nuevas plusmarcas mundiales en el campeonato internacional de atletismo, superando marcas que llevaban años vigentes.',
    imageUrl: '/images/news/deporte/atletas.jpg',
    alt: 'Atletas rompiendo récords mundiales en el campeonato internacional',
    content: [
      'El estadio olímpico fue testigo de momentos históricos cuando tres atletas lograron superar récords mundiales que parecían imbatibles, marcando un hito en la historia del atletismo moderno.',
      
      'En la prueba de 100 metros planos, el velocista jamaicano Devon Allen corrió en 9.58 segundos, igualando la marca mundial y demostrando una velocidad extraordinaria.',
      
      'La lanzadora de martillo polaca Anita Włodarczyk superó su propia marca mundial con un lanzamiento de 82.98 metros, extendiendo su dominio en esta disciplina.',
      
      'El salto de altura también tuvo su momento glorioso con el sueco Armand Duplantis, quien saltó 6.23 metros para establecer una nueva plusmarca mundial y dejar a todos presentes asombrados.',
      
      'Expertos deportivos atribuyen estos resultados a la evolución de los métodos de entrenamiento, la nutrición avanzada y el uso de tecnología de punta en la preparación de los atletas.',
      
      'Los organizadores del campeonato destacaron que estos récords demuestran que el límite humano sigue expandiéndose y que el atletismo vive una era dorada en términos de rendimiento.',
      
      'Los atletas que rompieron récords serán reconocidos en una ceremonia especial, y sus marcas serán sometidas a los procesos de verificación oficiales de la Federación Internacional de Atletismo.',
      
      'Este campeonato será recordado como uno de los más importantes en la historia reciente del deporte, inspirando a nuevas generaciones de atletas a superar los límites establecidos.'
    ],
    relatedNews: [
      {
        id: 'deporte-nba',
        title: 'Los Lakers vencen a los Celtics 112-107',
        href: '/news/deporte/lakers-vencen-celtics-nba',
        category: 'Deporte',
        date: '4 de octubre de 2025',
        datetime: '2025-10-04',
        summary: 'Los Lakers derrotan a los Celtics en un partido emocionante de la NBA.',
        imageUrl: '/images/news/deporte/nba.jpg',
        alt: 'Los Lakers vencen a los Celtics 112-107'
      },
      {
        id: 'deporte-natacion',
        title: 'Nadadora Impone Nuevo Récord',
        href: '/news/deporte/nadadora-impone-nuevo-record',
        category: 'Deporte',
        date: '1 de octubre de 2025',
        datetime: '2025-10-01',
        summary: 'Nadadora establece nueva marca mundial en 200 metros mariposa.',
        imageUrl: '/images/news/deporte/natacion.jpg',
        alt: 'Nadadora Impone Nuevo Récord'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Deporte',
      current: 'Atletas Rompen Récords Mundiales en Campeonato Internacional'
    }
  },
  {
    id: 'deporte-mlb',
    title: 'Los Mets vencen a los Braves en un partido decisivo de la MLB',
    href: '/news/deporte/mets-vencen-braves-partido-decisivo-mlb',
    category: 'Deporte',
    date: '7 de octubre de 2025',
    datetime: '2025-10-07',
    summary: 'Los Mets lograron una victoria impresionante sobre los Braves en un partido decisivo de la MLB, que mantuvo a los fanáticos al borde de sus asientos hasta el último out.',
    imageUrl: '/images/news/deporte/baseball.jpg',
    alt: 'Lanzador de los Mets tirando la pelota en un estadio de béisbol lleno',
    content: [
      'El partido comenzó con ambos equipos mostrando un juego sólido en la ofensiva y defensiva, pero fueron los Mets quienes lograron abrir el marcador en la tercera entrada gracias a un home run de su estrella principal.',
      
      'Los Braves intentaron reaccionar, conectando hits importantes en la quinta y sexta entrada, pero la excelente actuación del pitcher abridor de los Mets mantuvo a raya a los bateadores rivales.',
      
      'En la séptima entrada, los Mets ampliaron su ventaja con una jugada estratégica de doble robo y un sencillo oportuno, asegurando un margen cómodo antes del cierre del juego.',
      
      'El bullpen de los Mets demostró solidez, cerrando el partido sin permitir carreras adicionales y asegurando la victoria con un marcador final de 5-3.',
      
      'Con este triunfo, los Mets fortalecen sus aspiraciones de llegar a la postemporada y colocan presión sobre los Braves en la clasificación de la división.',
      
      'Los fanáticos celebraron con entusiasmo, mientras los jugadores de los Mets destacaron el esfuerzo colectivo y la concentración que mantuvieron durante todo el partido.',
      
      'Los Braves, aunque decepcionados, prometieron recuperarse en los próximos encuentros y luchar hasta el final por mantener sus opciones en la temporada.',
      
      'Este partido quedará como uno de los momentos más memorables de la temporada regular, mostrando el talento y la determinación de ambos equipos en la MLB.'
    ],
    relatedNews: [
      {
        id: 'deporte-nba',
        title: 'Los Lakers vencen a los Celtics 112-107 en un emocionante partido de la NBA',
        href: '/news/deporte/lakers-vencen-celtics-nba',
        category: 'Deporte',
        date: '4 de octubre de 2025',
        datetime: '2025-10-04',
        summary: 'Los Lakers lograron una victoria impresionante sobre los Celtics en un partido decisivo de la NBA.',
        imageUrl: '/images/news/deporte/nba.jpg',
        alt: 'LeBron James de los Lakers lanzando contra la defensa de los Celtics'
      },
      {
        id: 'deporte-equipo-local',
        title: 'Gran victoria del equipo local en un emocionante partido de fútbol',
        href: '/news/deporte/gran-victoria-equipo-local-futbol',
        category: 'Deporte',
        date: '4 de octubre de 2025',
        datetime: '2025-10-04',
        summary: 'El equipo local logró una impresionante victoria frente a su principal rival, consolidando su posición.',
        imageUrl: '/images/news/deporte/futbol.jpg',
        alt: 'Gran victoria del equipo local en un emocionante partido de fútbol'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Deporte',
      current: 'Los Mets vencen a los Braves en un partido decisivo de la MLB'
    }
  },
  {
    id: 'deporte-natacion',
    title: 'La selección estadounidense domina el relevo 4x100 metros en el Mundial de Natación',
    href: '/news/deporte/seleccion-estadounidense-dominia-relevo-4x100-metros-mundial-natacion',
    category: 'Deporte',
    date: '4 de octubre de 2025',
    datetime: '2025-10-04',
    summary: 'La selección estadounidense se consagró como la gran protagonista en el relevo 4x100 metros del Mundial de Natación, dominando la competencia de principio a fin y llevándose la medalla de oro con un tiempo impresionante.',
    imageUrl: '/images/news/deporte/natacion.jpg',
    alt: 'Equipo de relevos estadounidense celebrando la medalla de oro en la piscina',
    content: [
      'El equipo, compuesto por cuatro nadadores de élite, mostró una coordinación perfecta y relevos precisos, dejando claro su superioridad frente a rivales de todo el mundo.',
      
      'Desde la salida hasta el último tramo, los estadounidenses mantuvieron el liderazgo, con cada nadador realizando una performance destacada que contribuyó al récord personal del equipo y a su victoria contundente.',
      
      'El público presente en la piscina y los millones de espectadores alrededor del mundo celebraron la actuación impecable del equipo, que reafirma la fortaleza histórica de Estados Unidos en pruebas de relevos.',
      
      'Los nadadores expresaron su emoción tras la competencia, destacando la importancia del trabajo en equipo, la disciplina y la preparación física y mental que los llevó al triunfo.',
      
      'La competencia fue seguida de cerca por las selecciones de Australia, Reino Unido y China, quienes también ofrecieron un alto nivel de desempeño, aunque no pudieron superar la ventaja de Estados Unidos.',
      
      'Con este resultado, la selección estadounidense se consolida como favorita en futuras competencias internacionales y aumenta sus posibilidades de seguir batiendo récords en el ámbito mundial.',
      
      'El triunfo en el relevo 4x100 metros no solo representa una medalla más para el país, sino también un ejemplo de estrategia, sincronización y talento que inspira a las nuevas generaciones de nadadores.',
      
      'El Mundial de Natación continúa con otras pruebas emocionantes, donde los atletas de distintas naciones lucharán por medallas y por dejar su huella en esta prestigiosa competencia internacional.',
      
      'Sin duda, la actuación de Estados Unidos en el relevo 4x100 metros será recordada como uno de los momentos más destacados del Mundial, demostrando el poderío y la dedicación de su selección de natación.'
    ],
    relatedNews: [
      {
        id: 'deporte-nba',
        title: 'Los Lakers vencen a los Celtics 112-107 en un emocionante partido de la NBA',
        href: '/news/deporte/lakers-vencen-celtics-nba',
        category: 'Deporte',
        date: '4 de octubre de 2025',
        datetime: '2025-10-04',
        summary: 'Los Lakers lograron una victoria impresionante sobre los Celtics en un partido decisivo de la NBA.',
        imageUrl: '/images/news/deporte/nba.jpg',
        alt: 'LeBron James de los Lakers lanzando contra la defensa de los Celtics'
      },
      {
        id: 'deporte-atletas',
        title: 'Atletas Rompen Récords Mundiales en Campeonato Internacional',
        href: '/news/deporte/atletas-rompen-records-mundiales',
        category: 'Deporte',
        date: '4 de octubre de 2025',
        datetime: '2025-10-04',
        summary: 'Atletas de diferentes países establecen nuevas marcas mundiales en varias disciplinas.',
        imageUrl: '/images/news/deporte/atletas.jpg',
        alt: 'Atletas rompiendo récords mundiales en el campeonato internacional'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Deporte',
      current: 'La selección estadounidense domina el relevo 4x100 metros en el Mundial de Natación'
    }
  },
  {
    id: 'deporte-equipo-local',
    title: 'Gran victoria del equipo local en un emocionante partido de fútbol',
    href: '/news/deporte/gran-victoria-equipo-local-futbol',
    category: 'Deporte',
    date: '4 de octubre de 2025',
    datetime: '2025-10-04',
    summary: 'En una noche llena de emoción, el equipo local logró una impresionante victoria frente a su principal rival, consolidando su posición como uno de los favoritos del campeonato nacional.',
    imageUrl: '/images/news/deporte/futbol.jpg',
    alt: 'Jugadores del equipo local celebrando una victoria',
    content: [
      'Con un marcador final de 3-1, el conjunto demostró un excelente desempeño ofensivo y una defensa sólida que impidió cualquier intento de remontada del adversario. El técnico del equipo destacó la unión y el compromiso del plantel como claves del éxito.',
      
      'Los fanáticos celebraron durante horas en las calles, mientras las redes sociales se llenaron de mensajes de apoyo y orgullo. Los analistas deportivos coincidieron en que esta victoria podría marcar un punto de inflexión en la temporada, fortaleciendo la moral del equipo y la confianza de los seguidores, ya era hora que el equipo obtuviera una victoria.',
      
      'Tras el partido, el entrenador declaró en rueda de prensa: "El equipo mostró carácter, disciplina y pasión. Cada jugador entendió su rol y lo cumplió a la perfección. Estoy orgulloso de lo que hemos logrado hoy y confiado en que podemos seguir mejorando". Los próximos encuentros serán cruciales para determinar la clasificación hacia la fase final del campeonato.',
      
      'Por último, la comunidad local ha comenzado a organizar celebraciones y homenajes para los jugadores, reconociendo su esfuerzo y dedicación. Se espera que la ciudad viva una semana llena de entusiasmo deportivo, consolidando aún más la pasión por el fútbol en la región.'
    ],
    relatedNews: [
      {
        id: 'deporte-nba',
        title: 'Los Lakers vencen a los Celtics 112-107 en un emocionante partido de la NBA',
        href: '/news/deporte/lakers-vencen-celtics-nba',
        category: 'Deporte',
        date: '4 de octubre de 2025',
        datetime: '2025-10-04',
        summary: 'Los Lakers lograron una victoria impresionante sobre los Celtics en un partido decisivo de la NBA.',
        imageUrl: '/images/news/deporte/nba.jpg',
        alt: 'LeBron James de los Lakers lanzando contra la defensa de los Celtics'
      },
      {
        id: 'deporte-espana-alemania',
        title: 'España se clasifica para la final del Mundial de Fútbol',
        href: '/news/deporte/espana-clasifica-final-mundial-futbol',
        category: 'Deporte',
        date: '4 de octubre de 2025',
        datetime: '2025-10-04',
        summary: 'España se clasificó para la final del Mundial de Fútbol tras vencer a Alemania en un emocionante partido.',
        imageUrl: '/images/news/deporte/spain-germany.jpg',
        alt: 'España se clasifica para la final del Mundial de Fútbol'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Deporte',
      current: 'Gran victoria del equipo local en un emocionante partido de fútbol'
    }
  },
  {
    id: 'deporte-espana-alemania',
    title: 'España se clasifica para la final del Mundial de Fútbol tras vencer a Alemania',
    href: '/news/deporte/espana-clasifica-final-mundial-futbol',
    category: 'Deporte',
    date: '4 de octubre de 2025',
    datetime: '2025-10-04',
    summary: 'España se clasificó para la final del Mundial de Fútbol tras vencer a Alemania en un emocionante partido lleno de intensidad y momentos memorables. Desde el inicio, ambos equipos mostraron un alto nivel de juego, manteniendo a los aficionados al borde de sus asientos.',
    imageUrl: '/images/news/deporte/spain-germany.jpg',
    alt: 'Selección española de fútbol celebrando la clasificación a la final del Mundial',
    content: [
      'El primer tiempo estuvo marcado por la presión ofensiva de Alemania, que generó varias oportunidades de gol, pero la defensa española se mantuvo firme, con destacadas intervenciones del portero y una coordinación impecable en la línea defensiva.',
      
      'En la segunda mitad, España logró imponer su ritmo de juego. El gol decisivo llegó gracias a una jugada colectiva que culminó con un remate preciso de un jugador destacado, desatando la euforia en la grada y marcando la diferencia en el marcador.',
      
      'Además de la anotación clave, otros jugadores españoles se destacaron por su desempeño, mostrando gran visión de juego y contribuyendo a mantener la posesión del balón en momentos cruciales del encuentro.',
      
      'El equipo alemán no bajó los brazos y buscó el empate hasta los últimos minutos, generando ocasiones peligrosas, pero la solidez de la defensa española y la rapidez en los contraataques permitieron mantener la ventaja y asegurar la clasificación.',
      
      'Con esta victoria, España asegura su lugar en la final del Mundial, donde se enfrentará a su rival en un partido que promete ser histórico y que atraerá la atención de millones de aficionados alrededor del mundo.',
      
      'El entrenador del equipo español destacó la disciplina, el trabajo en equipo y la concentración de sus jugadores, resaltando que el triunfo es fruto del esfuerzo colectivo y de la preparación estratégica que realizaron durante el torneo. España se prepara para disputar la final con el objetivo de coronarse campeón del mundo.'
    ],
    relatedNews: [
      {
        id: 'deporte-nba',
        title: 'Los Lakers vencen a los Celtics 112-107 en un emocionante partido de la NBA',
        href: '/news/deporte/lakers-vencen-celtics-nba',
        category: 'Deporte',
        date: '4 de octubre de 2025',
        datetime: '2025-10-04',
        summary: 'Los Lakers lograron una victoria impresionante sobre los Celtics en un partido decisivo de la NBA.',
        imageUrl: '/images/news/deporte/nba.jpg',
        alt: 'LeBron James de los Lakers lanzando contra la defensa de los Celtics'
      },
      {
        id: 'deporte-equipo-local',
        title: 'Gran victoria del equipo local en un emocionante partido de fútbol',
        href: '/news/deporte/gran-victoria-equipo-local-futbol',
        category: 'Deporte',
        date: '4 de octubre de 2025',
        datetime: '2025-10-04',
        summary: 'El equipo local logró una impresionante victoria frente a su principal rival, consolidando su posición.',
        imageUrl: '/images/news/deporte/futbol.jpg',
        alt: 'Gran victoria del equipo local en un emocionante partido de fútbol'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Deporte',
      current: 'España se clasifica para la final del Mundial de Fútbol tras vencer a Alemania'
    }
  }
];
