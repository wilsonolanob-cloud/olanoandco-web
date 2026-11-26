/* Estudio OlanoandCo: simulador de marca en 3D (Instagram, web y agente de IA).
   La foto se lee y se reduce en el navegador; nunca se envía al servidor.
   A /api/estudio.php solo llegan el nombre del negocio y el sector. */
(function () {
  "use strict";

  var root = document.querySelector("[data-studio]");
  if (!root) return;

  var $ = function (sel, scope) { return (scope || root).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || root).querySelectorAll(sel)); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var WA = "https://wa.me/584143755434";

  var form = $("[data-studio-form]");
  var stage = $("[data-studio-stage]");
  var scene = $("[data-studio-scene]");
  var phone = $("[data-studio-phone]");
  var laptop = $("[data-studio-laptop]");
  var loading = $("[data-studio-loading]");
  var chatForm = $("[data-studio-chat]");
  var chatInput = $("[data-studio-msg]");
  var quickBox = $("[data-studio-quick]");
  var cta = $("[data-studio-cta]");
  var errorBox = $("[data-studio-error]");

  var state = {
    view: "ig",
    photo: "",
    name: "Tu Empresa",
    sector: "Salud y bienestar",
    color: "#536DFF",
    data: null,
    created: false,
    chat: [],
    busy: false,
    ticker: null
  };

  /* ---------------------------------------------------------- Plantillas de respaldo */
  var SECTORS = {
    "Salud y bienestar": {
      bio: ["🩺 Cuidamos tu salud con cercanía", "✨ Atención moderna y personalizada", "📅 Agenda tu cita por WhatsApp 👇"],
      hl: ["Servicios", "Equipo", "Citas", "Consejos"],
      posts: ["3 señales de que debes consultar", "Así es tu primera cita", "Mitos que debes dejar de creer", "Conoce a nuestro equipo", "Tu salud no puede esperar", "Responde el especialista"],
      web: { kicker: "Salud y bienestar", headline: "Tu salud en las mejores manos", sub: "Atención cercana, profesional y sin esperas. Agenda tu cita en minutos.", cta: "Agendar cita",
        services: [["Consultas", "Evaluación completa y un plan claro para ti."], ["Tratamientos", "Soluciones modernas adaptadas a cada paciente."], ["Seguimiento", "Te acompañamos en cada etapa del proceso."]] },
      quick: ["Quiero agendar una cita", "¿Qué servicios ofrecen?", "¿Atienden los sábados?"],
      auto: ["Agendamiento automático de citas", "Recordatorios por WhatsApp", "Respuestas a preguntas frecuentes", "Seguimiento de pacientes"]
    },
    "Restaurante y comida": {
      bio: ["🍽️ Sabores que se recuerdan", "🔥 Hecho al momento, con amor", "🛵 Pide por WhatsApp 👇"],
      hl: ["Menú", "Pedidos", "Promos", "Reseñas"],
      posts: ["El plato que todos piden", "Así preparamos tu pedido", "Combo del fin de semana", "Detrás de la cocina", "¿Ya probaste este postre?", "Tu mesa te espera"],
      web: { kicker: "Restaurante", headline: "Comida que te hace volver", sub: "Ingredientes frescos, recetas de la casa y pedidos en minutos.", cta: "Ver el menú",
        services: [["Menú del día", "Platos frescos preparados al momento."], ["Delivery", "Pide por WhatsApp y recíbelo caliente."], ["Eventos", "Celebra con nosotros tus momentos especiales."]] },
      quick: ["¿Me envían el menú?", "Quiero hacer un pedido", "¿Hacen delivery?"],
      auto: ["Toma de pedidos por WhatsApp", "Envío automático del menú", "Reservas de mesa", "Confirmación de entregas"]
    },
    "Belleza y estética": {
      bio: ["💅 Resaltamos tu mejor versión", "✨ Belleza con técnica y detalle", "📅 Reserva tu turno 👇"],
      hl: ["Servicios", "Antes y después", "Turnos", "Tips"],
      posts: ["El look que está en tendencia", "Antes y después real", "3 errores al cuidar tu piel", "Así es una sesión con nosotros", "Tu momento de consentirte", "Pregúntale a la experta"],
      web: { kicker: "Belleza y estética", headline: "Siéntete increíble cada día", sub: "Tratamientos de belleza con técnica, higiene y atención a cada detalle.", cta: "Reservar turno",
        services: [["Faciales", "Cuidado profesional para una piel radiante."], ["Uñas y manos", "Diseños modernos y duraderos."], ["Cabello", "Cortes, color y tratamientos a tu medida."]] },
      quick: ["Quiero reservar un turno", "¿Qué tratamientos tienen?", "¿Dónde están ubicados?"],
      auto: ["Reserva de turnos automática", "Recordatorios de citas", "Catálogo de servicios por chat", "Reprogramación sin llamadas"]
    },
    "Inmobiliaria": {
      bio: ["🏡 Encuentra el lugar ideal para ti", "🔑 Compra, venta y alquiler", "📲 Agenda una visita 👇"],
      hl: ["Propiedades", "Vendidas", "Visitas", "Consejos"],
      posts: ["Recorrido por esta propiedad", "5 claves antes de comprar", "Así vendemos tu inmueble", "¿Comprar o alquilar?", "Nueva propiedad disponible", "Errores al vender tu casa"],
      web: { kicker: "Bienes raíces", headline: "La propiedad que buscas, más cerca", sub: "Te acompañamos a comprar, vender o alquilar con asesoría de principio a fin.", cta: "Ver propiedades",
        services: [["Venta", "Publicamos y mostramos tu inmueble a compradores reales."], ["Compra", "Te ayudamos a encontrar la opción ideal."], ["Alquiler", "Gestión segura para propietarios e inquilinos."]] },
      quick: ["Busco un apartamento", "Quiero vender mi casa", "Agendar una visita"],
      auto: ["Calificación de interesados", "Agenda de visitas", "Envío de fichas de propiedades", "Seguimiento de prospectos"]
    },
    "Tienda y comercio": {
      bio: ["🛍️ Lo que buscas, en un solo lugar", "🚚 Envíos y retiro en tienda", "💬 Compra por WhatsApp 👇"],
      hl: ["Nuevo", "Ofertas", "Envíos", "Clientes"],
      posts: ["Lo más vendido de la semana", "Llegó lo nuevo", "Cómo comprar en 1 minuto", "Oferta por tiempo limitado", "Así empacamos tu pedido", "Lo que dicen los clientes"],
      web: { kicker: "Tienda", headline: "Todo lo que necesitas, sin complicaciones", sub: "Productos seleccionados, atención rápida y envíos a tu puerta.", cta: "Comprar ahora",
        services: [["Catálogo", "Encuentra productos de calidad para cada necesidad."], ["Envíos", "Recibe tu pedido de forma rápida y segura."], ["Atención", "Te asesoramos antes y después de tu compra."]] },
      quick: ["¿Tienen disponible…?", "¿Hacen envíos?", "¿Cómo puedo pagar?"],
      auto: ["Catálogo y precios por chat", "Toma de pedidos automática", "Estado de envíos", "Recuperación de ventas"]
    },
    "Servicios profesionales": {
      bio: ["💼 Soluciones claras para tu empresa", "📈 Experiencia y resultados medibles", "📅 Agenda una asesoría 👇"],
      hl: ["Servicios", "Casos", "Equipo", "Asesoría"],
      posts: ["El error que frena tu negocio", "Así trabajamos contigo", "3 preguntas antes de contratar", "Conoce a nuestro equipo", "Lo que nadie te explica", "Agenda tu asesoría"],
      web: { kicker: "Servicios profesionales", headline: "Expertos que resuelven, no que complican", sub: "Asesoría profesional con un plan claro y acompañamiento real.", cta: "Agendar asesoría",
        services: [["Asesoría", "Analizamos tu caso y te damos un plan claro."], ["Gestión", "Nos encargamos de los trámites por ti."], ["Acompañamiento", "Seguimiento cercano en cada paso."]] },
      quick: ["Necesito una asesoría", "¿Qué servicios ofrecen?", "¿Cómo es el proceso?"],
      auto: ["Calificación de clientes potenciales", "Agenda de reuniones", "Envío de propuestas", "Recordatorios de pagos"]
    },
    "Educación": {
      bio: ["🎓 Aprender puede ser emocionante", "📚 Formación con propósito", "✍️ Inscripciones abiertas 👇"],
      hl: ["Cursos", "Inscripción", "Comunidad", "Tips"],
      posts: ["Así es un día con nosotros", "Inscripciones abiertas", "3 hábitos para aprender mejor", "Conoce a los docentes", "Lo que lograrás aquí", "Preguntas de los padres"],
      web: { kicker: "Educación", headline: "Formamos a quienes construyen el futuro", sub: "Programas modernos, docentes cercanos y una comunidad que inspira.", cta: "Inscribirme",
        services: [["Programas", "Planes de estudio actualizados y prácticos."], ["Docentes", "Profesionales comprometidos con cada estudiante."], ["Comunidad", "Un entorno seguro para crecer y aprender."]] },
      quick: ["Quiero inscribirme", "¿Qué cursos tienen?", "¿Cuál es el horario?"],
      auto: ["Inscripciones por WhatsApp", "Información de cursos 24/7", "Recordatorios de pagos", "Avisos a representantes"]
    },
    "Tecnología": {
      bio: ["⚙️ Tecnología que impulsa empresas", "🤖 Soluciones a la medida", "📲 Solicita una demo 👇"],
      hl: ["Soluciones", "Casos", "Soporte", "Novedades"],
      posts: ["Automatiza esto hoy mismo", "Así funciona nuestra solución", "El costo de no digitalizarte", "Demo en 60 segundos", "Errores al elegir software", "Conoce al equipo técnico"],
      web: { kicker: "Tecnología", headline: "Tecnología que trabaja por tu empresa", sub: "Implementamos soluciones que ahorran tiempo, reducen errores y escalan contigo.", cta: "Solicitar demo",
        services: [["Software", "Herramientas a la medida de tus procesos."], ["Automatización", "Menos tareas manuales, más productividad."], ["Soporte", "Acompañamiento técnico cuando lo necesitas."]] },
      quick: ["Quiero una demo", "¿Qué soluciones tienen?", "¿Ofrecen soporte?"],
      auto: ["Calificación de prospectos", "Agenda de demos", "Tickets de soporte automáticos", "Seguimiento comercial"]
    }
  };

  function templateFor(name, sector) {
    var t = SECTORS[sector] || SECTORS["Servicios profesionales"];
    return {
      bio: t.bio.slice(),
      highlights: t.hl.slice(),
      posts: t.posts.slice(),
      web: {
        kicker: t.web.kicker, headline: t.web.headline, sub: t.web.sub, cta: t.web.cta,
        services: t.web.services.map(function (s) { return { title: s[0], text: s[1] }; })
      },
      agent: { greeting: "¡Hola! 👋 Bienvenido a " + name + ". Soy el asistente virtual. ¿En qué puedo ayudarte hoy?", quick: t.quick.slice() },
      automations: t.auto.slice()
    };
  }

  function localReply(msg) {
    var m = msg.toLowerCase();
    if (/precio|cu[aá]nto|costo|cuesta|tarifa/.test(m)) return "Con gusto te ayudo con eso. Los precios dependen de lo que necesites; ¿me dejas tu nombre y te enviamos la información completa?";
    if (/cita|agend|turno|reserv|visita|demo/.test(m)) return "¡Perfecto! Puedo agendarte ahora mismo. ¿Qué día y hora te quedan mejor?";
    if (/horario|hora|abren|sábado|domingo/.test(m)) return "Te confirmo el horario disponible y, si quieres, te reservo un espacio. ¿Para qué día lo necesitas?";
    if (/d[oó]nde|ubica|direcci/.test(m)) return "Te envío la ubicación exacta por aquí mismo. ¿Prefieres que te contacte alguien del equipo?";
    if (/olano|qui[eé]n te (cre|hiz)/.test(m)) return "Este agente lo crea OlanoandCo. Si quieres uno así para tu empresa, toca «Quiero esto real».";
    return "¡Claro! Te ayudo con eso. ¿Me cuentas un poco más para darte la mejor respuesta?";
  }

  /* ---------------------------------------------------------- Utilidades visuales */
  function initials(name) {
    var w = String(name).trim().split(/\s+/).filter(Boolean);
    return ((w[0] || "T")[0] + (w[1] ? w[1][0] : (w[0] || "E")[1] || "")).toUpperCase();
  }
  function handle(name) {
    var h = String(name).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");
    return (h || "tuempresa").slice(0, 22);
  }
  function avatar(cls) {
    return state.photo
      ? '<span class="' + cls + '" style="background-image:url(' + state.photo + ')"></span>'
      : '<span class="' + cls + ' is-initials">' + esc(initials(state.name)) + "</span>";
  }

  /* ---------------------------------------------------------- Pantallas */
  function renderInstagram() {
    var d = state.data;
    var tiles = d.posts.slice(0, 6).map(function (p, i) {
      var photoTile = state.photo && (i === 0 || i === 3 || i === 4);
      var style = photoTile ? ' style="background-image:url(' + state.photo + ')"' : "";
      var cls = "ig-tile t" + (i % 6) + (photoTile ? " has-photo" : "");
      return '<div class="' + cls + '"' + style + '><span>' + esc(p) + "</span>" + (i % 2 === 0 ? '<i class="ig-reel" aria-hidden="true"></i>' : "") + "</div>";
    }).join("");
    var hls = d.highlights.slice(0, 4).map(function (h, i) {
      return '<li><span class="ig-hl h' + i + '"></span><small>' + esc(h) + "</small></li>";
    }).join("");
    return '<div class="ig">' +
      '<div class="ph-status"><b>9:41</b><span></span></div>' +
      '<div class="ig-top"><b>' + esc(handle(state.name)) + '</b><i></i></div>' +
      '<div class="ig-profile">' +
        '<div class="ig-ring">' + avatar("ig-avatar") + "</div>" +
        '<div class="ig-counts"><div><b>' + d.posts.length + '</b><small>publicaciones</small></div><div><b>' + d.highlights.length + '</b><small>destacadas</small></div><div><b class="ig-new">24/7</b><small>atención</small></div></div>' +
      "</div>" +
      '<div class="ig-bio"><b>' + esc(state.name) + '</b><small>' + esc(state.sector) + "</small>" +
        d.bio.map(function (l) { return "<p>" + esc(l) + "</p>"; }).join("") +
        '<p class="ig-link">wa.me/' + esc(handle(state.name)) + "</p></div>" +
      '<div class="ig-btns"><span>Seguir</span><span>Mensaje</span><span>WhatsApp</span></div>' +
      '<ul class="ig-hls">' + hls + "</ul>" +
      '<div class="ig-tabs"><i class="on"></i><i></i><i></i></div>' +
      '<div class="ig-grid">' + tiles + "</div>" +
    "</div>";
  }

  function webContent(mobile) {
    var w = state.data.web;
    var heroVisual = state.photo
      ? '<div class="wb-visual" style="background-image:url(' + state.photo + ')"></div>'
      : '<div class="wb-visual is-shape"><span></span></div>';
    var services = w.services.map(function (s, i) {
      return '<div class="wb-card"><i>0' + (i + 1) + "</i><b>" + esc(s.title) + "</b><p>" + esc(s.text) + "</p></div>";
    }).join("");
    return '<div class="wb' + (mobile ? " is-mobile" : "") + '">' +
      (mobile ? '<div class="ph-status dark"><b>9:41</b><span></span></div>' : "") +
      '<nav class="wb-nav"><span class="wb-logo"><i>' + esc(initials(state.name)) + "</i>" + esc(state.name) + "</span>" +
        (mobile ? '<span class="wb-burger"></span>' : "<span>Inicio</span><span>Servicios</span><span>Nosotros</span><em>" + esc(w.cta) + "</em>") + "</nav>" +
      '<div class="wb-hero"><div class="wb-copy"><small>' + esc(w.kicker) + "</small><h4>" + esc(w.headline) + "</h4><p>" + esc(w.sub) + '</p><span class="wb-btn">' + esc(w.cta) + " →</span></div>" + heroVisual + "</div>" +
      '<div class="wb-cards">' + services + "</div>" +
      '<div class="wb-strip"><span>Atención por WhatsApp</span><span>Agente de IA 24/7</span><span>Diseño adaptado a móvil</span></div>' +
    "</div>";
  }

  function renderBrowser() {
    return '<div class="lap-bar"><i></i><i></i><i></i><span>' + esc(handle(state.name)) + '.com</span></div><div class="lap-page"><div class="lap-scroll">' + webContent(false) + "</div></div>";
  }

  function renderDashboard() {
    var a = state.data.automations;
    return '<div class="db">' +
      '<div class="db-head"><span class="wb-logo"><i>' + esc(initials(state.name)) + "</i>" + esc(state.name) + '</span><em><span class="live-dot"></span>Agente IA activo</em></div>' +
      '<div class="db-kpis">' +
        '<div><small>Mensajes atendidos</small><b data-kpi="0">0</b></div>' +
        '<div><small>Citas y pedidos</small><b data-kpi="1">0</b></div>' +
        '<div><small>Tiempo de respuesta</small><b>3 s</b></div>' +
      "</div>" +
      '<div class="db-body"><div class="db-flow"><p>Procesos automatizados</p><ul>' +
        a.map(function (x, i) { return '<li style="--d:' + (i * 0.15) + 's"><span></span>' + esc(x) + "</li>"; }).join("") +
      '</ul></div><div class="db-feed"><p>Actividad en tiempo real</p><ul data-feed></ul></div></div>' +
    "</div>";
  }

  function renderWhatsApp() {
    var msgs = state.chat.map(function (m) {
      return '<p class="wa-m ' + (m.role === "user" ? "out" : "in") + (m.typing ? " typing" : "") + '">' + (m.typing ? "<i></i><i></i><i></i>" : esc(m.text)) + "</p>";
    }).join("");
    return '<div class="wa">' +
      '<div class="wa-top"><div class="ph-status"><b>9:41</b><span></span></div>' +
        '<div class="wa-who">' + avatar("wa-av") + "<div><b>" + esc(state.name) + "</b><small>Agente IA · en línea</small></div></div></div>" +
      '<div class="wa-chat" data-wa-chat><span class="wa-day">Hoy</span>' + msgs + "</div>" +
      '<div class="wa-bar"><span>Mensaje</span><i></i></div>' +
    "</div>";
  }

  var FEED = ["Nuevo mensaje respondido en 3 s", "Cliente calificado y registrado", "Cita agendada para mañana 10:00", "Cotización enviada por WhatsApp", "Recordatorio enviado", "Pedido confirmado", "Conversación pasada a un asesor", "Reporte diario generado"];

  function startTicker() {
    stopTicker();
    var kpis = $$("[data-kpi]", laptop), feed = $("[data-feed]", laptop);
    if (!feed) return;
    var counts = [128, 34], n = 0;
    var tick = function () {
      counts[0] += 1 + Math.floor(Math.random() * 3);
      if (Math.random() > 0.55) counts[1] += 1;
      kpis.forEach(function (k, i) { k.textContent = counts[i].toLocaleString("es"); });
      var li = document.createElement("li");
      var now = new Date(Date.now() - n * 7000);
      li.innerHTML = "<time>" + String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0") + "</time>" + esc(FEED[n % FEED.length]);
      feed.insertBefore(li, feed.firstChild);
      while (feed.children.length > 5) feed.removeChild(feed.lastChild);
      n++;
    };
    for (var i = 0; i < 3; i++) tick();
    if (!reduced) state.ticker = setInterval(function () { if (!document.hidden) tick(); }, 1800);
  }
  function stopTicker() { if (state.ticker) { clearInterval(state.ticker); state.ticker = null; } }

  function render() {
    scene.style.setProperty("--bc", state.color);
    stage.setAttribute("data-view", state.view);
    stopTicker();
    if (state.view === "ig") {
      phone.innerHTML = renderInstagram();
      laptop.innerHTML = renderBrowser();
    } else if (state.view === "web") {
      phone.innerHTML = '<div class="ph-scroll">' + webContent(true) + "</div>";
      laptop.innerHTML = renderBrowser();
    } else {
      phone.innerHTML = renderWhatsApp();
      laptop.innerHTML = renderDashboard();
      startTicker();
      scrollChat();
    }
    chatForm.hidden = state.view !== "ai";
    renderQuick();
  }

  function renderQuick() {
    var q = (state.data.agent.quick || []).slice(0, 3);
    quickBox.innerHTML = q.map(function (t) { return '<button type="button">' + esc(t) + "</button>"; }).join("");
  }

  function scrollChat() {
    var box = $("[data-wa-chat]", phone);
    if (box) box.scrollTop = box.scrollHeight;
  }

  /* ---------------------------------------------------------- Pestañas */
  $$("[data-studio-tab]").forEach(function (b) {
    b.addEventListener("click", function () { setView(b.getAttribute("data-studio-tab")); });
  });
  function setView(v) {
    state.view = v;
    $$("[data-studio-tab]").forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-studio-tab") === v)); });
    stage.classList.remove("is-switching");
    void stage.offsetWidth;
    stage.classList.add("is-switching");
    render();
  }

  /* ---------------------------------------------------------- Escala de la escena al tamaño del escenario */
  (function initScale() {
    var fit = function () {
      var r = stage.getBoundingClientRect();
      if (!r.width) return;
      // En pantallas estrechas el teléfono pasa al frente y el portátil queda de fondo
      var narrow = r.width < 600;
      stage.classList.toggle("is-narrow", narrow);
      scene.style.setProperty("--s", (narrow ? Math.min(r.width / 360, r.height / 640) : Math.min(r.width / 860, r.height / 640)).toFixed(3));
    };
    fit();
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(stage);
    else window.addEventListener("resize", fit);
  })();

  /* ---------------------------------------------------------- Giro 3D con el puntero */
  (function initTilt() {
    var rx = 0, ry = 0, tx = 0, ty = 0, drag = null, raf = 0;
    var loop = function () {
      rx += (tx - rx) * 0.08; ry += (ty - ry) * 0.08;
      scene.style.setProperty("--rx", rx.toFixed(2) + "deg");
      scene.style.setProperty("--ry", ry.toFixed(2) + "deg");
      raf = (Math.abs(tx - rx) > 0.05 || Math.abs(ty - ry) > 0.05) ? requestAnimationFrame(loop) : 0;
    };
    var kick = function () { if (!raf) raf = requestAnimationFrame(loop); };
    stage.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      if (drag) {
        ty = Math.max(-38, Math.min(38, drag.ry + (e.clientX - drag.x) * 0.25));
        tx = Math.max(-18, Math.min(18, drag.rx - (e.clientY - drag.y) * 0.15));
      } else if (e.pointerType === "mouse" && !reduced) {
        ty = px * 16; tx = -py * 10;
      }
      kick();
    });
    stage.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button, input, a")) return;
      drag = { x: e.clientX, y: e.clientY, rx: tx, ry: ty };
      stage.classList.add("is-dragging");
    });
    var end = function () { if (!drag) return; drag = null; stage.classList.remove("is-dragging"); tx = 0; ty = 0; kick(); };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    stage.addEventListener("pointerleave", function (e) { if (!drag && e.pointerType === "mouse") { tx = 0; ty = 0; kick(); } });
  })();

  /* ---------------------------------------------------------- Foto (solo en el navegador) */
  var fileInput = $("[data-studio-file]");
  var preview = $("[data-studio-preview]");
  fileInput.addEventListener("change", function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f || !/^image\//.test(f.type)) return;
    var url = URL.createObjectURL(f);
    var img = new Image();
    img.onload = function () {
      var size = 480, c = document.createElement("canvas");
      var s = Math.min(img.width, img.height);
      c.width = c.height = size;
      // Recorte cuadrado centrado, un poco hacia arriba para encuadrar el rostro
      c.getContext("2d").drawImage(img, (img.width - s) / 2, Math.max(0, (img.height - s) * 0.3), s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      state.photo = c.toDataURL("image/jpeg", 0.86);
      preview.style.backgroundImage = "url(" + state.photo + ")";
      preview.classList.add("has-photo");
      $("[data-studio-photo-label]").textContent = "Foto lista · cambiar";
      if (state.data) render();
    };
    img.onerror = function () { URL.revokeObjectURL(url); };
    img.src = url;
  });

  /* ---------------------------------------------------------- Vista previa en vivo */
  var nameInput = $("[data-studio-name]");
  nameInput.addEventListener("input", function () {
    if (state.created) return;
    state.name = nameInput.value.trim() || "Tu Empresa";
    state.data = templateFor(state.name, state.sector);
    render();
  });
  $$('input[name="color"]', form).forEach(function (r) {
    r.addEventListener("change", function () { state.color = r.value; scene.style.setProperty("--bc", state.color); });
  });
  $$('input[name="sector"]', form).forEach(function (r) {
    r.addEventListener("change", function () {
      state.sector = r.value;
      if (!state.created) { state.data = templateFor(state.name, state.sector); render(); }
    });
  });

  /* ---------------------------------------------------------- Crear la marca */
  function post(body) {
    return fetch("api/estudio.php", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    }).then(function (r) { return r.json(); }).catch(function () { return { fallback: true }; });
  }

  function wait(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (state.busy) return;
    var name = nameInput.value.trim();
    if (name.length < 2) {
      errorBox.textContent = "Escribe el nombre de tu empresa para crear tu marca.";
      errorBox.hidden = false;
      nameInput.focus();
      return;
    }
    errorBox.hidden = true;
    state.busy = true;
    state.name = name;
    state.sector = (form.querySelector('input[name="sector"]:checked') || {}).value || state.sector;
    state.color = (form.querySelector('input[name="color"]:checked') || {}).value || state.color;
    var goBtn = $("[data-studio-go]");
    goBtn.classList.add("is-loading");

    var steps = $$(".sl-steps li", loading);
    steps.forEach(function (li) { li.className = ""; });
    loading.hidden = false;
    stage.classList.add("is-loading");
    var i = 0;
    var stepTimer = setInterval(function () {
      if (steps[i]) steps[i].className = "done";
      i++;
      if (steps[i]) steps[i].className = "on";
    }, 900);
    if (steps[0]) steps[0].className = "on";

    Promise.all([post({ action: "generar", negocio: state.name, sector: state.sector }), wait(3800)]).then(function (res) {
      var r = res[0];
      var base = templateFor(state.name, state.sector);
      if (r && r.ok && r.data) {
        var d = r.data;
        base.bio = d.bio.length ? d.bio : base.bio;
        base.highlights = d.highlights.length ? d.highlights : base.highlights;
        base.posts = d.posts.length >= 3 ? d.posts : base.posts;
        if (d.web && d.web.headline) {
          base.web = {
            kicker: d.web.kicker || base.web.kicker, headline: d.web.headline, sub: d.web.sub || base.web.sub,
            cta: d.web.cta || base.web.cta, services: (d.web.services && d.web.services.length === 3) ? d.web.services : base.web.services
          };
        }
        if (d.agent && d.agent.greeting) base.agent.greeting = d.agent.greeting;
        if (d.agent && d.agent.quick && d.agent.quick.length) base.agent.quick = d.agent.quick;
        if (d.automations && d.automations.length) base.automations = d.automations;
      }
      clearInterval(stepTimer);
      steps.forEach(function (li) { li.className = "done"; });
      state.data = base;
      state.created = true;
      state.chat = [{ role: "model", text: base.agent.greeting }];
      return wait(450);
    }).then(function () {
      loading.hidden = true;
      stage.classList.remove("is-loading");
      stage.classList.add("is-born");
      setTimeout(function () { stage.classList.remove("is-born"); }, 1600);
      goBtn.classList.remove("is-loading");
      goBtn.innerHTML = 'Crear otra versión <svg class="i" aria-hidden="true"><use href="#i-arrow"/></svg>';
      state.busy = false;
      setView("ig");
      showCta();
      if (window.innerWidth < 980) stage.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    });
  });

  function showCta() {
    cta.hidden = false;
    $("[data-studio-cta-title]").textContent = "¿Te ves así, " + state.name + "?";
    var text = "Hola OlanoandCo, probé el Estudio en su web. Mi empresa es " + state.name + " (" + state.sector +
      ") y quiero esto real: perfil de Instagram, página web y agente de IA.";
    $("[data-studio-wa]").href = WA + "?text=" + encodeURIComponent(text);
  }

  /* ---------------------------------------------------------- Chat con el agente */
  function sendChat(text) {
    text = String(text || "").trim();
    if (!text || state.busy) return;
    if (!state.created) {
      errorBox.textContent = "Primero crea tu marca para hablar con tu agente.";
      errorBox.hidden = false;
      return;
    }
    if (state.chat.filter(function (m) { return m.role === "user"; }).length >= 8) {
      state.chat.push({ role: "model", text: "Hasta aquí la demostración 🙌 Para tener este agente atendiendo a tus clientes de verdad, toca «Quiero esto real»." });
      render();
      return;
    }
    state.busy = true;
    var history = state.chat.map(function (m) { return { role: m.role, text: m.text }; });
    state.chat.push({ role: "user", text: text });
    state.chat.push({ role: "model", typing: true });
    if (state.view !== "ai") setView("ai"); else render();
    Promise.all([
      post({ action: "chat", negocio: state.name, sector: state.sector, message: text, history: history }),
      wait(900)
    ]).then(function (res) {
      var r = res[0];
      state.chat.pop();
      state.chat.push({ role: "model", text: (r && r.reply) ? r.reply : localReply(text) });
      state.busy = false;
      render();
    });
  }
  chatForm.addEventListener("submit", function (e) {
    e.preventDefault();
    sendChat(chatInput.value);
    chatInput.value = "";
  });
  quickBox.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b) sendChat(b.textContent);
  });

  /* ---------------------------------------------------------- Estado inicial */
  state.data = templateFor(state.name, state.sector);
  state.chat = [{ role: "model", text: state.data.agent.greeting }];
  render();
})();
