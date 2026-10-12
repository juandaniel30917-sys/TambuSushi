/* ==========================================================================
   TAMBÚ SUSHI — CONTENIDOS EDITABLES (content.js)
   Muestra textos de marca, preguntas frecuentes y datos de contacto
   desde js/demo-data.js, para editarlos sin tocar el HTML.
   ========================================================================== */

(function () {
  var E = TAMBU.escapar || function (t) { return t; };
  var I = TAMBU.icono;

  /* Preguntas frecuentes: <div class="faq" data-faq="contacto"> */
  document.querySelectorAll("[data-faq]").forEach(function (el) {
    var lista = TAMBU.faq[el.getAttribute("data-faq")] || [];
    el.innerHTML = lista.map(function (f) {
      return "<details><summary>" + E(f.p) + I("mas") + "</summary><p>" + E(f.r) + "</p></details>";
    }).join("");
  });

  /* Nosotros */
  var m = TAMBU.marca;
  var h = document.querySelector("[data-marca-historia]");
  if (h) h.innerHTML = m.historia.map(function (p) { return "<p>" + E(p) + "</p>"; }).join("");
  var c = document.querySelector("[data-marca-cita]");
  if (c) c.textContent = "«" + m.cita + "»";
  var v = document.querySelector("[data-marca-valores]");
  if (v) v.innerHTML = m.valores.map(function (x, i) {
    return '<div class="step"><h3>' + E(x.titulo) + "</h3><p>" + E(x.texto) + "</p></div>";
  }).join("");

  /* Contacto */
  var n = TAMBU.negocio;
  var lista = document.querySelector("[data-contacto-lista]");
  if (lista) {
    function fila(icono, titulo, valor) {
      return "<li>" + I(icono) + "<div><b>" + titulo + "</b>" + valor + "</div></li>";
    }
    var pend = function (t) { return '<span class="pending">' + t + " · por confirmar</span>"; };
    var redes = Object.keys(n.redes).map(function (k) {
      var nombre = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" }[k] || k;
      return n.redes[k] ? '<a href="' + E(n.redes[k]) + '" target="_blank" rel="noopener">' + nombre + "</a>" : null;
    }).filter(Boolean);
    lista.innerHTML =
      fila("whatsapp", "WhatsApp", '<a href="' + TAMBU.urlWhatsapp() + '" target="_blank" rel="noopener">' + n.whatsappVisible + "</a>") +
      fila("ubicacion", "Sucursales", (TAMBU.sucursales || []).map(function (s) {
        return E(s.nombre) + ' <span class="muted">· ' + E(s.region) + "</span>";
      }).join("<br>") + '<br><a class="link-arrow" href="sucursales.html" style="margin-top:6px">Ver mapa</a>') +
      fila("mail", "Correo", n.email ? '<a href="mailto:' + E(n.email) + '">' + E(n.email) + "</a>" : pend("Correo")) +
      fila("estrella", "Redes sociales", redes.length ? redes.join(" · ") : pend("Instagram, Facebook y TikTok"));
  }

  /* Mapa: si hay enlace de Google Maps, se muestra un botón */
  var mapa = document.querySelector("[data-mapa]");
  if (mapa && n.mapaUrl) {
    mapa.insertAdjacentHTML("beforeend", '<a class="btn btn--outline btn--sm" href="' + E(n.mapaUrl) + '" target="_blank" rel="noopener">Abrir en Google Maps</a>');
  }
})();
