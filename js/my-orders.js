/* ==========================================================================
   TAMBÚ SUSHI — MIS PEDIDOS (my-orders.js)
   --------------------------------------------------------------------------
   Para clientes con cuenta y SIN cuenta:
   - Al comprar, el código del pedido se guarda en este navegador.
   - Mientras haya un pedido en curso, aparece un aviso flotante en todas las
     páginas («Pedido #106 · En preparación») para volver al seguimiento.
   - pedido.html sin código muestra la lista «Mis pedidos».
   - Con sesión iniciada, también se suman los pedidos de la cuenta (sirve
     en cualquier dispositivo).
   Privacidad: solo se guarda el código del pedido (un identificador largo
   imposible de adivinar) y su número; nunca datos personales.
   ========================================================================== */

window.TAMBU = window.TAMBU || {};

TAMBU.misPedidos = (function () {
  var CLAVE = "tambu_mis_pedidos";
  var MAX = 15, DIAS = 30;
  var memoria = [];
  var FINALES = ["entregado", "cancelado"];
  var TEXTOS = {
    pendiente_pago: "Confirmando pago", pagado: "Recibido", en_preparacion: "En preparación",
    listo: "¡Listo para retirar!", entregado: "Entregado", cancelado: "Cancelado"
  };

  function leer() {
    var lista;
    try { lista = JSON.parse(localStorage.getItem(CLAVE) || "[]"); } catch (e) { lista = memoria; }
    if (!Array.isArray(lista)) lista = [];
    var limite = Date.now() - DIAS * 86400000;
    return lista.filter(function (p) { return p && /^[0-9a-f-]{36}$/i.test(p.id) && (p.creado || 0) > limite; });
  }
  function escribir(lista) {
    lista.sort(function (a, b) { return (b.creado || 0) - (a.creado || 0); });
    lista = lista.slice(0, MAX);
    memoria = lista;
    try { localStorage.setItem(CLAVE, JSON.stringify(lista)); } catch (e) { /* solo esta visita */ }
  }
  function guardar(id, numero, creado, estado) {
    if (!/^[0-9a-f-]{36}$/i.test(id || "")) return;
    var lista = leer();
    var p = lista.find(function (x) { return x.id === id; });
    if (p) { if (numero) p.numero = numero; if (estado) p.estado = estado; }
    else lista.push({ id: id, numero: numero || null, creado: creado || Date.now(), estado: estado || null });
    escribir(lista);
  }
  function actualizarEstado(id, estado, numero) {
    var lista = leer();
    var p = lista.find(function (x) { return x.id === id; });
    if (p) { p.estado = estado; if (numero) p.numero = numero; escribir(lista); }
  }

  /* Consulta el estado en el servidor (sirve para invitados: basta el código) */
  function consultar(id) {
    if (!TAMBU.supabaseConfig) return Promise.reject(new Error("sin conexión"));
    return fetch(TAMBU.supabaseConfig.url + "/functions/v1/estado-pedido?id=" + encodeURIComponent(id), {
      headers: { "apikey": TAMBU.supabaseConfig.publishableKey }
    }).then(function (r) {
      if (r.status === 404) return { error: "404" };
      return r.json();
    });
  }

  /* Pedidos de la cuenta con sesión (cualquier dispositivo) */
  function sincronizarCuenta() {
    if (!TAMBU.db) return Promise.resolve();
    return TAMBU.db.auth.getSession().then(function (s) {
      var u = s && s.data && s.data.session && s.data.session.user;
      if (!u) return;
      return TAMBU.db.from("orders").select("id, numero, estado, created_at").eq("user_id", u.id)
        .order("created_at", { ascending: false }).limit(10).then(function (r) {
          (r.data || []).forEach(function (o) { guardar(o.id, o.numero, new Date(o.created_at).getTime(), o.estado); });
        });
    }).catch(function () { /* sin conexión */ });
  }

  /* ---------- Aviso flotante de pedido en curso ---------- */
  var burbuja = null, temporizador = null;
  var pagina = document.body.getAttribute("data-page") || "";
  var SIN_AVISO = ["panel", "admin-pedidos", "configuracion", "admin"];

  function pintarBurbuja(p, datos) {
    if (!burbuja) {
      burbuja = document.createElement("a");
      burbuja.className = "order-bubble";
      document.body.appendChild(burbuja);
    }
    var listo = datos.estado === "listo";
    burbuja.href = "pedido.html?pedido=" + encodeURIComponent(p.id);
    burbuja.classList.toggle("is-ready", listo);
    burbuja.innerHTML = '<span class="order-bubble__dot" aria-hidden="true"></span>' +
      "<span><small>Pedido #" + (datos.numero || p.numero || "") + "</small><b>" + (TEXTOS[datos.estado] || "En curso") + "</b></span>" +
      TAMBU.icono("chevron");
    burbuja.setAttribute("aria-label", "Ver tu pedido " + (datos.numero || "") + ": " + (TEXTOS[datos.estado] || "en curso"));
    burbuja.hidden = false;
    document.body.classList.add("has-order-bubble");
    marcarBoton(true);
  }
  function ocultarBurbuja() {
    if (burbuja) burbuja.hidden = true;
    document.body.classList.remove("has-order-bubble");
    marcarBoton(false);
  }
  /* Punto en el botón «Mis pedidos» de la cabecera cuando hay un pedido en curso */
  function marcarBoton(si) {
    document.querySelectorAll("[data-mis-pedidos-btn]").forEach(function (b) {
      b.classList.toggle("has-activo", si);
      b.setAttribute("aria-label", si ? "Mis pedidos (tienes un pedido en curso)" : "Mis pedidos");
    });
  }

  function revisarActivos() {
    clearTimeout(temporizador);
    var actual = new URLSearchParams(location.search).get("pedido");
    if (pagina === "pedido" && !actual) { ocultarBurbuja(); return; } // ya está la lista completa
    var hace = Date.now() - 12 * 3600000;
    var activos = leer().filter(function (p) { return FINALES.indexOf(p.estado) === -1 && (p.creado || 0) > hace && p.id !== actual; }).slice(0, 3);
    if (!activos.length) { ocultarBurbuja(); return; }
    Promise.all(activos.map(function (p) {
      return consultar(p.id).then(function (d) { return { p: p, d: d }; }).catch(function () { return { p: p, d: null }; });
    })).then(function (res) {
      var mostrado = false;
      res.forEach(function (x) {
        if (!x.d) return;
        if (x.d.error === "404") { actualizarEstado(x.p.id, "cancelado"); return; }
        actualizarEstado(x.p.id, x.d.estado, x.d.numero);
        if (!mostrado && FINALES.indexOf(x.d.estado) === -1) { pintarBurbuja(x.p, x.d); mostrado = true; }
      });
      if (!mostrado) ocultarBurbuja();
      if (mostrado) temporizador = setTimeout(revisarActivos, 30000);
    });
  }

  /* ---------- Lista «Mis pedidos» (pedido.html sin código) ---------- */
  function precio(total, moneda) {
    return moneda === "USD"
      ? "US$ " + (total / 100).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : TAMBU.precioCLP(total);
  }
  function pintarLista(zona) {
    var E = TAMBU.escapar, I = TAMBU.icono;
    zona.innerHTML = '<div class="skeleton" style="height:120px"></div>';
    sincronizarCuenta().then(function () {
      var lista = leer();
      if (!lista.length) {
        zona.innerHTML = '<div class="state">' + I("carrito") + "<h2 style=\"font-size:1.3rem\">Aún no tienes pedidos en este dispositivo</h2>" +
          "<p>Cuando hagas un pedido aparecerá aquí para que sigas su estado. Si tienes cuenta, inicia sesión para ver tus pedidos en cualquier dispositivo.</p>" +
          '<div class="row" style="justify-content:center"><a class="btn btn--primary" href="carta.html">Ver la carta</a><a class="btn btn--outline" href="mi-cuenta.html">Iniciar sesión</a></div></div>';
        return;
      }
      Promise.all(lista.slice(0, 10).map(function (p) {
        return consultar(p.id).then(function (d) { return { p: p, d: d }; }).catch(function () { return { p: p, d: null }; });
      })).then(function (res) {
        zona.innerHTML = '<ul class="admin-list">' + res.filter(function (x) { return !(x.d && x.d.error); }).map(function (x) {
          var d = x.d || {};
          if (d.estado) actualizarEstado(x.p.id, d.estado, d.numero);
          var activo = d.estado && FINALES.indexOf(d.estado) === -1;
          var items = (d.items || []).reduce(function (s, it) { return s + it.cantidad; }, 0);
          return '<li><a class="admin-row' + (activo ? " is-new" : "") + '" href="pedido.html?pedido=' + encodeURIComponent(x.p.id) + '">' +
            '<span class="admin-row__num">#' + E(String(d.numero || x.p.numero || "")) + "</span>" +
            '<span class="admin-row__main"><b>' + E((d.sucursal && d.sucursal.nombre) || "Pedido") + "</b><small>" +
              new Date(x.p.creado).toLocaleDateString("es-CL", { day: "numeric", month: "short" }) + (items ? " · " + items + (items === 1 ? " producto" : " productos") : "") + "</small></span>" +
            '<span class="admin-row__tags"><span class="badge ' + (activo ? "badge--salmon" : d.estado === "cancelado" ? "badge--nori" : "badge--wasabi") + '">' + E(TEXTOS[d.estado] || "Sin conexión") + "</span></span>" +
            '<span class="admin-row__total">' + (d.total != null ? precio(d.total, d.moneda) : "") + "</span>" +
            I("chevron") + "</a></li>";
        }).join("") + "</ul>";
      });
    });
  }

  /* ---------- Inicio ---------- */
  if (SIN_AVISO.indexOf(pagina) === -1) {
    sincronizarCuenta().then(revisarActivos);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) revisarActivos(); });
  }

  return { guardar: guardar, lista: leer, actualizarEstado: actualizarEstado, pintarLista: pintarLista, revisar: revisarActivos };
})();
