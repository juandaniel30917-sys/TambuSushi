-- =====================================================================
-- Tambú Puntos por país: saldos separados en Chile y Venezuela
--   Chile:     1 punto por cada $1.000 (monto_base = 1000 pesos)
--   Venezuela: 1 punto por cada US$ 1   (monto_base = 100 centavos)
-- (Resumen de la migración ya aplicada en el proyecto Supabase "Tambu Sushi";
--  el SQL completo está en Supabase → Database → Migrations)
-- =====================================================================
alter table public.loyalty_settings drop constraint if exists loyalty_settings_id_check;
alter table public.loyalty_settings add column pais char(2) references public.paises (codigo);
update public.loyalty_settings set pais = 'CL' where id = 1;
alter table public.loyalty_settings alter column pais set not null;
alter table public.loyalty_settings add constraint loyalty_settings_pais_key unique (pais);
alter table public.loyalty_settings add constraint loyalty_settings_id_rango check (id between 1 and 10);
insert into public.loyalty_settings (id, pais, activo, puntos_por_monto, monto_base) values (2, 'VE', false, 1, 100);

alter table public.rewards add column pais char(2) not null default 'CL' references public.paises (codigo);
create index rewards_pais_idx on public.rewards (pais);
alter table public.points_ledger add column pais char(2) not null default 'CL' references public.paises (codigo);
create index points_ledger_user_pais_idx on public.points_ledger (user_id, pais);
alter table public.redemptions add column pais char(2) not null default 'CL' references public.paises (codigo);

-- Funciones nuevas/actualizadas:
--   calcular_puntos_pais(monto, pais), mi_saldo_puntos_pais(pais),
--   mi_saldo_puntos() = saldo de Chile (compatibilidad),
--   puntos_por_estado_pedido(): país según la moneda del pedido (USD = VE),
--   canjear_recompensa(): usa saldo y reglas del país de la recompensa,
--   anular_canje(): devuelve los puntos a su país.
