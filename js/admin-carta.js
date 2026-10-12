/* ==========================================================================
   TAMBÚ SUSHI — PANEL · CARTA, PRECIOS, PROMOCIONES Y CATEGORÍAS (admin-carta.js)
   --------------------------------------------------------------------------
   - Lista de comidas por país (Chile en pesos, Venezuela en dólares).
   - Editor: nombre, precio, precio «antes», piezas, descripciones,
     ingredientes, etiquetas, fotos y opciones con suplemento.
   - «Eliminar» archiva la comida (los pedidos antiguos conservan su detalle)
     y se puede recuperar.
   El servidor vuelve a validar todo y el cobro usa siempre estos precios.
   ========================================================================== */

(function () {
  var raiz = document.querySelector("[data-config]");
  var dialogo = document.querySelector("[data-editor]");
  if (!raiz || !dialogo || !TAMBU.sa) return;
  var SA = TAMBU.sa, E = TAMBU.escapar, I = TAMBU.icono;

  var productos = [], archivados = null;
  var filtro = { pais: "CL", cat: "", q: "", archivados: false };
  var paisPromos = "CL";
  var categorias = null;
  var ICONOS = { etiqueta: "Etiqueta", fuego: "Fuego (calientes)", copo: "Copo (fríos)", cono: "Cono (hand roll)", hoja: "Hoja (veggie)",
    vaso: "Vaso (bebidas)", rollo: "Roll", palillos: "Palillos", estrella: "Estrella", regalo: "Regalo" };

  /* ---------- Utilidades ---------- */
  function slug(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item";
  }
  function unico(base, usados) {
    var id = base, n = 2;
    while (usados.indexOf(id) !== -1) id = base.slice(0, 36) + "-" + n++;
    usados.push(id);
    return id;
  }
  function precioTexto(valor, pais) {
    return pais === "VE" ? "US$ " + (valor / 100).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : TAMBU.precioCLP(valor);
  }
  function aMinimo(texto, pais) {      // lo que escribe el usuario → pesos o centavos
    var v = parseFloat(String(texto).replace(/\./g, pais === "VE" ? "." : "").replace(",", "."));
    if (!isFinite(v)) return null;
    return pais === "VE" ? Math.round(v * 100) : Math.round(v);
  }
  function deMinimo(valor, pais) { return valor == null ? "" : pais === "VE" ? (valor / 100).toFixed(2) : String(valor); }
  function copiar(o) { return JSON.parse(JSON.stringify(o)); }

  function listaCategorias() {
    if (categorias) return categorias;
    var c = SA.contenido && Array.isArray(SA.contenido.categorias) && SA.contenido.categorias.length ? SA.contenido.categorias : (TAMBU.categoriasTodas || TAMBU.categorias);
    categorias = copiar(c).map(function (x) { if (x.activa === undefined) x.activa = true; return x; });
    return categorias;
  }
  function nombreCategoria(id) {
    var c = listaCategorias().find(function (x) { return x.id === id; });
    return c ? c.nombre : id;
  }

  /* ---------- Cargar ---------- */
  function cargar() {
    var p1 = SA.db.rpc("listar_productos_admin", { p_archivados: false });
    var p2 = SA.contenido ? Promise.resolve() : SA.cargarContenido().catch(function () { /* usa los valores de la web */ });
    return Promise.all([p1, p2]).then(function (res) {
      if (res[0].error) throw res[0].error;
      productos = res[0].data || [];
      archivados = null;
      categorias = null;
      pintarFiltros(); pintarLista(); pintarPromos(); pintarCategorias();
    }).catch(function (err) { SA.aviso(SA.mensajeError(err), "error"); });
  }
  function cargarArchivados() {
    return SA.db.rpc("listar_productos_admin", { p_archivados: true }).then(function (r) {
      if (r.error) throw r.error;
      archivados = r.data || [];
    });
  }

  /* ---------- Lista ---------- */
  function fila(p, conArchivo) {
    var img = (p.imagenes || [])[0];
    var chips = [];
    if (!p.activo) chips.push('<span class="badge badge--neutro">Escondida</span>');
    if (p.promo) chips.push('<span class="badge badge--salmon">Promoción</span>');
    if (p.destacado) chips.push('<span class="badge badge--wasabi">Destacada</span>');
    if (p.demo) chips.push('<span class="badge badge--neutro">Demo</span>');
    return '<li class="sa-prod' + (p.activo ? "" : " is-off") + '">' +
      '<span class="sa-prod__foto">' + (img ? '<img src="' + E(img) + '" alt="" loading="lazy">' : I("imagen")) + "</span>" +
      '<span class="sa-prod__info"><b>' + E(p.nombre) + "</b><small>" + E(nombreCategoria(p.categoria)) + (p.piezas ? " · " + p.piezas + " piezas" : "") +
        ((p.opciones || []).length ? " · " + p.opciones.length + (p.opciones.length === 1 ? " grupo de opciones" : " grupos de opciones") : "") + "</small>" +
        (chips.length ? '<span class="sa-prod__chips">' + chips.join("") + "</span>" : "") + "</span>" +
      '<span class="sa-prod__precio">' + precioTexto(p.precio, p.pais) + (p.precio_antes ? "<s>" + precioTexto(p.precio_antes, p.pais) + "</s>" : "") + "</span>" +
      '<span class="sa-prod__acciones">' +
        (conArchivo
          ? '<button class="btn btn--outline btn--sm" type="button" data-restaurar="' + E(p.id) + '">Recuperar</button>'
          : '<button class="icon-btn" type="button" data-visible="' + E(p.id) + '" aria-label="' + (p.activo ? "Esconder de la web" : "Mostrar en la web") + '" title="' + (p.activo ? "Esconder de la web" : "Mostrar en la web") + '">' + I("ojo", p.activo ? "" : "is-tachado") + "</button>" +
            '<button class="btn btn--outline btn--sm" type="button" data-editar="' + E(p.id) + '">' + I("lapiz") + "Editar</button>") +
      "</span></li>";
  }
  function pintarFiltros() {
    var sel = raiz.querySelector("[data-carta-cat]");
    var actual = sel.value;
    sel.innerHTML = '<option value="">Todas las categorías</option>' + listaCategorias().map(function (c) {
      return '<option value="' + E(c.id) + '">' + E(c.nombre) + (c.activa === false ? " (escondida)" : "") + "</option>";
    }).join("");
    sel.value = actual;
  }
  function pintarLista() {
    var zona = raiz.querySelector("[data-lista-productos]");
    var base = filtro.archivados ? (archivados || []) : productos;
    var q = filtro.q.trim().toLowerCase();
    var lista = base.filter(function (p) {
      return p.pais === filtro.pais && (!filtro.cat || p.categoria === filtro.cat) &&
        (!q || (p.nombre + " " + (p.descripcion || "")).toLowerCase().indexOf(q) !== -1);
    });
    if (filtro.archivados && !archivados) { zona.innerHTML = '<li><div class="skeleton" style="height:80px"></div></li>'; return; }
    if (!lista.length) {
      zona.innerHTML = '<li class="state" style="padding:32px 16px"><p>' + (filtro.archivados ? "No hay comidas eliminadas." : "No hay comidas con este filtro.") + "</p></li>";
      return;
    }
    // Agrupadas por categoría, en el orden de la carta
    var orden = listaCategorias().map(function (c) { return c.id; });
    lista.sort(function (a, b) {
      var ca = orden.indexOf(a.categoria), cb = orden.indexOf(b.categoria);
      return (ca === -1 ? 99 : ca) - (cb === -1 ? 99 : cb) || (b.relevancia || 0) - (a.relevancia || 0) || a.nombre.localeCompare(b.nombre);
    });
    var html = "", ultima = null;
    lista.forEach(function (p) {
      if (p.categoria !== ultima && !filtro.cat) { html += '<li class="sa-prod__grupo">' + E(nombreCategoria(p.categoria)) + "</li>"; ultima = p.categoria; }
      html += fila(p, filtro.archivados);
    });
    zona.innerHTML = html;
  }
  function pintarPromos() {
    var zona = raiz.querySelector("[data-lista-promos]");
    var lista = productos.filter(function (p) { return p.pais === paisPromos && (p.promo || p.categoria === "promociones"); });
    zona.innerHTML = lista.length ? lista.map(function (p) { return fila(p, false); }).join("")
      : '<li class="state" style="padding:32px 16px"><p>Aún no hay promociones en ' + (paisPromos === "VE" ? "Venezuela" : "Chile") + ".</p></li>";
  }

  /* ---------- Categorías ---------- */
  function pintarCategorias() {
    var cats = listaCategorias();
    var usadas = {};
    productos.forEach(function (p) { usadas[p.categoria] = (usadas[p.categoria] || 0) + 1; });
    raiz.querySelector("[data-categorias]").innerHTML = '<ul class="sa-cats">' + cats.map(function (c, i) {
      return '<li class="sa-cat" data-i="' + i + '">' +
        '<div class="sa-cat__orden"><button class="icon-btn" type="button" data-cat-mover="-1" aria-label="Subir"' + (i === 0 ? " disabled" : "") + ">" + I("arriba") + "</button>" +
          '<button class="icon-btn" type="button" data-cat-mover="1" aria-label="Bajar"' + (i === cats.length - 1 ? " disabled" : "") + ">" + I("abajo") + "</button></div>" +
        '<label class="field"><span>Nombre</span><input class="input" data-c="nombre" value="' + E(c.nombre) + '" maxlength="60"></label>' +
        '<label class="field"><span>Nombre corto</span><input class="input" data-c="corto" value="' + E(c.corto || "") + '" maxlength="24"></label>' +
        '<label class="field"><span>Ícono</span><select class="select" data-c="icono">' + Object.keys(ICONOS).map(function (k) {
          return '<option value="' + k + '"' + (k === c.icono ? " selected" : "") + ">" + ICONOS[k] + "</option>"; }).join("") + "</select></label>" +
        '<label class="field sa-cat__desc"><span>Descripción</span><input class="input" data-c="descripcion" value="' + E(c.descripcion || "") + '" maxlength="140"></label>' +
        '<label class="config-check"><input type="checkbox" data-c="activa"' + (c.activa !== false ? " checked" : "") + "> Visible</label>" +
        (usadas[c.id] ? '<small class="muted">' + usadas[c.id] + " comidas</small>" : '<button class="remove-btn" type="button" data-cat-quitar>Quitar</button>') +
      "</li>";
    }).join("") + "</ul>";
  }
  function leerCategorias() {
    raiz.querySelectorAll(".sa-cat").forEach(function (li) {
      var c = categorias[Number(li.getAttribute("data-i"))];
      li.querySelectorAll("[data-c]").forEach(function (el) {
        var k = el.getAttribute("data-c");
        c[k] = el.type === "checkbox" ? el.checked : el.value.trim();
      });
    });
  }

  /* ---------- Editor de comida ---------- */
  var editando = null;   // copia del producto en edición
  var fotos = [], grupos = [];

  function campo(nombre, etiqueta, valor, extra) {
    return '<div class="field"><label for="ed-' + nombre + '">' + etiqueta + "</label>" +
      '<input class="input" id="ed-' + nombre + '" name="' + nombre + '" value="' + E(valor == null ? "" : valor) + '"' + (extra || "") + "></div>";
  }
  function abrirEditor(p, nuevo) {
    editando = copiar(p);
    editando._nuevo = !!nuevo;
    fotos = (editando.imagenes || []).slice();
    grupos = copiar(editando.opciones || []);
    var pais = editando.pais, ve = pais === "VE";
    var moneda = ve ? "US$" : "$";
    dialogo.querySelector("[data-editor-titulo]").textContent = nuevo ? (editando.promo ? "Nueva promoción" : "Nueva comida") : "Editar · " + editando.nombre;
    dialogo.querySelector("[data-editor-archivar]").hidden = !!nuevo;
    dialogo.querySelector("[data-editor-msg]").textContent = "";
    var otros = productos.filter(function (x) { return x.pais === pais && x.id !== editando.id && (x.opciones || []).length; });
    var etiquetas = Object.keys(TAMBU.etiquetas).filter(function (k) { return k !== "demo"; });

    dialogo.querySelector("[data-editor-cuerpo]").innerHTML =
      '<p class="sa-pais-chip">' + (ve ? "Venezuela · precios en dólares" : "Chile · precios en pesos") + "</p>" +
      '<div class="form-grid">' +
        campo("nombre", "Nombre", editando.nombre, ' maxlength="120" required') +
        '<div class="sa-grid-3">' +
          '<div class="field"><label for="ed-categoria">Categoría</label><select class="select" id="ed-categoria" name="categoria">' +
            listaCategorias().map(function (c) { return '<option value="' + E(c.id) + '"' + (c.id === editando.categoria ? " selected" : "") + ">" + E(c.nombre) + "</option>"; }).join("") + "</select></div>" +
          campo("precio", "Precio (" + moneda + ")", deMinimo(editando.precio, pais), ' inputmode="decimal" required') +
          campo("precio_antes", "Precio antes (" + moneda + ", opcional)", deMinimo(editando.precio_antes, pais), ' inputmode="decimal" placeholder="Se muestra tachado"') +
        "</div>" +
        '<div class="sa-grid-3">' +
          campo("piezas", "Piezas (opcional)", editando.piezas, ' inputmode="numeric"') +
          '<div class="field" style="grid-column:span 2"><label for="ed-ingredientes">Ingredientes (separados por coma)</label>' +
            '<input class="input" id="ed-ingredientes" name="ingredientes" value="' + E((editando.ingredientes || []).join(", ")) + '"></div>' +
        "</div>" +
        '<div class="field"><label for="ed-descripcion">Descripción corta (tarjeta de la carta)</label>' +
          '<input class="input" id="ed-descripcion" name="descripcion" maxlength="300" value="' + E(editando.descripcion || "") + '"></div>' +
        '<div class="field"><label for="ed-larga">Descripción larga (página del producto)</label>' +
          '<textarea class="textarea" id="ed-larga" name="descripcion_larga" maxlength="2000">' + E(editando.descripcion_larga || "") + "</textarea></div>" +

        '<fieldset class="sa-fieldset"><legend>Dónde se muestra</legend><div class="sa-checks">' +
          '<label class="config-check"><input type="checkbox" name="activo"' + (editando.activo !== false ? " checked" : "") + "> Visible en la web</label>" +
          '<label class="config-check"><input type="checkbox" name="promo"' + (editando.promo ? " checked" : "") + "> Es promoción</label>" +
          '<label class="config-check"><input type="checkbox" name="destacado"' + (editando.destacado ? " checked" : "") + "> Destacada en el inicio</label>" +
          '<label class="config-check"><input type="checkbox" name="demo"' + (editando.demo ? " checked" : "") + "> Producto de demostración</label>" +
        "</div></fieldset>" +

        '<fieldset class="sa-fieldset"><legend>Etiquetas</legend><div class="sa-checks">' +
          etiquetas.map(function (k) {
            return '<label class="config-check"><input type="checkbox" name="etiqueta" value="' + E(k) + '"' + ((editando.etiquetas || []).indexOf(k) !== -1 ? " checked" : "") + "> " + E(TAMBU.etiquetas[k].texto) + "</label>";
          }).join("") +
        "</div></fieldset>" +

        '<fieldset class="sa-fieldset"><legend>Fotos</legend><div class="sa-fotos-prod" data-ed-fotos></div>' +
          '<p class="hint">La primera foto es la portada. Hasta 8 fotos; se achican solas para cargar rápido.</p></fieldset>' +

        '<fieldset class="sa-fieldset"><legend>Opciones para el cliente</legend>' +
          '<p class="hint" style="margin-top:0">Ej.: «Envoltura» (elige una: panko, tempura) o «Agrega» (puede elegir varias, con precio adicional). El precio extra se suma solo.</p>' +
          '<div data-ed-grupos></div>' +
          '<div class="row" style="margin-top:12px">' +
            '<button class="btn btn--outline btn--sm" type="button" data-grupo-agregar>+ Agregar grupo de opciones</button>' +
            (otros.length ? '<label class="sa-copiar"><span class="visually-hidden">Copiar opciones de</span><select class="select" data-copiar-opciones><option value="">Copiar opciones de…</option>' +
              otros.map(function (x) { return '<option value="' + E(x.id) + '">' + E(x.nombre) + "</option>"; }).join("") + "</select></label>" : "") +
          "</div></fieldset>" +
      "</div>";
    pintarFotos(); pintarGrupos();
    if (!dialogo.open) dialogo.showModal();
    var primero = dialogo.querySelector("#ed-nombre");
    if (primero && nuevo) primero.focus();
  }

  function pintarFotos() {
    var z = dialogo.querySelector("[data-ed-fotos]");
    z.innerHTML = fotos.map(function (u, i) {
      return '<figure class="sa-foto-mini"><img src="' + E(u) + '" alt="Foto ' + (i + 1) + '">' +
        (i === 0 ? '<figcaption>Portada</figcaption>' : "") +
        '<div class="sa-foto-mini__acc">' +
          (i > 0 ? '<button type="button" class="icon-btn" data-foto-portada="' + i + '" aria-label="Usar como portada" title="Usar como portada">' + I("estrella") + "</button>" : "") +
          '<button type="button" class="icon-btn" data-foto-quitar="' + i + '" aria-label="Quitar foto" title="Quitar foto">' + I("basura") + "</button>" +
        "</div></figure>";
    }).join("") + (fotos.length < 8 ? '<button type="button" class="sa-foto-subir" data-foto-subir>' + I("subir") + "<span>Subir foto</span></button>" : "");
  }

  function pintarGrupos() {
    var ve = editando.pais === "VE";
    dialogo.querySelector("[data-ed-grupos]").innerHTML = grupos.map(function (g, gi) {
      return '<div class="sa-grupo" data-g="' + gi + '" data-id="' + E(g.id || "") + '">' +
        '<div class="sa-grupo__head">' +
          '<label class="field"><span>Nombre del grupo</span><input class="input" data-gk="nombre" value="' + E(g.nombre || "") + '" placeholder="Ej: Envoltura" maxlength="60"></label>' +
          '<label class="field"><span>El cliente…</span><select class="select" data-gk="tipo">' +
            '<option value="unica"' + (g.tipo !== "multiple" ? " selected" : "") + ">Elige una</option>" +
            '<option value="multiple"' + (g.tipo === "multiple" ? " selected" : "") + ">Puede elegir varias</option></select></label>" +
          '<label class="field sa-grupo__max"' + (g.tipo === "multiple" ? "" : " hidden") + '><span>Máximo</span><input class="input" data-gk="max" type="number" min="1" max="30" value="' + E(g.max || "") + '"></label>' +
          '<label class="config-check"><input type="checkbox" data-gk="requerido"' + (g.requerido ? " checked" : "") + "> Obligatorio</label>" +
          '<button class="remove-btn" type="button" data-grupo-quitar>Quitar grupo</button>' +
        "</div>" +
        '<ul class="sa-valores-op">' + (g.valores || []).map(function (v) {
          return '<li data-id="' + E(v.id || "") + '"><input class="input" data-vk="nombre" value="' + E(v.nombre || "") + '" placeholder="Opción (ej: Panko)" maxlength="80" aria-label="Nombre de la opción">' +
            '<label class="sa-extra"><span>+' + (ve ? "US$" : "$") + '</span><input class="input" data-vk="extra" inputmode="decimal" value="' + E(deMinimo(Number(v.extra) || 0, editando.pais)) + '" aria-label="Precio adicional"></label>' +
            '<button class="icon-btn" type="button" data-valor-quitar aria-label="Quitar opción">' + I("cerrar") + "</button></li>";
        }).join("") + "</ul>" +
        '<button class="btn btn--ghost btn--sm" type="button" data-valor-agregar>+ Agregar opción</button>' +
      "</div>";
    }).join("") || '<p class="muted" style="margin:0">Sin opciones: se vende tal cual.</p>';
  }

  /* Lee los grupos escritos en pantalla */
  function leerGrupos() {
    var usadosG = [];
    var res = [];
    dialogo.querySelectorAll(".sa-grupo").forEach(function (div) {
      var nombre = div.querySelector('[data-gk="nombre"]').value.trim();
      var tipo = div.querySelector('[data-gk="tipo"]').value;
      var g = { id: div.getAttribute("data-id") || "", nombre: nombre, tipo: tipo,
        requerido: div.querySelector('[data-gk="requerido"]').checked, max: null, valores: [] };
      if (tipo === "multiple") { var m = parseInt(div.querySelector('[data-gk="max"]').value, 10); g.max = m > 0 ? m : null; }
      var usadosV = [];
      div.querySelectorAll(".sa-valores-op li").forEach(function (li) {
        var vn = li.querySelector('[data-vk="nombre"]').value.trim();
        if (!vn) return;
        var extra = aMinimo(li.querySelector('[data-vk="extra"]').value || "0", editando.pais);
        var vid = li.getAttribute("data-id");
        vid = vid && /^[a-z0-9-]{1,40}$/.test(vid) && usadosV.indexOf(vid) === -1 ? (usadosV.push(vid), vid) : unico(slug(vn), usadosV);
        g.valores.push({ id: vid, nombre: vn, extra: extra == null || extra < 0 ? 0 : extra });
      });
      res.push(g);
    });
    // ids de grupo
    res.forEach(function (g) {
      g.id = g.id && /^[a-z0-9-]{1,40}$/.test(g.id) && usadosG.indexOf(g.id) === -1 ? (usadosG.push(g.id), g.id) : unico(slug(g.nombre), usadosG);
    });
    return res;
  }
  /* Guarda en memoria lo escrito antes de volver a dibujar los grupos */
  function sincronizarGrupos() {
    var leidos = leerGruposCrudos();
    grupos = leidos;
  }
  function leerGruposCrudos() {
    var res = [];
    dialogo.querySelectorAll(".sa-grupo").forEach(function (div) {
      var g = { id: div.getAttribute("data-id") || "", nombre: div.querySelector('[data-gk="nombre"]').value, tipo: div.querySelector('[data-gk="tipo"]').value,
        requerido: div.querySelector('[data-gk="requerido"]').checked, max: parseInt(div.querySelector('[data-gk="max"]').value, 10) || null, valores: [] };
      div.querySelectorAll(".sa-valores-op li").forEach(function (li) {
        g.valores.push({ id: li.getAttribute("data-id") || "", nombre: li.querySelector('[data-vk="nombre"]').value,
          extra: aMinimo(li.querySelector('[data-vk="extra"]').value || "0", editando.pais) || 0 });
      });
      res.push(g);
    });
    return res;
  }

  function mensajeEditor(t) { dialogo.querySelector("[data-editor-msg]").textContent = t || ""; }

  function guardarEditor(boton) {
    var f = dialogo.querySelector('[data-form="producto"]');
    var pais = editando.pais;
    var nombre = f.nombre.value.trim();
    if (nombre.length < 2) { mensajeEditor("Escribe el nombre de la comida."); f.nombre.focus(); return; }
    var precio = aMinimo(f.precio.value, pais);
    if (precio == null || precio < 0) { mensajeEditor("Escribe un precio válido."); f.precio.focus(); return; }
    var antes = f.precio_antes.value.trim() ? aMinimo(f.precio_antes.value, pais) : null;
    if (antes != null && antes <= precio) { mensajeEditor("El precio «antes» debe ser mayor que el precio actual (o déjalo vacío)."); f.precio_antes.focus(); return; }
    var piezas = f.piezas.value.trim() ? parseInt(f.piezas.value, 10) : null;
    if (piezas != null && !(piezas >= 1 && piezas <= 500)) { mensajeEditor("Revisa la cantidad de piezas."); return; }
    var ops = leerGrupos();
    for (var i = 0; i < ops.length; i++) {
      if (!ops[i].nombre) { mensajeEditor("Ponle nombre a cada grupo de opciones."); return; }
      if (!ops[i].valores.length) { mensajeEditor("El grupo «" + ops[i].nombre + "» necesita al menos una opción."); return; }
    }
    var id = editando.id;
    if (editando._nuevo) {
      var usados = productos.map(function (x) { return x.id; });
      id = (pais === "VE" ? "ve-" : "") + slug(nombre).slice(0, 50) + "-" + Math.random().toString(36).slice(2, 6);
      while (usados.indexOf(id) !== -1) id = id.slice(0, -4) + Math.random().toString(36).slice(2, 6);
    }
    var datos = {
      id: id, pais: pais, categoria: f.categoria.value, nombre: nombre,
      descripcion: f.descripcion.value.trim(), descripcion_larga: f.descripcion_larga.value.trim(),
      precio: precio, precio_antes: antes, piezas: piezas,
      ingredientes: f.ingredientes.value.split(",").map(function (x) { return x.trim(); }).filter(Boolean),
      etiquetas: Array.prototype.map.call(f.querySelectorAll('[name="etiqueta"]:checked'), function (x) { return x.value; }),
      imagenes: fotos.slice(0, 8), opciones: ops,
      destacado: f.destacado.checked, promo: f.promo.checked, activo: f.activo.checked, demo: f.demo.checked,
      relevancia: editando.relevancia != null ? editando.relevancia : 50
    };
    SA.llamar("guardar_producto", { p: datos }, boton, editando._nuevo ? "«" + nombre + "» agregada a la carta" : "Cambios guardados · ya se ven en la web").then(function (r) {
      if (!r.ok) { mensajeEditor(SA.mensajeError(r.error)); return; }
      if (TAMBU.olvidarContenido) TAMBU.olvidarContenido();
      dialogo.close();
      cargar();
    });
  }

  function nuevoProducto(promo, pais) {
    var cats = listaCategorias();
    abrirEditor({
      id: "", pais: pais || filtro.pais, categoria: promo ? "promociones" : (filtro.cat || (cats[1] || cats[0] || {}).id || "promociones"),
      nombre: "", descripcion: "", descripcion_larga: "", precio: null, precio_antes: null, piezas: null,
      ingredientes: [], etiquetas: [], imagenes: [], opciones: [], destacado: false, promo: !!promo, activo: true, demo: false, relevancia: 50
    }, true);
  }

  /* ---------- Eventos de la lista ---------- */
  raiz.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-pais]")) && t.closest(".sa-segment")) {
      var enPromos = !!t.closest('[data-sa-vista="promociones"]');
      t.parentNode.querySelectorAll("[data-pais]").forEach(function (b) { b.setAttribute("aria-pressed", String(b === t)); });
      if (enPromos) { paisPromos = t.getAttribute("data-pais"); pintarPromos(); }
      else { filtro.pais = t.getAttribute("data-pais"); pintarLista(); }
      return;
    }
    if ((t = e.target.closest("[data-editar]"))) {
      var p = productos.find(function (x) { return x.id === t.getAttribute("data-editar"); });
      if (p) abrirEditor(p, false);
      return;
    }
    if ((t = e.target.closest("[data-visible]"))) {
      var pv = productos.find(function (x) { return x.id === t.getAttribute("data-visible"); });
      if (!pv) return;
      var copia = copiar(pv); copia.activo = !pv.activo;
      SA.llamar("guardar_producto", { p: copia }, t, copia.activo ? "«" + pv.nombre + "» visible en la web" : "«" + pv.nombre + "» escondida de la web").then(function (r) {
        if (r.ok) { if (TAMBU.olvidarContenido) TAMBU.olvidarContenido(); cargar(); }
      });
      return;
    }
    if ((t = e.target.closest("[data-restaurar]"))) {
      SA.llamar("archivar_producto", { p_id: t.getAttribute("data-restaurar"), p_archivar: false }, t, "Comida recuperada (quedó escondida: actívala al editarla)").then(function (r) {
        if (r.ok) cargarArchivados().then(function () { cargar().then(function () { filtro.archivados = true; cargarArchivados().then(pintarLista); }); });
      });
      return;
    }
    if (e.target.closest("[data-nuevo-producto]")) { nuevoProducto(false); return; }
    if (e.target.closest("[data-nueva-promo]")) { nuevoProducto(true, paisPromos); return; }

    // Categorías
    if ((t = e.target.closest("[data-cat-mover]"))) {
      leerCategorias();
      var i = Number(t.closest(".sa-cat").getAttribute("data-i")), d = Number(t.getAttribute("data-cat-mover"));
      var c = categorias.splice(i, 1)[0]; categorias.splice(i + d, 0, c);
      pintarCategorias();
      return;
    }
    if ((t = e.target.closest("[data-cat-quitar]"))) {
      leerCategorias();
      categorias.splice(Number(t.closest(".sa-cat").getAttribute("data-i")), 1);
      pintarCategorias();
      return;
    }
    if (e.target.closest("[data-cat-agregar]")) {
      leerCategorias();
      categorias.push({ id: "", nombre: "Nueva categoría", corto: "Nueva", icono: "rollo", descripcion: "", activa: true });
      pintarCategorias();
      var ult = raiz.querySelector(".sa-cat:last-child [data-c='nombre']");
      if (ult) { ult.focus(); ult.select(); }
      return;
    }
    if ((t = e.target.closest("[data-cat-guardar]"))) {
      leerCategorias();
      var usados = [];
      var limpio = categorias.filter(function (c) { return c.nombre; }).map(function (c) {
        var id = c.id && usados.indexOf(c.id) === -1 ? c.id : unico(slug(c.nombre), usados);
        if (usados.indexOf(id) === -1) usados.push(id);
        return { id: id, nombre: c.nombre.slice(0, 60), corto: (c.corto || c.nombre).slice(0, 24), icono: ICONOS[c.icono] ? c.icono : "rollo",
          descripcion: (c.descripcion || "").slice(0, 140), activa: c.activa !== false };
      });
      if (!limpio.length) { SA.aviso("Debe haber al menos una categoría.", "error"); return; }
      SA.guardarContenido("categorias", limpio, t, "Categorías guardadas").then(function (r) {
        if (r.ok) { categorias = null; pintarFiltros(); pintarCategorias(); pintarLista(); }
      });
    }
  });
  raiz.addEventListener("input", function (e) {
    if (e.target.matches("[data-carta-q]")) { filtro.q = e.target.value; pintarLista(); }
  });
  raiz.addEventListener("change", function (e) {
    if (e.target.matches("[data-carta-cat]")) { filtro.cat = e.target.value; pintarLista(); }
    if (e.target.matches("[data-carta-archivados]")) {
      filtro.archivados = e.target.checked;
      pintarLista();
      if (filtro.archivados && !archivados) cargarArchivados().then(pintarLista).catch(function (err) { SA.aviso(SA.mensajeError(err), "error"); });
    }
  });

  /* ---------- Eventos del editor ---------- */
  dialogo.addEventListener("click", function (e) {
    var t;
    if (e.target === dialogo || e.target.closest("[data-editor-cerrar]")) { dialogo.close(); return; }
    if ((t = e.target.closest("[data-foto-subir]"))) {
      SA.elegirImagen("productos", 1600, t).then(function (url) { if (url) { fotos.push(url); pintarFotos(); } });
      return;
    }
    if ((t = e.target.closest("[data-foto-quitar]"))) { fotos.splice(Number(t.getAttribute("data-foto-quitar")), 1); pintarFotos(); return; }
    if ((t = e.target.closest("[data-foto-portada]"))) {
      var i = Number(t.getAttribute("data-foto-portada"));
      fotos.unshift(fotos.splice(i, 1)[0]); pintarFotos(); return;
    }
    if (e.target.closest("[data-grupo-agregar]")) {
      sincronizarGrupos();
      grupos.push({ id: "", nombre: "", tipo: "unica", requerido: true, max: null, valores: [{ id: "", nombre: "", extra: 0 }] });
      pintarGrupos();
      var ult = dialogo.querySelector(".sa-grupo:last-child [data-gk='nombre']");
      if (ult) ult.focus();
      return;
    }
    if ((t = e.target.closest("[data-grupo-quitar]"))) {
      sincronizarGrupos();
      grupos.splice(Number(t.closest(".sa-grupo").getAttribute("data-g")), 1);
      pintarGrupos(); return;
    }
    if ((t = e.target.closest("[data-valor-agregar]"))) {
      sincronizarGrupos();
      grupos[Number(t.closest(".sa-grupo").getAttribute("data-g"))].valores.push({ id: "", nombre: "", extra: 0 });
      var gi = t.closest(".sa-grupo").getAttribute("data-g");
      pintarGrupos();
      var nuevos = dialogo.querySelectorAll('.sa-grupo[data-g="' + gi + '"] [data-vk="nombre"]');
      if (nuevos.length) nuevos[nuevos.length - 1].focus();
      return;
    }
    if ((t = e.target.closest("[data-valor-quitar]"))) {
      var li = t.closest("li"), div = t.closest(".sa-grupo");
      var idx = Array.prototype.indexOf.call(div.querySelectorAll(".sa-valores-op li"), li);
      sincronizarGrupos();
      grupos[Number(div.getAttribute("data-g"))].valores.splice(idx, 1);
      pintarGrupos(); return;
    }
    if ((t = e.target.closest("[data-editor-archivar]"))) {
      if (!confirm("¿Eliminar «" + editando.nombre + "» de la carta? Dejará de verse y de poder comprarse. Podrás recuperarla desde «Ver eliminados».")) return;
      SA.llamar("archivar_producto", { p_id: editando.id, p_archivar: true }, t, "«" + editando.nombre + "» eliminada de la carta").then(function (r) {
        if (r.ok) { if (TAMBU.olvidarContenido) TAMBU.olvidarContenido(); dialogo.close(); cargar(); }
      });
    }
  });
  dialogo.addEventListener("change", function (e) {
    if (e.target.matches('[data-gk="tipo"]')) {
      var div = e.target.closest(".sa-grupo");
      div.querySelector(".sa-grupo__max").hidden = e.target.value !== "multiple";
    }
    if (e.target.matches("[data-copiar-opciones]") && e.target.value) {
      var o = productos.find(function (x) { return x.id === e.target.value; });
      if (o && (!leerGruposCrudos().length || confirm("¿Reemplazar las opciones actuales por las de «" + o.nombre + "»?"))) {
        grupos = copiar(o.opciones || []); pintarGrupos();
      }
      e.target.value = "";
    }
  });
  dialogo.querySelector('[data-form="producto"]').addEventListener("submit", function (e) {
    e.preventDefault();
    guardarEditor(e.submitter || dialogo.querySelector('button[type="submit"]'));
  });

  /* Accesos rápidos del inicio: «Agregar comida» y «Nueva promoción» */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-nuevo]");
    if (!a) return;
    var tipo = a.getAttribute("data-nuevo");
    setTimeout(function () {
      var abrir = function () { nuevoProducto(tipo === "promo", "CL"); };
      productos.length ? abrir() : cargar().then(abrir);
    }, 50);
  });

  SA.registrar("carta", { entrar: cargar });
  SA.registrar("promociones", { entrar: cargar });
})();
