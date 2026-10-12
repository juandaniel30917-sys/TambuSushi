-- =====================================================================
-- Pago en efectivo (modo prueba): pedidos reales sin Flow para probar
-- la sección Pedidos y el panel. Nunca suman puntos.
-- (Copia de la migración ya aplicada en el proyecto Supabase "Tambu Sushi")
-- =====================================================================
alter table public.orders add column medio_pago text not null default 'webpay' check (medio_pago in ('webpay', 'efectivo'));
alter table public.orders add column es_prueba boolean not null default false;
-- puntos_por_estado_pedido(): ahora no hace nada si new.es_prueba = true
-- (SQL completo en Supabase → Database → Migrations)
