export interface LegalSection {
  id: string
  title: string
  content: string
  email?: string
}

export interface LegalPage {
  title: string
  date: string
  intro: string
  sections: LegalSection[]
}

export const legalContent: Record<'privacy' | 'terms', LegalPage> = {
  privacy: {
    title: 'Política de Privacidad',
    date: '23 de abril de 2026',
    intro: 'En NewsHub nos tomamos muy en serio la privacidad de nuestros usuarios. Esta política describe cómo recopilamos, usamos y protegemos la información personal que nos proporcionas al utilizar nuestro sitio web.',
    sections: [
      {
        id: '1',
        title: '1. Información que recopilamos',
        content: 'Podemos recopilar información personal como tu nombre, correo electrónico y preferencias cuando interactúas con nuestros formularios de contacto, boletines informativos u otros servicios.'
      },
      {
        id: '2',
        title: '2. Uso de la información',
        content: 'La información que recopilamos se utiliza para mejorar la experiencia del usuario, enviar comunicaciones relevantes y personalizar el contenido que ofrecemos.'
      },
      {
        id: '3',
        title: '3. Protección de la información',
        content: 'Implementamos medidas de seguridad técnicas y organizativas para proteger tu información frente al acceso no autorizado, pérdida o divulgación.'
      },
      {
        id: '4',
        title: '4. Cookies y tecnologías similares',
        content: 'NewsHub puede utilizar cookies para mejorar la funcionalidad del sitio web y analizar el tráfico. Puedes administrar las cookies desde la configuración de tu navegador.'
      },
      {
        id: '5',
        title: '5. Enlaces a terceros',
        content: 'Nuestro sitio puede contener enlaces a sitios web de terceros. NewsHub no se hace responsable de las políticas de privacidad de estos sitios externos.'
      },
      {
        id: '6',
        title: '6. Cambios en la política de privacidad',
        content: 'Nos reservamos el derecho de actualizar esta política en cualquier momento. Los cambios serán publicados en esta página con la fecha de actualización correspondiente.'
      },
      {
        id: '7',
        title: '7. Contacto',
        content: 'Si tienes preguntas sobre esta política de privacidad, puedes contactarnos a través de nuestro correo electrónico: ',
        email: 'contacto@newshub.com'
      }
    ]
  },
  terms: {
    title: 'Términos de Uso',
    date: '23 de abril de 2026',
    intro: 'Bienvenido a NewsHub. Al acceder y utilizar nuestro sitio web, aceptas cumplir con los siguientes términos de uso:',
    sections: [
      {
        id: '1',
        title: '1. Aceptación de términos',
        content: 'Al usar NewsHub, aceptas estar sujeto a estos Términos de Uso y nuestra Política de Privacidad. Si no estás de acuerdo, por favor no uses nuestro sitio.'
      },
      {
        id: '2',
        title: '2. Uso permitido',
        content: 'Puedes utilizar el sitio para fines personales y no comerciales únicamente. Queda prohibido copiar, reproducir, distribuir o modificar cualquier contenido sin autorización.'
      },
      {
        id: '3',
        title: '3. Contenido del usuario',
        content: 'Cualquier comentario o contenido que publiques debe ser apropiado, respetuoso y no infringir los derechos de terceros.'
      },
      {
        id: '4',
        title: '4. Propiedad intelectual',
        content: 'Todo el contenido de NewsHub, incluyendo textos, imágenes, logotipos y gráficos, está protegido por derechos de autor y marcas registradas.'
      },
      {
        id: '5',
        title: '5. Limitación de responsabilidad',
        content: 'NewsHub no se hace responsable por los daños directos o indirectos que puedan surgir del uso de este sitio web o de la información contenida en él.'
      },
      {
        id: '6',
        title: '6. Enlaces externos',
        content: 'Nuestro sitio puede contener enlaces a sitios web de terceros. No somos responsables del contenido o prácticas de privacidad de estos sitios externos.'
      },
      {
        id: '7',
        title: '7. Modificaciones',
        content: 'Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor en el momento de su publicación en este sitio.'
      },
      {
        id: '8',
        title: '8. Contacto',
        content: 'Si tienes preguntas sobre estos términos de uso, puedes contactarnos a través de nuestro correo electrónico: ',
        email: 'contacto@newshub.com'
      }
    ]
  }
}
