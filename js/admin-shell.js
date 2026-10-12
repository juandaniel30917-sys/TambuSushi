/* ==========================================================================
   TAMBÚ SUSHI — PANEL DEL SUPERADMINISTRADOR · ESTRUCTURA (admin-shell.js)
   --------------------------------------------------------------------------
   - Barra lateral «Modo superadministrador» (también en Pedidos).
   - Acceso: solo una cuenta superadministradora. La web lo comprueba para
     mostrar el panel, y la base de datos lo vuelve a comprobar en CADA cambio.
   - Navegación por secciones (admin.html#carta, #textos, #pagos…).
   - Herramientas comunes: avisos, guardar, subir fotos.
   ========================================================================== */

(function () {
  var I = TAMBU.icono, E = TAMBU.escapar, db = TAMBU.db;
  var pagina = document.body.getAttribute("data-page");
  var enPanel = pagina === "admin";
  var SA = TAMBU.sa = TAMBU.sa || {};
  SA.db = db;
  SA.modulos = SA.modulos || {};
  var actual = null;
  SA.registrar = function (id, modulo) {
    SA.modulos[id] = modulo;
    // Si esa sección ya está abierta (el módulo cargó después), se inicia ahora
    if (actual === id && SA.usuario && modulo.entrar) modulo.entrar();
  };

  var SECCIONES = [
    { id: "inicio", texto: "Inicio", icono: "casa" },
    { id: "pedidos", texto: "Pedidos", icono: "recibo", href: "admin-pedidos.html" },
    { grupo: "Tienda" },
    { id: "carta", texto: "Carta y precios", icono: "rollo" },
    { id: "promociones", texto: "Promociones", icono: "etiqueta" },
    { id: "pagos", texto: "Medios de pago", icono: "tarjeta" },
    { id: "sucursales", texto: "Sucursales", icono: "ubicacion" },
    { id: "puntos", texto: "Puntos y tasa Bs", icono: "estrella" },
    { grupo: "Contenido web" },
    { id: "textos", texto: "Textos", icono: "texto" },
    { id: "fotos", texto: "Fotos", icono: "imagen" },
    { id: "menu", texto: "Menú", icono: "menu" },
    { id: "fuentes", texto: "Fuentes", icono: "fuente" },
    { grupo: "Cuenta" },
    { id: "equipo", texto: "Equipo y accesos", icono: "equipo" },
    { id: "historial", texto: "Historial", icono: "reloj" }
  ];
  var TITULOS = {};
  SECCIONES.forEach(function (s) { if (s.id) TITULOS[s.id] = s.texto; });
  TITULOS.inicio = "Panel de administración";

  /* ---------- Barra lateral ---------- */
  function htmlBarra(actual, correo) {
    return '<div class="sa-side__brand">' +
        '<a href="admin.html#inicio" aria-label="Inicio del panel"><img src="assets/images/logo-tipografico-mini.png" alt="Tambú Sushi" width="92" height="92"></a>' +
        '<span class="sa-side__badge">' + I("candado") + "Superadministrador</span>" +
      "</div>" +
      '<nav class="sa-nav" aria-label="Secciones del panel">' +
        SECCIONES.map(function (s) {
          if (s.grupo) return '<p class="sa-nav__grupo">' + s.grupo + "</p>";
          var href = s.href || (enPanel ? "#" + s.id : "admin.html#" + s.id);
          var activo = s.id === actual;
          return '<a class="sa-nav__link' + (activo ? " is-active" : "") + '" href="' + href + '" data-sa-link="' + s.id + '"' +
            (activo ? ' aria-current="page"' : "") + ">" + I(s.icono) + "<span>" + s.texto + "</span></a>";
        }).join("") +
      "</nav>" +
      '<div class="sa-side__pie">' +
        '<a class="sa-nav__link" href="index.html" target="_blank" rel="noopener">' + I("externo") + "<span>Ver sitio web</span></a>" +
        '<div class="sa-side__user">' + I("usuario") + '<span><b>Superadministrador</b><small data-sa-correo>' + E(correo || "") + "</small></span></div>" +
        '<button class="sa-nav__link sa-nav__salir" type="button" data-sa-salir>' + I("salir") + "<span>Cerrar sesión</span></button>" +
      "</div>";
  }

  function pintarBarra(actual, correo) {
    var lado = document.querySelector("[data-sa-side]");
    if (!lado) {
      // En Pedidos: se agrega la barra y se oculta la cabecera pública
      lado = document.createElement("aside");
      lado.className = "sa-side";
      lado.id = "sa-side";
      lado.setAttribute("data-sa-side", "");
      lado.setAttribute("aria-label", "Panel del superadministrador");
      document.body.prepend(lado);
      var fondo = document.createElement("div");
      fondo.className = "sa-overlay"; fondo.hidden = true; fondo.setAttribute("data-sa-cerrar", "");
      document.body.appendChild(fondo);
      var boton = document.createElement("button");
      boton.className = "sa-fab"; boton.type = "button";
      boton.setAttribute("data-sa-abrir", ""); boton.setAttribute("aria-controls", "sa-side"); boton.setAttribute("aria-expanded", "false");
      boton.innerHTML = I("menu") + "<span>Panel</span>";
      document.body.appendChild(boton);
      document.documentElement.classList.add("sa-con-barra");
    }
    lado.innerHTML = htmlBarra(actual, correo);
  }

  /* Menú lateral en el teléfono */
  function abrirLado(si) {
    var lado = document.querySelector("[data-sa-side]");
    var fondo = document.querySelector("[data-sa-cerrar]");
    if (!lado) return;
    lado.classList.toggle("is-open", si);
    if (fondo) fondo.hidden = !si;
    document.querySelectorAll("[data-sa-abrir]").forEach(function (b) { b.setAttribute("aria-expanded", String(si)); });
    document.body.classList.toggle("no-scroll", si);
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-sa-abrir]")) { abrirLado(true); return; }
    if (e.target.closest("[data-sa-cerrar]")) { abrirLado(false); return; }
    if (e.target.closest(".sa-nav__link[href]")) abrirLado(false);
    if (e.target.closest("[data-sa-salir]")) {
      db.auth.signOut().then(function () {
        try { sessionStorage.clear(); } catch (err) { /* nada */ }
        location.href = "index.html";
      });
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") abrirLado(false); });

  /* ---------- Avisos y llamadas al servidor ---------- */
  SA.fecha = function (iso) {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }); } catch (e) { return iso; }
  };
  SA.aviso = function (texto, tipo) {
    var z = document.querySelector("[data-config-msg]");
    if (!z) { if (texto) TAMBU.toast(texto); return; }
    z.innerHTML = texto ? '<div class="demo-notice ' + (tipo === "error" ? "demo-notice--error" : "demo-notice--ok") + '" role="status" style="margin-bottom:16px">' +
      I(tipo === "error" ? "info" : "check") + "<p>" + E(texto) + "</p></div>" : "";
    if (texto) z.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  function mensajeError(err) {
    var m = (err && (err.message || err.details)) || "";
    if (/permission denied|42501|superadministrador/i.test(m)) return "Tu sesión no tiene permiso para este cambio. Vuelve a iniciar sesión con la cuenta de superadministrador.";
    if (/JWT|expired/i.test(m)) return "Tu sesión expiró. Vuelve a iniciar sesión.";
    return TAMBU.errorAmigable ? TAMBU.errorAmigable(err) : (m || "Ocurrió un error.");
  }
  SA.mensajeError = mensajeError;
  function cargando(boton, si) { if (boton) { boton.disabled = si; boton.classList.toggle("is-loading", si); } }
  /* Llama a una función protegida de la base de datos. Devuelve { ok, data } */
  SA.llamar = function (fn, args, boton, okTexto) {
    cargando(boton, true);
    return db.rpc(fn, args || {}).then(function (r) {
      cargando(boton, false);
      if (r.error) throw r.error;
      if (okTexto) { SA.aviso(""); TAMBU.toast(okTexto); }
      return { ok: true, data: r.data };
    }).catch(function (err) {
      cargando(boton, false);
      SA.aviso(mensajeError(err), "error");
      return { ok: false, error: err };
    });
  };

  /* Estado general (pagos, sucursales, puntos, historial) */
  SA.recargarEstado = function () {
    return db.rpc("estado_configuracion").then(function (r) {
      if (r.error) throw r.error;
      SA.estado = r.data;
      document.dispatchEvent(new CustomEvent("sa:estado"));
      return SA.estado;
    }).catch(function (err) { SA.aviso(mensajeError(err), "error"); });
  };

  /* Contenido editable (textos, fotos, menú, fuentes...) siempre recién leído */
  SA.cargarContenido = function () {
    return db.rpc("contenido_publico").then(function (r) {
      if (r.error) throw r.error;
      SA.contenido = (r.data && r.data.contenido) || {};
      return SA.contenido;
    });
  };
  SA.guardarContenido = function (clave, valor, boton, okTexto) {
    return SA.llamar("guardar_contenido", { p_clave: clave, p_valor: valor }, boton, okTexto === null ? null : (okTexto || "Cambios guardados · ya se ven en la web")).then(function (res) {
      if (res.ok) {
        SA.contenido = SA.contenido || {};
        SA.contenido[clave] = valor;
        if (TAMBU.olvidarContenido) TAMBU.olvidarContenido();
      }
      return res;
    });
  };

  /* ---------- Fotos: se achican en el navegador y se suben a la carpeta «tienda» ---------- */
  function achicar(archivo, maxLado) {
    return new Promise(function (ok, mal) {
      var url = URL.createObjectURL(archivo);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.max(1, Math.round(img.naturalWidth * escala)), h = Math.max(1, Math.round(img.naturalHeight * escala));
        var c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        c.toBlob(function (blob) {
          if (blob && blob.type === "image/webp") return ok({ blob: blob, ext: "webp" });
          c.toBlob(function (jpg) { jpg ? ok({ blob: jpg, ext: "jpg" }) : mal(new Error("No se pudo procesar la foto.")); }, "image/jpeg", 0.85);
        }, "image/webp", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); mal(new Error("Ese archivo no parece una foto (usa JPG, PNG o WEBP).")); };
      img.src = url;
    });
  }
  SA.subirImagen = function (archivo, carpeta, maxLado) {
    if (!archivo || !/^image\//.test(archivo.type)) return Promise.reject(new Error("Elige una foto (JPG, PNG o WEBP)."));
    if (archivo.size > 25 * 1024 * 1024) return Promise.reject(new Error("La foto es muy pesada (máximo 25 MB)."));
    return achicar(archivo, maxLado || 1600).then(function (r) {
      var ruta = (carpeta || "general") + "/" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8) + "." + r.ext;
      return db.storage.from("tienda").upload(ruta, r.blob, { contentType: r.blob.type, cacheControl: "31536000", upsert: false })
        .then(function (res) {
          if (res.error) throw res.error;
          return db.storage.from("tienda").getPublicUrl(ruta).data.publicUrl;
        });
    });
  };
  /* Abre el selector de archivos y sube la foto elegida */
  SA.elegirImagen = function (carpeta, maxLado, boton) {
    var input = document.querySelector("[data-subir-archivo]");
    if (!input) return Promise.resolve(null);
    return new Promise(function (ok) {
      input.value = "";
      input.onchange = function () {
        var f = input.files && input.files[0];
        if (!f) { ok(null); return; }
        cargando(boton, true);
        SA.subirImagen(f, carpeta, maxLado).then(function (url) { cargando(boton, false); ok(url); })
          .catch(function (err) { cargando(boton, false); SA.aviso(err.message || mensajeError(err), "error"); ok(null); });
      };
      input.click();
    });
  };

  /* ---------- Vistas y secciones ---------- */
  var vistas = {};
  document.querySelectorAll("[data-vista]").forEach(function (v) { vistas[v.getAttribute("data-vista")] = v; });
  function mostrarVista(n) {
    Object.keys(vistas).forEach(function (k) { vistas[k].hidden = k !== n; });
    if (n) document.querySelectorAll("[data-sa-vista]").forEach(function (s) { s.hidden = true; });
  }

  var correoActual = "";
  function irA(id) {
    if (!SA.modulos[id] && !document.querySelector('[data-sa-vista="' + id + '"]')) id = "inicio";
    actual = id;
    mostrarVista(null);
    document.querySelectorAll("[data-sa-vista]").forEach(function (s) { s.hidden = s.getAttribute("data-sa-vista") !== id; });
    var t = document.querySelector("[data-sa-titulo]");
    if (t) t.textContent = TITULOS[id] || "Panel";
    document.title = (TITULOS[id] || "Panel") + " · Tambú Sushi";
    document.querySelectorAll("[data-sa-link]").forEach(function (a) {
      var si = a.getAttribute("data-sa-link") === id;
      a.classList.toggle("is-active", si);
      if (si) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    SA.aviso("");
    var m = SA.modulos[id];
    if (m && m.entrar) m.entrar();
    window.scrollTo(0, 0);
  }
  SA.irA = function (id) { if (location.hash !== "#" + id) location.hash = id; else irA(id); };

  /* ---------- Acceso: solo superadministrador ---------- */
  var iniciadoPara = null;
  function revisar(session) {
    var u = session && session.user;
    if (!u) {
      iniciadoPara = null;
      if (enPanel) mostrarVista("login");
      return;
    }
    if (iniciadoPara === u.id) return;
    iniciadoPara = u.id;
    correoActual = u.email || "";
    db.rpc("es_superadmin").then(function (r) {
      if (r.error || r.data !== true) { if (enPanel) mostrarVista("sin-permiso"); return; }
      SA.usuario = u;
      if (!enPanel) { pintarBarra("pedidos", correoActual); return; }
      pintarBarra(null, correoActual);
      SA.recargarEstado().then(function () {
        irA((location.hash || "#inicio").slice(1));
      });
    });
  }

  if (enPanel) {
    if (!db) { mostrarVista("sin-conexion"); return; }
    window.addEventListener("hashchange", function () { if (SA.usuario) irA(location.hash.slice(1) || "inicio"); });
    var online = document.querySelector("[data-sa-online]");
    if (online) online.classList.toggle("is-off", !navigator.onLine);
  }
  if (!db) return;
  db.auth.getSession().then(function (r) { revisar(r.data.session); });
  db.auth.onAuthStateChange(function (_e, session) { setTimeout(function () { revisar(session); }, 0); });
})();
