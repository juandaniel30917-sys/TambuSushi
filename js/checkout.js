/* ==========================================================================
   TAMBÚ SUSHI — CHECKOUT DE DEMOSTRACIÓN (checkout.js)
   --------------------------------------------------------------------------
   - NO procesa pagos, NO confirma pedidos y NO asigna puntos.
   - Los datos del formulario NO se guardan en el navegador.
   - Opcional: arma un resumen para enviarlo al WhatsApp del local
     (TAMBU.checkout.enviarPorWhatsapp en demo-data.js).

   FUTURO (Webpay Plus): al confirmar, este archivo enviará el carrito a un
   servidor propio (por ejemplo una función de Supabase). El servidor:
     1. recalcula precios desde la base de datos,
     2. crea el pedido en estado "pendiente de pago",
     3. crea la transacción con el SDK oficial de Transbank y devuelve la URL,
     4. al volver de Webpay, confirma la transacción en el servidor,
     5. solo entonces marca el pedido como pagado, lo envía a caja (Fudo
        u otro, mediante una capa intercambiable) y registra los puntos.
   ========================================================================== */

(function () {
  var zona = document.querySelector("[data-checkout]");
  if (!zona) return;
  var E = TAMBU.escapar, I = TAMBU.icono, cfg = TAMBU.checkout;

  var r = TAMBU.resumenCarrito();
  if (!r.lineas.length) {
    zona.innerHTML = '<div class="state" style="margin:32px 0">' + I("carrito") +
      "<h2 style=\"font-size:1.5rem\">No hay productos para finalizar</h2>" +
      "<p>Agrega productos desde la carta para continuar.</p>" +
      '<a class="btn btn--primary" href="carta.html">Ir a la carta</a></div>';
    return;
  }

  function campo(id, etiqueta, tipo, extra, error, ayuda) {
    return '<div class="field"><label for="' + id + '">' + etiqueta + "</label>" +
      '<input class="input" id="' + id + '" name="' + id + '" type="' + tipo + '" ' + (extra || "") + ">" +
      (ayuda ? '<span class="hint">' + ayuda + "</span>" : "") +
      (error ? '<span class="error">' + error + "</span>" : "") + "</div>";
  }

  // Chile: pago en línea real con Webpay (vía Flow). Venezuela: se coordina por WhatsApp.
  var ONLINE = !!(TAMBU.paisActual && TAMBU.paisActual.pagoEnLinea && TAMBU.db);

  var pagos = ONLINE
    ? '<label class="choice" data-opcion-webpay><input type="radio" name="pago" value="webpay" checked><span class="choice__mark"></span>' +
      '<span class="choice__text"><b>Webpay</b><small>Débito, crédito o prepago · procesado por Flow</small></span>' + I("tarjeta") + "</label>" +
      // Efectivo de prueba: se muestra solo si está activado en Configuración (superadministrador)
      '<label class="choice" data-opcion-efectivo hidden><input type="radio" name="pago" value="efectivo"><span class="choice__mark"></span>' +
        '<span class="choice__text"><b>Efectivo al retirar</b><small>Pagas en el local · opción de prueba</small></span><span class="badge badge--neutro">Prueba</span></label>'
    : cfg.mediosPagoFuturos.map(function (m) {
    return '<label class="choice"><input type="radio" name="pago" value="' + m.id + '" disabled><span class="choice__mark"></span>' +
      '<span class="choice__text"><b>' + E(m.nombre) + "</b><small>" + E(m.detalle) + '</small></span><span class="badge badge--neutro">Próximamente</span></label>';
  }).join("");

  var items = r.lineas.map(function (l) {
    return "<li><span>" + l.item.cantidad + " × " + E(l.producto.nombre) +
      (l.detalle ? "<small>" + E(l.detalle) + "</small>" : "") + "</span><span>" + TAMBU.precio(l.subtotal) + "</span></li>";
  }).join("");

  var despachoTexto = cfg.costoDespacho == null ? "A confirmar" : TAMBU.precio(cfg.costoDespacho);

  zona.innerHTML =
    '<form class="cart-layout" id="form-checkout" novalidate>' +
      "<div>" +
        '<section class="checkout-block"><h2><span>1</span>Sucursal</h2>' +
          '<div class="locate-bar locate-bar--compact">' +
            '<button class="btn btn--outline btn--sm" type="button" data-ubicarme>' + I("ubicacion") + "Usar mi ubicación</button>" +
            '<p class="locate-bar__msg" data-ubicacion-msg aria-live="polite">Elegimos la sucursal más cercana a ti. Tu ubicación no se guarda.</p>' +
          "</div>" +
          '<fieldset style="margin-top:12px"><legend class="visually-hidden">Sucursal</legend><div class="choices" data-sucursales-checkout></div></fieldset>' +
          '<p class="field error-inline" data-error-sucursal hidden>Elige una sucursal para continuar.</p>' +
          '<div data-aviso-precios></div>' +
        "</section>" +

        '<section class="checkout-block"><h2><span>2</span>Datos de contacto</h2><div class="form-grid">' +
          campo("nombre", "Nombre", "text", 'autocomplete="name" required', "Ingresa tu nombre.") +
          campo("telefono", "Teléfono", "tel", 'autocomplete="tel" placeholder="' + TAMBU.paisActual.telefonoEjemplo + '" required', "Ingresa un teléfono válido.") +
          (ONLINE
            ? campo("correo", "Correo", "email", 'autocomplete="email" required', "Ingresa un correo válido.", "Te llegará el comprobante de pago")
            : campo("correo", "Correo", "email", 'autocomplete="email"', "Revisa el formato del correo.", "Opcional")) +
        "</div></section>" +

        '<section class="checkout-block"><h2><span>3</span>Entrega</h2>' +
          '<fieldset><legend class="visually-hidden">Modalidad</legend><div class="choices">' +
            '<label class="choice"><input type="radio" name="modalidad" value="retiro" checked><span class="choice__mark"></span><span class="choice__text"><b>Retiro en local</b><small data-retiro-detalle>En la sucursal elegida</small></span>' + I("tienda") + "</label>" +
            (ONLINE
              ? '<label class="choice"><input type="radio" name="modalidad" value="despacho" disabled><span class="choice__mark"></span><span class="choice__text"><b>Despacho a domicilio</b><small>Disponible próximamente para pago en línea</small></span><span class="badge badge--neutro">Pronto</span></label>'
              : '<label class="choice"><input type="radio" name="modalidad" value="despacho"><span class="choice__mark"></span><span class="choice__text"><b>Despacho a domicilio</b><small>Zonas y costo por confirmar</small></span>' + I("moto") + "</label>") +
          "</div></fieldset>" +
          '<div class="form-grid" data-direccion hidden style="margin-top:16px">' +
            campo("direccion", "Dirección", "text", 'autocomplete="street-address" placeholder="Calle, número, depto."', "Ingresa la dirección de entrega.") +
            campo("referencia", "Referencia", "text", 'placeholder="Ej: casa esquina, portón negro"', "", "Opcional") +
          "</div>" +
        "</section>" +

        '<section class="checkout-block"><h2><span>4</span>Observaciones</h2>' +
          '<div class="field"><label for="obs" class="visually-hidden">Observaciones</label>' +
          '<textarea class="textarea" id="obs" name="obs" maxlength="300" placeholder="Ej: sin sésamo, salsas aparte"></textarea><span class="hint">Opcional · máximo 300 caracteres</span></div>' +
        "</section>" +

        '<section class="checkout-block"><h2><span>5</span>Medio de pago</h2>' +
          '<div class="choices">' + pagos + "</div>" +
          (ONLINE
            ? '<div class="demo-notice demo-notice--ok" style="margin-top:16px">' + I("candado") + "<p><strong>Pago seguro.</strong> Pagarás en la página de Webpay: este sitio nunca ve ni guarda los datos de tu tarjeta. Tu pedido se confirma y se envía a la sucursal automáticamente al aprobarse el pago.</p></div>"
            : TAMBU.paisActual.pagoEnLinea
            ? '<div class="demo-notice" style="margin-top:16px">' + I("info") + "<p>El pago en línea no está disponible en este momento.</p></div>"
            : '<div class="demo-notice" style="margin-top:16px">' + I("info") + "<p><strong>Venezuela:</strong> el pago se coordina con la sucursal por WhatsApp (pago móvil, Zelle o efectivo).</p></div>") +
        "</section>" +
      "</div>" +

      '<aside class="summary summary--sticky" aria-label="Resumen del pedido">' +
        "<h2>Tu pedido</h2>" +
        '<ul class="summary-items">' + items + "</ul>" +
        '<ul class="totals">' +
          "<li><span>Subtotal</span><span>" + TAMBU.precio(r.subtotal) + "</span></li>" +
          '<li data-fila-despacho hidden><span>Despacho</span><span>' + despachoTexto + "</span></li>" +
          '<li class="totals__grand"><span>Total</span><span data-total>' + TAMBU.precio(r.subtotal + 0) + "</span></li>" +
          (TAMBU.pais === "VE" ? '<li><span>En bolívares</span>' + TAMBU.bsHTML(r.subtotal) + '</li><li><small class="muted" data-tasa-bs></small></li>' : "") +
        "</ul>" +
        '<div data-error-pago aria-live="polite"></div>' +
        '<button class="btn btn--primary btn--block" type="submit">' + (ONLINE ? I("candado") + "Pagar " + TAMBU.precio(r.subtotal) : "Revisar pedido") + "</button>" +
        '<a class="btn btn--ghost btn--block" href="carrito.html">Volver al carrito</a>' +
        '<p class="muted" style="margin:16px 0 0">' + (ONLINE
          ? "El total se confirma con los precios vigentes antes de pagar."
          : "El total y el pago se coordinan con la sucursal por WhatsApp.") + "</p>" +
      "</aside>" +
    "</form>";

  TAMBU.pintarBs();
  var form = document.getElementById("form-checkout");
  var bloqueDir = form.querySelector("[data-direccion]");
  var filaDesp = form.querySelector("[data-fila-despacho]");
  var totalEl = form.querySelector("[data-total]");

  function modalidad() { return form.querySelector('input[name="modalidad"]:checked').value; }

  /* ---------- Sucursal ---------- */
  var S = TAMBU.sucursal;
  var distancias = {};
  var cajaSuc = form.querySelector("[data-sucursales-checkout]");
  var msgUbic = form.querySelector("[data-ubicacion-msg]");
  var btnUbic = form.querySelector("[data-ubicarme]");

  function pintarSucursales() {
    var actual = S.actual();
    var orden = S.lista().slice();
    if (Object.keys(distancias).length) orden.sort(function (a, b) { return distancias[a.id] - distancias[b.id]; });
    cajaSuc.innerHTML = orden.map(function (s) {
      var km = distancias[s.id];
      var estado = TAMBU.estadoLocal(s);
      return '<label class="choice"><input type="radio" name="sucursal" value="' + s.id + '"' + (actual && actual.id === s.id ? " checked" : "") + '>' +
        '<span class="choice__mark"></span><span class="choice__text"><b>' + E(s.nombre) + "</b><small>" +
        E(s.region) + (km != null ? " · " + S.textoDistancia(km) : "") + " · " + E(estado.texto) + "</small></span>" +
        (s.nueva ? '<span class="badge badge--wasabi">Nueva</span>' : "") + "</label>";
    }).join("");
    var det = form.querySelector("[data-retiro-detalle]");
    det.textContent = actual ? actual.nombre + " · " + actual.direccion : "En la sucursal elegida";
    form.querySelector("[data-aviso-precios]").innerHTML = actual && !actual.preciosConfirmados
      ? '<div class="demo-notice" style="margin-top:12px">' + I("info") + "<p><strong>" + E(actual.corto) + ":</strong> los precios de la carta corresponden a Chile. Esta sucursal te confirmará el total por WhatsApp.</p></div>"
      : "";
  }

  function usarUbicacion(u, elegir) {
    var ranking = S.ordenarPorDistancia(u.lat, u.lng);
    ranking.forEach(function (x) { distancias[x.sucursal.id] = x.km; });
    if (elegir) S.elegir(ranking[0].sucursal.id, "ubicacion");
    var elegidaAhora = S.actual() && S.actual().id === ranking[0].sucursal.id;
    msgUbic.innerHTML = "Más cercana: <b>" + E(ranking[0].sucursal.nombre) + "</b> (" + S.textoDistancia(ranking[0].km) + ")." +
      (elegidaAhora ? " Puedes cambiarla abajo." : "");
    pintarSucursales();
  }

  function ubicar(elegir) {
    btnUbic.disabled = true; btnUbic.classList.add("is-loading");
    msgUbic.textContent = "Buscando tu ubicación…";
    S.ubicar().then(function (u) { usarUbicacion(u, elegir); })
      .catch(function (err) { msgUbic.textContent = S.mensajeErrorUbicacion(err); })
      .then(function () { btnUbic.disabled = false; btnUbic.classList.remove("is-loading"); });
  }
  btnUbic.addEventListener("click", function () { ubicar(true); });

  form.addEventListener("change", function (e) {
    if (e.target.name !== "sucursal") return;
    S.elegir(e.target.value);
    form.querySelector("[data-error-sucursal]").hidden = true;
  });
  document.addEventListener("tambu:sucursal", pintarSucursales);

  document.addEventListener("tambu:ubicacion-buscando", function () { msgUbic.textContent = "Buscando la sucursal más cercana…"; });
  document.addEventListener("tambu:ubicacion", function (e) { usarUbicacion(e.detail.ubicacion, false); });
  document.addEventListener("tambu:ubicacion-error", function (e) { if (!S.actual()) msgUbic.textContent = e.detail.mensaje; });
  if (S.buscando()) msgUbic.textContent = "Buscando la sucursal más cercana…";
  pintarSucursales();

  form.addEventListener("change", function (e) {
    if (e.target.name !== "modalidad") return;
    var desp = modalidad() === "despacho";
    bloqueDir.hidden = !desp;
    filaDesp.hidden = !desp;
    var costo = desp && cfg.costoDespacho ? cfg.costoDespacho : 0;
    totalEl.textContent = TAMBU.precio(r.subtotal + costo) + (desp && cfg.costoDespacho == null ? " + despacho" : "");
  });

  /* Validación sencilla */
  function validar() {
    var ok = true;
    function marcar(id, valido) {
      var f = document.getElementById(id).closest(".field");
      f.classList.toggle("is-invalid", !valido);
      if (!valido && ok) document.getElementById(id).focus();
      if (!valido) ok = false;
    }
    var v = function (id) { return document.getElementById(id).value.trim(); };
    if (!S.actual()) {
      form.querySelector("[data-error-sucursal]").hidden = false;
      if (ok) cajaSuc.scrollIntoView({ behavior: "smooth", block: "center" });
      ok = false;
    }
    marcar("nombre", v("nombre").length >= 2);
    var digitos = v("telefono").replace(/\D/g, "").length;
    marcar("telefono", digitos >= 8 && digitos <= 13);
    marcar("correo", (ONLINE ? !!v("correo") : !v("correo")) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("correo")));
    if (modalidad() === "despacho") marcar("direccion", v("direccion").length >= 5);
    return ok;
  }

  form.addEventListener("input", function (e) {
    var f = e.target.closest(".field.is-invalid");
    if (f) f.classList.remove("is-invalid");
  });

  /* ---------- Pago en línea (Chile) ----------
     El navegador solo envía qué productos quiere el cliente. El servidor
     (función crear-pago) recalcula el total con los precios oficiales, crea el
     pedido y devuelve el link de Webpay. Al aprobarse el pago, Flow avisa al
     servidor y el pedido queda "pagado" y visible para la sucursal. */
  function medioPago() {
    var m = form.querySelector('input[name="pago"]:checked');
    return m ? m.value : "webpay";
  }

  if (ONLINE) {
    // Medios de pago activados desde el panel del superadministrador
    TAMBU.db.from("app_settings").select("efectivo_prueba, flow_activo").eq("id", 1).maybeSingle().then(function (r) {
      var d = (r && r.data) || {};
      var op = form.querySelector("[data-opcion-efectivo]");
      var wp = form.querySelector("[data-opcion-webpay]");
      if (op) op.hidden = !d.efectivo_prueba;
      if (wp && d.flow_activo === false) {
        wp.hidden = true;
        wp.querySelector("input").checked = false;
        if (op && !op.hidden) { op.querySelector("input").checked = true; op.querySelector("input").dispatchEvent(new Event("change", { bubbles: true })); }
      }
    });
  }

  // El botón cambia según el medio: "Pagar $X" (Webpay) o "Confirmar pedido" (efectivo)
  var TEXTO_PAGAR = form.querySelector('button[type="submit"]').innerHTML;
  form.addEventListener("change", function (e) {
    if (e.target.name !== "pago" || !ONLINE) return;
    var b = form.querySelector('button[type="submit"]');
    b.innerHTML = medioPago() === "efectivo" ? I("check") + "Confirmar pedido · pago en el local" : TEXTO_PAGAR;
  });

  function pagarEnLinea() {
    var v = function (id) { return document.getElementById(id).value.trim(); };
    var boton = form.querySelector('button[type="submit"]');
    var errorBox = form.querySelector("[data-error-pago]");
    var efectivo = medioPago() === "efectivo";
    errorBox.innerHTML = "";
    boton.disabled = true;
    var textoBoton = boton.innerHTML;
    boton.textContent = efectivo ? "Enviando pedido…" : "Conectando con Webpay…";

    var cuerpo = {
      sucursal_id: S.actual().id,
      items: TAMBU.cart.items().map(function (i) { return { id: i.id, cantidad: i.cantidad, opciones: i.opciones || {} }; }),
      contacto: { nombre: v("nombre"), telefono: v("telefono"), correo: v("correo") },
      modalidad: modalidad(),
      direccion: v("direccion"), referencia: v("referencia"), observaciones: v("obs"),
      retorno: location.href,
      medio: efectivo ? "efectivo" : "webpay"
    };

    TAMBU.db.auth.getSession().then(function (s) {
      var token = s && s.data && s.data.session ? s.data.session.access_token : null;
      return fetch(TAMBU.supabaseConfig.url + "/functions/v1/crear-pago", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": TAMBU.supabaseConfig.publishableKey,
          "Authorization": "Bearer " + (token || TAMBU.supabaseConfig.publishableKey)
        },
        body: JSON.stringify(cuerpo)
      });
    }).then(function (resp) {
      return resp.json().catch(function () { return {}; }).then(function (d) { return { ok: resp.ok, d: d }; });
    }).then(function (res) {
      if (!res.ok || !(res.d.url || res.d.efectivo)) throw new Error(res.d.error || "No pudimos iniciar el pago.");
      try { sessionStorage.setItem("tambu_pedido_pendiente", res.d.pedido); } catch (e) { /* nada */ }
      // Se guarda en este dispositivo para poder volver al seguimiento (también sin cuenta)
      if (TAMBU.misPedidos) TAMBU.misPedidos.guardar(res.d.pedido, res.d.numero, Date.now(), res.d.efectivo ? "pagado" : "pendiente_pago");
      if (res.d.efectivo) {
        // Efectivo: el pedido ya está en la sucursal; se va directo al seguimiento
        location.href = "pedido.html?pedido=" + encodeURIComponent(res.d.pedido);
        return;
      }
      boton.textContent = "Abriendo Webpay…";
      location.href = res.d.url;
    }).catch(function (err) {
      var msg = /failed to fetch|network/i.test(err.message) ? "No hay conexión con el servidor. Revisa tu internet." : err.message;
      errorBox.innerHTML = '<div class="demo-notice demo-notice--error" style="margin-bottom:12px">' + I("info") + "<p>" + E(msg) + "</p></div>";
      boton.disabled = false;
      boton.innerHTML = textoBoton;
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validar()) return;
    if (ONLINE) { pagarEnLinea(); return; }
    var v = function (id) { return document.getElementById(id).value.trim(); };
    var desp = modalidad() === "despacho";
    var suc = S.actual();
    var conPrecios = suc.preciosConfirmados;

    // Mensaje formateado para WhatsApp (va a la sucursal elegida)
    var msg = "Hola Tambú Sushi " + suc.corto + ", quiero hacer este pedido:\n\n" +
      r.lineas.map(function (l) {
        return "• " + l.item.cantidad + " × " + l.producto.nombre + (l.detalle ? " (" + l.detalle + ")" : "") +
          (conPrecios ? " — " + TAMBU.precioDoble(l.subtotal) : "");
      }).join("\n") +
      "\n\nSucursal: " + suc.nombre +
      (conPrecios ? "\nSubtotal: " + TAMBU.precioDoble(r.subtotal) : "\nTotal: a confirmar por la sucursal") +
      "\nEntrega: " + (desp ? "Despacho a " + v("direccion") + (v("referencia") ? " (" + v("referencia") + ")" : "") : "Retiro en local") +
      "\nNombre: " + v("nombre") +
      "\nTeléfono: " + v("telefono") +
      (v("obs") ? "\nObservaciones: " + v("obs") : "") +
      "\n\n(Pedido armado en la web)";

    zona.innerHTML =
      '<div class="cart-layout"><div class="result-box">' +
        '<span class="eyebrow">Demostración</span>' +
        '<h2 style="margin-top:12px">Tu resumen está listo</h2>' +
        "<p>Este prototipo no cobra ni confirma pedidos. " +
        (cfg.enviarPorWhatsapp ? "Puedes enviar el resumen a <b>" + E(suc.nombre) + "</b> por WhatsApp: ellos confirmarán disponibilidad, total y forma de pago." : "") + "</p>" +
        (S.whatsappPropio(suc) ? "" : '<p class="muted">Esta sucursal aún no tiene WhatsApp propio configurado: el mensaje llegará al número general del local.</p>') +
        "<pre>" + E(msg) + "</pre>" +
        '<div class="row">' +
          (cfg.enviarPorWhatsapp ? '<a class="btn btn--primary" href="' + TAMBU.urlWhatsapp(msg, suc) + '" target="_blank" rel="noopener">' + I("whatsapp") + "Enviar por WhatsApp</a>" : "") +
          '<a class="btn btn--outline" href="checkout.html">Editar datos</a>' +
          '<button class="btn btn--ghost" type="button" data-terminar>Vaciar carrito y volver al inicio</button>' +
        "</div>" +
      "</div>" +
      '<aside class="summary"><h2>Próximamente</h2><p>Pago en línea con Webpay Plus, confirmación automática del pedido y acumulación de Tambú Puntos.</p><a class="link-arrow" href="fidelizacion.html">Conocer Tambú Puntos ' + I("flecha") + "</a></aside></div>";
    window.scrollTo({ top: 0, behavior: "smooth" });

    zona.querySelector("[data-terminar]").addEventListener("click", function () {
      TAMBU.cart.vaciar();
      location.href = "index.html";
    });
  });
})();
