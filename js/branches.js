/* ==========================================================================
   TAMBÚ SUSHI — SUCURSALES (branches.js)
   --------------------------------------------------------------------------
   - Recuerda la sucursal elegida en este navegador (solo su identificador).
   - Calcula la sucursal más cercana con la ubicación del cliente.
     La ubicación NUNCA se guarda ni se envía: se usa solo en el dispositivo
     para medir distancias.
   - Entrega el WhatsApp y el horario de cada sucursal.
   Los datos de las sucursales están en js/demo-data.js (sección 2b).
   ========================================================================== */

window.TAMBU = window.TAMBU || {};

TAMBU.sucursal = (function () {
  var CLAVE = "tambu_sucursal";
  var memoria = null;
  var ultimaUbicacion = null; // solo en memoria durante la visita

  function lista() { return TAMBU.sucursales || []; }
  function porId(id) { return lista().find(function (s) { return s.id === id; }) || null; }

  function actual() {
    var id = memoria;
    try { id = localStorage.getItem(CLAVE) || memoria; } catch (e) { /* sin almacenamiento */ }
    return porId(id);
  }

  var memoriaOrigen = null;
  function origenActual() {
    try { return localStorage.getItem(CLAVE + "_origen") || memoriaOrigen; } catch (e) { return memoriaOrigen; }
  }

  function elegir(id, origen) {
    var s = porId(id);
    if (!s) return null;
    var antes = actual();
    var paisAntes = antes ? antes.pais : "CL";
    memoria = id;
    memoriaOrigen = origen || "manual";
    try { localStorage.setItem(CLAVE, id); localStorage.setItem(CLAVE + "_origen", memoriaOrigen); } catch (e) { /* solo esta visita */ }
    // Cambio de país (Chile <-> Venezuela): la carta y la moneda son otras, se recarga la página
    if (s.pais !== paisAntes) {
      try { sessionStorage.setItem("tambu_cambio_pais", s.pais); } catch (e) { /* nada */ }
      location.reload();
      return s;
    }
    document.dispatchEvent(new CustomEvent("tambu:sucursal", { detail: { sucursal: s, origen: origen || "manual" } }));
    return s;
  }

  /* Distancia en km entre dos puntos (fórmula del haversine) */
  function distanciaKm(lat1, lng1, lat2, lng2) {
    var R = 6371, rad = Math.PI / 180;
    var dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function ordenarPorDistancia(lat, lng) {
    return lista().map(function (s) {
      return { sucursal: s, km: distanciaKm(lat, lng, s.lat, s.lng) };
    }).sort(function (a, b) { return a.km - b.km; });
  }

  function textoDistancia(km) {
    if (km == null) return "";
    if (km < 1) return Math.round(km * 1000 / 10) * 10 + " m";
    if (km < 100) return km.toFixed(1).replace(".", ",") + " km";
    return Math.round(km).toLocaleString("es-CL") + " km";
  }

  /* Pide la ubicación al navegador. Devuelve una promesa con {lat, lng}. */
  function ubicar() {
    return new Promise(function (resolver, rechazar) {
      if (!("geolocation" in navigator)) { rechazar({ code: "no-soportado" }); return; }
      navigator.geolocation.getCurrentPosition(function (pos) {
        ultimaUbicacion = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        resolver(ultimaUbicacion);
      }, function (err) { rechazar(err); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
    });
  }

  function mensajeErrorUbicacion(err) {
    if (err && err.code === 1) return "No diste permiso de ubicación. Puedes elegir tu sucursal de la lista.";
    if (err && err.code === 3) return "La ubicación tardó demasiado. Intenta de nuevo o elige de la lista.";
    if (err && err.code === "no-soportado") return "Tu navegador no permite usar la ubicación. Elige de la lista.";
    return "No pudimos obtener tu ubicación. Elige tu sucursal de la lista.";
  }

  /* ¿El permiso ya está concedido? (para no volver a preguntar) */
  function permisoConcedido() {
    if (!navigator.permissions || !navigator.permissions.query) return Promise.resolve(false);
    return navigator.permissions.query({ name: "geolocation" })
      .then(function (r) { return r.state === "granted"; })
      .catch(function () { return false; });
  }

  /* Ubica y elige la más cercana. Devuelve { sucursal, km, ranking } */
  function elegirMasCercana() {
    return ubicar().then(function (u) {
      var ranking = ordenarPorDistancia(u.lat, u.lng);
      var mejor = ranking[0];
      elegir(mejor.sucursal.id, "ubicacion");
      return { sucursal: mejor.sucursal, km: mejor.km, ranking: ranking, ubicacion: u };
    });
  }

  /* ---------- Detección automática al abrir cualquier página ----------
     - Sin sucursal: pide la ubicación (una vez por visita) y elige la más cercana.
     - Elegida por ubicación antes: si el permiso ya está dado, se actualiza
       sola cuando el cliente está más cerca de otra.
     - Elegida a mano: se respeta; solo se calculan distancias.
     Avisa con los eventos "tambu:ubicacion" y "tambu:ubicacion-error". */
  var ultimoRanking = null, buscando = false;

  function avisar(nombre, detalle) {
    document.dispatchEvent(new CustomEvent(nombre, { detail: detalle }));
  }

  function autoDetectar() {
    var actualS = actual();
    var origen = origenActual();
    var preguntado = false;
    try { preguntado = sessionStorage.getItem("tambu_ubicacion_preguntada") === "1"; } catch (e) { /* nada */ }

    function procesar(u, puedeCambiar) {
      ultimoRanking = ordenarPorDistancia(u.lat, u.lng);
      var mejor = ultimoRanking[0];
      var cambio = puedeCambiar && (!actualS || actualS.id !== mejor.sucursal.id);
      if (cambio) {
        elegir(mejor.sucursal.id, "ubicacion");
        if (TAMBU.toast) TAMBU.toast("Sucursal más cercana: " + mejor.sucursal.corto + " (" + textoDistancia(mejor.km) + ")",
          { texto: "Cambiar", href: "sucursales.html" });
      }
      buscando = false;
      avisar("tambu:ubicacion", { ubicacion: u, ranking: ultimoRanking, cambio: cambio });
    }
    function fallar(err) {
      buscando = false;
      avisar("tambu:ubicacion-error", { error: err, mensaje: mensajeErrorUbicacion(err) });
    }

    permisoConcedido().then(function (concedido) {
      if (!actualS && !concedido && preguntado) return;          // ya dijo que no en esta visita
      if (actualS && !concedido) return;                          // tiene sucursal y no hay permiso: no molestar
      if (!concedido) { try { sessionStorage.setItem("tambu_ubicacion_preguntada", "1"); } catch (e) { /* nada */ } }
      buscando = true;
      avisar("tambu:ubicacion-buscando", {});
      ubicar().then(function (u) { procesar(u, !actualS || origen !== "manual"); }).catch(fallar);
    });
  }

  function whatsapp(s) { return (s && s.whatsapp) || TAMBU.negocio.whatsapp; }
  function whatsappPropio(s) { return !!(s && s.whatsapp); }
  function horario(s) { return (s && s.horario) || TAMBU.horario; }
  function zonaHoraria(s) { return (s && s.zonaHoraria) || TAMBU.negocio.zonaHoraria; }
  function urlComoLlegar(s) { return "https://www.google.com/maps/dir/?api=1&destination=" + s.lat + "," + s.lng; }

  return {
    lista: lista, porId: porId, actual: actual, elegir: elegir,
    distanciaKm: distanciaKm, ordenarPorDistancia: ordenarPorDistancia, textoDistancia: textoDistancia,
    ubicar: ubicar, permisoConcedido: permisoConcedido, elegirMasCercana: elegirMasCercana,
    mensajeErrorUbicacion: mensajeErrorUbicacion,
    whatsapp: whatsapp, whatsappPropio: whatsappPropio, horario: horario, zonaHoraria: zonaHoraria,
    urlComoLlegar: urlComoLlegar,
    autoDetectar: autoDetectar,
    origen: origenActual,
    ranking: function () { return ultimoRanking; },
    buscando: function () { return buscando; },
    ultimaUbicacion: function () { return ultimaUbicacion; }
  };
})();

/* ---------- País activo (según la sucursal) ----------
   Se decide antes de dibujar la página: carta, moneda y medios de pago. */
(function activarPais() {
  var s = TAMBU.sucursal.actual();
  var pais = s && TAMBU.paises[s.pais] ? s.pais : "CL";
  TAMBU.pais = pais;
  TAMBU.paisActual = TAMBU.paises[pais];
  TAMBU.productosCL = TAMBU.productos;
  if (pais === "VE") TAMBU.productos = TAMBU.productosVE;
  if (TAMBU.checkout) TAMBU.checkout.mediosPagoFuturos = TAMBU.paises[pais].pagos;
  document.documentElement.setAttribute("data-pais", pais);
  // Última tasa de bolívares conocida (se actualiza desde la base de datos)
  try {
    var t = JSON.parse(localStorage.getItem("tambu_tasa_bs") || "null");
    if (t && TAMBU.paises.VE.tasaBs == null) { TAMBU.paises.VE.tasaBs = t.valor; TAMBU.paises.VE.tasaFecha = t.fecha; }
  } catch (e) { /* sin tasa guardada */ }
})();
