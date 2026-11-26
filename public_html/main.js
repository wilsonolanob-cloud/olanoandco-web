/* OlanoandCo — main.js (script clásico + IIFE, sin dependencias) */
(function () {
  "use strict";

  var data = window.__BRAND__ || {};
  var api = data.api || {};
  var WA = "https://wa.me/" + (data.whatsapp || "584143755434");

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var escHTML = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var waLink = function (text) { return WA + "?text=" + encodeURIComponent(text); };
  var isEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()); };
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  var FALLBACK_ERROR = "No pudimos enviar la información en este momento. Puedes intentarlo de nuevo o escribirnos por WhatsApp al " + (data.phone || "+58 414-3755434") + ".";

  /* ---------------------------------------------------------- Token anti-spam */
  var tokenPromise = null;
  function getToken(force) {
    if (!tokenPromise || force) {
      tokenPromise = fetch(api.token, { credentials: "same-origin", cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error("token"); return r.json(); })
        .then(function (j) { return j.token || ""; })
        .catch(function () { tokenPromise = null; return ""; });
    }
    return tokenPromise;
  }

  function postJSON(url, body) {
    return fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, reason: "server" }; });
    });
  }

  // Envía con token; si el servidor pide un token nuevo, reintenta una vez.
  function submitWithToken(url, payload) {
    return getToken().then(function (token) {
      payload.token = token;
      return postJSON(url, payload);
    }).then(function (res) {
      if (res && (res.reason === "token" || res.reason === "too_fast")) {
        var wait = res.reason === "too_fast" ? 2500 : 0;
        return new Promise(function (ok) { setTimeout(ok, wait); })
          .then(function () { return getToken(res.reason === "token"); })
          .then(function (t) { payload.token = t; return postJSON(url, payload); });
      }
      return res;
    });
  }

  function reasonMessage(reason) {
    switch (reason) {
      case "email": return "Revisa el correo electrónico: parece que no es válido.";
      case "consent": return "Necesitamos tu consentimiento para guardar los datos.";
      case "required": return "Completa los campos obligatorios.";
      case "rate": return "Has enviado varios formularios seguidos. Espera unos minutos o escríbenos por WhatsApp.";
      default: return FALLBACK_ERROR;
    }
  }

  /* ---------------------------------------------------------- Header y menú */
  function initHeader() {
    var header = $("[data-header]");
    var toggle = $("[data-menu-toggle]");
    var menu = $("[data-menu]");
    if (!header) return;

    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 24); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (!toggle || !menu) return;
    var close = function () {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      header.classList.remove("menu-open");
      document.body.classList.remove("menu-open");
      document.body.style.overflow = "";
    };
    toggle.addEventListener("click", function () {
      var open = !menu.classList.contains("is-open");
      menu.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      header.classList.toggle("is-scrolled", open || window.scrollY > 24);
      document.body.style.overflow = open ? "hidden" : "";
      document.body.classList.toggle("menu-open", open);
      if (open) { var first = $("a", menu); if (first) first.focus(); }
    });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) { close(); toggle.focus(); }
    });
    matchMedia("(min-width: 1140px)").addEventListener("change", close);
  }

  /* ---------------------------------------------------------- Navegación activa */
  function initCurrentNav() {
    var links = $$(".main-nav li a");
    if (!links.length || !("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var a = map[e.target.id];
        links.forEach(function (l) { l.classList.toggle("is-current", l === a); });
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    $$("main > section[id]").forEach(function (s) { io.observe(s); });
  }

  /* ---------------------------------------------------------- Palabra que rota en el inicio */
  function initRotator() {
    var box = $("[data-rotator]");
    if (!box || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var words = $$(".rot-word", box), i = 0;
    setInterval(function () {
      if (document.hidden) return;
      var cur = words[i];
      i = (i + 1) % words.length;
      cur.classList.replace("is-active", "is-leaving");
      words[i].classList.add("is-active");
      setTimeout(function () { cur.classList.toggle("is-leaving", false); }, 800);
    }, 2600);
  }

  /* ---------------------------------------------------------- Apariciones */
  function initReveals() {
    var els = $$("[data-reveal]");
    // Escalonado suave entre hermanos
    els.forEach(function (el) {
      var sibs = $$(":scope > [data-reveal]", el.parentElement);
      var i = sibs.indexOf(el);
      if (i > 0) el.style.setProperty("--d", Math.min(i * 0.08, 0.4) + "s");
    });
    if (!("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("is-visible"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -4% 0px" });
    els.forEach(function (el) { io.observe(el); });
    // Red de seguridad: nada se queda invisible
    setTimeout(function () {
      $$("[data-reveal]:not(.is-visible)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-visible");
      });
    }, 4000);
  }

  /* ---------------------------------------------------------- Servicios: filtros y luz que sigue al cursor */
  function initServices() {
    var root = $("[data-services]");
    if (!root) return;
    var cards = $$(".sv", root);
    var buttons = $$("[data-filter]", root);
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        var f = b.getAttribute("data-filter");
        buttons.forEach(function (x) { var on = x === b; x.classList.toggle("is-on", on); x.setAttribute("aria-pressed", String(on)); });
        var n = 0;
        cards.forEach(function (c) {
          var cat = c.getAttribute("data-cat");
          var show = f === "all" || cat === f || cat === "help";
          c.classList.toggle("is-hidden", !show);
          c.classList.remove("is-entering");
          if (show) {
            void c.offsetWidth;
            c.style.setProperty("--sd", (n++ * 0.05) + "s");
            c.classList.add("is-entering");
          }
        });
      });
    });
    cards.forEach(function (c) {
      c.addEventListener("pointermove", function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty("--mx", (e.clientX - r.left) + "px");
        c.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------------------------------------------------------- Botones "Consultar este servicio" */
  function initServiceLinks() {
    var select = $("[data-service-select]");
    if (!select) return;
    $$("[data-service]").forEach(function (a) {
      a.addEventListener("click", function () {
        var name = a.getAttribute("data-service");
        $$("option", select).forEach(function (o) { if (o.value === name || o.textContent === name) select.value = o.value || o.textContent; });
        var msg = $("[name=mensaje]", select.form);
        if (msg && !msg.value) msg.placeholder = "Cuéntanos qué necesitas sobre «" + name + "».";
        setTimeout(function () { var n = $("[name=nombre]", select.form); if (n) n.focus({ preventScroll: true }); }, 700);
      });
    });
  }

  /* ---------------------------------------------------------- Validación compartida */
  function markInvalid(el, bad) {
    if (!el) return;
    if (bad) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
  }
  function showError(box, msg) {
    if (!box) return;
    box.innerHTML = msg;
    box.hidden = !msg;
  }

  /* ---------------------------------------------------------- Formulario de contacto */
  function initContactForm() {
    var form = $("[data-contact-form]");
    if (!form) return;
    var err = $("[data-contact-error]", form);
    var ok = $("[data-contact-ok]", form);
    var btn = $("[data-contact-submit]", form);
    var waA = $("[data-contact-wa]", form);

    var buildWa = function () {
      var f = form.elements;
      var parts = ["Hola OlanoandCo,"];
      if (f.nombre.value.trim()) parts.push("soy " + f.nombre.value.trim() + (f.empresa.value.trim() ? " de " + f.empresa.value.trim() : "") + ".");
      if (f.servicio.value) parts.push("Me interesa: " + f.servicio.value + ".");
      if (f.mensaje.value.trim()) parts.push(f.mensaje.value.trim());
      else parts.push("Quiero más información.");
      waA.href = waLink(parts.join(" "));
    };
    form.addEventListener("input", buildWa);
    form.addEventListener("change", buildWa);
    buildWa();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = form.elements;
      showError(err, ""); ok.hidden = true;
      var problems = [];
      markInvalid(f.nombre, !f.nombre.value.trim()); if (!f.nombre.value.trim()) problems.push("tu nombre");
      markInvalid(f.email, !isEmail(f.email.value)); if (!isEmail(f.email.value)) problems.push("un correo válido");
      markInvalid(f.mensaje, !f.mensaje.value.trim()); if (!f.mensaje.value.trim()) problems.push("tu mensaje");
      if (!f.consentimiento.checked) problems.push("tu consentimiento");
      if (problems.length) {
        showError(err, "Falta completar: " + problems.join(", ") + ".");
        var firstBad = $("[aria-invalid=true]", form) || f.consentimiento;
        firstBad.focus();
        return;
      }
      btn.classList.add("is-loading"); btn.textContent = "Enviando…";
      submitWithToken(api.contact, {
        nombre: f.nombre.value, email: f.email.value, empresa: f.empresa.value,
        servicio: f.servicio.value, mensaje: f.mensaje.value,
        consentimiento: f.consentimiento.checked, sitio_web: f.sitio_web.value
      }).then(function (res) {
        if (res && res.ok) {
          form.reset(); buildWa();
          ok.innerHTML = "¡Gracias! Recibimos tu consulta y te responderemos pronto. Si es urgente, <a href=\"" + escHTML(WA) + "\" target=\"_blank\" rel=\"noopener\">escríbenos por WhatsApp</a>.";
          ok.hidden = false;
        } else {
          showError(err, reasonMessage(res && res.reason));
        }
      }).catch(function () {
        showError(err, FALLBACK_ERROR);
      }).then(function () {
        btn.classList.remove("is-loading"); btn.textContent = "Enviar consulta";
      });
    });
  }

  /* ---------------------------------------------------------- Diagnóstico digital */
  function initDiagnostic() {
    var root = $("[data-diag]");
    if (!root) return;
    var form = $("[data-diag-form]", root);
    var steps = $$(".diag-step", form);
    var bar = $("[data-diag-bar]", root);
    var count = $("[data-diag-count]", root);
    var prev = $("[data-diag-prev]", root);
    var next = $("[data-diag-next]", root);
    var submit = $("[data-diag-submit]", root);
    var err = $("[data-diag-error]", root);
    var result = $("[data-diag-result]", root);
    var current = 0;
    var total = steps.length;

    var show = function (i, focus) {
      current = i;
      steps.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
      bar.style.width = ((i + 1) / total * 100) + "%";
      count.textContent = "Paso " + (i + 1) + " de " + total;
      prev.style.visibility = i === 0 ? "hidden" : "visible";
      next.hidden = i === total - 1;
      submit.hidden = i !== total - 1;
      showError(err, "");
      if (focus) {
        var target = $("input:not([type=hidden]), textarea, select", steps[i]);
        if (target && !matchMedia("(hover: none)").matches) target.focus({ preventScroll: true });
        var top = root.getBoundingClientRect().top;
        if (top < 0) root.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    var validateStep = function (i) {
      var s = steps[i];
      var f = form.elements;
      switch (i) {
        case 0: markInvalid(f.empresa, !f.empresa.value.trim()); return f.empresa.value.trim() ? "" : "Escribe el nombre de tu empresa.";
        case 1: return $("[name=sector]:checked", s) ? "" : "Elige el sector que más se parece al tuyo.";
        case 2: return $("[name=objetivo]:checked", s) ? "" : "Elige tu objetivo principal.";
        case 3: return $("[name=canales]:checked", s) ? "" : "Marca al menos un canal (o «Ninguno todavía»).";
        case 4: markInvalid(f.problema, f.problema.value.trim().length < 5); return f.problema.value.trim().length >= 5 ? "" : "Cuéntanos brevemente el problema que quieres resolver.";
        case 5: return "";
        case 6:
          markInvalid(f.nombre, !f.nombre.value.trim());
          markInvalid(f.email, !isEmail(f.email.value));
          if (!f.nombre.value.trim()) return "Escribe tu nombre.";
          if (!isEmail(f.email.value)) return "Revisa el correo electrónico.";
          if (!f.consentimiento.checked) return "Para guardar tus respuestas necesitamos tu consentimiento.";
          return "";
        case 7: return "";
      }
      return "";
    };

    // "Ninguno todavía" y "Aún no lo sé" son excluyentes con el resto
    var exclusive = function (name, value) {
      form.addEventListener("change", function (e) {
        var t = e.target;
        if (t.name !== name || !t.checked) return;
        $$("[name=" + name + "]", form).forEach(function (c) {
          if (t.value === value ? c !== t : c.value === value) c.checked = false;
        });
      });
    };
    exclusive("canales", "Ninguno todavía");
    exclusive("servicios", "no_se");

    // Avanzar al elegir en preguntas de una sola opción
    form.addEventListener("change", function (e) {
      if ((e.target.name === "sector" || e.target.name === "objetivo") && current < total - 1) {
        setTimeout(function () { if (!validateStep(current)) show(current + 1, true); }, 260);
      }
    });

    next.addEventListener("click", function () {
      var msg = validateStep(current);
      if (msg) { showError(err, msg); return; }
      show(current + 1, true);
    });
    prev.addEventListener("click", function () { if (current > 0) show(current - 1, true); });
    form.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && current < total - 1) { e.preventDefault(); next.click(); }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      for (var i = 0; i < total; i++) {
        var msg = validateStep(i);
        if (msg) { show(i, true); showError(err, msg); return; }
      }
      var f = form.elements;
      var values = function (name) { return $$("[name=" + name + "]:checked", form).map(function (c) { return c.value; }); };
      var payload = {
        empresa: f.empresa.value,
        sector: (f.sector.value || ""),
        objetivo: f.objetivo.value,
        canales: values("canales"),
        problema: f.problema.value,
        servicios: values("servicios"),
        presupuesto: f.presupuesto.value,
        nombre: f.nombre.value,
        email: f.email.value,
        consentimiento: f.consentimiento.checked,
        contacto_pref: f.contacto_pref.value,
        telefono: f.telefono.value,
        sitio_web: f.sitio_web.value
      };
      submit.classList.add("is-loading");
      submit.firstChild.textContent = "Preparando tu orientación… ";
      submitWithToken(api.diagnostic, payload).then(function (res) {
        if (!res || !res.ok) { showError(err, reasonMessage(res && res.reason)); return; }
        renderResult(res, payload);
      }).catch(function () {
        showError(err, FALLBACK_ERROR);
      }).then(function () {
        submit.classList.remove("is-loading");
        submit.firstChild.textContent = "Ver mi orientación ";
      });
    });

    function renderResult(res, p) {
      var status = $("[data-result-status]", result);
      status.textContent = res.saved
        ? "✓ Tus respuestas se guardaron correctamente" + (res.ref ? " · Ref. " + res.ref : "")
        : "No pudimos guardar tus respuestas, pero aquí tienes tu orientación. Escríbenos por WhatsApp para continuar.";
      status.classList.toggle("is-warn", !res.saved);
      $("[data-result-summary]", result).textContent = res.summary || "";
      $("[data-result-recs]", result).innerHTML = (res.recommendations || []).map(function (r) {
        return "<li><b>" + escHTML(r.title) + "</b><p>" + escHTML(r.reason) + "</p></li>";
      }).join("");
      $("[data-result-next]", result).textContent = res.next || "";
      var titles = (res.recommendations || []).map(function (r) { return r.title; }).join(", ");
      $("[data-result-wa]", result).href = waLink(
        "Hola OlanoandCo, soy " + p.nombre.trim() + " de " + p.empresa.trim() + ". Completé el diagnóstico digital" +
        (res.ref ? " (ref. " + res.ref + ")" : "") + (titles ? " y me interesa conversar sobre: " + titles + "." : ".")
      );
      $("[data-result-wilson]", result).href = waLink(
        "Hola Wilson, soy " + p.nombre.trim() + " de " + p.empresa.trim() + ". Completé el diagnóstico digital" +
        (res.ref ? " (ref. " + res.ref + ")" : "") + " y me gustaría agendar una conversación."
      );
      form.hidden = true;
      $(".diag-progress", root).hidden = true;
      count.hidden = true;
      result.hidden = false;
      result.focus({ preventScroll: true });
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    show(0, false);
  }

  /* ---------------------------------------------------------- Asistente */
  function initChat() {
    var panel = $("[data-chat]");
    var openBtn = $("[data-chat-open]");
    if (!panel || !openBtn) return;
    var closeBtn = $("[data-chat-close]", panel);
    var log = $("[data-chat-log]", panel);
    var form = $("[data-chat-form]", panel);
    var input = $("input", form);
    var suggest = $("[data-chat-suggest]", panel);
    var history = [];
    var busy = false;

    var open = function () {
      panel.hidden = false;
      openBtn.setAttribute("aria-expanded", "true");
      document.body.classList.add("chat-open");
      if (matchMedia("(max-width: 959px)").matches) document.body.style.overflow = "hidden";
      if (!matchMedia("(hover: none)").matches) input.focus();
      else closeBtn.focus();
    };
    var close = function () {
      panel.hidden = true;
      openBtn.setAttribute("aria-expanded", "false");
      document.body.classList.remove("chat-open");
      document.body.style.overflow = "";
      openBtn.focus();
    };
    openBtn.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) close(); });

    var addBubble = function (role, text, actions) {
      var p = document.createElement("p");
      p.className = "bubble " + (role === "user" ? "user" : "bot");
      p.textContent = text;
      if (actions && actions.length) {
        var wrap = document.createElement("span");
        wrap.className = "bubble-actions";
        actions.forEach(function (a) {
          var link = document.createElement("a");
          link.href = a.href; link.textContent = a.label;
          if (a.alt) link.className = "alt";
          if (/^https?:/.test(a.href)) { link.target = "_blank"; link.rel = "noopener"; }
          else link.addEventListener("click", close);
          wrap.appendChild(link);
        });
        p.appendChild(wrap);
      }
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
      return p;
    };

    var localAnswer = function (q) {
      var text = " " + q.toLowerCase() + " ";
      var best = null;
      (data.faq || []).some(function (item) {
        if (item.keys.some(function (k) { return text.indexOf(k) !== -1; })) { best = item.answer; return true; }
        return false;
      });
      return best || "Para responderte con precisión, lo mejor es que hables con el equipo. Puedes escribirnos por WhatsApp o completar el diagnóstico digital.";
    };

    var defaultActions = [
      { label: "Hablar por WhatsApp", href: WA },
      { label: "Hacer el diagnóstico", href: "#diagnostico", alt: true }
    ];

    var ask = function (q) {
      q = q.trim();
      if (!q || busy) return;
      busy = true;
      suggest.hidden = true;
      addBubble("user", q);
      var typing = document.createElement("p");
      typing.className = "bubble bot typing";
      typing.innerHTML = "<i></i><i></i><i></i>";
      typing.setAttribute("aria-label", "Escribiendo");
      log.appendChild(typing);
      log.scrollTop = log.scrollHeight;

      postJSON(api.assistant, { message: q, history: history.slice(-8) })
        .then(function (res) {
          typing.remove();
          if (res && res.reply && !res.fallback) {
            history.push({ role: "user", text: q }, { role: "model", text: res.reply });
            var acts = res.handoff ? defaultActions : (res.suggestDiagnostic ? [defaultActions[1]] : null);
            addBubble("bot", res.reply, acts);
          } else {
            addBubble("bot", localAnswer(q), defaultActions);
          }
        })
        .catch(function () {
          typing.remove();
          addBubble("bot", localAnswer(q), defaultActions);
        })
        .then(function () { busy = false; });
    };

    form.addEventListener("submit", function (e) { e.preventDefault(); var q = input.value; input.value = ""; ask(q); });
    $$("button", suggest).forEach(function (b) { b.addEventListener("click", function () { ask(b.textContent); }); });
  }

  /* ---------------------------------------------------------- Botones flotantes */
  function initFloaters() {
    var fl = $(".floaters");
    if (!fl) return;
    // En móvil, se apartan mientras se escribe en un formulario para no tapar campos
    var small = matchMedia("(max-width: 719px)");
    document.addEventListener("focusin", function (e) {
      if (small.matches && e.target.closest(".diag-form, .contact-form")) fl.classList.add("is-hidden");
    });
    document.addEventListener("focusout", function () { fl.classList.remove("is-hidden"); });

    // En móvil, se ocultan al bajar (mientras se lee) y vuelven al subir, para no tapar contenido
    var lastY = window.scrollY;
    window.addEventListener("scroll", function () {
      if (!small.matches) return;
      var y = window.scrollY;
      if (Math.abs(y - lastY) < 8) return;
      var nearEnd = y + window.innerHeight > document.documentElement.scrollHeight - 120;
      fl.classList.toggle("is-tucked", y > lastY && y > 300 && !nearEnd);
      lastY = y;
    }, { passive: true });
  }

  function initYear() {
    var y = $("[data-year]");
    if (y) y.textContent = new Date().getFullYear();
  }

  function boot() {
    safe(initHeader, "header");
    safe(initCurrentNav, "currentNav");
    safe(initReveals, "reveals");
    safe(initRotator, "rotator");
    safe(initServices, "services");
    safe(initServiceLinks, "serviceLinks");
    safe(initContactForm, "contact");
    safe(initDiagnostic, "diagnostic");
    safe(initChat, "chat");
    safe(initFloaters, "floaters");
    safe(initYear, "year");
    // Pide el token anti-spam con antelación (sin bloquear la carga)
    setTimeout(function () { getToken(); }, 1200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
