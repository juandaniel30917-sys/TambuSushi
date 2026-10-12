/* ==========================================================================
   TAMBÚ SUSHI — CABECERA, MENÚ MÓVIL Y PIE DE PÁGINA (navigation.js)
   --------------------------------------------------------------------------
   La cabecera y el pie se escriben UNA sola vez aquí y se insertan en todas
   las páginas. Para agregar o quitar un enlace del menú, edita TAMBU.menu.
   Cada página indica cuál es con <body data-page="carta"> (marca el enlace).
   ========================================================================== */

window.TAMBU = window.TAMBU || {};

TAMBU.menu = [
  { id: "inicio",       texto: "Inicio",       href: "index.html" },
  { id: "carta",        texto: "Carta",        href: "carta.html" },
  { id: "promociones",  texto: "Promociones",  href: "promociones.html" },
  { id: "sucursales",   texto: "Sucursales",   href: "sucursales.html" },
  { id: "fidelizacion", texto: "Fidelización", href: "fidelizacion.html" },
  { id: "nosotros",     texto: "Nosotros",     href: "nosotros.html" },
  { id: "contacto",     texto: "Contacto",     href: "contacto.html" }
];

// Menú editado desde el panel del superadministrador (si existe)
TAMBU.menuOriginal = TAMBU.menu.slice();
if (TAMBU.menuPersonalizado && TAMBU.menuPersonalizado.length) TAMBU.menu = TAMBU.menuPersonalizado;

