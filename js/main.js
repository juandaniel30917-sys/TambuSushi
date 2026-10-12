/* ==========================================================================
   TAMBÚ SUSHI — UTILIDADES COMPARTIDAS (main.js)
   --------------------------------------------------------------------------
   - Formato de precios en pesos chilenos.
   - Estado del local (abierto / cerrado) según la hora de Chile,
     aunque el visitante tenga otra hora en su equipo.
   - Avisos breves (toast) y relleno automático de horarios.
   ========================================================================== */

window.TAMBU = window.TAMBU || {};

/* ---------- Texto seguro para insertar en HTML ---------- */
TAMBU.escapar = function (texto) {
  return String(texto == null ? "" : texto).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
};

/* ---------- Precios según el país activo ----------
   Chile:     12990 -> "$12.990"
   Venezuela: 8.5   -> "US$ 8,50"  (y en bolívares con TAMBU.precioBs) */
function formatoMoneda(valor, pais) {
  var p = TAMBU.paises && TAMBU.paises[pais || TAMBU.pais || "CL"];
  if (!p || p.moneda === "CLP") return "$" + Math.round(valor).toLocaleString("es-CL");
  return p.simbolo + " " + Number(valor).toLocaleString(p.locale, { minimumFractionDigits: p.decimales, maximumFractionDigits: p.decimales });
}
TAMBU.precio = function (valor) { return formatoMoneda(valor); };
TAMBU.precioCLP = function (valor) { return formatoMoneda(valor, "CL"); };

/* Monto base de la regla de puntos (viene en unidad mínima: pesos o centavos) */
TAMBU.montoPuntosTexto = function (montoBase, pais) {
  pais = pais || TAMBU.pais || "CL";
  if (pais === "VE") return "US$ " + (montoBase / 100).toLocaleString("es-VE", { maximumFractionDigits: 2 });
  return formatoMoneda(montoBase, "CL");
};

