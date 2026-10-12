/* ==========================================================================
   TAMBÚ SUSHI — PÁGINA DEL CARRITO (cart-page.js)
   Muestra el carrito guardado por cart.js: cambiar cantidades, eliminar,
   ver subtotales y total, seguir comprando o ir al checkout.
   ========================================================================== */

(function () {
  var zona = document.querySelector("[data-carrito]");
  if (!zona) return;
  var E = TAMBU.escapar, I = TAMBU.icono;

  function vacio() {
    zona.innerHTML =
      '<div class="state" style="margin:32px 0">' + I("carrito") +
        "<h2 style=\"font-size:1.5rem\">Tu carrito está vacío</h2>" +
        "<p>Explora la carta y agrega tus rolls favoritos.</p>" +
        '<div class="row" style="justify-content:center"><a class="btn btn--primary" href="carta.html">Ver la carta</a>' +
        '<a class="btn btn--outline" href="promociones.html">Ver promociones</a></div>' +
      "</div>";
  }

  function pintar() {
    var r = TAMBU.resumenCarrito();
    if (!r.lineas.length) { vacio(); return; }

    var lineas = r.lineas.map(function (l) {
      var url = TAMBU.urlProducto(l.producto);
      return '<li class="cart-line">' +
        '<a href="' + url + '" tabindex="-1" aria-hidden="true">' + TAMBU.fotoHTML(l.producto) + "</a>" +
        "<div>" +
          '<div class="cart-line__top">' +
            '<div><h3><a href="' + url + '">' + E(l.producto.nombre) + "</a></h3>" +
            (l.detalle ? '<p class="cart-line__opts">' + E(l.detalle) + "</p>" : "") +
            '<span class="cart-line__unit">' + TAMBU.precio(l.unitario) + " c/u</span></div>" +
            '<span class="cart-line__subtotal">' + TAMBU.precio(l.subtotal) + "</span>" +
          "</div>" +
          '<div class="cart-line__bottom">' +
            '<div class="qty qty--sm" data-linea="' + E(l.item.linea) + '">' +
              '<button type="button" data-paso="-1" aria-label="Quitar uno de ' + E(l.producto.nombre) + '">' + I(l.item.cantidad === 1 ? "basura" : "menos") + "</button>" +
              '<output aria-label="Cantidad">' + l.item.cantidad + "</output>" +
              '<button type="button" data-paso="1" aria-label="Agregar uno de ' + E(l.producto.nombre) + '"' + (l.item.cantidad >= 99 ? " disabled" : "") + ">" + I("mas") + "</button>" +
            "</div>" +
            '<button class="remove-btn" type="button" data-eliminar="' + E(l.item.linea) + '">Eliminar</button>' +
          "</div>" +
        "</div>" +
      "</li>";
    }).join("");

    var despacho = TAMBU.checkout.costoDespacho;
    zona.innerHTML =
      '<div class="cart-layout">' +
        "<div>" +
          '<div class="row" style="justify-content:space-between;margin-bottom:12px">' +
            '<span class="muted">' + r.cantidad + (r.cantidad === 1 ? " producto" : " productos") + "</span>" +
            '<button class="remove-btn" type="button" data-vaciar>Vaciar carrito</button>' +
          "</div>" +
          '<ul class="cart-list">' + lineas + "</ul>" +
          '<a class="link-arrow" href="carta.html" style="margin-top:24px">Seguir comprando ' + I("flecha") + "</a>" +
        "</div>" +
        '<aside class="summary summary--sticky" aria-label="Resumen">' +
          "<h2>Resumen</h2>" +
          '<ul class="totals">' +
            "<li><span>Subtotal</span><span>" + TAMBU.precio(r.subtotal) + "</span></li>" +
            "<li><span>Despacho</span><span>" + (despacho == null ? "Se define en el checkout" : TAMBU.precio(despacho)) + "</span></li>" +
            '<li class="totals__grand"><span>Total</span><span>' + TAMBU.precio(r.subtotal) + "</span></li>" +
            (TAMBU.pais === "VE" ? '<li><span>En bolívares</span>' + TAMBU.bsHTML(r.subtotal) + "</li>" : "") +
          "</ul>" +
          '<a class="btn btn--primary btn--block" href="checkout.html">Continuar ' + I("flecha") + "</a>" +
          '<a class="btn btn--ghost btn--block" href="carta.html">Seguir comprando</a>' +
          (TAMBU.productos.some(function (x) { return x.demo; }) || TAMBU.pais === "VE"
            ? '<p class="muted" style="margin:16px 0 0">' + (TAMBU.productos.some(function (x) { return x.demo; }) ? "Hay precios de demostración en la carta." : "") +
              (TAMBU.pais === "VE" ? ' <span data-tasa-bs></span>.' : "") + "</p>" : "") +
        "</aside>" +
      "</div>";
  }

  zona.addEventListener("click", function (e) {
    var paso = e.target.closest("[data-paso]");
    if (paso) {
      var cont = paso.closest("[data-linea]");
      var linea = cont.getAttribute("data-linea");
      var actual = TAMBU.cart.items().find(function (i) { return i.linea === linea; });
      if (actual) TAMBU.cart.cambiarCantidad(linea, actual.cantidad + parseInt(paso.getAttribute("data-paso"), 10));
      return;
    }
    var del = e.target.closest("[data-eliminar]");
    if (del) { TAMBU.cart.eliminar(del.getAttribute("data-eliminar")); TAMBU.toast("Producto eliminado"); return; }
    if (e.target.closest("[data-vaciar]")) { TAMBU.cart.vaciar(); TAMBU.toast("Carrito vaciado"); }
  });

  document.addEventListener("tambu:carrito", function () {
    // Conserva el foco en el mismo control tras repintar
    var f = document.activeElement;
    var sel = f && f.closest("[data-linea]") ? '[data-linea="' + f.closest("[data-linea]").getAttribute("data-linea").replace(/"/g, '\\"') + '"] [data-paso="' + f.getAttribute("data-paso") + '"]' : null;
    pintar();
    TAMBU.pintarBs();
    if (sel) { var n = zona.querySelector(sel); if (n) n.focus(); }
  });

  pintar();
  TAMBU.pintarBs();
})();
