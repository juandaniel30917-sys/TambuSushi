// =====================================================================
// TAMBÚ SUSHI — crear-pago
// 1. Recibe el carrito y los datos del cliente desde checkout.html
// 2. Recalcula el total con los precios de la base de datos (no del navegador)
// 3. Crea el pedido "pendiente de pago" y pide a Flow el link de pago
// 4. Devuelve la URL a la que se envía al cliente para pagar con Webpay
// =====================================================================
import { admin, CORS, flowConfigurado, flowPost, json, retornoPermitido } from "./comun.ts";

type Grupo = { id: string; nombre: string; tipo: "unica" | "multiple"; requerido?: boolean; max?: number | null;
  valores: { id: string; nombre: string; extra: number }[] };

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Datos inválidos." }, 400); }

  // Efectivo de PRUEBA: crea el pedido sin pasar por Flow (para probar Pedidos y el panel).
  const efectivo = body?.medio === "efectivo";
  const db = admin();
  if (efectivo) {
    // Se activa o desactiva desde Configuración (superadministrador)
    const { data: ajustes } = await db.from("app_settings").select("efectivo_prueba").eq("id", 1).maybeSingle();
    if (!ajustes?.efectivo_prueba) return json({ error: "El pago en efectivo no está disponible." }, 400);
  } else {
    // Webpay (Flow) se puede pausar desde el panel del superadministrador
    const { data: ajustes } = await db.from("app_settings").select("flow_activo").eq("id", 1).maybeSingle();
    if (ajustes && ajustes.flow_activo === false) return json({ error: "El pago en línea está pausado por el momento." }, 503);
    if (!(await flowConfigurado())) return json({ error: "Los pagos en línea aún no están configurados." }, 503);
  }

  // ---------- Cliente con sesión (opcional): para sumar puntos a su cuenta ----------
  let userId: string | null = null;
  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (jwt.split(".").length === 3) {
    const { data } = await db.auth.getUser(jwt);
    userId = data?.user?.id ?? null;
  }

  // ---------- Datos de contacto y entrega ----------
  const nombre = texto(body?.contacto?.nombre, 120);
  const telefono = texto(body?.contacto?.telefono, 30);
  const correo = texto(body?.contacto?.correo, 200).toLowerCase();
  const modalidad = body?.modalidad === "despacho" ? "despacho" : "retiro";
  const direccion = texto(body?.direccion, 200);
  const referencia = texto(body?.referencia, 200);
  const observaciones = texto(body?.observaciones, 300);
  const digitos = telefono.replace(/\D/g, "").length;
  if (nombre.length < 2) return json({ error: "Ingresa tu nombre." }, 400);
  if (digitos < 8 || digitos > 13) return json({ error: "Ingresa un teléfono válido." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return json({ error: "Ingresa un correo válido para el comprobante de pago." }, 400);
  if (modalidad === "despacho" && direccion.length < 5) return json({ error: "Ingresa la dirección de entrega." }, 400);

  const retorno = retornoPermitido(body?.retorno);
  if (!retorno && !efectivo) return json({ error: "Dirección de la web no autorizada. Abre el sitio con Live Server o desde la web publicada." }, 400);

  // ---------- Sucursal ----------
  const { data: suc } = await db.from("branches").select("id, nombre, nombre_corto, pais, activa, acepta_pago_en_linea")
    .eq("id", texto(body?.sucursal_id, 80)).maybeSingle();
  if (!suc || !suc.activa) return json({ error: "Elige una sucursal válida." }, 400);
  if (suc.pais !== "CL" || !suc.acepta_pago_en_linea) return json({ error: "Esta sucursal no acepta pago en línea." }, 400);

  // ---------- Productos y precios oficiales ----------
  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length < 1 || items.length > 50) return json({ error: "Tu carrito está vacío." }, 400);
  const ids = [...new Set(items.map((i: any) => texto(i?.id, 80)))];
  const { data: productos } = await db.from("products").select("id, nombre, precio, opciones")
    .in("id", ids).eq("pais", "CL").eq("activo", true);
  const porId = new Map((productos ?? []).map((p: any) => [p.id, p]));

  const lineas: any[] = [];
  let subtotal = 0;
  for (const it of items) {
    const p: any = porId.get(texto(it?.id, 80));
    if (!p) return json({ error: "Un producto de tu carrito ya no está disponible. Revisa el carrito." }, 409);
    const cantidad = Number(it?.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) return json({ error: "Cantidad inválida." }, 400);

    const elegidas = (it?.opciones && typeof it.opciones === "object") ? it.opciones : {};
    let unitario = Number(p.precio);
    const partes: string[] = [];
    const limpio: Record<string, string[]> = {};
    for (const g of (p.opciones as Grupo[])) {
      const sel: string[] = Array.isArray(elegidas[g.id]) ? elegidas[g.id].map(String) : [];
      const validos = sel.filter((id) => g.valores.some((v) => v.id === id));
      if (validos.length !== sel.length) return json({ error: "Opción inválida en " + p.nombre + "." }, 400);
      if (g.tipo === "unica" && (validos.length > 1 || (g.requerido && validos.length !== 1)))
        return json({ error: "Elige " + g.nombre.toLowerCase() + " en " + p.nombre + "." }, 400);
      if (g.tipo === "multiple" && g.max && validos.length > g.max)
        return json({ error: "Demasiadas opciones en " + p.nombre + "." }, 400);
      const nombres: string[] = [];
      for (const v of g.valores) if (validos.includes(v.id)) { unitario += Number(v.extra) || 0; nombres.push(v.nombre); }
      if (nombres.length) partes.push(g.nombre + ": " + nombres.join(", "));
      limpio[g.id] = validos;
    }
    subtotal += unitario * cantidad;
    lineas.push({ producto_id: p.id, nombre: p.nombre, cantidad, precio_unitario: unitario, detalle: partes.join(" · ") || null, opciones: limpio });
  }
  if (!efectivo && subtotal < 350) return json({ error: "El monto mínimo para pagar en línea es $350." }, 400);

  // ---------- Pedido pendiente de pago ----------
  const { data: pedido, error: e1 } = await db.from("orders").insert({
    user_id: userId, sucursal_id: suc.id, moneda: "CLP", modalidad,
    // Efectivo: el pedido entra directo a la sucursal; se cobra al retirar
    estado: efectivo ? "pagado" : "pendiente_pago",
    medio_pago: efectivo ? "efectivo" : "webpay",
    es_prueba: efectivo,
    nombre_contacto: nombre, telefono_contacto: telefono, correo_contacto: correo,
    direccion: modalidad === "despacho" ? direccion : null, referencia_direccion: modalidad === "despacho" ? referencia || null : null,
    observaciones: observaciones || null, subtotal, costo_despacho: 0, descuento: 0, total: subtotal,
  }).select("id, numero").single();
  if (e1 || !pedido) return json({ error: "No pudimos crear el pedido. Intenta de nuevo." }, 500);

  const { error: e2 } = await db.from("order_items").insert(lineas.map((l) => ({ ...l, order_id: pedido.id })));
  if (e2) {
    await db.from("orders").update({ estado: "cancelado" }).eq("id", pedido.id);
    return json({ error: "No pudimos guardar el detalle del pedido." }, 500);
  }

  if (efectivo) {
    await db.from("payments").insert({
      order_id: pedido.id, proveedor: "efectivo", token: "efectivo-" + pedido.id, estado: "iniciado",
      monto: subtotal, moneda: "CLP", url_retorno: retorno,
    });
    return json({ ok: true, efectivo: true, pedido: pedido.id, numero: pedido.numero, total: subtotal });
  }

  // ---------- Link de pago en Flow ----------
  const base = Deno.env.get("SUPABASE_URL")! + "/functions/v1/";
  try {
    const r = await flowPost("/payment/create", {
      commerceOrder: String(pedido.numero),
      subject: ("Pedido Tambú Sushi #" + pedido.numero + " · " + suc.nombre_corto).slice(0, 100),
      currency: "CLP",
      amount: String(subtotal),
      email: correo,
      paymentMethod: "9",
      timeout: "1800",
      urlConfirmation: base + "flow-confirmacion",
      urlReturn: base + "flow-retorno?pedido=" + pedido.id,
      optional: JSON.stringify({ pedido: pedido.id, sucursal: suc.id }),
    });
    await db.from("payments").insert({
      order_id: pedido.id, proveedor: "flow", token: r.token, estado: "iniciado",
      monto: subtotal, moneda: "CLP", url_retorno: retorno,
    });
    return json({ ok: true, url: r.url + "?token=" + r.token, pedido: pedido.id, numero: pedido.numero, total: subtotal });
  } catch (err) {
    console.error("crear-pago:", err);
    await db.from("orders").update({ estado: "cancelado" }).eq("id", pedido.id);
    return json({ error: "No pudimos conectar con el medio de pago. Intenta en unos minutos." }, 502);
  }
});
