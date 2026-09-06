import type { FullNewsArticle } from '../newsModels';

export const saludArticles: FullNewsArticle[] = [
  {
    id: 'salud-antibioticos',
    title: 'Aumenta la preocupación por la resistencia a los antibióticos a nivel mundial',
    href: '/news/salud/aumenta-preocupacion-resistencia-antibioticos-mundial',
    category: 'Salud',
    date: '9 de octubre de 2025',
    datetime: '2025-10-09',
    summary: 'La resistencia a los antibióticos continúa siendo una amenaza creciente para la salud pública a nivel mundial, generando preocupación entre científicos y autoridades sanitarias.',
    imageUrl: '/images/news/salud/antibioticos.avif',
    alt: 'Resistencia a los antibióticos',
    content: [
      'Expertos alertan que el uso excesivo e inadecuado de antibióticos ha acelerado la aparición de bacterias resistentes, lo que dificulta el tratamiento de infecciones comunes y aumenta el riesgo de complicaciones graves.',
      
      'Organizaciones internacionales han instado a implementar políticas más estrictas para controlar la prescripción de antibióticos, así como promover campañas de concienciación sobre su uso responsable.',
      
      'Investigaciones recientes muestran que la resistencia a los antibióticos podría causar millones de muertes adicionales en las próximas décadas si no se toman medidas efectivas de manera inmediata.',
      
      'Los científicos destacan la importancia de desarrollar nuevos medicamentos y tratamientos alternativos, así como fortalecer los sistemas de vigilancia epidemiológica para detectar y contener brotes de bacterias resistentes.',
      
      'En conclusión, la resistencia a los antibióticos representa uno de los mayores desafíos de la medicina moderna, y requiere cooperación internacional y un compromiso firme para proteger la salud global.'
    ],
    relatedNews: [
      {
        id: 'salud-contaminacion',
        title: 'La contaminación del aire aumenta el riesgo de enfermedades respiratorias',
        href: '/news/salud/contaminacion-aire-aumenta-riesgo-enfermedades-respiratorias',
        category: 'Salud',
        date: '9 de octubre de 2025',
        datetime: '2025-10-09',
        summary: 'Aumenta el riesgo de enfermedades respiratorias.',
        imageUrl: '/images/news/salud/contaminacion.avif',
        alt: 'Contaminación del aire y salud'
      },
      {
        id: 'salud-corazon',
        title: 'Nueva terapia cardiovascular promete mejorar la salud del corazón',
        href: '/news/salud/nueva-terapia-cardiovascular-mejora-salud-corazon',
        category: 'Salud',
        date: '8 de octubre de 2025',
        datetime: '2025-10-08',
        summary: 'Promete mejorar la salud del corazón.',
        imageUrl: '/images/news/salud/corazon.jpg',
        alt: 'Nueva terapia cardiovascular'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Salud',
      current: 'Aumenta la preocupación por la resistencia a los antibióticos a nivel mundial'
    }
  },
  {
    id: 'salud-contaminacion',
    title: 'La contaminación del aire aumenta el riesgo de enfermedades respiratorias',
    href: '/news/salud/contaminacion-aire-aumenta-riesgo-enfermedades-respiratorias',
    category: 'Salud',
    date: '9 de octubre de 2025',
    datetime: '2025-10-09',
    summary: 'La contaminación del aire se ha convertido en un problema creciente que afecta la salud de millones de personas en todo el mundo, agravando condiciones preexistentes y creando nuevos problemas de salud en la población general.',
    imageUrl: '/images/news/salud/contaminacion.avif',
    alt: 'Contaminación del aire',
    content: [
      'Estudios recientes indican que la exposición prolongada a contaminantes atmosféricos aumenta significativamente el riesgo de desarrollar enfermedades respiratorias, incluyendo asma, bronquitis y otras afecciones pulmonares crónicas.',
      
      'Expertos en salud pública advierten que las partículas finas y los gases tóxicos presentes en el aire pueden dañar el sistema respiratorio y debilitar las defensas del organismo frente a infecciones virales y bacterianas.',
      
      'Las autoridades ambientales han instado a implementar políticas más estrictas para reducir las emisiones industriales, promover el transporte limpio y concienciar a la población sobre la importancia de reducir la huella de carbono individual.',
      
      'Los médicos recomiendan que las personas con problemas respiratorios preexistentes tomen precauciones adicionales, como evitar las zonas de alta contaminación durante las horas pico y usar mascarillas protectoras cuando sea necesario.',
      
      'En conclusión, la contaminación del aire representa un riesgo serio para la salud respiratoria global y requiere un esfuerzo conjunto y sostenido de gobiernos, empresas y ciudadanos para mitigar sus efectos y proteger a las generaciones futuras.'
    ],
    relatedNews: [
      {
        id: 'salud-antibioticos',
        title: 'Aumenta la preocupación por la resistencia a los antibióticos',
        href: '/news/salud/aumenta-preocupacion-resistencia-antibioticos-mundial',
        category: 'Salud',
        date: '9 de octubre de 2025',
        datetime: '2025-10-09',
        summary: 'Preocupación mundial por superbacterias.',
        imageUrl: '/images/news/salud/antibioticos.avif',
        alt: 'Resistencia a los antibióticos'
      },
      {
        id: 'salud-corazon',
        title: 'Nueva terapia cardiovascular promete mejorar la salud del corazón',
        href: '/news/salud/nueva-terapia-cardiovascular-mejora-salud-corazon',
        category: 'Salud',
        date: '8 de octubre de 2025',
        datetime: '2025-10-08',
        summary: 'Promete mejoras en salud del corazón.',
        imageUrl: '/images/news/salud/corazon.jpg',
        alt: 'Nueva terapia cardiovascular'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Salud',
      current: 'La contaminación del aire aumenta el riesgo de enfermedades respiratorias'
    }
  },
  {
        id: 'salud-corazon',
        title: 'Nueva terapia cardiovascular promete mejorar la salud del corazón',
        href: '/news/salud/nueva-terapia-cardiovascular-mejora-salud-corazon',
    category: 'Salud',
    date: '8 de octubre de 2025',
    datetime: '2025-10-08',
    summary: 'Investigadores médicos han desarrollado una innovadora terapia cardiovascular que promete revolucionar el tratamiento de enfermedades del corazón y mejorar la calidad de vida de millones de pacientes.',
    imageUrl: '/images/news/salud/corazon.jpg',
    alt: 'Nueva terapia cardiovascular promete mejorar la salud del corazón',
    content: [
      'La nueva terapia, desarrollada después de una década de investigación, utiliza células madre y técnicas de ingeniería genética para regenerar el tejido cardíaco dañado por infartos y otras enfermedades cardiovasculares.',
      
      'Los ensayos clínicos iniciales han mostrado resultados prometedores, con pacientes experimentando mejoras significativas en la función cardíaca y una reducción en los síntomas de insuficiencia cardíaca.',
      
      'Los cardiólogos destacan que esta terapia podría reducir la necesidad de trasplantes de corazón y otros procedimientos invasivos, ofreciendo una alternativa menos riesgosa y más accesible para los pacientes.',
      
      'Las autoridades sanitarias están evaluando la aprobación de la terapia, que podría estar disponible para el público general en los próximos dos años después de completar las fases finales de los ensayos clínicos.',
      
      'Los investigadores también están explorando aplicaciones de esta tecnología para otras enfermedades degenerativas, abriendo nuevas posibilidades en el campo de la medicina regenerativa.'
    ],
    relatedNews: [
      {
        id: 'salud-antibioticos',
        title: 'Aumenta la preocupación por la resistencia a los antibióticos',
        href: '/news/salud/aumenta-preocupacion-resistencia-antibioticos-mundial',
        category: 'Salud',
        date: '9 de octubre de 2025',
        datetime: '2025-10-09',
        summary: 'Preocupación mundial por superbacterias.',
        imageUrl: '/images/news/salud/antibioticos.avif',
        alt: 'Resistencia a los antibióticos'
      },
      {
        id: 'salud-contaminacion',
        title: 'La contaminación del aire aumenta el riesgo de enfermedades respiratorias',
        href: '/news/salud/contaminacion-aire-aumenta-riesgo-enfermedades-respiratorias',
        category: 'Salud',
        date: '9 de octubre de 2025',
        datetime: '2025-10-09',
        summary: 'Aumenta el riesgo de enfermedades respiratorias.',
        imageUrl: '/images/news/salud/contaminacion.avif',
        alt: 'Contaminación del aire y salud'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Salud',
      current: 'Nueva terapia cardiovascular promete mejorar la salud del corazón'
    }
  },
  {
    id: 'salud-cardiovascular',
    title: 'Avances en medicina: nueva terapia promete mejorar la salud cardiovascular',
    href: '/news/salud/avances-medicina-nueva-terapia-mejora-salud-cardiovascular',
    category: 'Salud',
    date: '9 de octubre de 2025',
    datetime: '2025-10-09',
    summary: 'Un nuevo avance en medicina ha generado expectativas en la comunidad científica y entre los pacientes: una terapia innovadora promete mejorar la salud cardiovascular y reducir los riesgos asociados a enfermedades del corazón.',
    imageUrl: '/images/news/salud/corazon.jpg',
    alt: 'Salud Cardiovascular',
    content: [
      'Los estudios iniciales muestran que la terapia puede ayudar a fortalecer el músculo cardíaco, mejorar la circulación y disminuir la inflamación en los vasos sanguíneos. Los investigadores destacan que este tratamiento podría complementar las estrategias tradicionales como dieta, ejercicio y medicamentos.',
      
      'Los ensayos clínicos se encuentran en fases avanzadas, y los primeros resultados indican mejoras significativas en la presión arterial y la función cardíaca de los participantes. Los científicos aseguran que la seguridad del tratamiento ha sido una prioridad durante todo el proceso de investigación.',
      
      'Especialistas en cardiología consideran que esta terapia podría cambiar la forma en que se abordan enfermedades como la insuficiencia cardíaca y la hipertensión, ofreciendo una alternativa que trabaja directamente sobre los factores fisiológicos que afectan el corazón.',
      
      'A pesar del optimismo, los expertos advierten que aún se requieren estudios a largo plazo para confirmar la eficacia y seguridad del tratamiento antes de que pueda implementarse de forma masiva en el sistema de salud. No obstante, la comunidad médica ve con esperanza los avances alcanzados hasta ahora.',
      
      'En conclusión, la nueva terapia cardiovascular representa un paso importante en la medicina moderna, ofreciendo la posibilidad de mejorar la calidad de vida de millones de personas y marcando un hito significativo en la investigación sobre la salud del corazón.'
    ],
    relatedNews: [
      {
        id: 'salud-antibioticos',
        title: 'Aumenta la preocupación por la resistencia a los antibióticos a nivel mundial',
        href: '/news/salud/aumenta-preocupacion-resistencia-antibioticos-mundial',
        category: 'Salud',
        date: '9 de octubre de 2025',
        datetime: '2025-10-09',
        summary: 'Preocupación mundial por superbacterias.',
        imageUrl: '/images/news/salud/antibioticos.avif',
        alt: 'Aumenta la preocupación por la resistencia a los antibióticos a nivel mundial'
      },
      {
        id: 'salud-contaminacion',
        title: 'La contaminación del aire aumenta el riesgo de enfermedades respiratorias',
        href: '/news/salud/contaminacion-aire-aumenta-riesgo-enfermedades-respiratorias',
        category: 'Salud',
        date: '9 de octubre de 2025',
        datetime: '2025-10-09',
        summary: 'Riesgo de enfermedades respiratorias en alza.',
        imageUrl: '/images/news/salud/contaminacion.avif',
        alt: 'La contaminación del aire aumenta el riesgo de enfermedades respiratorias'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Salud',
      current: 'Avances en medicina: nueva terapia promete mejorar la salud cardiovascular'
    }
  },
  {
    id: 'salud-mental',
    title: 'La salud mental se convierte en prioridad ante el aumento de estrés y ansiedad',
    href: '/news/salud/salud-mental-prioridad-aumento-estres-ansiedad',
    category: 'Salud',
    date: '9 de octubre de 2025',
    datetime: '2025-10-09',
    summary: 'El aumento de estrés y ansiedad en la población ha convertido la salud mental en una prioridad tanto para las autoridades sanitarias como para la sociedad en general, impulsando nuevas estrategias de apoyo y concientización.',
    imageUrl: '/images/news/salud/salud-mental.jpg',
    alt: 'Salud Mental',
    content: [
      'Expertos señalan que factores como la vida laboral intensa, la incertidumbre económica y los rápidos cambios sociales han incrementado los niveles de ansiedad, afectando la calidad de vida y el bienestar emocional de millones de personas.',
      
      'Los profesionales de la salud mental recomiendan implementar programas de prevención en escuelas y lugares de trabajo, promover hábitos saludables como el ejercicio y el mindfulness, y facilitar el acceso a terapias psicológicas.',
      
      'Además, organizaciones internacionales han subrayado la importancia de concienciar a la población sobre la detección temprana de síntomas y la eliminación del estigma social asociado a buscar ayuda profesional para problemas mentales.',
      
      'Se espera que la inclusión de la salud mental en las políticas de salud pública y la educación emocional contribuya a crear entornos más comprensivos y a reducir el impacto negativo del estrés crónico en la sociedad.',
      
      'En conclusión, la salud mental se ha consolidado como un pilar fundamental del bienestar integral, requiriendo esfuerzos coordinados y sostenidos de gobiernos, instituciones y comunidades para enfrentar los desafíos actuales.'
    ],
    relatedNews: [
      {
        id: 'salud-antibioticos',
        title: 'Aumenta la preocupación por la resistencia a los antibióticos a nivel mundial',
        href: '/news/salud/aumenta-preocupacion-resistencia-antibioticos-mundial',
        category: 'Salud',
        date: '9 de octubre de 2025',
        datetime: '2025-10-09',
        summary: 'Preocupación mundial por superbacterias.',
        imageUrl: '/images/news/salud/antibioticos.avif',
        alt: 'Aumenta la preocupación por la resistencia a los antibióticos a nivel mundial'
      },
      {
        id: 'salud-contaminacion',
        title: 'La contaminación del aire aumenta el riesgo de enfermedades respiratorias',
        href: '/news/salud/contaminacion-aire-aumenta-riesgo-enfermedades-respiratorias',
        category: 'Salud',
        date: '9 de octubre de 2025',
        datetime: '2025-10-09',
        summary: 'Riesgo de enfermedades respiratorias en alza.',
        imageUrl: '/images/news/salud/contaminacion.avif',
        alt: 'La contaminación del aire aumenta el riesgo de enfermedades respiratorias'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Salud',
      current: 'La salud mental se convierte en prioridad ante el aumento de estrés y ansiedad'
    }
  },
  {
    id: 'salud-azucar',
    title: 'El consumo excesivo de azúcares aumenta el riesgo de enfermedades metabólicas',
    href: '/news/salud/noticia-sobre-azucar',
    category: 'Salud',
    date: '9 de octubre de 2025',
    datetime: '2025-10-09',
    summary: 'El consumo excesivo de azúcares añadidos se ha convertido en un problema crítico de salud pública, afectando a millones de personas en todo el mundo y contribuyendo al aumento de enfermedades crónicas graves.',
    imageUrl: '/images/news/salud/azucar.jpg',
    alt: 'Variedad de alimentos y bebidas azucaradas sobre una mesa',
    content: [
      'Estudios recientes, validados por múltiples instituciones sanitarias, muestran que una ingesta elevada de azúcares añadidos está directamente relacionada con un mayor riesgo de desarrollar enfermedades metabólicas complejas, como diabetes tipo 2, obesidad severa y síndrome metabólico.',

      'Los expertos advierten que el consumo frecuente de bebidas azucaradas, dulces y alimentos ultraprocesados puede alterar rápidamente los niveles de glucosa en la sangre y afectar la función de la insulina, creando una resistencia que contribuye al deterioro de la salud a largo plazo.',

      'Además, la exposición temprana a dietas altas en azúcar durante la infancia puede generar hábitos alimenticios poco saludables y adictivos que se prolongan hasta la adultez, aumentando exponencialmente la probabilidad de complicaciones metabólicas en etapas posteriores de la vida.',

      'Las autoridades sanitarias recomiendan encarecidamente moderar la ingesta de azúcares, leer cuidadosamente las etiquetas nutricionales y priorizar alimentos naturales como frutas, verduras y granos integrales, que aportan energía y nutrientes esenciales sin los riesgos asociados a los azúcares refinados.',

      'En conclusión, reducir el consumo de azúcares no es solo una elección dietética, sino una medida preventiva clave para proteger la salud metabólica, mejorar la calidad de vida y disminuir la incidencia de enfermedades crónicas en la población mundial.'
    ],
    relatedNews: [
      {
        id: 'salud-antibioticos',
        title: 'Aumenta la preocupación por la resistencia a los antibióticos',
        href: '/news/salud/aumenta-preocupacion-resistencia-antibioticos-mundial',
        category: 'Salud',
        date: '9 de octubre de 2025',
        datetime: '2025-10-09',
        summary: 'Preocupación mundial por superbacterias.',
        imageUrl: '/images/news/salud/antibioticos.avif',
        alt: 'Resistencia a los antibióticos'
      },
      {
        id: 'salud-contaminacion',
        title: 'La contaminación del aire aumenta el riesgo de enfermedades respiratorias',
        href: '/news/salud/contaminacion-aire-aumenta-riesgo-enfermedades-respiratorias',
        category: 'Salud',
        date: '9 de octubre de 2025',
        datetime: '2025-10-09',
        summary: 'Riesgo de enfermedades respiratorias en alza.',
        imageUrl: '/images/news/salud/contaminacion.avif',
        alt: 'Contaminación del aire y salud'
      }
    ],
    breadcrumb: {
      home: 'Inicio',
      category: 'Salud',
      current: 'El consumo excesivo de azúcares aumenta el riesgo de enfermedades metabólicas'
    }
  }
];
