/* ==========================================================================
   TAMBÚ SUSHI — CONTENIDO EDITABLE (site-data.js)
   --------------------------------------------------------------------------
   Carga desde la base de datos lo que el superadministrador cambia en el
   panel: carta, precios, promociones, textos, fotos, menú y fuentes.
   - js/demo-data.js queda como respaldo si no hay conexión.
   - Se guarda una copia en el navegador para que las páginas abran rápido.
   - Los demás scripts de la página (type="text/x-tambu") se ejecutan cuando
     el contenido ya está listo, así nunca se dibuja la carta antigua.
   Seguridad: los textos se insertan como texto (nunca como HTML), las fotos
   solo pueden venir de la carpeta de la tienda y los enlaces se filtran.
   ========================================================================== */

window.TAMBU = window.TAMBU || {};

TAMBU.supabaseConfig = TAMBU.supabaseConfig || {
  url: "https://uxvxcuspkbuyykefrcvt.supabase.co",
  publishableKey: "sb_publishable_2WcJ62rKJbijoEhY-6piLw_GAWehImI"
};

TAMBU.FUENTES = ["Poppins", "Inter", "Montserrat", "DM Sans", "Outfit", "Manrope", "Space Grotesk", "Plus Jakarta Sans",
  "Work Sans", "Nunito Sans", "Lato", "Raleway", "Josefin Sans", "Playfair Display", "Cormorant Garamond", "Noto Serif JP",
  "Shippori Mincho", "Zen Kaku Gothic New", "Noto Sans JP", "M PLUS Rounded 1c", "Sawarabi Gothic"];

