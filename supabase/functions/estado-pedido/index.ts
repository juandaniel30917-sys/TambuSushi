// =====================================================================
// TAMBÚ SUSHI — estado-pedido
// La página pedido.html consulta aquí el estado de un pedido.
// El identificador es un código largo imposible de adivinar (uuid).
// Si el pago sigue pendiente, se vuelve a consultar a Flow (respaldo por si
// la notificación de Flow se demoró).
// =====================================================================
import { admin, CORS, flowConfigurado, json, verificarPago } from "./comun.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Pedido no encontrado." }, 404);
  const db = admin();

  const leer = () => db.from("orders").select(
    "id, numero, estado, total, moneda, modalidad, medio_pago, es_prueba, created_at, pagado_at, sucursal_id, " +
    "order_items (nombre, cantidad, detalle, subtotal), branches (nombre, nombre_corto, whatsapp, telefono)"
  ).eq("id", id).maybeSingle();

  let { data: pedido } = await leer();
  if (!pedido) return json({ error: "Pedido no encontrado." }, 404);

  const { data: pago } = await db.from("payments").select("token, estado, intentos_verificacion")
    .eq("order_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (pedido.estado === "pendiente_pago" && pago?.estado === "iniciado" && (await flowConfigurado()) && (pago.intentos_verificacion ?? 0) < 40) {
    try { await verificarPago(db, pago.token); ({ data: pedido } = await leer()); } catch (err) { console.error("estado-pedido:", err); }
  }

  return json({
    numero: pedido!.numero, estado: pedido!.estado, total: pedido!.total, moneda: pedido!.moneda,
    modalidad: pedido!.modalidad, medio: pedido!.medio_pago, prueba: pedido!.es_prueba, creado: pedido!.created_at, pagado: pedido!.pagado_at,
    items: pedido!.order_items, sucursal: pedido!.branches,
  });
});
