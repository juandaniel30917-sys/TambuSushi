// =====================================================================
// TAMBÚ SUSHI — flow-retorno
// Al terminar en Flow, el cliente vuelve aquí. Se verifica el pago (por si
// la confirmación aún no llegó) y se le envía a pedido.html en la web.
// =====================================================================
import { admin, flowConfigurado, verificarPago } from "./comun.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const pedido = url.searchParams.get("pedido") ?? "";
  let token = url.searchParams.get("token") ?? "";
  if (!token && req.method === "POST") {
    try { token = String((await req.formData()).get("token") ?? ""); } catch { /* sin token */ }
  }
  const db = admin();
  if (token && (await flowConfigurado())) {
    try { await verificarPago(db, token); } catch (err) { console.error("flow-retorno:", err); }
  }

  // Página de la web a la que vuelve el cliente
  let base: string | null = null;
  if (/^[0-9a-f-]{36}$/i.test(pedido)) {
    const { data } = await db.from("payments").select("url_retorno").eq("order_id", pedido)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    base = data?.url_retorno ?? null;
  }
  if (!base) base = (Deno.env.get("SITIO_URLS") ?? "").split(",")[0]?.trim().replace(/\/?$/, "/") || null;
  if (!base) return new Response("Pago recibido. Puedes volver a la web de Tambú Sushi.", { status: 200 });
  return new Response(null, { status: 303, headers: { Location: base + "pedido.html?pedido=" + encodeURIComponent(pedido) } });
});
