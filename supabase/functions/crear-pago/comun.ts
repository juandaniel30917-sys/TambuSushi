// =====================================================================
// TAMBÚ SUSHI — Código compartido por las funciones de pago (Flow)
// Se copia dentro de cada función al desplegar (comun.ts).
//
// Claves de Flow: se configuran desde la web (panel del superadministrador)
// y quedan cifradas en Supabase Vault. Las funciones las leen con
// obtener_claves_flow(), que solo puede usar el servidor.
// (Opcional, tiene prioridad) Secretos de Edge Functions:
//   FLOW_API_KEY / FLOW_SECRET_KEY / FLOW_API_URL
//   SITIO_URLS       Direcciones permitidas de la web, separadas por coma
//                    (ej. https://tambusushi.cl). Para pruebas locales se
//                    aceptan siempre http://localhost y http://127.0.0.1.
// =====================================================================
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const URLS = { sandbox: "https://sandbox.flow.cl/api", produccion: "https://www.flow.cl/api" };
type Credenciales = { key: string; secret: string; url: string };
let cache: { valor: Credenciales | null; hasta: number } | null = null;

/** Claves de Flow (de los secretos de la función o de Vault). Se guardan 60 s en memoria. */
async function credenciales(): Promise<Credenciales | null> {
  if (cache && cache.hasta > Date.now()) return cache.valor;
  let valor: Credenciales | null = null;
  const envKey = Deno.env.get("FLOW_API_KEY"), envSecret = Deno.env.get("FLOW_SECRET_KEY");
  if (envKey && envSecret) {
    valor = { key: envKey, secret: envSecret, url: (Deno.env.get("FLOW_API_URL") ?? URLS.sandbox).replace(/\/$/, "") };
  } else {
    const { data, error } = await admin().rpc("obtener_claves_flow");
    const fila = Array.isArray(data) ? data[0] : data;
    if (!error && fila?.api_key && fila?.secret_key && fila.api_key !== "desconectado") {
      valor = { key: fila.api_key, secret: fila.secret_key, url: fila.modo === "produccion" ? URLS.produccion : URLS.sandbox };
    }
  }
  cache = { valor, hasta: Date.now() + 60000 };
  return valor;
}

export async function flowConfigurado(): Promise<boolean> {
  return (await credenciales()) !== null;
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function json(datos: unknown, estado = 200): Response {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

/** Cliente con permisos de servidor (nunca se expone al navegador) */
export function admin(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------- Firma de Flow: HMAC-SHA256 de "clave+valor" ordenados ----------
async function hmacHex(mensaje: string, clave: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(clave), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const firma = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(mensaje));
  return Array.from(new Uint8Array(firma)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function firmar(params: Record<string, string>, c: Credenciales): Promise<Record<string, string>> {
  const todos = { ...params, apiKey: c.key };
  const texto = Object.keys(todos).sort().map((k) => k + todos[k]).join("");
  return { ...todos, s: await hmacHex(texto, c.secret) };
}

async function exigirCredenciales(): Promise<Credenciales> {
  const c = await credenciales();
  if (!c) throw new Error("Flow no está configurado.");
  return c;
}

export async function flowPost(ruta: string, params: Record<string, string>) {
  const c = await exigirCredenciales();
  const r = await fetch(c.url + ruta, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(await firmar(params, c)),
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("Flow " + r.status + ": " + (datos.message ?? JSON.stringify(datos)));
  return datos;
}

export async function flowGet(ruta: string, params: Record<string, string>) {
  const c = await exigirCredenciales();
  const r = await fetch(c.url + ruta + "?" + new URLSearchParams(await firmar(params, c)));
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("Flow " + r.status + ": " + (datos.message ?? JSON.stringify(datos)));
  return datos;
}

/**
 * Consulta a Flow el estado real de un pago y actualiza el pedido.
 * Es seguro llamarla varias veces (notificaciones repetidas, recargas):
 * el pedido solo pasa a "pagado" una vez y los puntos se suman una vez.
 * Estados de Flow: 1 pendiente · 2 pagado · 3 rechazado · 4 anulado
 */
export async function verificarPago(db: SupabaseClient, token: string) {
  const { data: pago } = await db.from("payments").select("id, order_id, monto, moneda, estado, intentos_verificacion")
    .eq("token", token).maybeSingle();
  if (!pago) return { ok: false, motivo: "pago-desconocido" };

  const { data: pedido } = await db.from("orders").select("id, numero, total, moneda, estado").eq("id", pago.order_id).single();
  const st = await flowGet("/payment/getStatus", { token });

  await db.from("payments").update({ respuesta: st, intentos_verificacion: (pago.intentos_verificacion ?? 0) + 1 }).eq("id", pago.id);

  const status = Number(st.status);
  if (status === 2) {
    // Doble control: el monto, la moneda y el número de pedido deben coincidir
    const coincide = Math.round(Number(st.amount)) === Number(pedido.total) &&
      String(st.commerceOrder) === String(pedido.numero) &&
      String(st.currency ?? "CLP").toUpperCase() === "CLP";
    if (!coincide) {
      await db.from("payments").update({ estado: "error" }).eq("id", pago.id);
      return { ok: false, motivo: "monto-no-coincide" };
    }
    await db.from("payments").update({ estado: "autorizado" }).eq("id", pago.id);
    // Solo pasa a "pagado" si seguía pendiente (idempotente). Esto también suma los puntos.
    await db.from("orders").update({ estado: "pagado", pagado_at: new Date().toISOString() })
      .eq("id", pedido.id).eq("estado", "pendiente_pago");
    return { ok: true, estado: "pagado" };
  }
  if (status === 3 || status === 4) {
    await db.from("payments").update({ estado: status === 3 ? "rechazado" : "anulado" }).eq("id", pago.id);
    await db.from("orders").update({ estado: "cancelado" }).eq("id", pedido.id).eq("estado", "pendiente_pago");
    return { ok: true, estado: "rechazado" };
  }
  return { ok: true, estado: "pendiente" };
}

/** ¿La dirección de regreso pertenece a la web? (evita redirigir a sitios ajenos) */
export function retornoPermitido(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const permitidos = (Deno.env.get("SITIO_URLS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const esLocal = u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
  const esPermitido = permitidos.some((p) => { try { return new URL(p).origin === u.origin; } catch { return false; } });
  return esLocal || esPermitido ? u.origin + u.pathname.replace(/[^/]*$/, "") : null;
}
