/* ==========================================================================
   TAMBÚ SUSHI — CONEXIÓN CON SUPABASE (supabase-client.js)
   --------------------------------------------------------------------------
   Cuentas de clientes (Supabase Auth) y programa de puntos.

   Seguridad:
   - La clave de abajo es la "publishable key": está hecha para ir en la web.
     Lo que protege los datos son las reglas (RLS) de la base de datos:
     cada cliente solo puede leer lo suyo y NO puede escribir puntos.
   - Nunca pongas aquí la "secret key" ni la "service_role key".
   - El saldo de puntos lo calcula la base de datos (mi_saldo_puntos).
   ========================================================================== */

window.TAMBU = window.TAMBU || {};

TAMBU.supabaseConfig = TAMBU.supabaseConfig || {
  url: "https://uxvxcuspkbuyykefrcvt.supabase.co",
  publishableKey: "sb_publishable_2WcJ62rKJbijoEhY-6piLw_GAWehImI"
};

TAMBU.db = null;

(function () {
  if (!window.supabase || !window.supabase.createClient) {
    console.warn("Tambú: no se pudo cargar la librería de Supabase (¿sin internet?).");
    return;
  }
  TAMBU.db = window.supabase.createClient(TAMBU.supabaseConfig.url, TAMBU.supabaseConfig.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  /* Mensajes de error en español */
  TAMBU.errorAmigable = function (error) {
    var m = (error && (error.message || error.error_description)) || "";
    var mapa = [
      [/invalid login credentials/i, "Correo o contraseña incorrectos."],
      [/email not confirmed/i, "Confirma tu correo: revisa tu bandeja de entrada (y spam)."],
      [/user already registered|already been registered/i, "Ese correo ya tiene una cuenta. Inicia sesión."],
      [/password should be at least|weak password/i, "La contraseña es muy corta o débil (mínimo 8 caracteres)."],
      [/rate limit|too many requests|security purposes/i, "Demasiados intentos. Espera un momento y vuelve a probar."],
      [/failed to fetch|network/i, "No hay conexión con el servidor. Revisa tu internet."],
      [/programa de puntos aún no está activo/i, "El programa de puntos aún no está activo."],
      [/puntos insuficientes/i, "No tienes puntos suficientes para esta recompensa."],
      [/recompensa no disponible/i, "Esta recompensa ya no está disponible."]
    ];
    for (var i = 0; i < mapa.length; i++) if (mapa[i][0].test(m)) return mapa[i][1];
    return m || "Ocurrió un error inesperado. Intenta de nuevo.";
  };

  /* Datos de sucursales desde la base de datos (WhatsApp y teléfono de cada una).
     Si no hay conexión, se usan los de js/demo-data.js. */
  TAMBU.db.from("branches")
    .select("id, nombre, nombre_corto, direccion, detalle, lat, lng, whatsapp, telefono, zona_horaria, precios_confirmados, activa")
    .order("orden")
    .then(function (r) {
      if (r.error || !r.data || !r.data.length || !TAMBU.sucursales) return;
      r.data.forEach(function (b) {
        var s = TAMBU.sucursales.find(function (x) { return x.id === b.id; });
        if (!s) return;
        s.nombre = b.nombre; s.corto = b.nombre_corto; s.direccion = b.direccion; s.detalle = b.detalle || s.detalle;
        s.lat = b.lat; s.lng = b.lng; s.zonaHoraria = b.zona_horaria;
        s.whatsapp = b.whatsapp; s.telefonoVisible = b.telefono; s.preciosConfirmados = b.precios_confirmados;
      });
      // Sucursales desactivadas en la base de datos dejan de mostrarse
      var activas = r.data.map(function (b) { return b.id; });
      TAMBU.sucursales = TAMBU.sucursales.filter(function (s) { return activas.indexOf(s.id) !== -1; });
      document.dispatchEvent(new CustomEvent("tambu:sucursal", { detail: { origen: "datos" } }));
    });

  /* Tasa del día de bolívares (Venezuela). Se guarda la última conocida. */
  if (TAMBU.pais === "VE") {
    TAMBU.db.from("paises").select("tasa_secundaria, tasa_actualizada_at").eq("codigo", "VE").maybeSingle()
      .then(function (r) {
        if (r.error || !r.data || !r.data.tasa_secundaria) return;
        TAMBU.paises.VE.tasaBs = Number(r.data.tasa_secundaria);
        TAMBU.paises.VE.tasaFecha = r.data.tasa_actualizada_at;
        try { localStorage.setItem("tambu_tasa_bs", JSON.stringify({ valor: TAMBU.paises.VE.tasaBs, fecha: r.data.tasa_actualizada_at })); } catch (e) { /* nada */ }
        if (TAMBU.pintarBs) TAMBU.pintarBs();
      });
  }

  /* Marca el ícono de cuenta de la cabecera cuando hay sesión */
  function marcarCabecera(session) {
    document.querySelectorAll('a[href="mi-cuenta.html"].icon-btn').forEach(function (a) {
      a.classList.toggle("has-session", !!session);
      a.setAttribute("aria-label", session ? "Mi cuenta (sesión iniciada)" : "Mi cuenta");
    });
  }
  /* ---------- Opción «Pedidos» solo para administradores ----------
     Mostrar u ocultar el enlace es solo comodidad: la protección real está en
     la base de datos (solo una cuenta de la tabla "admins" recibe pedidos). */
  var CLAVE_ADMIN = "tambu_es_admin";
  /* Se marca justo antes de iniciar sesión (correo o Google) */
  TAMBU.recienIngreso = function () { try { sessionStorage.setItem("tambu_recien_ingreso", "1"); } catch (e) { /* nada */ } };
  function mostrarAdmin(si) {
    TAMBU.esAdmin = !!si;
    document.querySelectorAll("[data-solo-admin], [data-tarjeta-admin]").forEach(function (el) { el.hidden = !si; });
    document.documentElement.classList.toggle("es-admin", !!si);
    document.dispatchEvent(new CustomEvent("tambu:admin", { detail: { admin: !!si } }));
  }
  // Superadministrador: además ve «Configuración»
  function mostrarSuper(si) {
    TAMBU.esSuperadmin = !!si;
    document.querySelectorAll("[data-solo-superadmin]").forEach(function (el) { el.hidden = !si; });
    document.documentElement.classList.toggle("es-super", !!si);
    try { si ? sessionStorage.setItem(CLAVE_ADMIN + "_super", "1") : sessionStorage.removeItem(CLAVE_ADMIN + "_super"); } catch (e) { /* nada */ }
  }
  try {
    if (sessionStorage.getItem(CLAVE_ADMIN) === "1") mostrarAdmin(true);
    if (sessionStorage.getItem(CLAVE_ADMIN + "_super") === "1") mostrarSuper(true);
  } catch (e) { /* nada */ }

  var revisadoPara = null;
  function revisarAdmin(session) {
    var uid = session && session.user ? session.user.id : null;
    if (uid === revisadoPara) return;
    revisadoPara = uid;
    if (!uid) {
      try { sessionStorage.removeItem(CLAVE_ADMIN); } catch (e) { /* nada */ }
      mostrarAdmin(false);
      mostrarSuper(false);
      return;
    }
    TAMBU.db.rpc("es_admin").then(function (r) {
      var si = !r.error && r.data === true;
      try { si ? sessionStorage.setItem(CLAVE_ADMIN, "1") : sessionStorage.removeItem(CLAVE_ADMIN); } catch (e) { /* nada */ }
      mostrarAdmin(si);
      if (si) TAMBU.db.rpc("es_superadmin").then(function (r2) {
        var esSuper = !r2.error && r2.data === true;
        mostrarSuper(esSuper);
        // Recién inició sesión con la cuenta de superadministrador: se abre su panel
        var recien = false;
        try { recien = sessionStorage.getItem("tambu_recien_ingreso") === "1"; sessionStorage.removeItem("tambu_recien_ingreso"); } catch (e) { /* nada */ }
        if (esSuper && recien && document.body.getAttribute("data-page") !== "admin") location.href = "admin.html";
      });
      else { mostrarSuper(false); try { sessionStorage.removeItem("tambu_recien_ingreso"); } catch (e) { /* nada */ } }
    });
  }

  TAMBU.db.auth.getSession().then(function (r) { marcarCabecera(r.data.session); revisarAdmin(r.data.session); });
  TAMBU.db.auth.onAuthStateChange(function (_evento, session) {
    marcarCabecera(session);
    // Llamar a la base de datos fuera del aviso de sesión
    setTimeout(function () { revisarAdmin(session); }, 0);
  });
})();
