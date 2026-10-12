/* ==========================================================================
   TAMBÚ SUSHI — CARRITO DE DEMOSTRACIÓN (cart.js)
   --------------------------------------------------------------------------
   Guarda el carrito en localStorage SOLO para que sobreviva entre páginas.
   Nunca guardar aquí contraseñas, datos de tarjetas ni datos personales.
   En la tienda real, el pedido se validará y recalculará en el servidor.
   La página carrito.html usa este archivo a través de js/cart-page.js.
   ========================================================================== */

window.TAMBU = window.TAMBU || {};

TAMBU.cart = (function () {
  // Un carrito por país: los productos y la moneda de Chile y Venezuela son distintos
  var CLAVE = "tambu_carrito_demo_v1" + (TAMBU.pais && TAMBU.pais !== "CL" ? "_" + TAMBU.pais.toLowerCase() : "");
  var memoria = []; // respaldo si el navegador bloquea localStorage

  function leer() {
    try {
      var crudo = localStorage.getItem(CLAVE);
      var datos = crudo ? JSON.parse(crudo) : [];
      if (!Array.isArray(datos)) return [];
      // Descarta líneas mal formadas o de productos que ya no están en la carta
      return datos.filter(function (i) {
        var valida = i && typeof i.id === "string" && i.cantidad > 0;
        var existe = !TAMBU.productos || TAMBU.productos.some(function (p) { return p.id === i.id; });
        return valida && existe;
      });
    } catch (e) {
      return memoria.slice();
    }
  }

  function guardar(items) {
    memoria = items.slice();
    try { localStorage.setItem(CLAVE, JSON.stringify(items)); } catch (e) { /* modo memoria */ }
    document.dispatchEvent(new CustomEvent("tambu:carrito", { detail: { items: items } }));
  }

  /* Una línea = mismo producto + mismas opciones elegidas */
  function claveLinea(id, opciones) {
    return id + "|" + JSON.stringify(opciones || {});
  }

  return {
    items: leer,

    cantidadTotal: function () {
      return leer().reduce(function (s, i) { return s + i.cantidad; }, 0);
    },

    total: function () {
      return leer().reduce(function (s, i) { return s + i.precioUnitario * i.cantidad; }, 0);
    },

    agregar: function (producto, cantidad, opciones, precioUnitario, detalle) {
      var items = leer();
      var linea = claveLinea(producto.id, opciones);
      var existente = items.find(function (i) { return i.linea === linea; });
      cantidad = Math.max(1, parseInt(cantidad, 10) || 1);
      if (existente) {
        existente.cantidad = Math.min(99, existente.cantidad + cantidad);
      } else {
        items.push({
          linea: linea,
          id: producto.id,
          nombre: producto.nombre,
          precioUnitario: precioUnitario != null ? precioUnitario : producto.precio,
          cantidad: cantidad,
          opciones: opciones || {},
          detalle: detalle || ""   // texto legible: "Envoltura: palta · Extra: queso crema"
        });
      }
      guardar(items);
    },

    cambiarCantidad: function (linea, cantidad) {
      var items = leer();
      cantidad = parseInt(cantidad, 10) || 0;
      items = items
        .map(function (i) { if (i.linea === linea) i.cantidad = Math.min(99, cantidad); return i; })
        .filter(function (i) { return i.cantidad > 0; });
      guardar(items);
    },

    eliminar: function (linea) {
      guardar(leer().filter(function (i) { return i.linea !== linea; }));
    },

    vaciar: function () { guardar([]); }
  };
})();

/* Sincroniza el contador si el carrito cambia en otra pestaña */
window.addEventListener("storage", function (e) {
  if (e.key && e.key.indexOf("tambu_carrito_demo_v1") === 0) {
    document.dispatchEvent(new CustomEvent("tambu:carrito"));
  }
});
