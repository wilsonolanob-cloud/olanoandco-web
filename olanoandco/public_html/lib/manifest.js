/* Datos de marca de OlanoandCo — única fuente para el comportamiento del sitio.
   El contenido visible está escrito en el HTML; aquí solo hay datos que usa el JS. */
(function () {
  "use strict";
  window.__BRAND__ = {
    name: "OlanoandCo",
    whatsapp: "584143755434",
    phone: "+58 414-3755434",
    email: "olanofirm@gmail.com",
    address: "Carrera 20 entre calles 16 y 17, Edificio Banco Plaza, Barquisimeto, Lara, Venezuela",
    hours: "lunes a sábado, de 7:30 a. m. a 5:30 p. m.",
    maps: "https://www.google.com/maps/search/?api=1&query=Edificio%20Banco%20Plaza%2C%20Carrera%2020%20entre%20calles%2016%20y%2017%2C%20Barquisimeto%2C%20Lara%2C%20Venezuela",
    api: {
      token: "api/token.php",
      contact: "api/contacto.php",
      diagnostic: "api/diagnostico.php",
      assistant: "api/asistente.php"
    },

    // Respuestas de respaldo del asistente cuando la IA no está disponible.
    // Solo información oficial: sin precios, clientes ni resultados.
    faq: [
      { keys: ["precio", "costo", "cuesta", "tarifa", "presupuesto", "cobran"],
        answer: "El precio depende del servicio y del alcance de cada proyecto, por eso preparamos cada propuesta a medida. Lo mejor es escribirnos y te explicamos las opciones." },
      { keys: ["dónde", "donde", "ubicación", "ubicacion", "dirección", "direccion", "oficina", "horario", "hora", "abren"],
        answer: "Estamos en la Carrera 20 entre calles 16 y 17, Edificio Banco Plaza, Barquisimeto, Lara. Atendemos de lunes a sábado, de 7:30 a. m. a 5:30 p. m." },
      { keys: ["conviene", "necesito", "recomienda", "empezar", "cuál", "cual"],
        answer: "Para orientarte mejor, te recomiendo completar el diagnóstico digital de esta página: son unas preguntas breves y al final verás qué servicios podrían ayudarte más." },
      { keys: ["marca personal", "ceo", "dueño", "propietario", "representante", "cara"],
        answer: "Nuestra especialidad es crear marcas personales para empresas: convertimos al propietario, CEO o representante en la voz visible del negocio. Incluye estrategia de comunicación, planificación de contenido, guiones, producción y edición de vídeos." },
      { keys: ["web", "página", "pagina", "sitio", "landing"],
        answer: "Creamos páginas web nuevas y remodelamos sitios existentes: diseño a medida, rápidas, adaptadas a móviles y pensadas para facilitar el contacto con clientes potenciales." },
      { keys: ["whatsapp", "agente", "bot", "automatiz", "inteligencia artificial", " ia"],
        answer: "Implementamos agentes de IA para WhatsApp que responden consultas frecuentes, orientan a tus clientes, recopilan información y pueden pasar la conversación a una persona de tu equipo." },
      { keys: ["google", "meta", "anuncio", "publicidad", "ads", "campaña", "facebook", "instagram"],
        answer: "Gestionamos campañas en Google Ads y Meta Ads (Instagram y Facebook): planificación, creatividades, seguimiento y optimización." },
      { keys: ["auditor", "análisis", "analisis", "youtube", "ecommerce", "e-commerce", "tienda"],
        answer: "Realizamos auditorías de negocio, de marca personal, de YouTube y de e-commerce. Las lidera Eva Duque, licenciada en Psicología, con un enfoque profundo y riguroso." },
      { keys: ["video", "vídeo", "edición", "edicion", "editor"],
        answer: "Ofrecemos edición profesional de vídeos, a cargo de un editor con más de siete años de experiencia, cuidando el ritmo, la narrativa y la adaptación a cada plataforma." },
      { keys: ["contacto", "contactar", "teléfono", "telefono", "correo", "email", "llamar", "hablar"],
        answer: "Puedes escribirnos por WhatsApp o llamar al +58 414-3755434, enviar un correo a olanofirm@gmail.com o completar el diagnóstico digital de la web. Wilson Olano atiende personalmente las consultas comerciales." }
    ]
  };
})();
