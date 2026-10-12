/* ==========================================================================
   TAMBÚ SUSHI — ANIMACIONES (motion.js)
   --------------------------------------------------------------------------
   1. Transición al cambiar de página (con barra fina de bambú)
   2. Aparición suave de secciones al hacer scroll
   3. Pieza de sushi que vuela al carrito al agregar
   4. Fundido de contenido al filtrar la carta
   5. Menú móvil escalonado
   Si el dispositivo pide "reducir movimiento", solo queda lo esencial.
   ========================================================================== */

(function () {
  var reducido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var raiz = document.documentElement;

  /* ---------- 1. Cambio de página ---------- */
  var barra = document.createElement("div");
  barra.className = "route-bar";
  barra.setAttribute("aria-hidden", "true");
  document.body.appendChild(barra);

  function esEnlaceInterno(a, e) {
    if (!a || e.defaultPrevented || e.button !== 0) return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (a.target && a.target !== "_self") return false;
    if (a.hasAttribute("download")) return false;
    var href = a.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#" || /^(mailto|tel|javascript):/i.test(href)) return false;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return false; }
    if (url.protocol !== location.protocol || url.host !== location.host) return false;
    // Mismo documento con otro #ancla: dejar que el navegador haga scroll
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return false;
    return /\.html$/i.test(url.pathname) || /\/$/.test(url.pathname);
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!esEnlaceInterno(a, e)) return;
    e.preventDefault();
    var destino = a.href;
    raiz.classList.add("is-leaving");
    setTimeout(function () { location.href = destino; }, reducido ? 0 : 170);
  });

  // Al volver con el botón "atrás" el navegador puede restaurar la página tal cual
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) raiz.classList.remove("is-leaving");
  });

  if (reducido) return;

  /* ---------- 2. Aparición al hacer scroll ---------- */
  var selector = [
    ".section__head", ".product-card", ".cat-tile", ".promo-card", ".step", ".info-card",
    ".reward", ".loyalty-band", ".hero__media", ".editorial > *", ".map-box", ".faq details", ".state"
  ].join(",");

  var observador = "IntersectionObserver" in window ? new IntersectionObserver(function (entradas) {
    entradas.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("is-visible"); observador.unobserve(en.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }) : null;

  function prepararReveal(contexto) {
    if (!observador) return;
    var alto = window.innerHeight;
    var grupos = new Map();
    (contexto || document).querySelectorAll(selector).forEach(function (el) {
      if (el.classList.contains("reveal") || el.closest(".mobile-menu, .site-header")) return;
      // Lo que ya se ve al cargar no se oculta (evita parpadeos)
      if (el.getBoundingClientRect().top < alto * 0.92) return;
      // Escalonado entre hermanos de una misma cuadrícula
      var padre = el.parentElement;
      var n = grupos.get(padre) || 0;
      grupos.set(padre, n + 1);
      el.style.setProperty("--i", Math.min(n, 5));
      el.classList.add("reveal");
      observador.observe(el);
    });
  }
  // Espera a que los scripts de cada página dibujen su contenido
  requestAnimationFrame(function () { requestAnimationFrame(function () { prepararReveal(); }); });

  /* ---------- 3. Pieza que vuela al carrito ---------- */
  var ultimoBoton = null, ultimoToque = 0;
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-agregar], [data-boton-agregar]");
    if (b) { ultimoBoton = b; ultimoToque = Date.now(); }
  }, true);

  function carritoVisible() {
    var lista = document.querySelectorAll(".cart-btn");
    for (var i = 0; i < lista.length; i++) {
      var r = lista[i].getBoundingClientRect();
      if (r.width && r.height) return lista[i];
    }
    return null;
  }

  document.addEventListener("tambu:carrito", function () {
    if (!ultimoBoton || Date.now() - ultimoToque > 800 || !document.body.animate) return;
    var carrito = carritoVisible();
    if (!carrito) return;
    var o = ultimoBoton.getBoundingClientRect(), d = carrito.getBoundingClientRect();
    ultimoBoton = null;
    var pieza = document.createElement("div");
    pieza.className = "fly-piece";
    pieza.style.left = (o.left + o.width / 2 - 11) + "px";
    pieza.style.top = (o.top + o.height / 2 - 11) + "px";
    document.body.appendChild(pieza);
    var dx = d.left + d.width / 2 - (o.left + o.width / 2);
    var dy = d.top + d.height / 2 - (o.top + o.height / 2);
    var anim = pieza.animate([
      { transform: "translate(0, 0) scale(.6)", opacity: 0 },
      { transform: "translate(" + dx * 0.35 + "px," + (dy * 0.35 - 70) + "px) scale(1.1)", opacity: 1, offset: 0.35 },
      { transform: "translate(" + dx + "px," + dy + "px) scale(.4)", opacity: 0.9 }
    ], { duration: 620, easing: "cubic-bezier(.45,.05,.35,1)" });
    anim.onfinish = function () {
      pieza.remove();
      carrito.classList.remove("is-receiving"); void carrito.offsetWidth; carrito.classList.add("is-receiving");
    };
  });

  /* ---------- 4. Fundido al filtrar la carta ---------- */
  var carta = document.querySelector("[data-carta]");
  if (carta && "MutationObserver" in window) {
    new MutationObserver(function () {
      carta.classList.remove("is-swapping"); void carta.offsetWidth; carta.classList.add("is-swapping");
    }).observe(carta, { childList: true });
  }

  /* ---------- 5. Menú móvil escalonado ---------- */
  document.querySelectorAll(".mobile-menu__link, .mobile-menu__bottom").forEach(function (el, i) {
    el.style.setProperty("--i", i);
  });
})();
