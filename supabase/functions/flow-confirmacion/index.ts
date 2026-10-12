// =====================================================================
// TAMBÚ SUSHI — flow-confirmacion
// Flow llama aquí (POST con "token") cuando cambia el estado de un pago.
// Se verifica el pago directamente con Flow y, si está pagado, el pedido
// pasa a "pagado": queda liberado para la sucursal y suma puntos.
// =====================================================================
import { admin, flowConfigurado, verificarPago } from "./comun.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });
  if (!(await flowConfigurado())) return new Response("Pagos no configurados", { status: 503 });
  let token = "";
  try { token = String((await req.formData()).get("token") ?? ""); } catch { /* cuerpo vacío */ }
  if (!token) return new Response("Falta token", { status: 400 });
  try {
    const r = await verificarPago(admin(), token);
    console.log("flow-confirmacion", token.slice(0, 8), JSON.stringify(r));
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("flow-confirmacion:", err);
    // Respuesta de error: Flow reintentará la notificación más tarde
    return new Response("Error", { status: 500 });
  }
});
