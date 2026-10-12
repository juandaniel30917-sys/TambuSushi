/* ==========================================================================
   TAMBÚ SUSHI — MODO CLARO / OSCURO (theme.js)
   --------------------------------------------------------------------------
   Se carga en el <head> de cada página para aplicar el tema elegido ANTES
   de que la página se dibuje (evita un parpadeo de color).
   El tema es manual: claro por defecto, y el cliente lo cambia con el botón
   de la cabecera. La elección se recuerda en este navegador.
   ========================================================================== */

window.TAMBU = window.TAMBU || {};

(function () {
  var CLAVE = "tambu_tema";
  var raiz = document.documentElement;
  var memoria = "light"; // respaldo si el navegador bloquea el almacenamiento

  function leer() {
    try {
      var v = localStorage.getItem(CLAVE);
      return v === "dark" || v === "light" ? v : memoria;
    } catch (e) { return memoria; }
  }

  function aplicar(tema) {
    raiz.setAttribute("data-theme", tema);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", tema === "dark" ? "#131210" : "#F8F6F0");
    document.querySelectorAll("[data-tema]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-tema") === tema));
    });
    document.querySelectorAll(".theme-toggle").forEach(function (b) {
      b.setAttribute("aria-label", tema === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
      b.setAttribute("title", tema === "dark" ? "Modo claro" : "Modo oscuro");
    });
  }

  TAMBU.tema = {
    actual: leer,
    elegir: function (tema) {
      tema = tema === "dark" ? "dark" : "light";
      memoria = tema;
      try { localStorage.setItem(CLAVE, tema); } catch (e) { /* sin memoria: solo esta visita */ }
      var suave = document.startViewTransition &&
        !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      if (suave) document.startViewTransition(function () { aplicar(tema); });
      else aplicar(tema);
    },
    alternar: function () { this.elegir(leer() === "dark" ? "light" : "dark"); },
    refrescar: function () { aplicar(leer()); }
  };

  aplicar(leer());

  // Botones: .theme-toggle alterna; [data-tema="light|dark"] elige
  document.addEventListener("click", function (e) {
    var t = e.target.closest(".theme-toggle");
    if (t) { TAMBU.tema.alternar(); return; }
    var b = e.target.closest("[data-tema]");
    if (b) TAMBU.tema.elegir(b.getAttribute("data-tema"));
  });

  // Mantener sincronizadas otras pestañas abiertas
  window.addEventListener("storage", function (e) { if (e.key === CLAVE) aplicar(leer()); });
})();

/* ---------- Contenido editable: fuentes elegidas y textos sin parpadeo ----------
   Las fuentes que el superadministrador elige se aplican antes de dibujar.
   Mientras llega el contenido, los textos editables se ocultan un instante
   (máximo 4 segundos) para no mostrar el texto antiguo. */
(function () {
  var raiz = document.documentElement;
  var OK = ["Poppins", "Inter", "Montserrat", "DM Sans", "Outfit", "Manrope", "Space Grotesk", "Plus Jakarta Sans",
    "Work Sans", "Nunito Sans", "Lato", "Raleway", "Josefin Sans", "Playfair Display", "Cormorant Garamond", "Noto Serif JP",
    "Shippori Mincho", "Zen Kaku Gothic New", "Noto Sans JP", "M PLUS Rounded 1c", "Sawarabi Gothic"];
  try {
    var f = JSON.parse(localStorage.getItem("tambu_fuentes") || "null");
    if (f) {
      var t = OK.indexOf(f.titulo) >= 0 ? f.titulo : "Poppins", x = OK.indexOf(f.texto) >= 0 ? f.texto : "Inter";
      raiz.style.setProperty("--font-titulo", '"' + t + '", "Poppins", system-ui, sans-serif');
      raiz.style.setProperty("--font-texto", '"' + x + '", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif');
      var extra = [t, x].filter(function (n) { return n !== "Poppins" && n !== "Inter"; });
      if (extra.length) document.write('<link id="tambu-fuentes" rel="stylesheet" href="https://fonts.googleapis.com/css2?' +
        extra.map(function (n) { return "family=" + encodeURIComponent(n).replace(/%20/g, "+") + ":wght@400;500;600;700;800"; }).join("&") + '&display=swap">');
    }
  } catch (e) { /* sin fuentes guardadas */ }
  raiz.classList.add("tambu-cargando");
  setTimeout(function () { raiz.classList.remove("tambu-cargando"); }, 4000);
})();
