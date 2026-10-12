/* ==========================================================================
   TAMBÚ SUSHI — PANEL · INICIO, PAGOS, SUCURSALES, PUNTOS, EQUIPO (admin-config.js)
   --------------------------------------------------------------------------
   Seguridad:
   - Nada se guarda en el navegador ni en el HTML. Cada cambio va a una función
     de la base de datos que comprueba que la cuenta sea superadministradora.
   - Las claves de Flow y de Mercado Pago se guardan cifradas (Supabase Vault)
     y son de solo escritura: después nadie puede volver a leerlas desde la web.
   - Cada cambio queda en el historial (quién, qué y cuándo).
   ========================================================================== */

(function () {
  var raiz = document.querySelector("[data-config]");
  if (!raiz || !TAMBU.sa) return;
  var SA = TAMBU.sa, E = TAMBU.escapar, I = TAMBU.icono;
  function $(sel) { return raiz.querySelector(sel); }
  function recargar() { return SA.recargarEstado().then(pintarTodo); }
  function llamar(fn, args, boton, ok) {
    return SA.llamar(fn, args, boton, ok).then(function (r) { if (r.ok) return recargar().then(function () { return r; }); return r; });
  }

  var NOMBRES = { flow_claves: "Claves de Flow guardadas", flow_desconectado: "Flow desconectado", ajustes: "Modo de Flow", medios_pago: "Medios de pago",
    mp_claves: "Claves de Mercado Pago guardadas", mp_desconectado: "Mercado Pago desconectado", sucursal: "Sucursal", puntos: "Tambú Puntos",
    tasa_bs: "Tasa del bolívar", equipo_asignar: "Acceso otorgado", equipo_quitar: "Acceso quitado", producto: "Comida guardada",
    producto_archivado: "Comida eliminada", producto_restaurado: "Comida recuperada", contenido: "Contenido de la web" };
  var SECCION = { textos: "textos", imagenes: "fotos", menu: "menú", fuentes: "fuentes", categorias: "categorías", marca: "Nosotros",
    negocio: "contacto", horario: "horario", faq: "preguntas frecuentes", etiquetas: "etiquetas" };
  function lineaHistorial(h) {
    var d = h.detalle || {};
    var extra = d.nombre || d.email || (d.seccion ? SECCION[d.seccion] || d.seccion : "") || d.id || d.pais || (d.modo ? "modo " + d.modo : "") || (d.tasa != null ? "Bs " + d.tasa : "");
    return "<li><span>" + E(NOMBRES[h.accion] || h.accion) + (extra ? ' <small class="muted">· ' + E(String(extra)) + "</small>" : "") +
      '<br><small class="muted">' + E(h.por || "") + "</small></span><span><small>" + SA.fecha(h.fecha) + "</small></span></li>";
  }

  /* ---------- Inicio ---------- */
  function pintarInicio() {
    var s = SA.estado || {}, r = s.resumen || {};
    var nombre = (SA.usuario && SA.usuario.user_metadata && (SA.usuario.user_metadata.nombre || SA.usuario.user_metadata.full_name)) || "";
    $("[data-sa-saludo]").textContent = "Hola" + (nombre ? ", " + nombre.split(" ")[0] : "");
    function stat(n, t, href) { return '<a class="sa-stat" href="' + href + '"><b>' + n + "</b><span>" + t + "</span></a>"; }
    $("[data-sa-stats]").innerHTML =
      stat(r.pedidos_hoy || 0, "Pedidos hoy", "admin-pedidos.html") +
      stat(r.pendientes || 0, "En curso", "admin-pedidos.html") +
      stat(TAMBU.precioCLP(r.ventas_hoy || 0), "Ventas de hoy (Chile)", "admin-pedidos.html") +
      stat(r.productos || 0, "Comidas visibles", "#carta");
    function fila(nombre, ok, texto) {
      return "<li><span>" + nombre + '</span><span class="badge ' + (ok ? "badge--wasabi" : "badge--neutro") + '">' + texto + "</span></li>";
    }
    $("[data-sa-pagos-resumen]").innerHTML =
      fila("Webpay · Flow", s.flow_configurado && s.flow_activo, !s.flow_configurado ? "Sin claves" : !s.flow_activo ? "Pausado" : s.flow_modo === "produccion" ? "Activo · real" : "Activo · pruebas") +
      fila("Efectivo (prueba)", s.efectivo_prueba, s.efectivo_prueba ? "Activo" : "Apagado") +
      fila("Mercado Pago", false, s.mp_configurado ? "Claves guardadas" : "Sin conectar");
    $("[data-sa-ultimos]").innerHTML = (s.historial || []).slice(0, 5).map(lineaHistorial).join("") || '<li class="muted">Sin cambios todavía.</li>';
  }

  /* ---------- Pagos ---------- */
  function pintarPagos() {
    var s = SA.estado || {};
    var fm = $('[data-form="medios"]');
    fm.webpay.checked = s.flow_activo !== false;
    fm.efectivo.checked = !!s.efectivo_prueba;

    $("[data-flow-estado]").innerHTML = s.flow_configurado
      ? '<div class="config-status config-status--ok">' + I("check") + "<div><b>Flow conectado</b><small>" +
          "API Key terminada en ····" + E(s.flow_api_key_termina_en || "") + " · modo " + (s.flow_modo === "produccion" ? "<b>REAL</b>" : "pruebas") +
          (s.flow_actualizado_at ? " · " + SA.fecha(s.flow_actualizado_at) : "") + "</small></div>" +
          '<button class="btn btn--ghost btn--sm" type="button" data-desconectar="flow">Desconectar</button></div>'
      : '<div class="config-status">' + I("info") + "<div><b>Flow no está conectado</b><small>Pega tus claves de Flow (en tu cuenta Flow: Integraciones → Datos de integración).</small></div></div>";
    $("#flow-modo").value = s.flow_modo || "sandbox";
    var fmodo = $('[data-form="flow-modo"]');
    fmodo.hidden = !s.flow_configurado;
    fmodo.modo.value = s.flow_modo || "sandbox";

    $("[data-mp-estado]").innerHTML = s.mp_configurado
      ? '<div class="config-status config-status--ok">' + I("check") + "<div><b>Claves de Mercado Pago guardadas</b><small>" +
          "Public Key terminada en ····" + E(s.mp_public_key_termina_en || "") + " · modo " + (s.mp_modo === "produccion" ? "<b>REAL</b>" : "pruebas") +
          (s.mp_actualizado_at ? " · " + SA.fecha(s.mp_actualizado_at) : "") + ". El cobro con Mercado Pago se activará en una próxima actualización.</small></div>" +
          '<button class="btn btn--ghost btn--sm" type="button" data-desconectar="mp">Desconectar</button></div>'
      : '<div class="config-status">' + I("info") + "<div><b>Mercado Pago sin conectar</b><small>Puedes dejar tus credenciales guardadas desde ya. El botón de pago aparecerá cuando activemos la integración.</small></div></div>";
    $("#mp-modo").value = s.mp_modo || "sandbox";
  }

  /* ---------- Sucursales ---------- */
  function pintarSucursales() {
    $("[data-sucursales]").innerHTML = ((SA.estado || {}).sucursales || []).map(function (b) {
      return '<form class="config-sucursal" data-form="sucursal" data-id="' + E(b.id) + '">' +
        '<div class="config-sucursal__nombre"><b>' + E(b.nombre) + "</b><small>" + (b.pais === "VE" ? "Venezuela" : "Chile") + "</small></div>" +
        '<label><span class="visually-hidden">WhatsApp</span><input class="input" name="whatsapp" inputmode="numeric" placeholder="WhatsApp (ej. 56912345678)" value="' + E(b.whatsapp || "") + '"></label>' +
        '<label><span class="visually-hidden">Teléfono visible</span><input class="input" name="telefono" placeholder="Teléfono visible (ej. +56 9 1234 5678)" value="' + E(b.telefono || "") + '"></label>' +
        '<label class="config-check"><input type="checkbox" name="activa"' + (b.activa ? " checked" : "") + "> Abierta en la web</label>" +
        (b.pais === "CL" ? '<label class="config-check"><input type="checkbox" name="pago"' + (b.acepta_pago_en_linea ? " checked" : "") + "> Pago en línea</label>" : '<span class="muted config-check">Sin pago en línea</span>') +
        '<button class="btn btn--outline btn--sm" type="submit">Guardar</button>' +
      "</form>";
    }).join("");
  }

  /* ---------- Puntos y tasa ---------- */
  function pintarPuntos() {
    var s = SA.estado || {};
    $("[data-puntos]").innerHTML = (s.puntos || []).map(function (p) {
      var ve = p.pais === "VE";
      var base = ve ? (p.monto_base / 100) : p.monto_base;
      return '<form class="form-grid config-puntos" data-form="puntos" data-pais="' + p.pais + '">' +
        "<b>" + (ve ? "Venezuela" : "Chile") + "</b>" +
        '<label class="choice"><input type="checkbox" name="activo"' + (p.activo ? " checked" : "") + '><span class="choice__mark"></span><span class="choice__text"><b>Programa activo</b></span></label>' +
        '<div class="config-puntos__regla">' +
          '<input class="input" name="puntos" type="number" min="0" max="1000" step="1" value="' + p.puntos_por_monto + '" aria-label="Puntos">' +
          "<span>punto(s) por cada</span>" +
          '<input class="input" name="base" type="number" min="' + (ve ? "0.01" : "1") + '" step="' + (ve ? "0.01" : "1") + '" value="' + base + '" aria-label="Monto">' +
          "<span>" + (ve ? "US$" : "pesos") + "</span>" +
        "</div>" +
        '<button class="btn btn--outline btn--sm" type="submit">Guardar ' + (ve ? "Venezuela" : "Chile") + "</button>" +
      "</form>";
    }).join("");
    var t = s.tasa_bs || {};
    $("#tasa-bs").value = t.valor != null ? t.valor : "";
    $("[data-tasa-fecha]").textContent = t.actualizada ? "Última actualización: " + SA.fecha(t.actualizada) : "Aún sin tasa: la web muestra «Bs a la tasa del día».";
  }

  /* ---------- Equipo ---------- */
  function cargarEquipo() {
    var s = SA.estado || {};
    var sel = $('[data-form="equipo"] [name="sucursal"]');
    if (!sel.options.length) sel.innerHTML = (s.sucursales || []).map(function (b) { return '<option value="' + E(b.id) + '">' + E(b.nombre) + "</option>"; }).join("");
    SA.db.rpc("listar_equipo").then(function (r) {
      if (r.error) { SA.aviso(SA.mensajeError(r.error), "error"); return; }
      var eq = r.data || {}, suc = {};
      (s.sucursales || []).forEach(function (b) { suc[b.id] = b.nombre; });
      var yo = SA.usuario && SA.usuario.id;
      var filas = [];
      (eq.admins || []).forEach(function (a) {
        filas.push("<li><span><b>" + E(a.email) + "</b><br><small class=\"muted\">" + (a.rol === "superadmin" ? "Superadministrador" : "Administrador") + (a.user_id === yo ? " · tú" : "") + "</small></span>" +
          (a.user_id === yo ? "" : '<button class="remove-btn" type="button" data-quitar="' + a.user_id + '" data-rol="' + a.rol + '">Quitar</button>') + "</li>");
      });
      (eq.personal || []).forEach(function (p) {
        filas.push("<li><span><b>" + E(p.email) + "</b><br><small class=\"muted\">Personal · " + E(suc[p.sucursal_id] || p.sucursal_id) + "</small></span>" +
          '<button class="remove-btn" type="button" data-quitar="' + p.user_id + '" data-rol="personal" data-sucursal="' + E(p.sucursal_id) + '">Quitar</button></li>');
      });
      $("[data-equipo]").innerHTML = '<ul class="kv" style="margin-top:16px">' + (filas.join("") || '<li class="muted">Sin equipo asignado.</li>') + "</ul>";
    });
  }

  function pintarHistorial() {
    $("[data-historial]").innerHTML = ((SA.estado || {}).historial || []).map(lineaHistorial).join("") || '<li class="muted">Sin cambios registrados todavía.</li>';
  }

  function pintarTodo() {
    if (!SA.estado) return;
    pintarInicio(); pintarPagos(); pintarSucursales(); pintarPuntos(); pintarHistorial();
  }
  document.addEventListener("sa:estado", pintarTodo);
  if (SA.estado) pintarTodo();

  SA.registrar("inicio", { entrar: function () { SA.recargarEstado(); } });
  SA.registrar("pagos", { entrar: pintarPagos });
  SA.registrar("sucursales", { entrar: pintarSucursales });
  SA.registrar("puntos", { entrar: pintarPuntos });
  SA.registrar("equipo", { entrar: cargarEquipo });
  SA.registrar("historial", { entrar: function () { SA.recargarEstado(); } });

  /* ---------- Formularios ---------- */
  raiz.addEventListener("submit", function (e) {
    var f = e.target.closest("[data-form]");
    if (!f) return;
    var tipo = f.getAttribute("data-form");
    var boton = f.querySelector('button[type="submit"]');
    var s = SA.estado || {};

    if (tipo === "medios") {
      e.preventDefault();
      if (f.webpay.checked && !s.flow_configurado) SA.aviso("Webpay quedará activo, pero los clientes no podrán pagar hasta que guardes las claves de Flow.", "ok");
      llamar("actualizar_medios_pago", { p_efectivo_prueba: f.efectivo.checked, p_flow_activo: f.webpay.checked }, boton, "Medios de pago actualizados");
      return;
    }
    if (tipo === "flow") {
      e.preventDefault();
      var api = f.api.value.trim(), sec = f.secret.value.trim();
      if (api.length < 10 || sec.length < 10) { SA.aviso("Pega la API Key y la Secret Key completas.", "error"); return; }
      if (f.modo.value === "produccion" && !confirm("Modo REAL: los clientes pagarán dinero de verdad. ¿Continuar?")) return;
      f.api.value = ""; f.secret.value = "";   // se borran del formulario de inmediato
      llamar("guardar_claves_flow", { p_api_key: api, p_secret_key: sec, p_modo: f.modo.value }, boton, "Claves de Flow guardadas de forma segura");
      return;
    }
    if (tipo === "flow-modo") {
      e.preventDefault();
      if (f.modo.value === "produccion" && s.flow_modo !== "produccion" && !confirm("Modo REAL: los clientes pagarán dinero de verdad. ¿Continuar?")) return;
      llamar("actualizar_ajustes", { p_efectivo_prueba: !!s.efectivo_prueba, p_flow_modo: f.modo.value }, boton, "Modo de Flow actualizado");
      return;
    }
    if (tipo === "mp") {
      e.preventDefault();
      var tok = f.token.value.trim(), pub = f.publica.value.trim();
      if (!/^(APP_USR|TEST)-/.test(tok) || !/^(APP_USR|TEST)-/.test(pub)) { SA.aviso("Las credenciales de Mercado Pago empiezan con APP_USR- (reales) o TEST- (de prueba).", "error"); return; }
      f.token.value = "";
      llamar("guardar_claves_mp", { p_access_token: tok, p_public_key: pub, p_modo: f.modo.value }, boton, "Claves de Mercado Pago guardadas de forma segura")
        .then(function (r) { if (r.ok) f.publica.value = ""; });
      return;
    }
    if (tipo === "puntos") {
      e.preventDefault();
      var ve = f.getAttribute("data-pais") === "VE";
      var base = parseFloat(f.base.value);
      var montoBase = ve ? Math.round(base * 100) : Math.round(base);
      if (!(montoBase >= 1)) { SA.aviso("Ingresa un monto válido.", "error"); return; }
      llamar("actualizar_puntos", { p_pais: f.getAttribute("data-pais"), p_activo: f.activo.checked, p_puntos_por_monto: parseInt(f.puntos.value, 10) || 0, p_monto_base: montoBase }, boton, "Programa de puntos actualizado");
      return;
    }
    if (tipo === "tasa") {
      e.preventDefault();
      var v = f.tasa.value.trim();
      llamar("actualizar_tasa_bs", { p_tasa: v === "" ? null : parseFloat(v) }, boton, "Tasa actualizada");
      return;
    }
    if (tipo === "sucursal") {
      e.preventDefault();
      llamar("actualizar_sucursal", {
        p_id: f.getAttribute("data-id"), p_whatsapp: f.whatsapp.value, p_telefono: f.telefono.value,
        p_activa: f.activa.checked, p_pago_en_linea: f.pago ? f.pago.checked : false
      }, boton, "Sucursal guardada");
      return;
    }
    if (tipo === "equipo") {
      e.preventDefault();
      var rol = f.rol.value;
      if (rol === "superadmin" && !confirm("El superadministrador puede cambiar TODO, incluidas las claves de pago. ¿Dar este acceso a " + f.email.value + "?")) return;
      SA.llamar("asignar_rol", { p_email: f.email.value.trim(), p_rol: rol, p_sucursal: rol === "personal" ? f.sucursal.value : null }, boton, "Acceso otorgado")
        .then(function (r) { if (r.ok) { f.email.value = ""; cargarEquipo(); } });
    }
  });

  raiz.addEventListener("change", function (e) {
    if (e.target.name === "rol" && e.target.closest('[data-form="equipo"]')) {
      $("[data-equipo-sucursal]").hidden = e.target.value !== "personal";
    }
  });

  raiz.addEventListener("click", function (e) {
    var d = e.target.closest("[data-desconectar]");
    if (d) {
      var mp = d.getAttribute("data-desconectar") === "mp";
      if (!confirm(mp ? "¿Desconectar Mercado Pago? Se borrarán las claves guardadas." : "¿Desconectar Flow? Los clientes no podrán pagar con Webpay hasta que guardes claves nuevas.")) return;
      llamar(mp ? "desconectar_mp" : "desconectar_flow", {}, null, mp ? "Mercado Pago desconectado" : "Flow desconectado");
      return;
    }
    var q = e.target.closest("[data-quitar]");
    if (q) {
      if (!confirm("¿Quitar este acceso?")) return;
      SA.llamar("quitar_rol", { p_user_id: q.getAttribute("data-quitar"), p_rol: q.getAttribute("data-rol"), p_sucursal: q.getAttribute("data-sucursal") || null }, null, "Acceso quitado")
        .then(function (r) { if (r.ok) cargarEquipo(); });
    }
  });
})();
