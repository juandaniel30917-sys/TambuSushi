/* ==========================================================================
   TAMBÚ SUSHI — DETALLE DE PRODUCTO (product-detail.js)
   --------------------------------------------------------------------------
   Una sola plantilla (producto.html) para todos los productos.
   Lee el identificador de la URL:  producto.html?id=roll-demo-01
   Las opciones de cada producto vienen de demo-data.js y cada una puede
   tener suplemento: el total se recalcula al cambiar opciones o cantidad.
   ========================================================================== */

(function () {
  var zona = document.querySelector("[data-producto]");
  if (!zona) return;

  var E = TAMBU.escapar, I = TAMBU.icono;
  var id = new URLSearchParams(location.search).get("id");
  var p = id ? TAMBU.producto(id) : null;

  /* ---------- Producto inexistente ---------- */
  if (!p) {
    document.title = "Producto no encontrado · Tambú Sushi Talca";
    zona.innerHTML =
      '<div class="state" style="margin:32px 0 72px">' + I("buscar") +
        "<h1 style=\"font-size:1.8rem\">No encontramos este producto</h1>" +
        "<p>Puede que el enlace esté incompleto o que el producto ya no esté en la carta.</p>" +
        '<a class="btn btn--primary" href="carta.html">Volver a la carta</a>' +
      "</div>";
    return;
  }

  var cat = TAMBU.categoria(p.categoria);
  document.title = p.nombre + " · Tambú Sushi Talca";
  var bc = document.querySelector("[data-breadcrumb]");
  if (bc && cat) bc.insertAdjacentHTML("beforeend",
    '<span aria-hidden="true">/</span><a href="carta.html#' + cat.id + '">' + cat.nombre + '</a><span aria-hidden="true">/</span><span aria-current="page">' + E(p.nombre) + "</span>");

  var seleccion = TAMBU.seleccionInicial(p);
  var cantidad = 1;

  /* ---------- Galería (fotos reales o 4 recuadros provisionales) ---------- */
  var nFotos = Math.max(p.imagenes.length, 4);
  function foto(i, clase) {
    return p.imagenes[i] ? TAMBU.fotoHTML(p, clase, i)
      : '<div class="photo ' + (clase || "") + '" data-label="Foto provisional ' + (i + 1) + '" role="img" aria-label="Foto provisional ' + (i + 1) + ' de ' + E(p.nombre) + '"></div>';
  }
  var thumbs = "";
  for (var t = 0; t < nFotos; t++) {
    thumbs += '<button type="button" data-foto="' + t + '" aria-pressed="' + (t === 0) + '" aria-label="Ver foto ' + (t + 1) + '">' + foto(t) + "</button>";
  }

  /* ---------- Grupos de opciones ---------- */
  function grupoHTML(g) {
    var unica = g.tipo === "unica";
    var nota = unica ? (g.requerido ? "Obligatorio · elige 1" : "Opcional · elige 1") : "Opcional · hasta " + (g.max || g.valores.length);
    return '<fieldset class="opt-group" data-grupo="' + g.id + '">' +
      '<legend class="opt-group__head"><span class="opt-group__title">' + E(g.nombre) + "</span><span>" + nota + "</span></legend>" +
      '<div class="choices">' + g.valores.map(function (v) {
        var marcado = (seleccion[g.id] || []).indexOf(v.id) !== -1;
        return '<label class="choice">' +
          '<input type="' + (unica ? "radio" : "checkbox") + '" name="op-' + g.id + '" value="' + v.id + '"' + (marcado ? " checked" : "") + ">" +
          '<span class="choice__mark"></span>' +
          '<span class="choice__text"><b>' + E(v.nombre) + "</b></span>" +
          '<span class="choice__extra">' + (v.extra ? "+ " + TAMBU.precio(v.extra) : "Sin costo") + "</span>" +
        "</label>";
      }).join("") + "</div></fieldset>";
  }

  zona.innerHTML =
    '<div class="detail">' +
      '<div class="gallery">' +
        '<div class="product-card__media" data-foto-principal>' +
          '<div class="product-card__badges">' + TAMBU.badgesHTML(p, 3) + "</div>" + foto(0, "gallery__main") +
        "</div>" +
        '<div class="gallery__thumbs">' + thumbs + "</div>" +
      "</div>" +
      '<form class="detail__info" data-form-producto novalidate>' +
        '<span class="eyebrow">' + (cat ? cat.nombre : "") + "</span>" +
        "<h1>" + E(p.nombre) + "</h1>" +
        "<p>" + E(p.descripcionLarga || p.descripcion) + "</p>" +
        '<div class="detail__price">' + TAMBU.precioHTML(p, "Precio base demo") + (p.piezas ? '<span class="muted">' + p.piezas + " piezas</span>" : "") + "</div>" +
        (p.ingredientes && p.ingredientes.length
          ? '<span class="eyebrow">Ingredientes</span><ul class="ingredients" style="margin-top:12px">' +
            p.ingredientes.map(function (i) { return "<li>" + E(i) + "</li>"; }).join("") + "</ul>"
          : "") +
        (p.opciones || []).map(grupoHTML).join("") +
        '<div class="buy-bar buy-bar--sticky">' +
          '<div class="qty" data-qty>' +
            '<button type="button" data-paso="-1" aria-label="Quitar uno">' + I("menos") + "</button>" +
            '<output aria-live="polite" aria-label="Cantidad">1</output>' +
            '<button type="button" data-paso="1" aria-label="Agregar uno">' + I("mas") + "</button>" +
          "</div>" +
          '<button class="btn btn--primary" type="submit" data-boton-agregar>Agregar</button>' +
        "</div>" +
        '<p class="muted" data-max-aviso aria-live="polite" style="margin:8px 0 0"></p>' +
      "</form>" +
    "</div>";

  var form = zona.querySelector("[data-form-producto]");
  var boton = zona.querySelector("[data-boton-agregar]");
  var salida = zona.querySelector("[data-qty] output");
  var menos = zona.querySelector('[data-paso="-1"]');
  var aviso = zona.querySelector("[data-max-aviso]");

  function actualizar() {
    var calc = TAMBU.calcularPrecio(p, seleccion);
    boton.innerHTML = "Agregar · " + TAMBU.precio(calc.unitario * cantidad);
    salida.textContent = cantidad;
    menos.disabled = cantidad <= 1;
  }

  /* Cambios en opciones */
  form.addEventListener("change", function (e) {
    var input = e.target;
    var fs = input.closest("[data-grupo]");
    if (!fs) return;
    var g = p.opciones.find(function (x) { return x.id === fs.getAttribute("data-grupo"); });
    var marcados = Array.prototype.slice.call(fs.querySelectorAll("input:checked")).map(function (i) { return i.value; });
    if (g.tipo === "multiple" && g.max && marcados.length > g.max) {
      input.checked = false;
      marcados = marcados.filter(function (v) { return v !== input.value; });
      aviso.textContent = "Puedes elegir hasta " + g.max + " en «" + g.nombre + "».";
    } else {
      aviso.textContent = "";
    }
    seleccion[g.id] = marcados;
    actualizar();
  });

  /* Cantidad */
  zona.querySelector("[data-qty]").addEventListener("click", function (e) {
    var b = e.target.closest("[data-paso]");
    if (!b) return;
    cantidad = Math.min(99, Math.max(1, cantidad + parseInt(b.getAttribute("data-paso"), 10)));
    actualizar();
  });

  /* Agregar al carrito */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var faltante = (p.opciones || []).find(function (g) { return g.requerido && !(seleccion[g.id] || []).length; });
    if (faltante) { aviso.textContent = "Elige una opción en «" + faltante.nombre + "»."; return; }
    var calc = TAMBU.calcularPrecio(p, seleccion);
    TAMBU.cart.agregar(p, cantidad, JSON.parse(JSON.stringify(seleccion)), calc.unitario, calc.detalle);
    TAMBU.toast(cantidad + " × " + p.nombre + " agregado", { texto: "Ver carrito", href: "carrito.html" });
    cantidad = 1;
    actualizar();
  });

  /* Galería */
  zona.querySelector(".gallery__thumbs").addEventListener("click", function (e) {
    var b = e.target.closest("[data-foto]");
    if (!b) return;
    var i = parseInt(b.getAttribute("data-foto"), 10);
    var principal = zona.querySelector("[data-foto-principal]");
    principal.querySelector(".photo").outerHTML = foto(i, "gallery__main");
    zona.querySelectorAll("[data-foto]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
  });

  actualizar();

  /* ---------- Relacionados (misma categoría, luego destacados) ---------- */
  var rel = TAMBU.productos.filter(function (x) { return x.id !== p.id && x.categoria === p.categoria; });
  TAMBU.ordenar(TAMBU.productos.filter(function (x) { return x.destacado && x.id !== p.id && rel.indexOf(x) === -1; }), "relevancia")
    .forEach(function (x) { rel.push(x); });
  rel = rel.slice(0, 3);
  if (rel.length) {
    document.querySelector("[data-relacionados]").innerHTML = rel.map(TAMBU.tarjetaProducto).join("");
    document.querySelector("[data-relacionados-wrap]").hidden = false;
  }
})();
