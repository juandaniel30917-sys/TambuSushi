/* ==========================================================================
   TAMBÚ SUSHI — SEGUIMIENTO DEL PEDIDO (order-page.js)
   --------------------------------------------------------------------------
   pedido.html?pedido=<código>
   Consulta el estado en el servidor (función estado-pedido) cada pocos
   segundos: pago pendiente → pagado → en preparación → listo → entregado.
   El estado "pagado" lo pone el servidor solo cuando Flow confirma el pago.
   ========================================================================== */

(function () {
  var zona = document.querySelector("[data-pedido-estado]");
  if (!zona) return;
  var E = TAMBU.escapar, I = TAMBU.icono;
  var id = new URLSearchParams(location.search).get("pedido") || "";
  var inicio = Date.now();
  var temporizador = null;
  var celebrado = false;

  var PASOS = [
    { id: "pagado",         titulo: "Pago confirmado",  texto: "Tu pedido llegó a la sucursal." },
    { id: "en_preparacion", titulo: "En preparación",   texto: "Estamos preparando tus rolls." },
    { id: "listo",          titulo: "Listo",            texto: "Ya puedes retirarlo." },
    { id: "entregado",      titulo: "Entregado",        texto: "¡Que lo disfrutes!" }
  ];

  function precio(total, moneda) {
    return moneda === "USD"
      ? "US$ " + (total / 100).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : TAMBU.precioCLP(total);
  }

  function noEncontrado() {
    zona.innerHTML = '<div class="state" style="margin:32px 0">' + I("buscar") +
      "<h2 style=\"font-size:1.4rem\">No encontramos este pedido</h2>" +
      "<p>Revisa el enlace o mira la lista de tus pedidos.</p>" +
      '<div class="row" style="justify-content:center"><a class="btn btn--primary" href="pedido.html">Mis pedidos</a><a class="btn btn--outline" href="carta.html">Ver la carta</a></div></div>';
  }

  function pintar(p) {
    var estado = p.estado;
    var efectivo = p.medio === "efectivo";
    var indice = PASOS.findIndex(function (s) { return s.id === estado; });
    var suc = p.sucursal || {};

    var cabecera;
    if (estado === "pendiente_pago") {
      var demora = Date.now() - inicio > 90000;
      cabecera = '<div class="order-status order-status--wait">' + '<span class="order-status__spinner" aria-hidden="true"></span>' +
        "<div><h2>Confirmando tu pago…</h2><p>" + (demora
          ? "Está tardando más de lo normal. Si ya pagaste, no vuelvas a pagar: la confirmación llegará en unos minutos."
          : "Esto toma solo unos segundos. No cierres esta página.") + "</p></div></div>";
    } else if (estado === "cancelado") {
      cabecera = '<div class="order-status order-status--error">' + I("info") +
        "<div><h2>El pago no se completó</h2><p>No se realizó ningún cobro. Tu carrito sigue guardado para que lo intentes de nuevo.</p>" +
        '<a class="btn btn--primary btn--sm" href="checkout.html">Intentar de nuevo</a></div></div>';
    } else {
      cabecera = '<div class="order-status order-status--ok">' + I("check") +
        "<div><h2>" + (estado === "pagado" ? (efectivo ? "¡Pedido recibido!" : "¡Pago confirmado!") : PASOS[indice] ? PASOS[indice].titulo : "Pedido recibido") + "</h2>" +
        "<p>Pedido <b>#" + p.numero + "</b> en <b>" + E(suc.nombre || "tu sucursal") + "</b>. " +
        (estado === "listo" ? "Ya puedes retirarlo." : estado === "entregado" ? "¡Gracias por tu compra!" : "Te avisaremos aquí mismo cuando esté listo.") +
        (efectivo && estado !== "entregado" ? " <b>Pagas en efectivo al retirar.</b>" : "") + "</p>" +
        (p.prueba ? '<span class="badge badge--neutro">Pedido de prueba</span>' : "") + "</div></div>";
    }

    var linea = estado === "cancelado" ? "" : '<ol class="order-steps">' + PASOS.map(function (s, i) {
      var clase = indice >= i ? (indice === i ? "is-current" : "is-done") : "";
      if (i === 0 && efectivo) s = { titulo: "Pedido confirmado", texto: "Tu pedido llegó a la sucursal. Pagas al retirar." };
      return '<li class="' + clase + '"><span class="order-steps__dot">' + (indice > i ? I("check") : i + 1) + "</span>" +
        "<div><b>" + s.titulo + "</b><small>" + s.texto + "</small></div></li>";
    }).join("") + "</ol>";

    var items = (p.items || []).map(function (it) {
      return "<li><span>" + it.cantidad + " × " + E(it.nombre) + (it.detalle ? "<small>" + E(it.detalle) + "</small>" : "") +
        "</span><span>" + precio(it.subtotal, p.moneda) + "</span></li>";
    }).join("");

    zona.innerHTML = cabecera +
      '<div class="cart-layout" style="padding-top:24px">' +
        "<div>" + linea + "</div>" +
        '<aside class="summary">' +
          "<h2>Pedido #" + p.numero + "</h2>" +
          '<ul class="summary-items">' + items + "</ul>" +
          '<ul class="totals"><li class="totals__grand"><span>Total</span><span>' + precio(p.total, p.moneda) + "</span></li></ul>" +
          '<p class="muted" style="margin:0">' + (p.modalidad === "despacho" ? "Despacho a domicilio" : "Retiro en " + E(suc.nombre || "la sucursal")) + "</p>" +
          (suc.whatsapp ? '<a class="btn btn--outline btn--block" style="margin-top:16px" href="https://wa.me/' + E(suc.whatsapp) + "?text=" +
            encodeURIComponent("Hola, consulto por mi pedido #" + p.numero) + '" target="_blank" rel="noopener">' + I("whatsapp") + "Escribir a la sucursal</a>" : "") +
          '<a class="btn btn--ghost btn--block btn--sm" style="margin-top:8px" href="pedido.html">Ver todos mis pedidos</a>' +
        "</aside>" +
      "</div>";

    // Pago confirmado: se vacía el carrito una sola vez
    if (estado !== "pendiente_pago" && estado !== "cancelado" && !celebrado) {
      celebrado = true;
      var pendiente = null;
      try { pendiente = sessionStorage.getItem("tambu_pedido_pendiente"); } catch (e) { /* nada */ }
      if (pendiente === id) {
        TAMBU.cart.vaciar();
        try { sessionStorage.removeItem("tambu_pedido_pendiente"); } catch (e) { /* nada */ }
        if (TAMBU.toast) TAMBU.toast((efectivo ? "¡Pedido recibido! #" : "¡Pago confirmado! Pedido #") + p.numero);
      }
    }
  }

  function consultar() {
    fetch(TAMBU.supabaseConfig.url + "/functions/v1/estado-pedido?id=" + encodeURIComponent(id), {
      headers: { "apikey": TAMBU.supabaseConfig.publishableKey }
    })
      .then(function (r) { if (r.status === 404) throw new Error("404"); return r.json(); })
      .then(function (p) {
        if (p.error) throw new Error(p.error);
        pintar(p);
        if (TAMBU.misPedidos) TAMBU.misPedidos.guardar(id, p.numero, null, p.estado);
        // Rápido mientras se confirma el pago; luego más espaciado para seguir la preparación
        var siguiente = p.estado === "pendiente_pago" ? 3000 : (p.estado === "entregado" || p.estado === "cancelado") ? 0 : 15000;
        if (p.estado === "pendiente_pago" && Date.now() - inicio > 15 * 60000) siguiente = 30000;
        if (siguiente) temporizador = setTimeout(consultar, siguiente);
      })
      .catch(function (err) {
        if (err.message === "404") { noEncontrado(); return; }
        temporizador = setTimeout(consultar, 6000);
      });
  }

  // Sin código: lista «Mis pedidos» (pedidos hechos en este dispositivo + los de la cuenta)
  if (!id) {
    document.title = "Mis pedidos · Tambú Sushi";
    var h1 = document.querySelector("h1"), lead = document.querySelector("h1 + .lead");
    if (h1) h1.textContent = "Mis pedidos";
    if (lead) lead.textContent = "Toca un pedido para ver en qué va. Los pedidos en curso se actualizan solos.";
    if (TAMBU.misPedidos && TAMBU.supabaseConfig) TAMBU.misPedidos.pintarLista(zona); else noEncontrado();
    return;
  }
  if (!/^[0-9a-f-]{36}$/i.test(id) || !TAMBU.supabaseConfig) { noEncontrado(); return; }
  consultar();
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && !temporizador) consultar();
  });
})();
