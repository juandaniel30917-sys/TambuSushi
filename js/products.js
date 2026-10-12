/* ==========================================================================
   TAMBÚ SUSHI — PRODUCTOS Y CARTA (products.js)
   --------------------------------------------------------------------------
   1. Utilidades de productos (buscar, precio con opciones, HTML de tarjetas)
   2. Agregar rápido al carrito desde una tarjeta
   3. Inicio: categorías, destacados y promociones
   4. Carta: búsqueda, filtros por categoría y orden
   5. Promociones
   Lee todo desde js/demo-data.js. Para pasar a Supabase solo cambiará el
   origen de TAMBU.productos y TAMBU.categorias.
   ========================================================================== */

window.TAMBU = window.TAMBU || {};

/* ---------- 1. Utilidades ---------- */
TAMBU.producto = function (id) {
  return TAMBU.productos.find(function (p) { return p.id === id; }) || null;
};

TAMBU.categoria = function (id) {
  return TAMBU.categorias.find(function (c) { return c.id === id; }) || null;
};

TAMBU.urlProducto = function (p) { return "producto.html?id=" + encodeURIComponent(p.id); };

/* Selección por defecto: primera opción de cada grupo obligatorio */
TAMBU.seleccionInicial = function (p) {
  var sel = {};
  (p.opciones || []).forEach(function (g) {
    sel[g.id] = g.tipo === "unica" && g.requerido && g.valores.length ? [g.valores[0].id] : [];
  });
  return sel;
};

/* Calcula precio unitario y texto legible de las opciones elegidas */
TAMBU.calcularPrecio = function (p, seleccion) {
  var unitario = p.precio;
  var partes = [];
  (p.opciones || []).forEach(function (g) {
    var elegidos = (seleccion && seleccion[g.id]) || [];
    var nombres = [];
    g.valores.forEach(function (v) {
      if (elegidos.indexOf(v.id) !== -1) {
        unitario += v.extra || 0;
        nombres.push(v.nombre);
      }
    });
    if (nombres.length) partes.push(g.nombre + ": " + nombres.join(", "));
  });
  return { unitario: unitario, detalle: partes.join(" · ") };
};

TAMBU.badgesHTML = function (p, max) {
  var lista = (p.etiquetas || []).slice(0, max || 3);
  return lista.map(function (clave) {
    var e = TAMBU.etiquetas[clave];
    return e ? '<span class="badge badge--' + e.tono + '">' + e.texto + "</span>" : "";
  }).join("");
};

/* Foto real si existe, si no un recuadro provisional con etiqueta */
TAMBU.fotoHTML = function (p, clase, indice) {
  var img = p.imagenes && p.imagenes[indice || 0];
  if (img) {
    return '<div class="photo ' + (clase || "") + '"><img src="' + TAMBU.escapar(img) + '" alt="' +
           TAMBU.escapar(p.nombre) + '" loading="lazy"></div>';
  }
  return '<div class="photo ' + (clase || "") + '" data-label="Foto provisional" role="img" aria-label="Foto provisional de ' +
         TAMBU.escapar(p.nombre) + '"></div>';
};

TAMBU.precioHTML = function (p, etiqueta) {
  return '<span class="price"><small>' + (etiqueta || (p.demo ? "Precio demo" : "Precio")) + "</small>" + TAMBU.precio(p.precio) +
         (p.precioAntes ? "<s>" + TAMBU.precio(p.precioAntes) + "</s>" : "") + TAMBU.bsHTML(p.precio) + "</span>";
};

TAMBU.tarjetaProducto = function (p) {
  var url = TAMBU.urlProducto(p);
  var cat = TAMBU.categoria(p.categoria);
  var nombre = TAMBU.escapar(p.nombre);
  return '<article class="product-card">' +
    '<a class="product-card__media" href="' + url + '" tabindex="-1" aria-hidden="true">' +
      '<div class="product-card__badges">' + TAMBU.badgesHTML(p, 2) + "</div>" +
      TAMBU.fotoHTML(p) +
    "</a>" +
    '<div class="product-card__body">' +
      '<span class="product-card__meta">' + (cat ? cat.corto : "") + (p.piezas ? " · " + p.piezas + " piezas" : "") + "</span>" +
      '<h3 class="product-card__title"><a href="' + url + '">' + nombre + "</a></h3>" +
      '<p class="product-card__desc">' + TAMBU.escapar(p.descripcion) + "</p>" +
      '<div class="product-card__foot">' +
        TAMBU.precioHTML(p) +
        '<button class="btn btn--primary btn--sm" type="button" data-agregar="' + p.id + '" aria-label="Agregar ' + nombre + ' al carrito">' +
          TAMBU.icono("mas") + "Agregar</button>" +
      "</div>" +
    "</div>" +
  "</article>";
};

