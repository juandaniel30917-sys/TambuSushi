/* ==========================================================================
   TAMBÚ SUSHI — PANEL DE PEDIDOS DE SUCURSAL (panel.js)
   --------------------------------------------------------------------------
   - Solo para personal: la cuenta debe estar en la tabla branch_staff.
   - Muestra los pedidos PAGADOS de la sucursal en tiempo real, con sonido.
   - El personal avanza el estado: en preparación → listo → entregado.
   - Nadie puede marcar un pedido como "pagado" a mano: eso lo hace el pago.
   ========================================================================== */

(function () {
  var raiz = document.querySelector("[data-panel]");
  if (!raiz) return;
  var E = TAMBU.escapar, I = TAMBU.icono, db = TAMBU.db;
  var vistas = {};
  document.querySelectorAll("[data-vista]").forEach(function (v) { vistas[v.getAttribute("data-vista")] = v; });
  function mostrar(n) { Object.keys(vistas).forEach(function (k) { vistas[k].hidden = k !== n; }); }

  if (!db) { mostrar("sin-conexion"); return; }

  var usuario = null, sucursal = null, canal = null, sondeo = null;
  var conocidos = {};          // id -> estado (para detectar pedidos nuevos)
  var primeraCarga = true;

  /* ---------- Sonido de aviso (sin archivos) ---------- */
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
  function avisar(p) {
    sonar();
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification("Nuevo pedido #" + p.numero, { body: (p.nombre_contacto || "") + " · " + precio(p) }); } catch (e) { /* nada */ }
    }
    var t = document.title;
    document.title = "🔔 Nuevo pedido · " + t.replace(/^🔔 Nuevo pedido · /, "");
    setTimeout(function () { document.title = t.replace(/^🔔 Nuevo pedido · /, ""); }, 8000);
  }

  function precio(p) {
    return p.moneda === "USD"
      ? "US$ " + (p.total / 100).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : TAMBU.precioCLP(p.total);
  }
  function hora(iso) {
    try { return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; }
  }
  function haceMin(iso) {
    var m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    return m < 1 ? "recién" : "hace " + m + " min";
  }

  /* ---------- Tarjeta de pedido ---------- */
  var ACCIONES = {
    pagado:         [{ estado: "en_preparacion", texto: "Empezar a preparar", clase: "btn--primary" }, { estado: "cancelado", texto: "Cancelar", clase: "btn--ghost" }],
    en_preparacion: [{ estado: "listo", texto: "Marcar listo", clase: "btn--primary" }, { estado: "cancelado", texto: "Cancelar", clase: "btn--ghost" }],
    listo:          [{ estado: "entregado", texto: "Entregado", clase: "btn--dark" }]
  };

  function tarjeta(p) {
    var items = (p.order_items || []).map(function (it) {
      return "<li><b>" + it.cantidad + "×</b> " + E(it.nombre) + (it.detalle ? "<small>" + E(it.detalle) + "</small>" : "") + "</li>";
    }).join("");
    return '<article class="ticket ticket--' + p.estado + '" data-id="' + p.id + '">' +
      '<div class="ticket__head"><span class="ticket__num">#' + p.numero + "</span>" +
        '<span class="muted">' + hora(p.pagado_at || p.created_at) + " · " + haceMin(p.pagado_at || p.created_at) + "</span></div>" +
      '<p class="ticket__cliente"><b>' + E(p.nombre_contacto) + '</b> · <a href="tel:' + E((p.telefono_contacto || "").replace(/\s/g, "")) + '">' + E(p.telefono_contacto) + "</a></p>" +
      '<p class="ticket__modo">' + (p.modalidad === "despacho" ? I("moto") + "Despacho: " + E(p.direccion || "") : I("tienda") + "Retiro en local") + "</p>" +
      '<ul class="ticket__items">' + items + "</ul>" +
      (p.observaciones ? '<p class="ticket__obs">' + I("info") + E(p.observaciones) + "</p>" : "") +
      '<div class="ticket__foot"><span class="price">' + precio(p) + '</span>' + (p.medio_pago === "efectivo" ? '<span class="badge badge--salmon">Cobrar en efectivo</span>' : '<span class="badge badge--wasabi">Pagado</span>') + "</div>" +
      '<div class="ticket__actions">' + (ACCIONES[p.estado] || []).map(function (a) {
        return '<button class="btn btn--sm ' + a.clase + '" type="button" data-accion="' + a.estado + '">' + a.texto + "</button>";
      }).join("") + "</div>" +
    "</article>";
  }

  /* ---------- Carga de pedidos ---------- */
  function cargar() {
    if (!sucursal) return;
    var desde = new Date(Date.now() - 18 * 3600 * 1000).toISOString();
    db.from("orders")
      .select("id, numero, estado, total, moneda, modalidad, direccion, nombre_contacto, telefono_contacto, observaciones, medio_pago, created_at, pagado_at, order_items (nombre, cantidad, detalle)")
      .eq("sucursal_id", sucursal.id)
      .in("estado", ["pagado", "en_preparacion", "listo", "entregado"])
      .gte("created_at", desde)
      .order("pagado_at", { ascending: true })
      .then(function (r) {
        if (r.error) { mensaje(TAMBU.errorAmigable(r.error)); return; }
        var lista = r.data || [];
        // ¿Hay pedidos pagados nuevos?
        lista.forEach(function (p) {
          if (!primeraCarga && p.estado === "pagado" && conocidos[p.id] !== "pagado") avisar(p);
          conocidos[p.id] = p.estado;
        });
        primeraCarga = false;
        var col = function (estado) { return lista.filter(function (p) { return p.estado === estado; }); };
        var nuevos = col("pagado"), prep = col("en_preparacion"), listos = col("listo");
        var entregados = col("entregado").reverse().slice(0, 10);
        function columna(titulo, arr, vacio) {
          return '<section class="board__col"><h2>' + titulo + ' <span class="chip__n">' + arr.length + "</span></h2>" +
            (arr.length ? arr.map(tarjeta).join("") : '<p class="muted board__empty">' + vacio + "</p>") + "</section>";
        }
        raiz.querySelector("[data-tablero]").innerHTML =
          columna("Nuevos", nuevos, "Sin pedidos nuevos.") +
          columna("En preparación", prep, "Nada en preparación.") +
          columna("Listos", listos, "Nada listo para entregar.");
        raiz.querySelector("[data-entregados]").innerHTML = entregados.length
          ? entregados.map(function (p) { return "<li><span>#" + p.numero + " · " + E(p.nombre_contacto) + "</span><span>" + precio(p) + "</span></li>"; }).join("")
          : '<li class="muted">Aún no hay pedidos entregados hoy.</li>';
        raiz.querySelector("[data-actualizado]").textContent = "Actualizado " + new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      });
  }

  function mensaje(t) {
    raiz.querySelector("[data-panel-msg]").innerHTML = t ? '<div class="demo-notice demo-notice--error" role="alert">' + I("info") + "<p>" + E(t) + "</p></div>" : "";
  }

  /* ---------- Tiempo real (+ respaldo cada 30 s) ---------- */
  function escuchar() {
    if (canal) db.removeChannel(canal);
    canal = db.channel("pedidos-" + sucursal.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: "sucursal_id=eq." + sucursal.id }, function () { cargar(); })
      .subscribe(function (estado) {
        var el = raiz.querySelector("[data-en-vivo]");
        if (el) el.classList.toggle("is-live", estado === "SUBSCRIBED");
      });
    clearInterval(sondeo);
    sondeo = setInterval(cargar, 30000);
  }

  /* ---------- Acciones ---------- */
  raiz.addEventListener("click", function (e) {
    var b = e.target.closest("[data-accion]");
    if (!b) return;
    var id = b.closest("[data-id]").getAttribute("data-id");
    var nuevo = b.getAttribute("data-accion");
    if (nuevo === "cancelado" && !confirm("¿Cancelar este pedido? Recuerda devolver el dinero al cliente desde tu cuenta de Flow.")) return;
    b.disabled = true;
    db.rpc("cambiar_estado_pedido", { p_order_id: id, p_estado: nuevo }).then(function (r) {
      if (r.error) { mensaje(r.error.message); b.disabled = false; return; }
      mensaje("");
      cargar();
    });
  });

  raiz.addEventListener("change", function (e) {
    if (e.target.matches("[data-elegir-sucursal]")) iniciarSucursal(e.target.value);
  });

  document.querySelector("[data-activar-avisos]").addEventListener("click", function () {
    sonar();
    if ("Notification" in window) Notification.requestPermission().then(function (p) {
      TAMBU.toast(p === "granted" ? "Avisos activados" : "Sonido activado (notificaciones bloqueadas por el navegador)");
    });
  });

  /* ---------- Sesión y sucursales del personal ---------- */
  var asignadas = [];
  function iniciarSucursal(id) {
    sucursal = asignadas.find(function (s) { return s.id === id; }) || asignadas[0];
    try { localStorage.setItem("tambu_panel_sucursal", sucursal.id); } catch (e) { /* nada */ }
    raiz.querySelector("[data-panel-sucursal]").textContent = sucursal.nombre;
    conocidos = {}; primeraCarga = true;
    cargar();
    escuchar();
  }

  function entrar(user) {
    usuario = user;
    db.from("branch_staff").select("sucursal_id, rol, branches (id, nombre, nombre_corto)").eq("user_id", user.id).then(function (r) {
      asignadas = (r.data || []).map(function (x) { return x.branches; }).filter(Boolean);
      if (!asignadas.length) {
        mostrar("sin-permiso");
        document.querySelector("[data-mi-correo]").textContent = user.email || user.id;
        return;
      }
      mostrar("panel");
      var sel = raiz.querySelector("[data-elegir-sucursal]");
      sel.innerHTML = asignadas.map(function (s) { return '<option value="' + s.id + '">' + E(s.nombre) + "</option>"; }).join("");
      sel.parentElement.hidden = asignadas.length < 2;
      var guardada = null;
      try { guardada = localStorage.getItem("tambu_panel_sucursal"); } catch (e) { /* nada */ }
      if (guardada && asignadas.some(function (s) { return s.id === guardada; })) sel.value = guardada;
      iniciarSucursal(sel.value);
    });
  }

  db.auth.onAuthStateChange(function (_ev, session) {
    setTimeout(function () {
      if (session && session.user) { if (!usuario || usuario.id !== session.user.id) entrar(session.user); }
      else { usuario = null; if (canal) db.removeChannel(canal); clearInterval(sondeo); mostrar("login"); }
    }, 0);
  });

  /* ---------- Inicio de sesión ---------- */
  document.querySelector('[data-form="panel-login"]').addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, msg = f.querySelector("[data-msg]");
    msg.textContent = "";
    db.auth.signInWithPassword({ email: f.correo.value.trim(), password: f.clave.value }).then(function (r) {
      if (r.error) msg.textContent = TAMBU.errorAmigable(r.error);
    });
  });
  document.querySelector("[data-panel-google]").addEventListener("click", function () {
    if (!/^https?:/.test(location.protocol)) { TAMBU.toast("Abre el panel con Live Server o desde la web publicada"); return; }
    db.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
  });
  document.querySelectorAll("[data-salir]").forEach(function (b) {
    b.addEventListener("click", function () { db.auth.signOut(); });
  });

  // Mantiene "hace X min" al día
  setInterval(function () { if (sucursal) cargar(); }, 60000);
})();
