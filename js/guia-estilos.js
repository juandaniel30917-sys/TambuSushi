/* Script SOLO para guia-estilos.html: muestra componentes con datos de ejemplo. */
(function () {
  
  // Chips con las categorías reales de demo-data.js
  var chips = document.getElementById("sg-chips");
  chips.innerHTML = '<a class="chip is-active" role="listitem" href="carta.html">Todo</a>' +
    TAMBU.categorias.map(function (c) {
      return '<a class="chip" role="listitem" href="carta.html#' + c.id + '">' + c.nombre + "</a>";
    }).join("");

  // Tarjetas reales, iguales a las de la carta
  document.getElementById("sg-cards").innerHTML = TAMBU.productos.slice(3, 6).map(TAMBU.tarjetaProducto).join("");

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-vaciar]")) {
      TAMBU.cart.vaciar();
      TAMBU.toast("Carrito de prueba vaciado");
    }
    if (e.target.closest("[data-demo-toast]")) TAMBU.toast("Así se ve un aviso breve", { texto: "Acción", href: "carta.html" });
  });

  // Selector de cantidad
  document.querySelectorAll("[data-qty]").forEach(function (q) {
    var out = q.querySelector("output");
    q.addEventListener("click", function (e) {
      var b = e.target.closest("[data-paso]");
      if (!b) return;
      var v = Math.min(99, Math.max(1, parseInt(out.textContent, 10) + parseInt(b.getAttribute("data-paso"), 10)));
      out.textContent = v;
    });
  });
})();