TAMBU.tarjetaPromo = function (p, destacada) {
  var url = TAMBU.urlProducto(p);
  return '<article class="promo-card' + (destacada ? " promo-card--feature" : "") + '">' +
    '<a href="' + url + '" tabindex="-1" aria-hidden="true">' + TAMBU.fotoHTML(p, "photo--wide") + "</a>" +
    '<div class="promo-card__body">' +
      '<div class="row">' + TAMBU.badgesHTML(p, 2) + "</div>" +
      "<h3>" + TAMBU.escapar(p.nombre) + "</h3>" +
      "<p>" + TAMBU.escapar(p.descripcion) + "</p>" +
      '<div class="promo-card__foot">' +
        TAMBU.precioHTML(p, (p.piezas ? p.piezas + " piezas · " : "") + (p.demo ? "precio demo" : "precio").replace(/^p/, p.piezas ? "p" : "P")) +
        '<div class="row">' +
          '<a class="btn btn--outline btn--sm" href="' + url + '">Ver detalle</a>' +
          '<button class="btn btn--primary btn--sm" type="button" data-agregar="' + p.id + '" aria-label="Agregar ' + TAMBU.escapar(p.nombre) + ' al carrito">Agregar</button>' +
        "</div>" +
      "</div>" +
    "</div>" +
  "</article>";
};

/* Carrito con precios RECALCULADOS desde los datos (no confía en lo guardado).
   En la tienda real este cálculo lo repetirá el servidor antes de cobrar. */
TAMBU.resumenCarrito = function () {
  var lineas = [];
  TAMBU.cart.items().forEach(function (item) {
    var p = TAMBU.producto(item.id);
    if (!p) return; // producto que ya no existe en la carta
    var calc = TAMBU.calcularPrecio(p, item.opciones);
    lineas.push({ item: item, producto: p, unitario: calc.unitario, detalle: calc.detalle, subtotal: calc.unitario * item.cantidad });
  });
  return {
    lineas: lineas,
    cantidad: lineas.reduce(function (s, l) { return s + l.item.cantidad; }, 0),
    subtotal: lineas.reduce(function (s, l) { return s + l.subtotal; }, 0)
  };
};

/* ---------- 2. Agregar rápido ---------- */
TAMBU.agregarRapido = function (id) {
  var p = TAMBU.producto(id);
  if (!p) return;
  var sel = TAMBU.seleccionInicial(p);
  var calc = TAMBU.calcularPrecio(p, sel);
  TAMBU.cart.agregar(p, 1, sel, calc.unitario, calc.detalle);
  var personalizable = (p.opciones || []).length > 0;
  TAMBU.toast(p.nombre + " agregado", personalizable
    ? { texto: "Personalizar", href: TAMBU.urlProducto(p) }
    : { texto: "Ver carrito", href: "carrito.html" });
};

document.addEventListener("click", function (e) {
  var b = e.target.closest("[data-agregar]");
  if (b && TAMBU.producto(b.getAttribute("data-agregar"))) TAMBU.agregarRapido(b.getAttribute("data-agregar"));
});

/* Ordena una lista según el criterio elegido */
TAMBU.ordenar = function (lista, criterio) {
  var copia = lista.slice();
  var por = {
    "relevancia":  function (a, b) { return (b.relevancia || 0) - (a.relevancia || 0); },
    "precio-asc":  function (a, b) { return a.precio - b.precio; },
    "precio-desc": function (a, b) { return b.precio - a.precio; },
    "nombre":      function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); }
  };
  return copia.sort(por[criterio] || por.relevancia);
};