/* Equivalente en bolívares (solo Venezuela). null si no hay tasa del día. */
TAMBU.precioBs = function (usd) {
  if (TAMBU.pais !== "VE") return null;
  var tasa = TAMBU.paises.VE.tasaBs;
  if (!tasa) return null;
  return "Bs " + (usd * tasa).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
/* "US$ 8,50 · Bs 1.234,00" en Venezuela; precio normal en Chile */
TAMBU.precioDoble = function (valor) {
  var bs = TAMBU.precioBs(valor);
  return TAMBU.precio(valor) + (bs ? " · " + bs : "");
};
/* HTML para el equivalente en Bs: <span class="price__bs" data-usd="8.5"> (se actualiza con la tasa) */
TAMBU.bsHTML = function (usd) {
  if (TAMBU.pais !== "VE") return "";
  return '<span class="price__bs" data-usd="' + usd + '">' + (TAMBU.precioBs(usd) || "Bs a la tasa del día") + "</span>";
};
TAMBU.pintarBs = function () {
  document.querySelectorAll(".price__bs[data-usd]").forEach(function (el) {
    el.textContent = TAMBU.precioBs(parseFloat(el.getAttribute("data-usd"))) || "Bs a la tasa del día";
  });
  var tasa = TAMBU.paises && TAMBU.paises.VE && TAMBU.paises.VE.tasaBs;
  document.querySelectorAll("[data-tasa-bs]").forEach(function (el) {
    el.textContent = tasa ? "Tasa del día: 1 US$ = Bs " + tasa.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Tasa del día por confirmar";
  });
};

/* ---------- Hora actual en la zona horaria indicada ---------- */
TAMBU.ahoraEn = function (zona) {
  var partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zona || TAMBU.negocio.zonaHoraria,
    weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(new Date());
  var get = function (t) { return (partes.find(function (p) { return p.type === t; }) || {}).value; };
  var dias = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  var hora = parseInt(get("hour"), 10) % 24;
  return { dia: dias[get("weekday")], minutos: hora * 60 + parseInt(get("minute"), 10) };
};
TAMBU.ahoraEnChile = function () { return TAMBU.ahoraEn(TAMBU.negocio.zonaHoraria); };

function aMinutos(hhmm) {
  var p = hhmm.split(":");
  return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
}

/* Estado (abierto / cerrado) de una sucursal, o del horario general si no hay.
   Devuelve { abierto, texto, tono } */
TAMBU.estadoLocal = function (sucursal) {
  var S = TAMBU.sucursal;
  var horario = S ? S.horario(sucursal) : TAMBU.horario;
  var ahora = TAMBU.ahoraEn(S ? S.zonaHoraria(sucursal) : TAMBU.negocio.zonaHoraria);
  var hoy = horario.find(function (h) { return h.dia === ahora.dia; });

  if (hoy) {
    var abre = aMinutos(hoy.abre), cierra = aMinutos(hoy.cierra);
    if (ahora.minutos >= abre && ahora.minutos < cierra) {
      var restante = cierra - ahora.minutos;
      return restante <= 30
        ? { abierto: true, tono: "warning", texto: "Cierra a las " + hoy.cierra }
        : { abierto: true, tono: "open", texto: "Abierto · hasta " + hoy.cierra };
    }
    if (ahora.minutos < abre) {
      return { abierto: false, tono: "closed", texto: "Cerrado · abre a las " + hoy.abre };
    }
  }
  for (var i = 1; i <= 7; i++) {
    var d = (ahora.dia + i) % 7;
    var sig = horario.find(function (h) { return h.dia === d; });
    if (sig) {
      var cuando = i === 1 ? "mañana" : sig.nombre.toLowerCase();
      return { abierto: false, tono: "closed", texto: "Cerrado · abre " + cuando + " " + sig.abre };
    }
  }
  return { abierto: false, tono: "closed", texto: "Cerrado" };
};

/* Pinta el estado en todos los [data-estado-local].
   Con data-sucursal="id" muestra el de esa sucursal; sin él, el de la elegida. */
TAMBU.pintarEstado = function () {
  var elegida = TAMBU.sucursal ? TAMBU.sucursal.actual() : null;
  document.querySelectorAll("[data-estado-local]").forEach(function (el) {
    var id = el.getAttribute("data-sucursal");
    var s = id && TAMBU.sucursal ? TAMBU.sucursal.porId(id) : elegida;
    var estado = TAMBU.estadoLocal(s);
    el.classList.remove("is-open", "is-closed", "is-warning");
    el.classList.add(estado.tono === "open" ? "is-open" : estado.tono === "warning" ? "is-warning" : "is-closed");
    var t = el.querySelector(".status-pill__text");
    if (t) t.textContent = estado.texto;
  });
  document.querySelectorAll("[data-sucursal-nombre]").forEach(function (el) {
    el.textContent = elegida ? elegida.corto : "Elige tu sucursal";
  });
  document.querySelectorAll("[data-pais-nombre]").forEach(function (el) {
    el.textContent = elegida ? TAMBU.paises[elegida.pais].nombre : "";
    el.hidden = !elegida;
  });
};

/* ---------- Relleno de horarios: <ul data-horario></ul> ---------- */
TAMBU.pintarHorarios = function () {
  var s = TAMBU.sucursal ? TAMBU.sucursal.actual() : null;
  var horario = TAMBU.sucursal ? TAMBU.sucursal.horario(s) : TAMBU.horario;
  var hoy = TAMBU.ahoraEn(TAMBU.sucursal ? TAMBU.sucursal.zonaHoraria(s) : null).dia;
  document.querySelectorAll("[data-horario]").forEach(function (ul) {
    ul.innerHTML = horario.map(function (h) {
      return '<li class="' + (h.dia === hoy ? "is-today" : "") + '"><span>' + h.nombre +
             "</span><span>" + h.abre + " – " + h.cierra + "</span></li>";
    }).join("");
  });
};

/* ---------- Aviso breve ---------- */
TAMBU.toast = function (mensaje, accion) {
  var zona = document.querySelector(".toast-zone");
  if (!zona) {
    zona = document.createElement("div");
    zona.className = "toast-zone";
    zona.setAttribute("role", "status");
    zona.setAttribute("aria-live", "polite");
    document.body.appendChild(zona);
  }
  var t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = TAMBU.icono("palillos", "icon--palillos") + "<span></span>";
  t.querySelector("span").textContent = mensaje;
  if (accion && accion.href) {
    var a = document.createElement("a");
    a.href = accion.href;
    a.textContent = accion.texto;
    t.appendChild(a);
  }
  while (zona.children.length > 2) zona.firstChild.remove();
  zona.appendChild(t);
  setTimeout(function () { t.classList.add("is-leaving"); }, 3200);
  setTimeout(function () { t.remove(); }, 3600);
};

/* ---------- Inicio ---------- */
(function () {
  TAMBU.pintarEstado();
  TAMBU.pintarHorarios();
  setInterval(TAMBU.pintarEstado, 60000);
  document.addEventListener("tambu:sucursal", function () {
    TAMBU.pintarEstado();
    TAMBU.pintarHorarios();
    TAMBU.pintarWhatsapp();
  });

  // Enlaces de WhatsApp: <a data-whatsapp="mensaje"> (van a la sucursal elegida)
  TAMBU.pintarWhatsapp = function () {
    document.querySelectorAll("[data-whatsapp]").forEach(function (a) {
      a.href = TAMBU.urlWhatsapp(a.getAttribute("data-whatsapp") || "");
      a.target = "_blank";
      a.rel = "noopener";
    });
  };
  TAMBU.pintarWhatsapp();

  TAMBU.pintarBs();
  document.querySelectorAll("[data-ciudad-marca]").forEach(function (el) {
    if (TAMBU.paisActual) el.textContent = TAMBU.paisActual.ciudadMarca;
  });

  // Aviso tras cambiar de país
  var cambio = null;
  try { cambio = sessionStorage.getItem("tambu_cambio_pais"); sessionStorage.removeItem("tambu_cambio_pais"); } catch (e) { /* nada */ }
  if (cambio === "VE") setTimeout(function () { TAMBU.toast("Estás en Venezuela: carta y precios en dólares y bolívares", { texto: "Ver carta", href: "carta.html" }); }, 300);
  if (cambio === "CL") setTimeout(function () { TAMBU.toast("Estás en Chile: carta y precios en pesos", { texto: "Ver carta", href: "carta.html" }); }, 300);

  // Sucursal más cercana al abrir el sitio (después de que cada página prepare sus avisos)
  // (no en el panel interno del personal)
  if (TAMBU.sucursal && document.body.getAttribute("data-page") !== "panel") setTimeout(TAMBU.sucursal.autoDetectar, 0);
})();
