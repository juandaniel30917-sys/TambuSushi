/* ==========================================================================
   TAMBÚ SUSHI — PANEL · TEXTOS, FOTOS, MENÚ Y FUENTES (admin-contenido.js)
   --------------------------------------------------------------------------
   - Textos: se editan con vista previa en vivo de la página real.
   - Contacto y horario, página Nosotros y preguntas frecuentes.
   - Fotos del sitio (logo, portada, Nosotros), menú y tipografías.
   Todo se guarda en la base de datos (tabla site_content) mediante una
   función que solo acepta cambios del superadministrador.
   ========================================================================== */

(function () {
  var raiz = document.querySelector("[data-config]");
  if (!raiz || !TAMBU.sa) return;
  var SA = TAMBU.sa, E = TAMBU.escapar, I = TAMBU.icono;
  function $(s) { return raiz.querySelector(s); }
  function copiar(o) { return JSON.parse(JSON.stringify(o)); }
  function asegurarContenido() {
    return SA.contenido ? Promise.resolve(SA.contenido) : SA.cargarContenido().catch(function (err) {
      SA.aviso(SA.mensajeError(err), "error"); SA.contenido = {}; return SA.contenido;
    });
  }

  /* =====================================================================
     TEXTOS DE LAS PÁGINAS (con vista previa)
     ===================================================================== */
  var guardados = {}, borrador = {}, originales = {}, sucio = false;
  var iframe = $("[data-preview]");
  var paginaTextos = null;

  function etiquetaCampo(el, k) {
    var tipo = (k.split(".")[1] || "").replace(/\d+$/, "");
    var tag = el.tagName.toLowerCase();
    if (tipo === "titulo") return tag === "h1" ? "Título principal" : tag === "h2" ? "Título de sección" : "Subtítulo";
    if (tipo === "etiqueta") return "Texto pequeño sobre el título";
    if (tipo === "texto") return el.classList.contains("lead") ? "Presentación" : "Texto";
    if (tipo === "boton") return "Botón";
    if (tipo === "dato") return "Dato";
    return "Texto";
  }
  function grupoDe(el, win) {
    var sec = el.closest("section, header, footer, .hero, .info-card, .loyalty-band");
    if (!sec) return "Página";
    if (sec.matches("footer, .site-footer")) return "Pie de página";
    if (sec.matches("header, .site-header")) return "Cabecera";
    var t = sec.querySelector("h1[data-texto], h2[data-texto], h3[data-texto]");
    return t ? "Sección «" + win.TAMBU.textoOriginal(t).replace(/\*/g, "").slice(0, 40) + "»" : "Página";
  }

  function cargarVistaPrevia() {
    var v = $("[data-textos-pagina]").value.split("|");
    paginaTextos = { url: v[0], prefijo: v[1] };
    $("[data-preview-abrir]").href = v[0];
    $("[data-textos-campos]").innerHTML = '<div class="skeleton" style="height:200px"></div>';
    iframe.onload = function () { esperarIframe(0); };
    iframe.src = v[0] + "?vista-previa=1";
  }
  function esperarIframe(intento) {
    var win = iframe.contentWindow, doc = iframe.contentDocument;
    var listo = win && doc && win.TAMBU && win.TAMBU.aplicarTextos && doc.querySelector('[data-texto^="' + paginaTextos.prefijo + '."]');
    if (!listo) {
      if (intento > 60) { $("[data-textos-campos]").innerHTML = '<p class="muted">Esta página no tiene textos editables.</p>'; return; }
      setTimeout(function () { esperarIframe(intento + 1); }, 100);
      return;
    }
    // Estilo para resaltar el texto que se está editando
    if (!doc.getElementById("sa-resaltar")) {
      var st = doc.createElement("style"); st.id = "sa-resaltar";
      st.textContent = ".sa-resaltado{outline:2px dashed #FF6B4A !important;outline-offset:4px;border-radius:4px;background:rgba(255,107,74,.08)}";
      doc.head.appendChild(st);
    }
    pintarCampos(win, doc);
    previsualizar();
  }
  function pintarCampos(win, doc) {
    var els = doc.querySelectorAll('[data-texto^="' + paginaTextos.prefijo + '."]');
    var vistos = {}, html = "", grupoActual = null;
    els.forEach(function (el) {
      var k = el.getAttribute("data-texto");
      if (vistos[k]) return;     // el mismo texto puede repetirse (p. ej. «Pedir ahora»)
      vistos[k] = true;
      var original = win.TAMBU.textoOriginal(el);
      originales[k] = original;
      var g = grupoDe(el, win);
      if (g !== grupoActual) { html += '<h4 class="sa-campos__grupo">' + E(g) + "</h4>"; grupoActual = g; }
      var valor = typeof borrador[k] === "string" && borrador[k] !== "" ? borrador[k] : original;
      var largo = original.length > 70 || valor.length > 70;
      var rico = el.hasAttribute("data-texto-rico");
      html += '<div class="field sa-campo"><label for="tx-' + E(k) + '">' + etiquetaCampo(el, k) + (rico ? ' <small class="muted">(admite *destacado*)</small>' : "") +
        (valor !== original ? ' <button type="button" class="sa-restaurar" data-restaurar-texto="' + E(k) + '">Volver al original</button>' : "") + "</label>" +
        (largo
          ? '<textarea class="textarea" rows="3" id="tx-' + E(k) + '" data-tk="' + E(k) + '" maxlength="1500">' + E(valor) + "</textarea>"
          : '<input class="input" id="tx-' + E(k) + '" data-tk="' + E(k) + '" maxlength="300" value="' + E(valor) + '">') +
        "</div>";
    });
    $("[data-textos-campos]").innerHTML = html || '<p class="muted">Esta página no tiene textos editables.</p>';
  }
  function previsualizar() {
    var win = iframe.contentWindow;
    if (win && win.TAMBU && win.TAMBU.aplicarTextos) { try { win.TAMBU.aplicarTextos(borrador); } catch (e) { /* nada */ } }
  }
  function resaltar(k) {
    var doc = iframe.contentDocument;
    if (!doc) return;
    doc.querySelectorAll(".sa-resaltado").forEach(function (x) { x.classList.remove("sa-resaltado"); });
    if (!k) return;
    var el = doc.querySelector('[data-texto="' + k.replace(/"/g, "") + '"]');
    if (el) { el.classList.add("sa-resaltado"); el.scrollIntoView({ block: "center", behavior: "smooth" }); }
  }
  function limpiarTextos(mapa) {
    var r = {};
    Object.keys(mapa).forEach(function (k) {
      var v = typeof mapa[k] === "string" ? mapa[k].trim() : "";
      if (!v) return;
      if (originales[k] !== undefined && v === originales[k].trim()) return;   // igual al original: no se guarda
      r[k] = v.slice(0, 1500);
    });
    return r;
  }
  function marcarSucio(si) { sucio = si; $("[data-textos-guardar]").classList.toggle("is-pending", si); }

  raiz.addEventListener("input", function (e) {
    var k = e.target.getAttribute && e.target.getAttribute("data-tk");
    if (!k) return;
    borrador[k] = e.target.value;
    marcarSucio(true);
    previsualizar();
  });
  raiz.addEventListener("focusin", function (e) {
    var k = e.target.getAttribute && e.target.getAttribute("data-tk");
    if (k) resaltar(k);
  });
  window.addEventListener("beforeunload", function (e) { if (sucio) { e.preventDefault(); e.returnValue = ""; } });

  /* =====================================================================
     CONTACTO Y HORARIO · NOSOTROS · PREGUNTAS FRECUENTES
     ===================================================================== */
  var DIAS = [{ dia: 1, nombre: "Lunes" }, { dia: 2, nombre: "Martes" }, { dia: 3, nombre: "Miércoles" }, { dia: 4, nombre: "Jueves" },
    { dia: 5, nombre: "Viernes" }, { dia: 6, nombre: "Sábado" }, { dia: 0, nombre: "Domingo" }];
  var resumen = [], valores = [], faq = {};

  function pintarNegocio() {
    var f = $('[data-form="negocio"]'), n = TAMBU.negocio, c = (SA.contenido || {}).negocio || {};
    f.whatsapp.value = c.whatsapp != null ? c.whatsapp : (n.whatsapp || "");
    f.whatsappVisible.value = c.whatsappVisible != null ? c.whatsappVisible : (n.whatsappVisible || "");
    f.email.value = c.email != null ? c.email || "" : (n.email || "");
    var redes = c.redes || n.redes || {};
    f.instagram.value = redes.instagram || ""; f.facebook.value = redes.facebook || ""; f.tiktok.value = redes.tiktok || "";
    var hc = (SA.contenido || {}).horario || {};
    var dias = Array.isArray(hc.dias) ? hc.dias : TAMBU.horario;
    $("[data-horario-dias]").innerHTML = DIAS.map(function (d) {
      var h = dias.find(function (x) { return x.dia === d.dia; });
      return '<div class="sa-dia" data-dia="' + d.dia + '"><b>' + d.nombre + "</b>" +
        '<label class="config-check"><input type="checkbox" data-hk="abierto"' + (h ? " checked" : "") + "> Abierto</label>" +
        '<label><span class="visually-hidden">Abre</span><input class="input" type="time" data-hk="abre" value="' + E(h ? h.abre : "12:00") + '"' + (h ? "" : " disabled") + "></label>" +
        "<span>a</span>" +
        '<label><span class="visually-hidden">Cierra</span><input class="input" type="time" data-hk="cierra" value="' + E(h ? h.cierra : "19:30") + '"' + (h ? "" : " disabled") + "></label></div>";
    }).join("");
    resumen = copiar(Array.isArray(hc.resumen) ? hc.resumen : TAMBU.horarioResumen);
    pintarResumen();
  }
  function pintarResumen() {
    $("[data-horario-resumen]").innerHTML = resumen.map(function (r, i) {
      return '<div class="sa-par" data-i="' + i + '"><input class="input" data-rk="dias" value="' + E(r.dias) + '" placeholder="Lunes a sábado" maxlength="40">' +
        '<input class="input" data-rk="horas" value="' + E(r.horas) + '" placeholder="12:00 – 19:30" maxlength="40">' +
        '<button class="icon-btn" type="button" data-resumen-quitar aria-label="Quitar línea">' + I("cerrar") + "</button></div>";
    }).join("");
  }
  function leerResumen() {
    resumen = Array.prototype.map.call(raiz.querySelectorAll("[data-horario-resumen] .sa-par"), function (d) {
      return { dias: d.querySelector('[data-rk="dias"]').value.trim(), horas: d.querySelector('[data-rk="horas"]').value.trim() };
    });
  }

  function pintarMarca() {
    var f = $('[data-form="marca"]'), m = TAMBU.marca;
    f.lema.value = m.lema || ""; f.intro.value = m.intro || "";
    f.historia.value = (m.historia || []).join("\n\n"); f.cita.value = m.cita || "";
    valores = copiar(m.valores || []);
    pintarValores();
  }
  function pintarValores() {
    $("[data-valores]").innerHTML = valores.map(function (v, i) {
      return '<div class="sa-par" data-i="' + i + '"><input class="input" data-vk="titulo" value="' + E(v.titulo) + '" placeholder="Título" maxlength="40">' +
        '<input class="input" data-vk="texto" value="' + E(v.texto) + '" placeholder="Descripción" maxlength="140">' +
        '<button class="icon-btn" type="button" data-valor-marca-quitar aria-label="Quitar valor">' + I("cerrar") + "</button></div>";
    }).join("") + (valores.length < 6 ? '<button class="btn btn--ghost btn--sm" type="button" data-valor-marca-agregar>+ Agregar valor</button>' : "");
  }
  function leerValores() {
    valores = Array.prototype.map.call(raiz.querySelectorAll("[data-valores] .sa-par"), function (d) {
      return { titulo: d.querySelector('[data-vk="titulo"]').value.trim(), texto: d.querySelector('[data-vk="texto"]').value.trim() };
    });
  }

  function pintarFaq() {
    faq = copiar(TAMBU.faq || {});
    ["contacto", "fidelizacion"].forEach(pintarFaqGrupo);
  }
  function pintarFaqGrupo(g) {
    $('[data-faq="' + g + '"]').innerHTML = (faq[g] || []).map(function (q, i) {
      return '<div class="sa-faq" data-i="' + i + '"><input class="input" data-qk="p" value="' + E(q.p) + '" placeholder="Pregunta" maxlength="160">' +
        '<textarea class="textarea" rows="2" data-qk="r" placeholder="Respuesta" maxlength="800">' + E(q.r) + "</textarea>" +
        '<button class="remove-btn" type="button" data-faq-quitar="' + g + '">Quitar</button></div>';
    }).join("") || '<p class="muted" style="margin:0">Sin preguntas.</p>';
  }
  function leerFaq() {
    ["contacto", "fidelizacion"].forEach(function (g) {
      faq[g] = Array.prototype.map.call(raiz.querySelectorAll('[data-faq="' + g + '"] .sa-faq'), function (d) {
        return { p: d.querySelector('[data-qk="p"]').value.trim(), r: d.querySelector('[data-qk="r"]').value.trim() };
      });
    });
  }

  /* =====================================================================
     FOTOS DEL SITIO
     ===================================================================== */
  var HUECOS = [
    { k: "logo", t: "Logo de la cabecera", d: "Cuadrado o circular, ideal PNG con fondo transparente.", def: "assets/images/logo-circular-mini.png", max: 400, carpeta: "logos" },
    { k: "logo-pie", t: "Logo del pie de página", d: "Se ve sobre fondo oscuro: usa una versión clara.", def: "assets/images/logo-tipografico-mini.png", max: 600, carpeta: "logos" },
    { k: "inicio.foto1", t: "Foto principal del inicio", d: "Vertical (4:5). Tu mejor foto de sushi.", def: null, max: 1600, carpeta: "sitio" },
    { k: "nosotros.foto1", t: "Nosotros · cocina", d: "Vertical (4:5).", def: null, max: 1600, carpeta: "sitio" },
    { k: "nosotros.foto2", t: "Nosotros · equipo", d: "Vertical (4:5).", def: null, max: 1600, carpeta: "sitio" },
    { k: "nosotros.foto3", t: "Nosotros · preparación", d: "Horizontal (16:9).", def: null, max: 1600, carpeta: "sitio" }
  ];
  function imagenesActuales() { return copiar((SA.contenido || {}).imagenes || {}); }
  function pintarFotos() {
    var imgs = imagenesActuales();
    $("[data-fotos-sitio]").innerHTML = HUECOS.map(function (h) {
      var url = imgs[h.k] || h.def;
      return '<article class="info-card sa-foto-slot">' +
        '<div class="sa-foto-slot__img' + (h.k.indexOf("logo") === 0 ? " is-logo" : "") + '">' + (url ? '<img src="' + E(url) + '" alt="' + E(h.t) + '">' : '<span class="muted">' + I("imagen") + "Sin foto todavía</span>") + "</div>" +
        "<h3>" + E(h.t) + '</h3><p class="hint">' + E(h.d) + "</p>" +
        '<div class="row"><button class="btn btn--primary btn--sm" type="button" data-foto-sitio="' + h.k + '">' + I("subir") + (imgs[h.k] ? "Cambiar" : "Subir foto") + "</button>" +
        (imgs[h.k] ? '<button class="btn btn--ghost btn--sm" type="button" data-foto-sitio-quitar="' + h.k + '">Quitar</button>' : "") + "</div>" +
      "</article>";
    }).join("");
  }

  /* =====================================================================
     MENÚ
     ===================================================================== */
  var PAGINAS = [["index.html", "Inicio"], ["carta.html", "Carta"], ["promociones.html", "Promociones"], ["sucursales.html", "Sucursales"],
    ["fidelizacion.html", "Fidelización"], ["nosotros.html", "Nosotros"], ["contacto.html", "Contacto"], ["mi-cuenta.html", "Mi cuenta"], ["pedido.html", "Mis pedidos"]];
  var menu = [];
  function pintarMenu() {
    $("[data-menu-lista]").innerHTML = menu.map(function (m, i) {
      var interno = /\.html/.test(m.href) && !/^https:/.test(m.href);
      return '<li class="sa-menu__item" data-i="' + i + '">' +
        '<div class="sa-cat__orden"><button class="icon-btn" type="button" data-menu-mover="-1" aria-label="Subir"' + (i === 0 ? " disabled" : "") + ">" + I("arriba") + "</button>" +
          '<button class="icon-btn" type="button" data-menu-mover="1" aria-label="Bajar"' + (i === menu.length - 1 ? " disabled" : "") + ">" + I("abajo") + "</button></div>" +
        '<label class="field"><span>Texto</span><input class="input" data-mk="texto" value="' + E(m.texto) + '" maxlength="40"></label>' +
        '<label class="field"><span>Lleva a</span>' + (interno
          ? '<select class="select" data-mk="href">' + PAGINAS.map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === m.href ? " selected" : "") + ">" + p[1] + "</option>"; }).join("") + "</select>"
          : '<input class="input" data-mk="href" value="' + E(m.href) + '" placeholder="https://…">') + "</label>" +
        '<label class="config-check"><input type="checkbox" data-mk="visible"' + (m.visible !== false ? " checked" : "") + "> Visible</label>" +
        (m.propio ? '<button class="remove-btn" type="button" data-menu-quitar>Quitar</button>' : "<span></span>") +
      "</li>";
    }).join("");
  }
  function leerMenu() {
    raiz.querySelectorAll(".sa-menu__item").forEach(function (li) {
      var m = menu[Number(li.getAttribute("data-i"))];
      m.texto = li.querySelector('[data-mk="texto"]').value.trim();
      m.href = li.querySelector('[data-mk="href"]').value.trim();
      m.visible = li.querySelector('[data-mk="visible"]').checked;
    });
  }
  function menuInicial() {
    var c = (SA.contenido || {}).menu;
    if (Array.isArray(c) && c.length) return copiar(c);
    return (TAMBU.menuOriginal || TAMBU.menu).map(function (m) { return { id: m.id, texto: m.texto, href: m.href, visible: true }; });
  }

  /* =====================================================================
     FUENTES
     ===================================================================== */
  var PRESETS = [
    { n: "Japandi (actual)", t: "Poppins", x: "Inter" },
    { n: "Japonés sereno", t: "Shippori Mincho", x: "Noto Sans JP" },
    { n: "Moderno", t: "Outfit", x: "DM Sans" },
    { n: "Editorial", t: "Playfair Display", x: "Lato" },
    { n: "Amable", t: "M PLUS Rounded 1c", x: "Nunito Sans" }
  ];
  var cargadas = {};
  function cargarFuente(nombre) {
    if (cargadas[nombre] || nombre === "Poppins" || nombre === "Inter") return;
    cargadas[nombre] = true;
    var l = document.createElement("link"); l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(nombre).replace(/%20/g, "+") + ":wght@400;600;700&display=swap";
    document.head.appendChild(l);
  }
  function muestraFuentes() {
    var f = $('[data-form="fuentes"]');
    cargarFuente(f.titulo.value); cargarFuente(f.texto.value);
    var m = $("[data-fuentes-muestra]");
    m.querySelector(".sa-muestra__titulo").style.fontFamily = '"' + f.titulo.value + '", sans-serif';
    m.querySelectorAll(".sa-muestra__texto").forEach(function (x) { x.style.fontFamily = '"' + f.texto.value + '", sans-serif'; });
  }
  function pintarFuentes() {
    var f = $('[data-form="fuentes"]'), actual = (SA.contenido || {}).fuentes || {};
    var opciones = TAMBU.FUENTES.map(function (n) { return '<option value="' + E(n) + '">' + E(n) + "</option>"; }).join("");
    f.titulo.innerHTML = opciones; f.texto.innerHTML = opciones;
    f.titulo.value = actual.titulo || "Poppins"; f.texto.value = actual.texto || "Inter";
    $("[data-fuentes-presets]").innerHTML = PRESETS.map(function (p, i) {
      return '<button class="sa-preset" type="button" data-preset="' + i + '"><b style="font-family:\'' + p.t + '\'">' + E(p.n) + "</b><small>" + E(p.t + " + " + p.x) + "</small></button>";
    }).join("");
    PRESETS.forEach(function (p) { cargarFuente(p.t); });
    muestraFuentes();
  }

  /* =====================================================================
     Eventos
     ===================================================================== */
  raiz.addEventListener("change", function (e) {
    var t = e.target;
    if (t.matches("[data-textos-pagina]")) {
      if (sucio && !confirm("Tienes textos sin guardar en esta página. Se mantendrán en borrador hasta que guardes. ¿Cambiar de página?")) return;
      cargarVistaPrevia();
    }
    if (t.matches('[data-hk="abierto"]')) {
      t.closest(".sa-dia").querySelectorAll('input[type="time"]').forEach(function (x) { x.disabled = !t.checked; });
    }
    if (t.closest('[data-form="fuentes"]')) muestraFuentes();
  });

  raiz.addEventListener("click", function (e) {
    var t;
    // Pestañas de Textos
    if ((t = e.target.closest("[data-textos-tabs] [data-tab]"))) {
      var tab = t.getAttribute("data-tab");
      raiz.querySelectorAll("[data-textos-tabs] [data-tab]").forEach(function (b) { b.setAttribute("aria-selected", String(b === t)); });
      raiz.querySelectorAll("[data-textos-panel]").forEach(function (p) { p.hidden = p.getAttribute("data-textos-panel") !== tab; });
      return;
    }
    if ((t = e.target.closest("[data-restaurar-texto]"))) {
      var k = t.getAttribute("data-restaurar-texto");
      delete borrador[k];
      var campo = raiz.querySelector('[data-tk="' + k + '"]');
      if (campo) campo.value = originales[k] || "";
      t.remove(); marcarSucio(true); previsualizar();
      return;
    }
    if ((t = e.target.closest("[data-textos-guardar]"))) {
      var limpio = limpiarTextos(Object.assign({}, guardados, borrador));
      SA.guardarContenido("textos", limpio, t, "Textos guardados · ya se ven en la web").then(function (r) {
        if (r.ok) { guardados = copiar(limpio); borrador = copiar(limpio); marcarSucio(false); cargarVistaPrevia(); }
      });
      return;
    }
    if (e.target.closest("[data-textos-descartar]")) {
      borrador = copiar(guardados); marcarSucio(false); cargarVistaPrevia();
      return;
    }
    // Horario
    if (e.target.closest("[data-resumen-agregar]")) { leerResumen(); resumen.push({ dias: "", horas: "" }); pintarResumen(); return; }
    if ((t = e.target.closest("[data-resumen-quitar]"))) { leerResumen(); resumen.splice(Number(t.closest(".sa-par").getAttribute("data-i")), 1); pintarResumen(); return; }
    // Valores de marca
    if (e.target.closest("[data-valor-marca-agregar]")) { leerValores(); valores.push({ titulo: "", texto: "" }); pintarValores(); return; }
    if ((t = e.target.closest("[data-valor-marca-quitar]"))) { leerValores(); valores.splice(Number(t.closest(".sa-par").getAttribute("data-i")), 1); pintarValores(); return; }
    // FAQ
    if ((t = e.target.closest("[data-faq-agregar]"))) { leerFaq(); var g = t.getAttribute("data-faq-agregar"); (faq[g] = faq[g] || []).push({ p: "", r: "" }); pintarFaqGrupo(g); return; }
    if ((t = e.target.closest("[data-faq-quitar]"))) { leerFaq(); var gq = t.getAttribute("data-faq-quitar"); faq[gq].splice(Number(t.closest(".sa-faq").getAttribute("data-i")), 1); pintarFaqGrupo(gq); return; }
    // Fotos del sitio
    if ((t = e.target.closest("[data-foto-sitio]"))) {
      var hueco = HUECOS.find(function (h) { return h.k === t.getAttribute("data-foto-sitio"); });
      SA.elegirImagen(hueco.carpeta, hueco.max, t).then(function (url) {
        if (!url) return;
        var imgs = imagenesActuales(); imgs[hueco.k] = url;
        SA.guardarContenido("imagenes", imgs, t, "Foto actualizada · ya se ve en la web").then(pintarFotos);
      });
      return;
    }
    if ((t = e.target.closest("[data-foto-sitio-quitar]"))) {
      if (!confirm("¿Quitar esta foto? Volverá a verse la imagen original o el espacio provisional.")) return;
      var imgs2 = imagenesActuales(); delete imgs2[t.getAttribute("data-foto-sitio-quitar")];
      SA.guardarContenido("imagenes", imgs2, t, "Foto quitada").then(pintarFotos);
      return;
    }
    // Menú
    if ((t = e.target.closest("[data-menu-mover]"))) {
      leerMenu();
      var i = Number(t.closest(".sa-menu__item").getAttribute("data-i")), d = Number(t.getAttribute("data-menu-mover"));
      menu.splice(i + d, 0, menu.splice(i, 1)[0]); pintarMenu(); return;
    }
    if ((t = e.target.closest("[data-menu-quitar]"))) { leerMenu(); menu.splice(Number(t.closest(".sa-menu__item").getAttribute("data-i")), 1); pintarMenu(); return; }
    if (e.target.closest("[data-menu-agregar]")) {
      leerMenu(); menu.push({ id: "propio-" + Math.random().toString(36).slice(2, 7), texto: "Nuevo enlace", href: "https://", visible: true, propio: true });
      pintarMenu(); return;
    }
    if (e.target.closest("[data-menu-restaurar]")) {
      if (!confirm("¿Volver al menú original? Se perderán los nombres y enlaces que cambiaste.")) return;
      menu = (TAMBU.menuOriginal || TAMBU.menu).map(function (m) { return { id: m.id, texto: m.texto, href: m.href, visible: true }; });
      pintarMenu(); return;
    }
    if ((t = e.target.closest("[data-menu-guardar]"))) {
      leerMenu();
      for (var j = 0; j < menu.length; j++) {
        if (!menu[j].texto) { SA.aviso("Cada enlace del menú necesita un texto.", "error"); return; }
        if (!TAMBU.enlaceValido(menu[j].href)) { SA.aviso("Revisa el enlace «" + menu[j].texto + "»: debe empezar con https://", "error"); return; }
      }
      if (!menu.some(function (m) { return m.visible !== false; })) { SA.aviso("Deja al menos un enlace visible.", "error"); return; }
      SA.guardarContenido("menu", menu.map(function (m) { return { id: m.id, texto: m.texto, href: m.href, visible: m.visible !== false, propio: !!m.propio }; }), t, "Menú guardado · ya se ve en la web");
      return;
    }
    // Fuentes
    if ((t = e.target.closest("[data-preset]"))) {
      var p = PRESETS[Number(t.getAttribute("data-preset"))], f = $('[data-form="fuentes"]');
      f.titulo.value = p.t; f.texto.value = p.x; muestraFuentes();
    }
  });

  raiz.addEventListener("submit", function (e) {
    var f = e.target.closest("[data-form]");
    if (!f) return;
    var tipo = f.getAttribute("data-form");
    var boton = f.querySelector('button[type="submit"]');

    if (tipo === "negocio") {
      e.preventDefault();
      var wa = f.whatsapp.value.replace(/\D/g, "");
      if (wa && (wa.length < 8 || wa.length > 15)) { SA.aviso("El WhatsApp debe tener entre 8 y 15 dígitos, con código de país (ej. 56912345678).", "error"); return; }
      var redes = {}, malas = [];
      ["instagram", "facebook", "tiktok"].forEach(function (r) {
        var v = f[r].value.trim();
        if (v && !/^https:\/\/[^\s"<>]+$/.test(v)) malas.push(r);
        redes[r] = v || null;
      });
      if (malas.length) { SA.aviso("Los enlaces de redes deben empezar con https:// (" + malas.join(", ") + ").", "error"); return; }
      var neg = { whatsapp: wa || null, whatsappVisible: f.whatsappVisible.value.trim() || null, email: f.email.value.trim() || null, redes: redes };
      var dias = [];
      raiz.querySelectorAll(".sa-dia").forEach(function (d) {
        if (!d.querySelector('[data-hk="abierto"]').checked) return;
        var abre = d.querySelector('[data-hk="abre"]').value, cierra = d.querySelector('[data-hk="cierra"]').value;
        var n = DIAS.find(function (x) { return String(x.dia) === d.getAttribute("data-dia"); });
        if (/^\d\d:\d\d$/.test(abre) && /^\d\d:\d\d$/.test(cierra)) dias.push({ dia: n.dia, nombre: n.nombre, abre: abre, cierra: cierra });
      });
      leerResumen();
      var horario = { dias: dias, resumen: resumen.filter(function (r) { return r.dias || r.horas; }) };
      SA.guardarContenido("negocio", neg, boton, null).then(function (r) {
        if (r.ok) SA.guardarContenido("horario", horario, boton, "Contacto y horario guardados · ya se ven en la web");
      });
      return;
    }
    if (tipo === "marca") {
      e.preventDefault();
      leerValores();
      var marca = {
        lema: f.lema.value.trim(), intro: f.intro.value.trim(),
        historia: f.historia.value.split(/\n\s*\n/).map(function (x) { return x.trim(); }).filter(Boolean),
        cita: f.cita.value.trim(),
        valores: valores.filter(function (v) { return v.titulo || v.texto; })
      };
      SA.guardarContenido("marca", marca, boton, "Página Nosotros guardada · ya se ve en la web").then(function (r) { if (r.ok) Object.assign(TAMBU.marca, marca); });
      return;
    }
    if (tipo === "faq") {
      e.preventDefault();
      leerFaq();
      var limpio = {};
      Object.keys(faq).forEach(function (g) { limpio[g] = (faq[g] || []).filter(function (q) { return q.p && q.r; }); });
      SA.guardarContenido("faq", limpio, boton, "Preguntas guardadas · ya se ven en la web").then(function (r) { if (r.ok) Object.assign(TAMBU.faq, limpio); });
      return;
    }
    if (tipo === "fuentes") {
      e.preventDefault();
      var fuentes = { titulo: f.titulo.value, texto: f.texto.value };
      SA.guardarContenido("fuentes", fuentes, boton, "Fuentes guardadas · ya se ven en la web").then(function (r) {
        if (r.ok) { try { localStorage.setItem("tambu_fuentes", JSON.stringify(fuentes)); } catch (err) { /* nada */ } }
      });
    }
  });

  /* ---------- Entradas a cada sección ---------- */
  SA.registrar("textos", { entrar: function () {
    asegurarContenido().then(function (c) {
      if (!sucio) { guardados = copiar(c.textos || {}); borrador = copiar(guardados); }
      cargarVistaPrevia(); pintarNegocio(); pintarMarca(); pintarFaq();
    });
  } });
  SA.registrar("fotos", { entrar: function () { asegurarContenido().then(pintarFotos); } });
  SA.registrar("menu", { entrar: function () { asegurarContenido().then(function () { menu = menuInicial(); pintarMenu(); }); } });
  SA.registrar("fuentes", { entrar: function () { asegurarContenido().then(pintarFuentes); } });
})();