(function () {
  var CLAVE = "tambu_contenido";
  var FRESCO = 60000;         // copia de menos de 1 minuto: se usa sin esperar
  var ESPERA_CON_COPIA = 1200, ESPERA_SIN_COPIA = 3500;

  var IMG_OK = /^(https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/tienda\/[A-Za-z0-9._\/-]+|assets\/images\/[A-Za-z0-9._\/-]+)$/;
  var HREF_OK = /^([a-z0-9-]+\.html(#[a-z0-9-]*)?|https:\/\/[^\s"<>]+)$/;
  TAMBU.imagenValida = function (u) { return typeof u === "string" && IMG_OK.test(u); };
  TAMBU.enlaceValido = function (u) { return typeof u === "string" && HREF_OK.test(u); };

  /* ---------- Copia local ---------- */
  function leerCopia() {
    try { return JSON.parse(localStorage.getItem(CLAVE) || "null"); } catch (e) { return null; }
  }
  function guardarCopia(datos) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ t: Date.now(), datos: datos }));
      var f = datos && datos.contenido && datos.contenido.fuentes;
      if (f) localStorage.setItem("tambu_fuentes", JSON.stringify(f)); else localStorage.removeItem("tambu_fuentes");
    } catch (e) { /* sin espacio o modo privado */ }
  }
  TAMBU.olvidarContenido = function () { try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ } };

  /* ---------- Convertir filas de la base de datos al formato de la web ---------- */
  function producto(r) {
    var div = r.pais === "VE" ? 100 : 1;   // Venezuela se guarda en centavos de dólar
    var etiquetas = (r.etiquetas || []).slice();
    if (r.demo && etiquetas.indexOf("demo") === -1) etiquetas.push("demo");
    return {
      id: r.id, categoria: r.categoria, demo: !!r.demo, destacado: !!r.destacado, promo: !!r.promo, relevancia: r.relevancia || 0,
      nombre: r.nombre, descripcion: r.descripcion || "", descripcionLarga: r.descripcion_larga || r.descripcion || "",
      precio: r.precio / div, precioAntes: r.precio_antes != null ? r.precio_antes / div : undefined,
      piezas: r.piezas || undefined, ingredientes: r.ingredientes || [], etiquetas: etiquetas,
      imagenes: (r.imagenes || []).filter(TAMBU.imagenValida),
      opciones: (r.opciones || []).map(function (g) {
        return { id: g.id, nombre: g.nombre, tipo: g.tipo, requerido: !!g.requerido, max: g.max || undefined,
          valores: (g.valores || []).map(function (v) { return { id: v.id, nombre: v.nombre, extra: (Number(v.extra) || 0) / div }; }) };
      })
    };
  }

  /* ---------- Aplicar datos (antes de dibujar la página) ---------- */
  function aplicarDatos(d) {
    if (!d) return;
    TAMBU.contenido = d.contenido || {};
    var c = TAMBU.contenido;
    if (Array.isArray(d.productos)) {
      TAMBU.productos = d.productos.filter(function (r) { return r.pais === "CL"; }).map(producto);
      TAMBU.productosVE = d.productos.filter(function (r) { return r.pais === "VE"; }).map(producto);
    }
    if (Array.isArray(c.categorias) && c.categorias.length) {
      TAMBU.categoriasTodas = c.categorias;
      TAMBU.categorias = c.categorias.filter(function (x) { return x.activa !== false; });
    }
    if (c.etiquetas && typeof c.etiquetas === "object") Object.assign(TAMBU.etiquetas, c.etiquetas);
    if (c.marca) Object.assign(TAMBU.marca, c.marca);
    if (c.negocio) {
      var n = c.negocio;
      ["whatsapp", "whatsappVisible", "email", "direccion", "ciudad"].forEach(function (k) { if (n[k] !== undefined) TAMBU.negocio[k] = n[k] || null; });
      if (n.redes) Object.keys(n.redes).forEach(function (k) {
        var u = n.redes[k];
        TAMBU.negocio.redes[k] = u && /^https:\/\/[^\s"<>]+$/.test(u) ? u : null;
      });
      if (TAMBU.negocio.whatsapp) TAMBU.negocio.whatsapp = String(TAMBU.negocio.whatsapp).replace(/\D/g, "");
    }
    if (c.horario) {
      if (Array.isArray(c.horario.dias) && c.horario.dias.length) TAMBU.horario = c.horario.dias.filter(function (h) { return h && /^\d\d:\d\d$/.test(h.abre) && /^\d\d:\d\d$/.test(h.cierra); });
      if (Array.isArray(c.horario.resumen)) TAMBU.horarioResumen = c.horario.resumen;
    }
    if (c.faq && typeof c.faq === "object") Object.assign(TAMBU.faq, c.faq);
    if (Array.isArray(c.menu)) {
      TAMBU.menuPersonalizado = c.menu.filter(function (m) { return m && m.visible !== false && TAMBU.enlaceValido(m.href) && m.texto; });
    }
    TAMBU.imagenes = {};
    if (c.imagenes) Object.keys(c.imagenes).forEach(function (k) { if (TAMBU.imagenValida(c.imagenes[k])) TAMBU.imagenes[k] = c.imagenes[k]; });
    if (c.fuentes) TAMBU.aplicarFuentes(c.fuentes);
  }

  /* ---------- Fuentes ---------- */
  TAMBU.aplicarFuentes = function (f) {
    var titulo = TAMBU.FUENTES.indexOf(f && f.titulo) >= 0 ? f.titulo : "Poppins";
    var texto = TAMBU.FUENTES.indexOf(f && f.texto) >= 0 ? f.texto : "Inter";
    var raiz = document.documentElement.style;
    raiz.setProperty("--font-titulo", '"' + titulo + '", "Poppins", system-ui, sans-serif');
    raiz.setProperty("--font-texto", '"' + texto + '", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif');
    var extra = [titulo, texto].filter(function (x) { return x !== "Poppins" && x !== "Inter"; });
    var link = document.getElementById("tambu-fuentes");
    if (!extra.length) { if (link) link.remove(); return; }
    var url = "https://fonts.googleapis.com/css2?" + extra.map(function (x) { return "family=" + encodeURIComponent(x).replace(/%20/g, "+") + ":wght@400;500;600;700;800"; }).join("&") + "&display=swap";
    if (!link) { link = document.createElement("link"); link.id = "tambu-fuentes"; link.rel = "stylesheet"; document.head.appendChild(link); }
    if (link.href !== url) link.href = url;
  };

  /* ---------- Textos y fotos de las páginas ---------- */
  function escapar(t) { return String(t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  /* Formato simple: **negrita** y *destacado en color* */
  function rico(t) {
    return escapar(t).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }
  /* Texto original de la página (para el panel y para volver atrás) */
  TAMBU.textoOriginal = function (el) {
    if (el.hasAttribute("data-texto-original")) return el.getAttribute("data-texto-original");
    var t = el.hasAttribute("data-texto-rico")
      ? el.innerHTML.replace(/<strong>([^<]*)<\/strong>/g, "**$1**").replace(/<em>([^<]*)<\/em>/g, "*$1*").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      : el.textContent;
    el.setAttribute("data-texto-original", t);
    return t;
  };
  TAMBU.aplicarTextos = function (textos, raiz) {
    (raiz || document).querySelectorAll("[data-texto]").forEach(function (el) {
      var original = TAMBU.textoOriginal(el);
      var k = el.getAttribute("data-texto");
      var v = textos && typeof textos[k] === "string" && textos[k].trim() !== "" ? textos[k] : original;
      if (el.hasAttribute("data-texto-rico")) el.innerHTML = rico(v); else el.textContent = v;
    });
  };
  TAMBU.aplicarImagenes = function (imgs, raiz) {
    (raiz || document).querySelectorAll("[data-imagen]").forEach(function (el) {
      var url = imgs && imgs[el.getAttribute("data-imagen")];
      var actual = el.querySelector(":scope > img[data-imagen-puesta]");
      if (TAMBU.imagenValida(url)) {
        if (!actual) { actual = document.createElement("img"); actual.setAttribute("data-imagen-puesta", ""); actual.loading = "lazy"; el.appendChild(actual); }
        actual.src = url;
        actual.alt = el.getAttribute("aria-label") || "";
      } else if (actual) {
        actual.remove();
      }
    });
  };

  /* ---------- Arranque: espera el contenido y luego ejecuta la página ---------- */
  var listo = false, domListo = false, ejecutado = false;
  function ejecutar() {
    if (ejecutado || !listo || !domListo) return;
    ejecutado = true;
    try {
      var c = TAMBU.contenido || {};
      TAMBU.aplicarTextos(c.textos || {});
      TAMBU.aplicarImagenes(TAMBU.imagenes || {});
    } catch (e) { /* nunca bloquear la página */ }
    document.documentElement.classList.remove("tambu-cargando");
    var diferidos = document.querySelectorAll('script[type="text/x-tambu"]');
    diferidos.forEach(function (viejo) {
      var s = document.createElement("script");
      s.src = viejo.getAttribute("src");
      s.async = false;
      document.body.appendChild(s);
    });
  }
  function marcarListo() { listo = true; ejecutar(); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { domListo = true; ejecutar(); });
  } else { domListo = true; }

  var copia = leerCopia();
  if (copia && copia.datos) aplicarDatos(copia.datos);
  var fresca = copia && copia.datos && Date.now() - copia.t < FRESCO;
  if (fresca) marcarListo();
  else setTimeout(marcarListo, copia ? ESPERA_CON_COPIA : ESPERA_SIN_COPIA);

  // Contenido actualizado desde la base de datos
  TAMBU.contenidoListo = fetch(TAMBU.supabaseConfig.url + "/rest/v1/rpc/contenido_publico", {
    method: "POST",
    headers: { "apikey": TAMBU.supabaseConfig.publishableKey, "Content-Type": "application/json" },
    body: "{}"
  }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (datos) {
      if (!datos || !Array.isArray(datos.productos)) throw new Error("formato");
      guardarCopia(datos);
      if (!ejecutado) { aplicarDatos(datos); marcarListo(); }
      return datos;
    })
    .catch(function () { marcarListo(); return null; });
})();
