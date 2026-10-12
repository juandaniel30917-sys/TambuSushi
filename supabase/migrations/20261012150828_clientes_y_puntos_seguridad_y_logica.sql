-- =====================================================================
-- Seguridad (RLS + permisos) y lógica del programa de puntos
-- (Copia de la migración ya aplicada en el proyecto Supabase "Tambu Sushi")
-- =====================================================================

-- ---------- RLS en todas las tablas ----------
alter table public.profiles         enable row level security;
alter table public.loyalty_settings enable row level security;
alter table public.rewards          enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.payments         enable row level security;
alter table public.redemptions      enable row level security;
alter table public.points_ledger    enable row level security;

-- ---------- Permisos: el navegador solo LEE; las escrituras son del servidor ----------
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on public.payments from anon, authenticated;            -- pagos: nunca visibles desde la web
revoke select on public.profiles, public.orders, public.order_items, public.redemptions, public.points_ledger from anon;
-- El cliente puede editar solo estos campos de su perfil
grant update (nombre, telefono, fecha_nacimiento, acepta_comunicaciones) on public.profiles to authenticated;

-- ---------- Políticas ----------
create policy "perfil: ver el propio" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "perfil: editar el propio" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "reglas del programa: lectura pública" on public.loyalty_settings
  for select to anon, authenticated using (true);

create policy "recompensas activas: lectura pública" on public.rewards
  for select to anon, authenticated using (activo);

create policy "pedidos: ver los propios" on public.orders
  for select to authenticated using (user_id = (select auth.uid()));

create policy "detalle de pedidos: ver los propios" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );

create policy "canjes: ver los propios" on public.redemptions
  for select to authenticated using (user_id = (select auth.uid()));

create policy "movimientos: ver los propios" on public.points_ledger
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------- Perfil automático al registrarse ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nombre, telefono)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'nombre', ''), 120),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'telefono', ''), 30), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Cálculo de puntos según las reglas vigentes ----------
create or replace function public.calcular_puntos(p_monto integer)
returns integer language sql stable set search_path = '' as $$
  select coalesce((p_monto / s.monto_base) * s.puntos_por_monto, 0)
  from public.loyalty_settings s where s.id = 1;
$$;

-- ---------- Saldo del cliente que consulta (derivado de movimientos) ----------
create or replace function public.mi_saldo_puntos()
returns integer language sql stable security invoker set search_path = '' as $$
  select coalesce(sum(l.puntos), 0)::integer
  from public.points_ledger l
  where l.user_id = (select auth.uid());
$$;
revoke execute on function public.mi_saldo_puntos() from public, anon;
grant execute on function public.mi_saldo_puntos() to authenticated;

-- ---------- Acumular / revertir puntos según el estado del pedido ----------
-- Se dispara solo. Gracias a los índices únicos, aunque el pago se notifique
-- varias veces, un pedido acumula una sola vez y se revierte una sola vez.
create or replace function public.puntos_por_estado_pedido()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_activo boolean;
  v_puntos integer;
  v_acumulado integer;
begin
  if new.user_id is null then
    return new;
  end if;

  -- Pago confirmado: acumular
  if new.estado = 'pagado' and (tg_op = 'INSERT' or old.estado is distinct from 'pagado') then
    select activo into v_activo from public.loyalty_settings where id = 1;
    if v_activo then
      v_puntos := public.calcular_puntos(new.total - new.descuento);
      if v_puntos > 0 then
        insert into public.points_ledger (user_id, puntos, tipo, order_id, descripcion)
        values (new.user_id, v_puntos, 'acumulacion', new.id, 'Pedido #' || new.numero)
        on conflict do nothing;
      end if;
    end if;
  end if;

  -- Pedido cancelado después de acumular: revertir
  if new.estado = 'cancelado' and tg_op = 'UPDATE' and old.estado is distinct from 'cancelado' then
    select puntos into v_acumulado from public.points_ledger
      where order_id = new.id and tipo = 'acumulacion';
    if v_acumulado is not null then
      insert into public.points_ledger (user_id, puntos, tipo, order_id, descripcion)
      values (new.user_id, -v_acumulado, 'reverso', new.id, 'Pedido #' || new.numero || ' cancelado')
      on conflict do nothing;
    end if;
  end if;

  return new;
end $$;
revoke execute on function public.puntos_por_estado_pedido() from public, anon, authenticated;

create trigger orders_puntos
  after insert or update of estado on public.orders
  for each row execute function public.puntos_por_estado_pedido();

-- ---------- Canjear una recompensa (lo llama el cliente con sesión) ----------
create or replace function public.canjear_recompensa(p_reward_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_activo boolean;
  v_reward public.rewards%rowtype;
  v_saldo integer;
  v_canje uuid;
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión para canjear.' using errcode = '28000';
  end if;

  select activo into v_activo from public.loyalty_settings where id = 1;
  if not coalesce(v_activo, false) then
    raise exception 'El programa de puntos aún no está activo.' using errcode = 'P0001';
  end if;

  select * into v_reward from public.rewards where id = p_reward_id and activo;
  if not found then
    raise exception 'Recompensa no disponible.' using errcode = 'P0002';
  end if;

  -- Evita dos canjes simultáneos del mismo cliente
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  select coalesce(sum(puntos), 0) into v_saldo from public.points_ledger where user_id = v_uid;
  if v_saldo < v_reward.puntos_requeridos then
    raise exception 'Puntos insuficientes.' using errcode = 'P0003';
  end if;

  insert into public.redemptions (user_id, reward_id, puntos)
  values (v_uid, v_reward.id, v_reward.puntos_requeridos)
  returning id into v_canje;

  insert into public.points_ledger (user_id, puntos, tipo, redemption_id, descripcion)
  values (v_uid, -v_reward.puntos_requeridos, 'canje', v_canje, 'Canje: ' || v_reward.nombre);

  return v_canje;
end $$;
revoke execute on function public.canjear_recompensa(uuid) from public, anon;
grant execute on function public.canjear_recompensa(uuid) to authenticated;

-- ---------- Anular un canje (solo el local / servidor) ----------
create or replace function public.anular_canje(p_redemption_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_r public.redemptions%rowtype;
begin
  select * into v_r from public.redemptions where id = p_redemption_id for update;
  if not found or v_r.estado = 'cancelado' then
    return;
  end if;
  update public.redemptions set estado = 'cancelado' where id = v_r.id;
  insert into public.points_ledger (user_id, puntos, tipo, redemption_id, descripcion)
  values (v_r.user_id, v_r.puntos, 'reverso', v_r.id, 'Canje anulado')
  on conflict do nothing;
end $$;
revoke execute on function public.anular_canje(uuid) from public, anon, authenticated;

-- calcular_puntos es inofensiva (solo lee reglas públicas)
revoke execute on function public.calcular_puntos(integer) from public;
grant execute on function public.calcular_puntos(integer) to anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- ---------- Datos iniciales (ejemplos, editables desde el panel de Supabase) ----------
-- insert into public.rewards (nombre, descripcion, puntos_requeridos, orden) values
--   ('Salsa adicional', 'Ejemplo ilustrativo', 100, 1),
--   ('Bebida', 'Ejemplo ilustrativo', 200, 2),
--   ('Hand roll', 'Ejemplo ilustrativo', 400, 3),
--   ('Descuento en tabla', 'Ejemplo ilustrativo', 800, 4);
