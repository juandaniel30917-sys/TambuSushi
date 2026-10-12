/* ==========================================================================
   TAMBÚ SUSHI — MI CUENTA (account.js)
   --------------------------------------------------------------------------
   Cuentas reales con Supabase Auth:
   - Registro (con confirmación por correo), inicio de sesión, recuperación
     y cambio de contraseña. Las contraseñas las maneja Supabase: este sitio
     nunca las guarda.
   - Panel: saldo de puntos (calculado en la base de datos), movimientos,
     recompensas, canje, pedidos y edición del perfil.
   ========================================================================== */

(function () {
  var E = TAMBU.escapar, I = TAMBU.icono;
  var db = TAMBU.db;
  // Los puntos van separados por país: se muestra el saldo del país de la sucursal activa
  var PAIS = TAMBU.pais || "CL";
  var NOMBRE_PAIS = TAMBU.paises && TAMBU.paises[PAIS] ? TAMBU.paises[PAIS].nombre : "Chile";
  var vistas = {};
  document.querySelectorAll("[data-vista]").forEach(function (v) { vistas[v.getAttribute("data-vista")] = v; });

  function mostrar(nombre) {
    Object.keys(vistas).forEach(function (k) { vistas[k].hidden = k !== nombre; });
  }

  function aviso(zona, texto, tipo) {
    if (!zona) return;
    zona.innerHTML = texto
      ? '<div class="demo-notice' + (tipo === "error" ? " demo-notice--error" : tipo === "ok" ? " demo-notice--ok" : "") + '" role="status">' +
        I(tipo === "ok" ? "check" : "info") + "<p>" + E(texto) + "</p></div>"
      : "";
  }

  function ocupado(form, si) {
    var b = form.querySelector('button[type="submit"]');
    if (!b) return;
    if (si) { b.dataset.texto = b.textContent; b.textContent = "Un momento…"; b.disabled = true; b.classList.add("is-loading"); }
    else { b.textContent = b.dataset.texto || b.textContent; b.disabled = false; b.classList.remove("is-loading"); }
  }

  function validar(form) {
    var ok = true;
    form.querySelectorAll("input[required], input[minlength]").forEach(function (inp) {
      var v = inp.value.trim();
      var valido = (!inp.required || v !== "") &&
        (inp.type !== "email" || !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) &&
        (inp.minLength <= 0 || !v || inp.value.length >= inp.minLength);
      var f = inp.closest(".field");
      if (f) f.classList.toggle("is-invalid", !valido);
      if (!valido && ok) { inp.focus(); ok = false; }
    });
    return ok;
  }

  document.addEventListener("input", function (e) {
    var f = e.target.closest(".field.is-invalid");
    if (f) f.classList.remove("is-invalid");
  });

  /* URL a la que vuelven los correos de confirmación y recuperación.
     Solo funciona si el sitio se abre con http(s) (servidor local o publicado). */
  function urlRetorno() {
    return /^https?:/.test(location.protocol) ? location.origin + location.pathname : undefined;
  }

  /* ---------- Pestañas ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function activar(nombre, enfocar) {
    tabs.forEach(function (t) {
      var activo = t.id === "tab-" + nombre;
      t.setAttribute("aria-selected", String(activo));
      t.tabIndex = activo ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !activo;
      if (activo && enfocar) t.focus();
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { activar(t.id.replace("tab-", "")); });
    t.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var sig = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      activar(sig.id.replace("tab-", ""), true);
    });
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-ir-tab]");
    if (b) activar(b.getAttribute("data-ir-tab"), true);
  });
  var h = location.hash.replace("#", "");
  if (["ingresar", "registro", "recuperar"].indexOf(h) !== -1) activar(h);

  /* Error al volver de Google (por ejemplo, si el cliente canceló) */
  var errorRetorno = new URLSearchParams(location.search + "&" + location.hash.replace(/^#/, "")).get("error_description");
  if (errorRetorno) {
    setTimeout(function () {
      aviso(document.querySelector("[data-msg-google]"), "No se pudo entrar con Google: " + errorRetorno.replace(/\+/g, " "), "error");
    }, 0);
    history.replaceState(null, "", location.pathname);
  }

  /* ---------- Sin conexión ---------- */
  if (!db) { mostrar("sin-conexion"); return; }

  /* ---------- Reglas del programa y recompensas (públicas) ---------- */
  var reglas = null, recompensas = [];

  function pintarEstadoPrograma() {
    document.querySelectorAll("[data-estado-programa]").forEach(function (el) {
      if (!reglas) { el.innerHTML = I("info") + "<p>No se pudieron cargar las reglas del programa.</p>"; return; }
      var regla = reglas.puntos_por_monto + (reglas.puntos_por_monto === 1 ? " punto" : " puntos") +
        " por cada " + TAMBU.montoPuntosTexto(reglas.monto_base) + (TAMBU.pais === "VE" ? " en Venezuela" : " en Chile");
      el.innerHTML = I("info") + "<p>" + (reglas.activo
        ? "<strong>Programa activo.</strong> Ganas " + regla + "" + (PAIS === "VE" ? " en pedidos confirmados por la sucursal." : " en pedidos pagados en línea.") + ""
        : "<strong>El programa aún no está activo.</strong> Cuando se lance, ganarás " + regla + "" + (PAIS === "VE" ? " en pedidos confirmados por la sucursal." : " en pedidos pagados en línea.") + "") + "</p>";
    });
    var pub = document.querySelector("[data-recompensas-publicas]");
    if (pub) pub.innerHTML = recompensas.map(function (r) {
      return '<div class="reward">' + I("regalo") + "<b>" + E(r.nombre) + "</b><span>" + r.puntos_requeridos.toLocaleString("es-CL") + " pts</span></div>";
    }).join("");
  }

  var cargaPublica = Promise.all([
    db.from("loyalty_settings").select("activo, puntos_por_monto, monto_base").eq("pais", PAIS).maybeSingle(),
    db.from("rewards").select("id, nombre, descripcion, puntos_requeridos").eq("pais", PAIS).order("orden")
  ]).then(function (res) {
    reglas = res[0].data || null;
    recompensas = res[1].data || [];
    pintarEstadoPrograma();
  }).catch(function () { pintarEstadoPrograma(); });

  /* ---------- Panel del cliente ---------- */
  var usuario = null, saldo = 0;

  function pintarSaldo() {
    var el = document.querySelector("[data-saldo]");
    if (TAMBU.tarjetaPuntosHTML && recompensas.length) {
      TAMBU.fidelizacion.recompensas = recompensas.map(function (r) { return { nombre: r.nombre, puntos: r.puntos_requeridos }; });
      el.innerHTML = TAMBU.tarjetaPuntosHTML(saldo, "Tus puntos en " + NOMBRE_PAIS).replace(" · saldo de demostración", "");
    } else {
      el.innerHTML = '<span class="eyebrow" style="color:var(--bambu)">Tus puntos en ' + NOMBRE_PAIS + '</span><div class="points-card__value">' + saldo.toLocaleString("es-CL") + " pts</div>";
    }
  }

  function pintarRecompensasCliente() {
    var ul = document.querySelector("[data-recompensas-cliente]");
    if (!recompensas.length) { ul.innerHTML = '<li><span>No hay recompensas disponibles.</span></li>'; return; }
    var activo = reglas && reglas.activo;
    ul.innerHTML = recompensas.map(function (r) {
      var alcanza = saldo >= r.puntos_requeridos;
      return "<li><span>" + E(r.nombre) + ' <small class="muted">· ' + r.puntos_requeridos.toLocaleString("es-CL") + " pts</small></span>" +
        '<button class="btn btn--sm ' + (alcanza && activo ? "btn--primary" : "btn--outline") + '" type="button" data-canjear="' + r.id + '"' +
        (alcanza && activo ? "" : " disabled") + ">" + (activo ? (alcanza ? "Canjear" : "Te faltan " + (r.puntos_requeridos - saldo)) : "Próximamente") + "</button></li>";
    }).join("");
  }

  var etiquetasMov = { acumulacion: "Acumulación", canje: "Canje", reverso: "Reverso", ajuste: "Ajuste", vencimiento: "Vencimiento" };
  var etiquetasPedido = { pendiente_pago: "Pendiente de pago", pagado: "Pagado", en_preparacion: "En preparación", listo: "Listo", entregado: "Entregado", cancelado: "Cancelado" };
  function fecha(iso) {
    try { return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Santiago" }); }
    catch (e) { return iso; }
  }

  function cargarPanel() {
    mostrar("panel");
    document.getElementById("pf-correo").value = usuario.email || "";

    return Promise.all([
      db.from("profiles").select("nombre, telefono, fecha_nacimiento, acepta_comunicaciones").eq("id", usuario.id).maybeSingle(),
      db.rpc("mi_saldo_puntos_pais", { p_pais: PAIS }),
      db.from("points_ledger").select("puntos, tipo, descripcion, created_at").eq("pais", PAIS).order("created_at", { ascending: false }).limit(20),
      db.from("orders").select("id, numero, estado, total, moneda, created_at").eq("user_id", usuario.id).order("created_at", { ascending: false }).limit(10),
      cargaPublica
    ]).then(function (res) {
      var perfil = res[0].data || {};
      saldo = res[1].data || 0;
      var movs = res[2].data || [];
      var pedidos = res[3].data || [];

      var nombre = perfil.nombre || (usuario.user_metadata && usuario.user_metadata.nombre) || "";
      document.querySelector("[data-saludo]").textContent = nombre ? nombre.split(" ")[0] : "Tu panel";
      var f = document.querySelector('[data-form="perfil"]');
      f.nombre.value = nombre;
      f.telefono.value = perfil.telefono || "";
      f.fecha_nacimiento.value = perfil.fecha_nacimiento || "";
      f.acepta_comunicaciones.checked = !!perfil.acepta_comunicaciones;

      pintarSaldo();
      pintarRecompensasCliente();

      document.querySelector("[data-movimientos]").innerHTML = movs.length
        ? movs.map(function (m) {
            return "<li><span>" + E(m.descripcion || etiquetasMov[m.tipo]) + '<br><small class="muted">' + etiquetasMov[m.tipo] + " · " + fecha(m.created_at) + "</small></span>" +
              '<span class="' + (m.puntos > 0 ? "pts-mas" : "pts-menos") + '">' + (m.puntos > 0 ? "+" : "") + m.puntos.toLocaleString("es-CL") + "</span></li>";
          }).join("")
        : '<li><span class="muted">Aún no tienes movimientos. Tus puntos aparecerán aquí cuando hagas pedidos pagados en línea.</span></li>';

      document.querySelector("[data-pedidos]").innerHTML = pedidos.length
        ? '<thead><tr><th scope="col">Pedido</th><th scope="col">Fecha</th><th scope="col">Estado</th><th scope="col">Total</th></tr></thead><tbody>' +
          pedidos.map(function (o) {
            return '<tr><td><a href="pedido.html?pedido=' + encodeURIComponent(o.id) + '">#' + o.numero + "</a></td><td>" + fecha(o.created_at) + "</td><td>" + (etiquetasPedido[o.estado] || o.estado) + "</td><td>" + (o.moneda === "USD" ? "US$ " + (o.total / 100).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : TAMBU.precioCLP(o.total)) + "</td></tr>";
          }).join("") + "</tbody>"
        : '<tbody><tr><td class="muted">Aún no tienes pedidos registrados en tu cuenta.</td></tr></tbody>';
      if (TAMBU.misPedidos) pedidos.forEach(function (o) { TAMBU.misPedidos.guardar(o.id, o.numero, new Date(o.created_at).getTime(), o.estado); });
    }).catch(function (err) {
      aviso(document.querySelector("[data-msg-canje]"), TAMBU.errorAmigable(err), "error");
    });
  }

  /* ---------- Sesión ---------- */
  var enRecuperacion = /type=recovery/.test(location.hash);

  function alCambiarSesion(evento, session) {
    if (evento === "PASSWORD_RECOVERY" || enRecuperacion) { enRecuperacion = false; mostrar("nueva-clave"); return; }
    usuario = session ? session.user : null;
    if (usuario) cargarPanel();
    else mostrar("invitado");
  }
  // No llamar a Supabase dentro del aviso de cambio de sesión: se difiere un instante
  db.auth.onAuthStateChange(function (evento, session) {
    setTimeout(function () { alCambiarSesion(evento, session); }, 0);
  });

  /* ---------- Formularios ---------- */
  document.addEventListener("submit", function (e) {
    var form = e.target.closest("[data-form]");
    if (!form) return;
    e.preventDefault();
    if (!validar(form)) return;
    var tipo = form.getAttribute("data-form");
    var msg = form.querySelector("[data-msg]");
    aviso(msg, "");
    ocupado(form, true);

    var accion;
    if (tipo === "ingresar") {
      TAMBU.recienIngreso();
      accion = db.auth.signInWithPassword({ email: form.correo.value.trim(), password: form.clave.value })
        .then(function (r) { if (r.error) throw r.error; form.clave.value = ""; });
    }
    if (tipo === "registro") {
      accion = db.auth.signUp({
        email: form.correo.value.trim(),
        password: form.clave.value,
        options: {
          emailRedirectTo: urlRetorno(),
          data: { nombre: form.nombre.value.trim(), telefono: form.telefono.value.trim() }
        }
      }).then(function (r) {
        if (r.error) throw r.error;
        form.clave.value = "";
        var u = r.data.user;
        if (u && u.identities && u.identities.length === 0) throw new Error("User already registered");
        if (!r.data.session) aviso(msg, "¡Listo! Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego inicia sesión.", "ok");
      });
    }
    if (tipo === "recuperar") {
      accion = db.auth.resetPasswordForEmail(form.correo.value.trim(), { redirectTo: urlRetorno() })
        .then(function (r) {
          if (r.error) throw r.error;
          aviso(msg, "Si existe una cuenta con ese correo, te llegará un enlace para crear una nueva contraseña.", "ok");
        });
    }
    if (tipo === "nueva-clave") {
      accion = db.auth.updateUser({ password: form.clave.value }).then(function (r) {
        if (r.error) throw r.error;
        form.clave.value = "";
        history.replaceState(null, "", location.pathname);
        TAMBU.toast("Contraseña actualizada");
        return db.auth.getSession().then(function (s) { alCambiarSesion("SIGNED_IN", s.data.session); });
      });
    }
    if (tipo === "perfil") {
      accion = db.from("profiles").update({
        nombre: form.nombre.value.trim(),
        telefono: form.telefono.value.trim() || null,
        fecha_nacimiento: form.fecha_nacimiento.value || null,
        acepta_comunicaciones: form.acepta_comunicaciones.checked
      }).eq("id", usuario.id).then(function (r) {
        if (r.error) throw r.error;
        document.querySelector("[data-saludo]").textContent = form.nombre.value.trim().split(" ")[0];
        aviso(msg, "Datos guardados.", "ok");
      });
    }

    Promise.resolve(accion)
      .catch(function (err) { aviso(msg, TAMBU.errorAmigable(err), "error"); })
      .then(function () { ocupado(form, false); });
  });

  /* ---------- Canjear ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-canjear]");
    if (!b) return;
    var r = recompensas.find(function (x) { return x.id === b.getAttribute("data-canjear"); });
    if (!r || !confirm("¿Canjear «" + r.nombre + "» por " + r.puntos_requeridos + " puntos?")) return;
    b.disabled = true;
    db.rpc("canjear_recompensa", { p_reward_id: r.id }).then(function (res) {
      if (res.error) throw res.error;
      TAMBU.toast("Canje solicitado: " + r.nombre);
      return cargarPanel();
    }).catch(function (err) {
      aviso(document.querySelector("[data-msg-canje]"), TAMBU.errorAmigable(err), "error");
      b.disabled = false;
    });
  });

  /* ---------- Continuar con Google ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-google]");
    if (!b) return;
    var zona = document.querySelector("[data-msg-google]");
    if (!urlRetorno()) {
      aviso(zona, "Para entrar con Google abre el sitio con Live Server o desde la web publicada (no con doble clic).", "error");
      return;
    }
    b.disabled = true;
    b.classList.add("is-loading");
    TAMBU.recienIngreso();
    db.auth.signInWithOAuth({ provider: "google", options: { redirectTo: urlRetorno() } })
      .then(function (r) { if (r.error) throw r.error; /* el navegador va a Google */ })
      .catch(function (err) {
        aviso(zona, /provider is not enabled|unsupported provider/i.test(err.message || "")
          ? "El acceso con Google aún no está activado en Supabase."
          : TAMBU.errorAmigable(err), "error");
        b.disabled = false;
        b.classList.remove("is-loading");
      });
  });

  /* ---------- Cerrar sesión ---------- */
  document.addEventListener("click", function (e) {
    if (!e.target.closest("[data-salir]")) return;
    db.auth.signOut().then(function () { TAMBU.toast("Sesión cerrada"); });
  });
})();
