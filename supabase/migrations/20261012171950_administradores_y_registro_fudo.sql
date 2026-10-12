-- =====================================================================
-- Administradores: ven y gestionan TODOS los pedidos de todas las sucursales.
-- Registro manual en Fudo: marca para saber qué pedidos ya se copiaron a la caja.
-- (Copia de la migración ya aplicada en el proyecto Supabase "Tambu Sushi")
-- =====================================================================
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nota text,
  created_at timestamptz not null default now()
);
comment on table public.admins is 'Cuentas con acceso a la sección Pedidos. Se agregan solo desde el panel de Supabase.';
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;
revoke execute on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

alter table public.orders add column fudo_registrado_at timestamptz;
alter table public.orders add column fudo_registrado_por uuid references auth.users (id) on delete set null;
create index orders_estado_created_idx on public.orders (estado, created_at desc);

create policy "admin: ver todos los pedidos" on public.orders
  for select to authenticated using (public.es_admin());
create policy "admin: ver detalle de todos los pedidos" on public.order_items
  for select to authenticated using (public.es_admin());
grant select (id, order_id, proveedor, estado, monto, moneda, created_at, updated_at) on public.payments to authenticated;
create policy "admin: ver pagos" on public.payments
  for select to authenticated using (public.es_admin());

-- cambiar_estado_pedido(): ahora también lo puede usar un administrador
-- marcar_registrado_fudo(pedido, registrado, n°_fudo): solo administradores
-- (SQL completo en Supabase → Database → Migrations)