/* ---------- Iconos SVG (trazo fino, coherentes entre sí) -------------- */
TAMBU.icono = function (nombre, extraClase) {
  var p = {
    carrito:  '<path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.2"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
    usuario:  '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.3-3.6 4.2-5.4 7.5-5.4s6.2 1.8 7.5 5.4"/>',
    menu:     '<path d="M4 7h16M4 12h16M4 17h10"/>',
    cerrar:   '<path d="M6 6l12 12M18 6L6 18"/>',
    whatsapp: '<path d="M4.5 19.5l1.1-3.9A8 8 0 1 1 8.7 18.6z"/><path d="M9.2 8.6c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.1.3 0 .5.6 1 1.4 1.8 2.4 2.3.2.1.4.1.5 0l.6-.7c.2-.2.4-.2.6-.1l1.5.7c.3.1.4.3.4.5v.5c0 .4-.3.9-.8 1.1-.6.3-1.6.4-3.2-.4-1.9-1-3.2-2.6-3.8-3.8-.5-1-.4-1.9-.1-2.4z"/>',
    reloj:    '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    ubicacion:'<path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    flecha:   '<path d="M5 12h14M13 6l6 6-6 6"/>',
    mas:      '<path d="M12 5v14M5 12h14"/>',
    menos:    '<path d="M5 12h14"/>',
    buscar:   '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
    info:     '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    check:    '<path d="M5 12.5l4.2 4.2L19 7"/>',
    luna:     '<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/>',
    sol:      '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
    basura:   '<path d="M4.5 7h15M9.5 7V5h5v2M6.5 7l.8 12.2a1 1 0 0 0 1 .8h7.4a1 1 0 0 0 1-.8L17.5 7"/>',
    regalo:   '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5V20h14v-7.5M12 8.5V20M12 8.5c-1.5-3.5-5.5-4-5.5-1.5S12 8.5 12 8.5zM12 8.5c1.5-3.5 5.5-4 5.5-1.5S12 8.5 12 8.5z"/>',
    estrella: '<path d="M12 3.8l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z"/>',
    tienda:   '<path d="M4 9.5l1.5-5h13L20 9.5M4 9.5v10h16v-10M4 9.5c0 1.5 1.2 2.5 2.7 2.5s2.6-1 2.6-2.5c0 1.5 1.2 2.5 2.7 2.5s2.7-1 2.7-2.5c0 1.5 1.1 2.5 2.6 2.5S20 11 20 9.5M10 19.5v-4.5h4v4.5"/>',
    moto:     '<circle cx="6" cy="17" r="2.8"/><circle cx="18" cy="17" r="2.8"/><path d="M8.8 17h6.4l-2.2-6H9.5M13 11l1.5-3.5h2.5M15 17l2-5.5"/>',
    hoja:     '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14zM5 19l7-7"/>',
    fuego:    '<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.5 3-5.3 3.6-8.9 2.4 1.5 3.4 3.6 3.4 5.6.8-.6 1.4-1.6 1.6-2.7 1.9 1.6 3.4 3.6 3.4 6 0 3.2-2.4 5.6-6 5.6z"/>',
    copo:     '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"/>',
    vaso:     '<path d="M6.5 4h11l-1.4 15.2a1 1 0 0 1-1 .8H8.9a1 1 0 0 1-1-.8zM7 9h10"/>',
    rollo:    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.8"/>',
    cono:     '<path d="M4.5 5.5l15 3-11 11.5z"/><path d="M8.5 9.5l5 1"/>',
    etiqueta: '<path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9z"/><circle cx="8" cy="8" r="1.4"/>',
    mail:     '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
    candado:  '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    tarjeta:  '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 9.5h18M7 15h3"/>',
    chevron:  '<path d="M9 6l6 6-6 6"/>',
    copiar:   '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
    palillos: '<path class="palillo-a" d="M3 21L19.5 4.5"/><path class="palillo-b" d="M3 21L21 8"/><circle class="pieza" cx="18.6" cy="7.4" r="1.9" fill="currentColor" stroke="none"/>',
    // Panel del superadministrador
    casa:     '<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V19h12V9.5"/><path d="M10 19v-5h4v5"/>',
    recibo:   '<path d="M6 3.5h12v17l-2.5-1.5-2 1.5-1.5-1.2-1.5 1.2-2-1.5L6 20.5z"/><path d="M9 8h6M9 11.5h6M9 15h4"/>',
    texto:    '<path d="M5 6.5V5h14v1.5M12 5v14M9.5 19h5"/>',
    imagen:   '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 16l-5-4.5-8 7.5"/>',
    fuente:   '<path d="M3.5 18L8 6l4.5 12M5.2 14h5.6"/><path d="M15 12.5a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2zM17.6 11v7"/>',
    equipo:   '<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.9-3 3-4.6 5.5-4.6s4.6 1.6 5.5 4.6"/><path d="M15.5 6.2a3 3 0 0 1 0 5.6M17.5 14.6c1.4.6 2.4 2 3 4.4"/>',
    salir:    '<path d="M14 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H14"/><path d="M10.5 12H20M16.5 8l4 4-4 4"/>',
    externo:  '<path d="M13 5h6v6M19 5l-8.5 8.5"/><path d="M17 13.5V18a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 5 18V9a1.5 1.5 0 0 1 1.5-1.5H11"/>',
    lapiz:    '<path d="M4.5 19.5l1-4L15.8 5.2a1.8 1.8 0 0 1 2.5 0l.5.5a1.8 1.8 0 0 1 0 2.5L8.5 18.5z"/><path d="M14 7l3 3"/>',
    subir:    '<path d="M12 15.5V4.5M7.5 9L12 4.5 16.5 9"/><path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15"/>',
    ajustes:  '<circle cx="12" cy="12" r="2.8"/><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4L6 18M18 18l-1.6-1.6M7.6 7.6L6 6"/>',
    arriba:   '<path d="M12 19V5M6.5 10.5L12 5l5.5 5.5"/>',
    abajo:    '<path d="M12 5v14M6.5 13.5L12 19l5.5-5.5"/>',
    ojo:      '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'
  };
  return '<svg class="icon ' + (extraClase || "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
         (p[nombre] || "") + "</svg>";
};

/* WhatsApp de la sucursal elegida (o el general si no hay / no tiene propio) */
TAMBU.urlWhatsapp = function (mensaje, sucursal) {
  var s = sucursal || (TAMBU.sucursal ? TAMBU.sucursal.actual() : null);
  var numero = TAMBU.sucursal ? TAMBU.sucursal.whatsapp(s) : TAMBU.negocio.whatsapp;
  var base = "https://wa.me/" + numero;
  return mensaje ? base + "?text=" + encodeURIComponent(mensaje) : base;
};

(function () {
  var paginaActual = document.body.getAttribute("data-page") || "";
  var I = TAMBU.icono;
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function externo(m) { return /^https:/.test(m.href) ? ' target="_blank" rel="noopener"' : ""; }
  var imgs = TAMBU.imagenes || {};
  var logo = TAMBU.imagenValida && TAMBU.imagenValida(imgs.logo) ? imgs.logo : "assets/images/logo-circular-mini.png";
  var logoPie = TAMBU.imagenValida && TAMBU.imagenValida(imgs["logo-pie"]) ? imgs["logo-pie"] : "assets/images/logo-tipografico-mini.png";

  function enlacesMenu(clase) {
    return TAMBU.menu.map(function (m) {
      var activo = m.id === paginaActual || m.href === paginaActual + ".html";
      return '<a class="' + clase + (activo ? " is-active" : "") + '" href="' + esc(m.href) + '"' + externo(m) +
             (activo ? ' aria-current="page"' : "") + ">" + esc(m.texto) + "</a>";
    }).join("");
  }

  /* ---------- Cabecera ---------- */
  var header =
    '<a class="skip-link" href="#contenido">Saltar al contenido</a>' +
    '<div class="branch-bar">' +
      '<div class="container branch-bar__inner">' +
        '<a class="branch-bar__pick" href="sucursales.html">' + I("ubicacion") +
          '<span class="branch-bar__label">Pedir en</span> <b data-sucursal-nombre>Elige tu sucursal</b><span class="branch-bar__pais" data-pais-nombre hidden></span>' +
          '<span class="branch-bar__change">Cambiar</span>' +
        "</a>" +
        '<span class="status-pill status-pill--bare" data-estado-local aria-live="polite">' +
          '<span class="status-pill__dot"></span><span class="status-pill__text">Horario</span>' +
        "</span>" +
      "</div>" +
    "</div>" +
    '<header class="site-header">' +
      '<div class="container site-header__bar">' +
        '<a class="brand" href="index.html" aria-label="Tambú Sushi, ir al inicio">' +
          '<img class="brand__logo" src="' + esc(logo) + '" alt="" width="44" height="40">' +
          '<span class="brand__text">Tambú<span>Sushi · ' + (TAMBU.paisActual ? TAMBU.paisActual.ciudadMarca : "Talca") + "</span></span>" +
        "</a>" +
        '<nav class="main-nav" aria-label="Principal">' + enlacesMenu("main-nav__link") +
          '<a class="main-nav__link main-nav__link--admin' + (paginaActual === "admin-pedidos" ? " is-active" : "") + '" href="admin-pedidos.html" data-solo-admin hidden>Pedidos</a>' +
          '<a class="main-nav__link main-nav__link--super" href="admin.html" data-solo-superadmin hidden>Panel</a>' +
        "</nav>" +
        '<div class="header-actions">' +
          '<button class="icon-btn theme-toggle" type="button" aria-label="Cambiar a modo oscuro">' + I("luna", "icon--luna") + I("sol", "icon--sol") + "</button>" +
          '<a class="icon-btn orders-btn' + (paginaActual === "pedido" ? " is-active" : "") + '" href="pedido.html" aria-label="Mis pedidos" title="Mis pedidos" data-mis-pedidos-btn>' + I("recibo") + "</a>" +
          '<a class="icon-btn" href="mi-cuenta.html" aria-label="Mi cuenta">' + I("usuario") + "</a>" +
          '<a class="icon-btn cart-btn" href="carrito.html" aria-label="Carrito">' + I("carrito") +
            '<span class="cart-btn__count" data-contador-carrito>0</span>' +
          "</a>" +
          '<a class="btn btn--primary btn--sm header-cta" href="carta.html" data-texto="general.boton1">Pedir ahora</a>' +
          '<button class="icon-btn menu-toggle" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="menu-movil">' + I("menu") + "</button>" +
        "</div>" +
      "</div>" +
    "</header>" +
    '<div class="mobile-menu" id="menu-movil" hidden>' +
      '<div class="mobile-menu__panel" role="dialog" aria-modal="true" aria-label="Menú">' +
        '<div class="mobile-menu__top">' +
          '<span class="eyebrow">Menú</span>' +
          '<button class="icon-btn" type="button" data-cerrar-menu aria-label="Cerrar menú">' + I("cerrar") + "</button>" +
        "</div>" +
        '<nav class="mobile-menu__nav" aria-label="Principal móvil">' + enlacesMenu("mobile-menu__link") +
          '<a class="mobile-menu__link' + (paginaActual === "mi-cuenta" ? " is-active" : "") + '" href="mi-cuenta.html">Mi cuenta</a>' +
          '<a class="mobile-menu__link' + (paginaActual === "pedido" ? " is-active" : "") + '" href="pedido.html">Mis pedidos</a>' +
          '<a class="mobile-menu__link mobile-menu__link--admin' + (paginaActual === "admin-pedidos" ? " is-active" : "") + '" href="admin-pedidos.html" data-solo-admin hidden>Pedidos · admin</a>' +
          '<a class="mobile-menu__link mobile-menu__link--super" href="admin.html" data-solo-superadmin hidden>Panel de administración</a>' +
        "</nav>" +
        '<div class="mobile-menu__bottom">' +
          '<div class="theme-switch" role="group" aria-label="Apariencia">' +
            '<button type="button" data-tema="light" aria-pressed="true">' + I("sol") + "Claro</button>" +
            '<button type="button" data-tema="dark" aria-pressed="false">' + I("luna") + "Oscuro</button>" +
          "</div>" +
          '<a class="branch-card-mini" href="sucursales.html">' + I("ubicacion") +
            '<span><small>Pedir en</small><b data-sucursal-nombre>Elige tu sucursal</b></span>' +
            '<span class="status-pill" data-estado-local><span class="status-pill__dot"></span><span class="status-pill__text">Horario</span></span>' +
          "</a>" +
          '<a class="btn btn--primary btn--block" href="carta.html" data-texto="general.boton1">Pedir ahora</a>' +
        "</div>" +
      "</div>" +
    "</div>";

  /* ---------- Pie de página ---------- */
  var n = TAMBU.negocio;
  var redes = Object.keys(n.redes).map(function (k) {
    var nombre = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" }[k] || k;
    return n.redes[k]
      ? '<li><a href="' + esc(n.redes[k]) + '" target="_blank" rel="noopener">' + nombre + "</a></li>"
      : '<li><span class="pending">' + nombre + " · por confirmar</span></li>";
  }).join("");

  var horario = TAMBU.horarioResumen.map(function (h) {
    return "<li><span>" + esc(h.dias) + "</span><span>" + esc(h.horas) + "</span></li>";
  }).join("");

  var footer =
    '<footer class="site-footer">' +
      '<div class="container site-footer__grid">' +
        '<div class="site-footer__brand">' +
          '<img src="' + esc(logoPie) + '" alt="Tambú Sushi" width="120" height="120" loading="lazy">' +
          '<p data-texto="general.texto1">Sushi preparado al momento en Talca y Punto Fijo.</p>' +
        "</div>" +
        '<div><h2 class="footer-title" data-texto="general.titulo1">Navegación</h2><ul class="footer-list">' +
          TAMBU.menu.map(function (m) { return '<li><a href="' + esc(m.href) + '"' + externo(m) + ">" + esc(m.texto) + "</a></li>"; }).join("") +
          '<li><a href="mi-cuenta.html">Mi cuenta</a></li>' +
          '<li><a href="pedido.html">Mis pedidos</a></li>' +
        "</ul></div>" +
        '<div><h2 class="footer-title" data-texto="general.titulo2">Horario</h2><ul class="footer-list footer-list--hours">' + horario + "</ul></div>" +
        '<div><h2 class="footer-title" data-texto="general.titulo3">Contacto</h2><ul class="footer-list">' +
          '<li><a href="' + TAMBU.urlWhatsapp() + '" target="_blank" rel="noopener" data-whatsapp="">WhatsApp ' + esc(n.whatsappVisible) + "</a></li>" +
          '<li><a href="sucursales.html">' + (TAMBU.sucursales ? TAMBU.sucursales.length : "") + " sucursales · ver mapa</a></li>" +
          redes +
        "</ul></div>" +
      "</div>" +
      '<div class="container site-footer__legal">' +
        "<span>© " + new Date().getFullYear() + ' <span data-texto="general.texto2">Tambú Sushi Talca · Prototipo de demostración</span></span>' +
        '<span class="pending" data-texto="general.texto3">Términos y condiciones · Privacidad · Despacho y devoluciones — por redactar antes de publicar</span>' +
      "</div>" +
    "</footer>";

  var hHeader = document.getElementById("site-header");
  var hFooter = document.getElementById("site-footer");
  if (hHeader) hHeader.outerHTML = header;
  if (hFooter) hFooter.outerHTML = footer;
  if (TAMBU.tema) TAMBU.tema.refrescar();
  // Textos de cabecera y pie editados en el panel
  if (TAMBU.aplicarTextos) TAMBU.aplicarTextos((TAMBU.contenido && TAMBU.contenido.textos) || {});

  /* ---------- Menú móvil ---------- */
  var menu = document.getElementById("menu-movil");
  var toggle = document.querySelector(".menu-toggle");

  function abrir() {
    menu.hidden = false;
    requestAnimationFrame(function () { menu.classList.add("is-open"); });
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("no-scroll");
    var primero = menu.querySelector("a, button");
    if (primero) primero.focus();
  }
  function cerrar() {
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("no-scroll");
    setTimeout(function () { menu.hidden = true; }, 200);
    toggle.focus();
  }
  if (menu && toggle) {
    toggle.addEventListener("click", abrir);
    menu.addEventListener("click", function (e) {
      if (e.target === menu || e.target.closest("[data-cerrar-menu]")) cerrar();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) cerrar();
    });
  }

  /* ---------- Contador del carrito ---------- */
  function actualizarContador() {
    var total = TAMBU.cart ? TAMBU.cart.cantidadTotal() : 0;
    document.querySelectorAll("[data-contador-carrito]").forEach(function (el) {
      el.textContent = total > 99 ? "99+" : String(total);
      el.classList.toggle("is-empty", total === 0);
    });
    var btn = document.querySelector(".cart-btn");
    if (btn) btn.setAttribute("aria-label", "Carrito, " + total + (total === 1 ? " producto" : " productos"));
  }
  actualizarContador();
  document.addEventListener("tambu:carrito", function () {
    actualizarContador();
    document.querySelectorAll("[data-contador-carrito]").forEach(function (el) {
      el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
    });
  });
})();
