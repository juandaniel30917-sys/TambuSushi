/* ==========================================================================
   TAMBÚ SUSHI — PEDIDOS (solo administradores) (admin-orders.js)
   --------------------------------------------------------------------------
   admin-pedidos.html · Lista de pedidos de TODAS las sucursales para
   revisarlos y copiarlos a Fudo mientras no exista la integración por API.

   Seguridad: esta página no decide quién es administrador. La base de datos
   solo entrega pedidos a cuentas registradas en la tabla "admins"; para
   cualquier otra cuenta la lista simplemente llega vacía.
   ========================================================================== */

(function () {
  var raiz = document.querySelector("[data-admin]");
  if (!raiz) return;
  var E = TAMBU.escapar, I = TAMBU.icono, db = TAMBU.db;

  var vistas = {};
  raiz.querySelectorAll("[data-vista]").forEach(function (v) { vistas[v.getAttribute("data-vista")] = v; });
  function mostrar(n) { Object.keys(vistas).forEach(function (k) { vistas[k].hidden = k !== n; }); }
  if (!db) { mostrar("sin-conexion"); return; }

  var pedidos = [];
  var filtro = "pendientes";
  var conocidos = null;       // id -> estado, para avisar pedidos nuevos
  var canal = null, sondeo = null, abierto = null;

  var ESTADOS = {
    pendiente_pago: { texto: "Esperando pago", tono: "neutro" },
    pagado:         { texto: "Pagado · nuevo", tono: "salmon" },
    en_preparacion: { texto: "En preparación", tono: "neutro" },
    listo:          { texto: "Listo", tono: "wasabi" },
    entregado:      { texto: "Entregado", tono: "wasabi" },
    cancelado:      { texto: "Cancelado", tono: "nori" }
  };
  var PENDIENTES = ["pagado", "en_preparacion", "listo"];
  var FINALIZADOS = ["entregado", "cancelado"];
  var PAGADOS = ["pagado", "en_preparacion", "listo", "entregado"];   // (incluye efectivo: ya confirmado)

  /* ---------- Formatos ---------- */
  function precio(monto, moneda) {
    return moneda === "USD"
      ? "US$ " + (monto / 100).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : TAMBU.precioCLP(monto);
  }
  function fechaHora(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" });
    } catch (e) { return iso; }
  }
  function hora(iso) {
    try { return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago" }); } catch (e) { return ""; }
  }
  function badge(estado) {
    var e = ESTADOS[estado] || { texto: estado, tono: "neutro" };
    return '<span class="badge badge--' + e.tono + '">' + e.texto + "</span>";
  }

  /* ---------- Sonido y avisos de pedido nuevo ---------- */
  var audio = null;
  function sonar() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.18, 0.36].forEach(function (t, i) {
        var o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = [880, 1175, 1568][i];
        g.gain.setValueAtTime(0.0001, audio.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.16);
        o.connect(g); g.connect(audio.destination);
        o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.18);
      });
    } catch (e) { /* sin sonido */ }
  }
  raiz.querySelector("[data-activar-sonido]").addEventListener("click", function () {
    sonar();
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    TAMBU.toast("Sonido activado para pedidos nuevos");
  });

  /* ---------- Texto para copiar a Fudo ---------- */
  function textoFudo(p) {
    var suc = p.branches || {};
    var lineas = [
      "PEDIDO WEB #" + p.numero + " · " + (suc.nombre || p.sucursal_id || ""),
      "Fecha: " + fechaHora(p.pagado_at || p.created_at),
      "Estado: " + (ESTADOS[p.estado] ? ESTADOS[p.estado].texto : p.estado),
      "Pago: " + (p.medio_pago === "efectivo" ? "EFECTIVO AL RETIRAR (cobrar en caja)" : p.pagado_at ? "Webpay · pagado en línea" : "Webpay · pendiente") + (p.es_prueba ? " · PEDIDO DE PRUEBA" : ""),
      "",
      "CLIENTE",
      "Nombre: " + (p.nombre_contacto || ""),
      "Teléfono: " + (p.telefono_contacto || ""),
      p.correo_contacto ? "Correo: " + p.correo_contacto : null,
      "Entrega: " + (p.modalidad === "despacho"
        ? "Despacho a " + (p.direccion || "") + (p.referencia_direccion ? " (" + p.referencia_direccion + ")" : "")
        : "Retiro en local"),
      "",
      "PRODUCTOS"
    ];
    (p.order_items || []).forEach(function (it) {
      lineas.push(it.cantidad + " x " + it.nombre + " — " + precio(it.subtotal, p.moneda));
      if (it.detalle) lineas.push("    " + it.detalle);
    });
    lineas.push("");
    if (p.observaciones) { lineas.push("OBSERVACIONES: " + p.observaciones); lineas.push(""); }
    lineas.push("TOTAL: " + precio(p.total, p.moneda) + (p.medio_pago === "efectivo" ? " · POR COBRAR EN EFECTIVO" : p.pagado_at ? " · PAGADO" : ""));
    return lineas.filter(function (l) { return l !== null; }).join("\n");
  }

  function copiar(texto) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto);
    return new Promise(function (ok, mal) {
      var t = document.createElement("textarea");
      t.value = texto; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy") ? ok() : mal(); } catch (e) { mal(e); }
      t.remove();
    });
  }

  /* ---------- Lista ---------- */
  function filtrados() {
    var suc = raiz.querySelector("[data-f-sucursal]").value;
    var q = raiz.querySelector("[data-f-buscar]").value.trim().toLowerCase().replace(/^#/, "");
    return pedidos.filter(function (p) {
      if (filtro === "pendientes" && PENDIENTES.indexOf(p.estado) === -1) return false;
      if (filtro === "finalizados" && FINALIZADOS.indexOf(p.estado) === -1) return false;
      if (filtro === "sinfudo" && (PAGADOS.indexOf(p.estado) === -1 || p.fudo_registrado_at)) return false;
      if (suc && p.sucursal_id !== suc) return false;
      if (q) {
        var texto = [p.numero, p.nombre_contacto, p.telefono_contacto, p.correo_contacto].join(" ").toLowerCase();
        if (texto.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function pintar() {
    var lista = filtrados();
    var sinFudo = pedidos.filter(function (p) { return PAGADOS.indexOf(p.estado) !== -1 && !p.fudo_registrado_at; }).length;
    raiz.querySelector("[data-cuenta-sinfudo]").textContent = sinFudo ? sinFudo : "";
    raiz.querySelector("[data-resumen]").textContent = lista.length + (lista.length === 1 ? " pedido" : " pedidos") +
      " · actualizado " + new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

    var zona = raiz.querySelector("[data-lista]");
    if (!lista.length) {
      zona.innerHTML = '<div class="state" style="margin-top:16px">' + I("check") +
        "<h3>No hay pedidos aquí</h3><p>" + (filtro === "pendientes" ? "No hay pedidos por preparar en este momento." : "Prueba con otro filtro o rango de fechas.") + "</p></div>";
      return;
    }
    zona.innerHTML = '<ul class="admin-list">' + lista.map(function (p) {
      var suc = p.branches || {};
      var items = (p.order_items || []).reduce(function (s, it) { return s + it.cantidad; }, 0);
      return '<li><button class="admin-row' + (p.estado === "pagado" ? " is-new" : "") + '" type="button" data-abrir="' + p.id + '">' +
        '<span class="admin-row__num">#' + p.numero + "</span>" +
        '<span class="admin-row__main"><b>' + E(p.nombre_contacto || "Sin nombre") + "</b>" +
          "<small>" + E(suc.nombre_corto || p.sucursal_id || "") + " · " + hora(p.pagado_at || p.created_at) + " · " + items + (items === 1 ? " producto" : " productos") + "</small></span>" +
        '<span class="admin-row__tags">' + badge(p.estado) +
          (p.medio_pago === "efectivo" ? '<span class="badge badge--salmon">Efectivo</span>' : "") +
          (p.es_prueba ? '<span class="badge badge--neutro">Prueba</span>' : "") +
          (PAGADOS.indexOf(p.estado) !== -1 ? (p.fudo_registrado_at
            ? '<span class="badge badge--wasabi">' + I("check") + "En Fudo</span>"
            : '<span class="badge badge--neutro">Falta Fudo</span>') : "") +
        "</span>" +
        '<span class="admin-row__total">' + precio(p.total, p.moneda) + "</span>" +
        I("chevron") +
      "</button></li>";
    }).join("") + "</ul>";
  }

  /* ---------- Detalle ---------- */
  var capa = document.querySelector("[data-detalle]");
  var cuerpo = document.querySelector("[data-detalle-cuerpo]");
  var focoPrevio = null;

  var ACCIONES = {
    pagado:         [{ estado: "en_preparacion", texto: "Empezar a preparar", clase: "btn--primary" }],
    en_preparacion: [{ estado: "listo", texto: "Marcar listo", clase: "btn--primary" }],
    listo:          [{ estado: "entregado", texto: "Marcar entregado", clase: "btn--dark" }]
  };

  function pintarDetalle(p) {
    var suc = p.branches || {};
    var pago = (p.payments || [])[0];
    var items = (p.order_items || []).map(function (it) {
      return "<li><div><b>" + it.cantidad + " × " + E(it.nombre) + "</b>" + (it.detalle ? "<small>" + E(it.detalle) + "</small>" : "") +
        "<small>" + precio(it.precio_unitario, p.moneda) + " c/u</small></div><span>" + precio(it.subtotal, p.moneda) + "</span></li>";
    }).join("");
    var acciones = (ACCIONES[p.estado] || []).map(function (a) {
      return '<button class="btn btn--sm ' + a.clase + '" type="button" data-estado="' + a.estado + '">' + a.texto + "</button>";
    }).join("");
    if (["pagado", "en_preparacion"].indexOf(p.estado) !== -1) {
      acciones += '<button class="btn btn--sm btn--ghost" type="button" data-estado="cancelado">Cancelar pedido</button>';
    }

    cuerpo.innerHTML =
      '<span class="eyebrow">' + E(suc.nombre || p.sucursal_id || "") + "</span>" +
      '<h2 id="detalle-titulo" class="detalle__titulo">Pedido #' + p.numero + "</h2>" +
      '<div class="row" style="margin-bottom:16px">' + badge(p.estado) +
        (p.fudo_registrado_at ? '<span class="badge badge--wasabi">' + I("check") + "En Fudo" + (p.referencia_externa ? " · N° " + E(p.referencia_externa) : "") + "</span>" : "") +
      "</div>" +

      '<div class="fudo-box">' +
        '<button class="btn btn--primary btn--block" type="button" data-copiar>' + I("copiar") + "Copiar todo para Fudo</button>" +
        (p.fudo_registrado_at
          ? '<p class="muted" style="margin:10px 0 0">Registrado en Fudo el ' + fechaHora(p.fudo_registrado_at) + '. <button class="link-arrow" type="button" data-desmarcar>Desmarcar</button></p>'
          : PAGADOS.indexOf(p.estado) !== -1
          ? '<form class="fudo-box__form" data-marcar>' +
              '<label class="visually-hidden" for="ref-fudo">N° de pedido en Fudo</label>' +
              '<input class="input" id="ref-fudo" name="ref" maxlength="60" placeholder="N° en Fudo (opcional)">' +
              '<button class="btn btn--dark" type="submit">Marcar como registrado en Fudo</button>' +
            "</form>"
          : '<p class="muted" style="margin:10px 0 0">Este pedido no está pagado: no se registra en Fudo.</p>') +
      "</div>" +

      '<div class="detalle__grid">' +
        '<section><h3>Cliente</h3><ul class="kv">' +
          "<li><span>Nombre</span><span>" + E(p.nombre_contacto || "") + "</span></li>" +
          '<li><span>Teléfono</span><span><a href="tel:' + E((p.telefono_contacto || "").replace(/\s/g, "")) + '">' + E(p.telefono_contacto || "") + "</a></span></li>" +
          (p.correo_contacto ? "<li><span>Correo</span><span>" + E(p.correo_contacto) + "</span></li>" : "") +
          "<li><span>Entrega</span><span>" + (p.modalidad === "despacho" ? "Despacho" : "Retiro en local") + "</span></li>" +
          (p.modalidad === "despacho" ? "<li><span>Dirección</span><span>" + E(p.direccion || "") + (p.referencia_direccion ? "<br><small>" + E(p.referencia_direccion) + "</small>" : "") + "</span></li>" : "") +
        "</ul></section>" +
        '<section><h3>Pago</h3><ul class="kv">' +
          "<li><span>Creado</span><span>" + fechaHora(p.created_at) + "</span></li>" +
          "<li><span>Pagado</span><span>" + (p.pagado_at ? fechaHora(p.pagado_at) : "—") + "</span></li>" +
          "<li><span>Medio</span><span>" + (p.medio_pago === "efectivo" ? "Efectivo al retirar" + (p.es_prueba ? " · prueba" : "") : pago ? "Webpay (Flow) · " + E(pago.estado) : "—") + "</span></li>" +
        "</ul></section>" +
      "</div>" +

      "<h3>Productos</h3>" +
      '<ul class="detalle__items">' + items + "</ul>" +
      (p.observaciones ? '<p class="ticket__obs">' + I("info") + E(p.observaciones) + "</p>" : "") +
      '<div class="detalle__total"><span>Total</span><span>' + precio(p.total, p.moneda) + "</span></div>" +
      (acciones ? '<div class="ticket__actions" style="margin-top:20px">' + acciones + "</div>" : "") +
      '<div data-detalle-msg aria-live="polite"></div>';
  }

  function abrir(id) {
    var p = pedidos.find(function (x) { return x.id === id; });
    if (!p) return;
    abierto = id;
    focoPrevio = document.activeElement;
    pintarDetalle(p);
    capa.hidden = false;
    requestAnimationFrame(function () { capa.classList.add("is-open"); });
    document.body.classList.add("no-scroll");
    capa.querySelector("[data-cerrar-detalle]").focus();
  }
  function cerrar() {
    abierto = null;
    capa.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
    setTimeout(function () { capa.hidden = true; }, 180);
    if (focoPrevio) focoPrevio.focus();
  }
  function avisoDetalle(texto, tipo) {
    var z = cuerpo.querySelector("[data-detalle-msg]");
    if (z) z.innerHTML = texto ? '<div class="demo-notice' + (tipo === "error" ? " demo-notice--error" : " demo-notice--ok") + '" style="margin-top:12px" role="status">' + I(tipo === "error" ? "info" : "check") + "<p>" + E(texto) + "</p></div>" : "";
  }

  capa.addEventListener("click", function (e) {
    if (e.target === capa || e.target.closest("[data-cerrar-detalle]")) { cerrar(); return; }
    var p = pedidos.find(function (x) { return x.id === abierto; });
    if (!p) return;

    if (e.target.closest("[data-copiar]")) {
      copiar(textoFudo(p)).then(function () { TAMBU.toast("Pedido #" + p.numero + " copiado. Pégalo en Fudo."); })
        .catch(function () { avisoDetalle("No se pudo copiar automáticamente. Selecciona el texto a mano.", "error"); });
      return;
    }
    if (e.target.closest("[data-desmarcar]")) {
      if (!confirm("¿Quitar la marca de «registrado en Fudo» del pedido #" + p.numero + "?")) return;
      db.rpc("marcar_registrado_fudo", { p_order_id: p.id, p_registrado: false, p_referencia: null })
        .then(function (r) { if (r.error) throw r.error; return cargar(); })
        .catch(function (err) { avisoDetalle(TAMBU.errorAmigable(err), "error"); });
      return;
    }
    var b = e.target.closest("[data-estado]");
    if (b) {
      var nuevo = b.getAttribute("data-estado");
      if (nuevo === "cancelado" && !confirm("¿Cancelar el pedido #" + p.numero + "? Si ya se pagó, recuerda devolver el dinero desde tu cuenta de Flow.")) return;
      b.disabled = true;
      db.rpc("cambiar_estado_pedido", { p_order_id: p.id, p_estado: nuevo })
        .then(function (r) { if (r.error) throw r.error; return cargar(); })
        .catch(function (err) { avisoDetalle(err.message || TAMBU.errorAmigable(err), "error"); b.disabled = false; });
    }
  });

  capa.addEventListener("submit", function (e) {
    var f = e.target.closest("[data-marcar]");
    if (!f) return;
    e.preventDefault();
    var p = pedidos.find(function (x) { return x.id === abierto; });
    var boton = f.querySelector("button");
    boton.disabled = true;
    db.rpc("marcar_registrado_fudo", { p_order_id: p.id, p_registrado: true, p_referencia: f.ref.value.trim() || null })
      .then(function (r) { if (r.error) throw r.error; TAMBU.toast("Pedido #" + p.numero + " marcado como registrado en Fudo"); return cargar(); })
      .catch(function (err) { avisoDetalle(TAMBU.errorAmigable(err), "error"); boton.disabled = false; });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !capa.hidden) cerrar();
  });

  /* ---------- Carga de datos ---------- */
  function cargar() {
    var dias = parseInt(raiz.querySelector("[data-f-dias]").value, 10);
    var consulta = db.from("orders")
      .select("id, numero, estado, total, moneda, modalidad, direccion, referencia_direccion, nombre_contacto, telefono_contacto, correo_contacto, " +
              "observaciones, medio_pago, es_prueba, created_at, pagado_at, sucursal_id, fudo_registrado_at, referencia_externa, " +
              "order_items (nombre, cantidad, detalle, precio_unitario, subtotal), branches (nombre, nombre_corto), payments (proveedor, estado)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (dias > 0) {
      // "Hoy" = desde la medianoche de Chile
      var desde = new Date(Date.now() - (dias - 1) * 86400000);
      var chile = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(desde);
      consulta = consulta.gte("created_at", new Date(chile + "T00:00:00-03:00").toISOString());
    }
    return consulta.then(function (r) {
      if (r.error) { mensaje(TAMBU.errorAmigable(r.error)); return; }
      mensaje("");
      pedidos = r.data || [];
      // Aviso de pedidos pagados nuevos
      if (conocidos) {
        pedidos.forEach(function (p) {
          if (p.estado === "pagado" && conocidos[p.id] !== "pagado") {
            sonar();
            TAMBU.toast("Nuevo pedido pagado #" + p.numero, { texto: "Ver", href: "#pedido-" + p.id });
            if ("Notification" in window && Notification.permission === "granted") {
              try { new Notification("Nuevo pedido #" + p.numero, { body: (p.nombre_contacto || "") + " · " + precio(p.total, p.moneda) }); } catch (e) { /* nada */ }
            }
          }
        });
      }
      conocidos = {};
      pedidos.forEach(function (p) { conocidos[p.id] = p.estado; });
      pintar();
      if (abierto) {
        var p = pedidos.find(function (x) { return x.id === abierto; });
        if (p) pintarDetalle(p);
      }
    });
  }

  function mensaje(t) {
    raiz.querySelector("[data-admin-msg]").innerHTML = t ? '<div class="demo-notice demo-notice--error" role="alert" style="margin-top:16px">' + I("info") + "<p>" + E(t) + "</p></div>" : "";
  }

  function escuchar() {
    if (canal) db.removeChannel(canal);
    canal = db.channel("admin-pedidos")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, function () { cargar(); })
      .subscribe(function (estado) {
        raiz.querySelector("[data-en-vivo]").classList.toggle("is-live", estado === "SUBSCRIBED");
      });
    clearInterval(sondeo);
    sondeo = setInterval(cargar, 30000);   // respaldo por si el tiempo real se corta
  }

  /* ---------- Filtros ---------- */
  raiz.addEventListener("click", function (e) {
    var chip = e.target.closest("[data-filtro]");
    if (chip) {
      filtro = chip.getAttribute("data-filtro");
      raiz.querySelectorAll("[data-filtro]").forEach(function (c) {
        var on = c === chip;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-pressed", String(on));
      });
      pintar();
      return;
    }
    var fila = e.target.closest("[data-abrir]");
    if (fila) abrir(fila.getAttribute("data-abrir"));
  });
  raiz.querySelector("[data-f-sucursal]").addEventListener("change", pintar);
  raiz.querySelector("[data-f-dias]").addEventListener("change", cargar);
  var espera;
  raiz.querySelector("[data-f-buscar]").addEventListener("input", function () { clearTimeout(espera); espera = setTimeout(pintar, 120); });

  // Enlace "Ver" de los avisos: #pedido-<id>
  window.addEventListener("hashchange", function () {
    var m = location.hash.match(/^#pedido-([0-9a-f-]{36})$/i);
    if (m) { abrir(m[1]); history.replaceState(null, "", location.pathname); }
  });

  raiz.querySelector("[data-f-sucursal]").innerHTML += (TAMBU.sucursales || []).map(function (s) {
    return '<option value="' + s.id + '">' + E(s.nombre) + "</option>";
  }).join("");

  /* ---------- Sesión y permiso ---------- */
  var iniciadoPara = null;
  function revisar(session) {
    var user = session && session.user;
    if (!user) { iniciadoPara = null; if (canal) db.removeChannel(canal); clearInterval(sondeo); mostrar("login"); return; }
    if (iniciadoPara === user.id) return;
    iniciadoPara = user.id;
    db.rpc("es_admin").then(function (r) {
      if (r.error || r.data !== true) { mostrar("sin-permiso"); return; }
      mostrar("lista");
      cargar().then(escuchar);
    });
  }
  db.auth.getSession().then(function (r) { revisar(r.data.session); });
  db.auth.onAuthStateChange(function (_ev, session) { setTimeout(function () { revisar(session); }, 0); });
})();