function normalizar(t) {
  return String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/* ---------- 3. Inicio ---------- */
(function inicio() {
  var cats = document.querySelector("[data-categorias-inicio]");
  if (cats) {
    cats.innerHTML = TAMBU.categorias.map(function (c, i) {
      var n = TAMBU.productos.filter(function (p) { return p.categoria === c.id; }).length;
      return '<a class="cat-tile" href="carta.html#' + c.id + '">' +
        TAMBU.icono("flecha") +
        '<span class="cat-tile__n">0' + (i + 1) + "</span>" +
        "<div><h3>" + c.nombre + '</h3><span class="muted">' + n + (n === 1 ? " producto" : " productos") + "</span></div>" +
      "</a>";
    }).join("");
  }

  var dest = document.querySelector("[data-destacados]");
  if (dest) {
    var lista = TAMBU.ordenar(TAMBU.productos.filter(function (p) { return p.destacado && !p.promo; }), "relevancia").slice(0, 4);
    dest.innerHTML = lista.map(TAMBU.tarjetaProducto).join("");
  }

  var promos = document.querySelector("[data-promos-inicio]");
  if (promos) {
    var lp = TAMBU.ordenar(TAMBU.productos.filter(function (p) { return p.promo; }), "relevancia").slice(0, 3);
    promos.innerHTML = lp.map(function (p, i) { return TAMBU.tarjetaPromo(p, i === 0); }).join("");
  }
})();

/* ---------- 4. Carta ---------- */
(function carta() {
  var contenedor = document.querySelector("[data-carta]");
  if (!contenedor) return;

  var chips = document.querySelector("[data-carta-chips]");
  var buscador = document.getElementById("buscar-carta");
  var orden = document.getElementById("orden-carta");
  var info = document.querySelector("[data-carta-info]");

  var estado = { categoria: "todas", q: "", orden: "relevancia" };
  var desdeHash = location.hash.replace("#", "");
  if (TAMBU.categoria(desdeHash)) estado.categoria = desdeHash;

  function pintarChips() {
    var total = TAMBU.productos.length;
    chips.innerHTML =
      '<button class="chip' + (estado.categoria === "todas" ? " is-active" : "") + '" type="button" data-cat="todas" aria-pressed="' + (estado.categoria === "todas") + '">Todo <span class="chip__n">' + total + "</span></button>" +
      TAMBU.categorias.map(function (c) {
        var n = TAMBU.productos.filter(function (p) { return p.categoria === c.id; }).length;
        var activo = estado.categoria === c.id;
        return '<button class="chip' + (activo ? " is-active" : "") + '" type="button" data-cat="' + c.id + '" aria-pressed="' + activo + '">' +
               c.nombre + ' <span class="chip__n">' + n + "</span></button>";
      }).join("");
    var activo = chips.querySelector(".is-active");
    if (activo && activo.scrollIntoView) activo.scrollIntoView({ block: "nearest", inline: "center" });
  }

  function pintar() {
    var q = normalizar(estado.q.trim());
    var filtrados = TAMBU.productos.filter(function (p) {
      var okCat = estado.categoria === "todas" || p.categoria === estado.categoria;
      var texto = normalizar(p.nombre + " " + p.descripcion + " " + (p.ingredientes || []).join(" "));
      return okCat && (!q || texto.indexOf(q) !== -1);
    });

    if (!filtrados.length) {
      contenedor.innerHTML =
        '<div class="state" style="margin-top:32px">' + TAMBU.icono("buscar") +
          "<h3>No encontramos productos</h3>" +
          "<p>Prueba con otra palabra o revisa todas las categorías.</p>" +
          '<button class="btn btn--outline btn--sm" type="button" data-limpiar>Limpiar filtros</button>' +
        "</div>";
      info.textContent = "0 productos";
      return;
    }

    info.textContent = filtrados.length + (filtrados.length === 1 ? " producto" : " productos") +
      (q ? " para «" + estado.q.trim() + "»" : "") + (TAMBU.productos.some(function (x) { return x.demo; }) ? " · hay precios de demostración" : "");

    // Con orden "recomendados" se agrupa por categoría; con otro orden, lista continua
    if (estado.orden === "relevancia") {
      contenedor.innerHTML = TAMBU.categorias.map(function (c) {
        var deCat = TAMBU.ordenar(filtrados.filter(function (p) { return p.categoria === c.id; }), "relevancia");
        if (!deCat.length) return "";
        return '<section class="menu-section" id="seccion-' + c.id + '" aria-labelledby="titulo-' + c.id + '">' +
          '<div class="menu-section__head"><h2 id="titulo-' + c.id + '">' + c.nombre + '</h2><span class="muted">' + c.descripcion + "</span></div>" +
          '<div class="product-grid product-grid--compact">' + deCat.map(TAMBU.tarjetaProducto).join("") + "</div>" +
        "</section>";
      }).join("");
    } else {
      contenedor.innerHTML = '<div class="product-grid product-grid--compact" style="padding-top:24px">' +
        TAMBU.ordenar(filtrados, estado.orden).map(TAMBU.tarjetaProducto).join("") + "</div>";
    }
  }

  chips.addEventListener("click", function (e) {
    var b = e.target.closest("[data-cat]");
    if (!b) return;
    estado.categoria = b.getAttribute("data-cat");
    history.replaceState(null, "", estado.categoria === "todas" ? location.pathname + location.search : "#" + estado.categoria);
    pintarChips(); pintar();
    var top = document.querySelector(".filter-bar").getBoundingClientRect().top + window.scrollY;
    if (window.scrollY > top) window.scrollTo({ top: top, behavior: "smooth" });
  });

  var espera;
  buscador.addEventListener("input", function () {
    clearTimeout(espera);
    espera = setTimeout(function () { estado.q = buscador.value; pintar(); }, 120);
  });
  orden.addEventListener("change", function () { estado.orden = orden.value; pintar(); });

  contenedor.addEventListener("click", function (e) {
    if (e.target.closest("[data-limpiar]")) {
      estado = { categoria: "todas", q: "", orden: estado.orden };
      buscador.value = "";
      history.replaceState(null, "", location.pathname);
      pintarChips(); pintar();
    }
  });

  window.addEventListener("hashchange", function () {
    var h = location.hash.replace("#", "");
    if (TAMBU.categoria(h)) { estado.categoria = h; pintarChips(); pintar(); }
  });

  pintarChips();
  pintar();
})();

/* ---------- 5. Promociones ---------- */
(function promociones() {
  var lista = document.querySelector("[data-promos-lista]");
  if (!lista) return;
  var promos = TAMBU.ordenar(TAMBU.productos.filter(function (p) { return p.promo; }), "relevancia");
  lista.innerHTML = promos.length
    ? promos.map(function (p, i) { return TAMBU.tarjetaPromo(p, i === 0); }).join("")
    : '<div class="state"><h3>No hay promociones activas</h3><p>Vuelve pronto o revisa la carta completa.</p><a class="btn btn--primary btn--sm" href="carta.html">Ver la carta</a></div>';
})();
