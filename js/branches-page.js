/* ==========================================================================
   TAMBÚ SUSHI — PÁGINA DE SUCURSALES (branches-page.js)
   Mapa (MapLibre + OpenFreeMap, sin costo ni clave), lista de sucursales,
   detección de la más cercana y elección de la sucursal para pedir.
   ========================================================================== */

(function () {
  var lista = document.querySelector("[data-lista-sucursales]");
  if (!lista) return;
  var S = TAMBU.sucursal, E = TAMBU.escapar, I = TAMBU.icono;
  var distancias = {};          // id -> km (solo si el cliente compartió su ubicación)
  var mapa = null, marcadores = {}, marcadorCliente = null;
  var msg = document.querySelector("[data-ubicacion-msg]");
  var botonUbicar = document.querySelector("[data-ubicarme]");

  /* ---------- Lista ---------- */
  function tarjeta(s) {
    var elegida = S.actual() && S.actual().id === s.id;
    var km = distancias[s.id];
    var tel = s.telefonoVisible
      ? '<a href="tel:' + E(s.telefonoVisible.replace(/\s/g, "")) + '">' + E(s.telefonoVisible) + "</a>"
      : '<span class="pending">Teléfono por confirmar</span>';
    return '<article class="branch-card' + (elegida ? " is-selected" : "") + '" data-id="' + s.id + '">' +
      '<div class="branch-card__head">' +
        "<div>" +
          '<span class="eyebrow">' + E(s.ciudad) + "</span>" +
          "<h3>" + E(s.nombre) + "</h3>" +
        "</div>" +
        '<div class="row" style="gap:6px">' +
          (s.nueva ? '<span class="badge badge--wasabi">Nueva</span>' : "") +
          (km != null ? '<span class="badge">' + S.textoDistancia(km) + "</span>" : "") +
        "</div>" +
      "</div>" +
      '<p class="branch-card__addr">' + E(s.direccion) + " · " + E(s.detalle) + "</p>" +
      '<div class="branch-card__meta">' +
        '<span class="status-pill" data-estado-local data-sucursal="' + s.id + '"><span class="status-pill__dot"></span><span class="status-pill__text">Horario</span></span>' +
        '<span class="muted">' + tel + "</span>" +
      "</div>" +
      (s.preciosConfirmados ? "" : '<p class="muted" style="margin:0">Carta y precios de esta sucursal por confirmar: el total se acuerda por WhatsApp.</p>') +
      '<div class="branch-card__actions">' +
        (elegida
          ? '<span class="btn btn--dark btn--sm is-static">' + I("check") + "Tu sucursal</span>"
          : '<button class="btn btn--primary btn--sm" type="button" data-elegir="' + s.id + '">Pedir aquí</button>') +
        '<a class="btn btn--outline btn--sm" href="' + S.urlComoLlegar(s) + '" target="_blank" rel="noopener">Cómo llegar</a>' +
        '<button class="btn btn--ghost btn--sm" type="button" data-ver="' + s.id + '">Ver en el mapa</button>' +
      "</div>" +
    "</article>";
  }

  function pintarLista() {
    var orden = S.lista().slice();
    if (Object.keys(distancias).length) {
      orden.sort(function (a, b) { return distancias[a.id] - distancias[b.id]; });
    }
    var html = "";
    TAMBU.regionesMapa.forEach(function (r) {
      var deRegion = orden.filter(function (s) { return s.region === r.id; });
      if (!deRegion.length) return;
      html += '<h2 class="branch-list__title">' + E(r.nombre) + ' <span class="muted">' + deRegion.length +
        (deRegion.length === 1 ? " sucursal" : " sucursales") + "</span></h2>" + deRegion.map(tarjeta).join("");
    });
    // Si hay distancias, la región más cercana va primero
    if (Object.keys(distancias).length) {
      var primera = orden[0].region;
      var bloques = html.split('<h2 class="branch-list__title">').filter(Boolean);
      bloques.sort(function (a, b) { return (b.indexOf(primera) === 0) - (a.indexOf(primera) === 0); });
      html = bloques.map(function (b) { return '<h2 class="branch-list__title">' + b; }).join("");
    }
    lista.innerHTML = html;
    TAMBU.pintarEstado();
    pintarMarcadores();
  }

  /* ---------- Regiones (Talca / Venezuela) ---------- */
  var regiones = document.querySelector("[data-regiones]");
  var regionActiva = (S.actual() && S.actual().region) || "Chile";
  function pintarRegiones() {
    regiones.innerHTML = TAMBU.regionesMapa.map(function (r) {
      var n = S.lista().filter(function (s) { return s.region === r.id; }).length;
      var activo = r.id === regionActiva;
      return '<button class="chip' + (activo ? " is-active" : "") + '" type="button" data-region="' + r.id + '" aria-pressed="' + activo + '">' +
        E(r.nombre) + ' <span class="chip__n">' + n + "</span></button>";
    }).join("");
  }
  regiones.addEventListener("click", function (e) {
    var b = e.target.closest("[data-region]");
    if (!b) return;
    regionActiva = b.getAttribute("data-region");
    pintarRegiones();
    encuadrar(regionActiva);
  });

  /* ---------- Mapa (MapLibre + OpenFreeMap: gratis, sin clave) ---------- */
  var ESTILO_MAPA = "https://tiles.openfreemap.org/styles/positron";

  function posicion(s) {
    // Las dos sucursales del Portal están en el mismo edificio: se separan un poco en el mapa
    var mismas = S.lista().filter(function (x) { return x.lat === s.lat && x.lng === s.lng; });
    var i = mismas.indexOf(s);
    var lng = mismas.length > 1 ? s.lng + (i - (mismas.length - 1) / 2) * 0.0009 : s.lng;
    return [lng, s.lat]; // MapLibre usa [longitud, latitud]
  }

  function popup(s) {
    var elegida = S.actual() && S.actual().id === s.id;
    return "<b>" + E(s.nombre) + "</b><br><small>" + E(s.direccion) + "</small><br>" +
      (elegida ? "<small>Tu sucursal</small>"
               : '<button class="btn btn--primary btn--sm" type="button" data-elegir="' + s.id + '" style="margin-top:8px">Pedir aquí</button>');
  }

  function mostrarFallback() {
    document.querySelector("[data-mapa-fallback]").hidden = false;
    document.getElementById("mapa").hidden = true;
    mapa = null;
  }

  function iniciarMapa() {
    if (!window.maplibregl) { mostrarFallback(); return; }
    try {
      mapa = new maplibregl.Map({
        container: "mapa",
        style: ESTILO_MAPA,
        center: [-71.66, -35.435],
        zoom: 12,
        cooperativeGestures: true,      // en el teléfono se mueve con dos dedos; no atrapa el scroll
        attributionControl: { compact: true },
        locale: {
          "CooperativeGesturesHandler.WindowsHelpText": "Usa Ctrl + rueda para hacer zoom",
          "CooperativeGesturesHandler.MacHelpText": "Usa ⌘ + rueda para hacer zoom",
          "CooperativeGesturesHandler.MobileHelpText": "Usa dos dedos para mover el mapa"
        }
      });
    } catch (err) { mostrarFallback(); return; }
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
    mapa.on("error", function (e) { console.warn("Mapa:", e && e.error && e.error.message); });

    S.lista().forEach(function (s) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "map-pin";
      el.setAttribute("aria-label", s.nombre);
      el.innerHTML = '<span class="map-pin__dot"></span><span class="map-pin__label">' + E(s.corto) + "</span>";
      var pop = new maplibregl.Popup({ offset: 16, closeButton: true, maxWidth: "240px" }).setHTML(popup(s));
      marcadores[s.id] = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat(posicion(s)).setPopup(pop).addTo(mapa);
    });
    pintarMarcadores();
    encuadrar(regionActiva, true);
  }

  function pintarMarcadores() {
    if (!mapa) return;
    var actual = S.actual();
    S.lista().forEach(function (s) {
      var m = marcadores[s.id];
      if (!m) return;
      var elegida = actual && actual.id === s.id;
      m.getElement().classList.toggle("is-selected", !!elegida);
      m.getPopup().setHTML(popup(s));
    });
  }

  function encuadrar(region, sinAnimar) {
    if (!mapa) return;
    var puntos = S.lista().filter(function (s) { return s.region === region; }).map(posicion);
    if (!puntos.length) return;
    if (puntos.length === 1) { mapa.jumpTo({ center: puntos[0], zoom: 15 }); return; }
    var limites = new maplibregl.LngLatBounds(puntos[0], puntos[0]);
    puntos.forEach(function (p) { limites.extend(p); });
    mapa.fitBounds(limites, { padding: 70, maxZoom: 14.5, duration: sinAnimar ? 0 : 700 });
  }

  function verEnMapa(id) {
    var s = S.porId(id);
    if (!mapa || !s) return;
    if (s.region !== regionActiva) { regionActiva = s.region; pintarRegiones(); }
    mapa.flyTo({ center: posicion(s), zoom: 16, duration: 800 });
    var m = marcadores[id];
    if (m && !m.getPopup().isOpen()) m.togglePopup();
    document.getElementById("mapa").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* ---------- Ubicación ---------- */
  function aplicarUbicacion(u, elegirCercana) {
    S.ordenarPorDistancia(u.lat, u.lng).forEach(function (r) { distancias[r.sucursal.id] = r.km; });
    var mejor = S.ordenarPorDistancia(u.lat, u.lng)[0];
    if (elegirCercana) S.elegir(mejor.sucursal.id, "ubicacion");
    regionActiva = mejor.sucursal.region;
    pintarRegiones();
    pintarLista();
    var actual = S.actual();
    msg.innerHTML = "La más cercana es <b>" + E(mejor.sucursal.nombre) + "</b>, a " + S.textoDistancia(mejor.km) + "." +
      (actual && actual.id === mejor.sucursal.id ? " La dejamos elegida para tu pedido." : "");
    if (mapa) {
      if (marcadorCliente) marcadorCliente.remove();
      var yo = document.createElement("div");
      yo.className = "map-user";
      yo.title = "Tú";
      marcadorCliente = new maplibregl.Marker({ element: yo, anchor: "center" }).setLngLat([u.lng, u.lat]).addTo(mapa);
      // Si estás cerca (misma ciudad) se muestra tu punto junto a la sucursal; si no, solo la región
      if (mejor.km < 60) {
        var lim = new maplibregl.LngLatBounds([u.lng, u.lat], [u.lng, u.lat]).extend(posicion(mejor.sucursal));
        mapa.fitBounds(lim, { padding: 90, maxZoom: 15, duration: 700 });
      } else encuadrar(regionActiva);
    }
  }

  function ubicar(elegirCercana) {
    botonUbicar.disabled = true;
    botonUbicar.classList.add("is-loading");
    msg.textContent = "Buscando tu ubicación…";
    S.ubicar().then(function (u) { aplicarUbicacion(u, elegirCercana); })
      .catch(function (err) { msg.textContent = S.mensajeErrorUbicacion(err); })
      .then(function () { botonUbicar.disabled = false; botonUbicar.classList.remove("is-loading"); });
  }

  botonUbicar.addEventListener("click", function () { ubicar(true); });

  /* ---------- Acciones ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-elegir]");
    if (el) {
      var s = S.elegir(el.getAttribute("data-elegir"));
      if (s) TAMBU.toast("Pedirás en " + s.corto, { texto: "Ver carta", href: "carta.html" });
      return;
    }
    var ver = e.target.closest("[data-ver]");
    if (ver) verEnMapa(ver.getAttribute("data-ver"));
  });
  document.addEventListener("tambu:sucursal", pintarLista);

  /* ---------- Inicio ---------- */
  pintarRegiones();
  pintarLista();
  iniciarMapa();
  // La búsqueda automática la hace branches.js al abrir la página; aquí solo se muestra
  document.addEventListener("tambu:ubicacion-buscando", function () { msg.textContent = "Buscando la sucursal más cercana…"; });
  document.addEventListener("tambu:ubicacion", function (e) { aplicarUbicacion(e.detail.ubicacion, false); });
  document.addEventListener("tambu:ubicacion-error", function (e) { if (!S.actual()) msg.textContent = e.detail.mensaje; });
  if (S.buscando()) msg.textContent = "Buscando la sucursal más cercana…";
})();
