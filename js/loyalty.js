/* ==========================================================================
   TAMBÚ SUSHI — FIDELIZACIÓN (loyalty.js)
   --------------------------------------------------------------------------
   Solo muestra el FUNCIONAMIENTO PREVISTO del programa con valores
   ilustrativos de demo-data.js (TAMBU.fidelizacion). No calcula ni guarda
   puntos reales: en la tienda real el saldo se calculará en el servidor a
   partir de movimientos validados (pago confirmado + pedido entregado).
   ========================================================================== */

window.TAMBU = window.TAMBU || {};

/* Próxima recompensa para un saldo dado */
TAMBU.proximaRecompensa = function (saldo) {
  var lista = TAMBU.fidelizacion.recompensas.slice().sort(function (a, b) { return a.puntos - b.puntos; });
  return lista.find(function (r) { return r.puntos > saldo; }) || lista[lista.length - 1];
};

TAMBU.tarjetaPuntosHTML = function (saldo, titulo) {
  var meta = TAMBU.proximaRecompensa(saldo);
  var pct = Math.min(100, Math.round((saldo / meta.puntos) * 100));
  var faltan = Math.max(0, meta.puntos - saldo);
  return '<span class="eyebrow" style="color:var(--bambu)">' + (titulo || "Ejemplo ilustrativo") + "</span>" +
    '<div class="points-card__value">' + saldo.toLocaleString("es-CL") + ' <span style="font-size:1rem;font-weight:600">pts</span></div>' +
    '<div class="progress" role="progressbar" aria-label="Progreso de ejemplo" aria-valuemin="0" aria-valuemax="' + meta.puntos + '" aria-valuenow="' + saldo + '"><span style="width:' + pct + '%"></span></div>' +
    '<p class="muted" style="margin:0">' + (faltan ? "Faltan " + faltan + " pts para: " + meta.nombre : "Puedes canjear: " + meta.nombre) + " · saldo de demostración</p>";
};

(function () {
  var f = TAMBU.fidelizacion;
  // Regla del país activo (Chile o Venezuela): saldos separados
  if (TAMBU.paisActual && TAMBU.paisActual.puntos) {
    f.puntosPorMonto = TAMBU.paisActual.puntos.porMonto;
    f.montoBase = TAMBU.paisActual.puntos.montoBase;
  }
  var enCuenta = !!document.querySelector("[data-vista]"); // mi-cuenta.html usa sus propios datos

  document.querySelectorAll("[data-regla-puntos]").forEach(function (el) {
    el.textContent = "Por ejemplo: " + f.puntosPorMonto + (f.puntosPorMonto === 1 ? " punto" : " puntos") +
      " por cada " + TAMBU.montoPuntosTexto(f.montoBase) + (TAMBU.pais === "VE" ? " en Venezuela" : "") + " (regla ilustrativa).";
  });

  document.querySelectorAll("[data-puntos-demo]").forEach(function (el) {
    el.innerHTML = TAMBU.tarjetaPuntosHTML(f.saldoEjemplo);
  });

  function pintarRecompensas(nota) {
    var rec = document.querySelector("[data-recompensas]");
    if (!rec) return;
    rec.innerHTML = f.recompensas.map(function (r) {
      return '<div class="reward">' + TAMBU.icono("regalo") +
        "<b>" + TAMBU.escapar(r.nombre) + "</b><span>" + r.puntos.toLocaleString("es-CL") + " pts" + nota + "</span></div>";
    }).join("");
  }
  pintarRecompensas(" · ejemplo");

  /* Si hay conexión con Supabase, se usan las reglas y recompensas reales */
  if (TAMBU.db && !enCuenta) {
    Promise.all([
      TAMBU.db.from("loyalty_settings").select("activo, puntos_por_monto, monto_base").eq("pais", TAMBU.pais || "CL").maybeSingle(),
      TAMBU.db.from("rewards").select("nombre, puntos_requeridos").eq("pais", TAMBU.pais || "CL").order("orden")
    ]).then(function (res) {
      var reglas = res[0].data, lista = res[1].data;
      if (reglas) {
        f.puntosPorMonto = reglas.puntos_por_monto;
        f.montoBase = reglas.monto_base;
        f.activo = reglas.activo;
        document.querySelectorAll("[data-regla-puntos]").forEach(function (el) {
          el.textContent = (reglas.activo ? "Hoy ganas " : "Ganarás ") + f.puntosPorMonto +
            (f.puntosPorMonto === 1 ? " punto" : " puntos") + " por cada " + TAMBU.montoPuntosTexto(f.montoBase) + (TAMBU.pais === "VE" ? " en Venezuela" : "") + ".";
        });
      }
      if (lista && lista.length) {
        f.recompensas = lista.map(function (r) { return { nombre: r.nombre, puntos: r.puntos_requeridos }; });
        pintarRecompensas("");
        document.querySelectorAll("[data-puntos-demo]").forEach(function (el) {
          el.innerHTML = TAMBU.tarjetaPuntosHTML(f.saldoEjemplo);
        });
      }
    }).catch(function () { /* se quedan los datos de ejemplo */ });
  }
})();
