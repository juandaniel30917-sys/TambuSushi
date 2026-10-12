-- =====================================================================
-- Países (Chile / Venezuela): moneda, tasa de bolívares y pedidos en USD.
-- Los montos se guardan como enteros en la unidad mínima de la moneda:
--   CLP -> pesos      (12990 = $12.990)
--   USD -> centavos   (850   = US$ 8,50)
-- (Copia de la migración ya aplicada en el proyecto Supabase "Tambu Sushi")
-- =====================================================================
update public.branches set region = 'Chile' where pais = 'CL';
update public.branches set moneda = 'USD', precios_confirmados = true where pais = 'VE';

create table public.paises (
  codigo char(2) primary key check (codigo in ('CL', 'VE')),
  nombre text not null,
  moneda char(3) not null,
  moneda_secundaria char(3),
  tasa_secundaria numeric(14, 4) check (tasa_secundaria is null or tasa_secundaria > 0),
  tasa_actualizada_at timestamptz,
  updated_at timestamptz not null default now()
);
comment on column public.paises.tasa_secundaria is 'Venezuela: bolívares por 1 dólar. Actualizar cada día; la web muestra el equivalente en Bs.';
create trigger paises_updated_at before update on public.paises
  for each row execute function public.set_updated_at();

create or replace function public.marcar_tasa_actualizada()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.tasa_secundaria is distinct from old.tasa_secundaria then
    new.tasa_actualizada_at := now();
  end if;
  return new;
end $$;
revoke execute on function public.marcar_tasa_actualizada() from public, anon, authenticated;
create trigger paises_tasa_fecha before update on public.paises
  for each row execute function public.marcar_tasa_actualizada();

alter table public.paises enable row level security;
revoke insert, update, delete, truncate on public.paises from anon, authenticated;
create policy "paises: lectura pública" on public.paises for select to anon, authenticated using (true);

insert into public.paises (codigo, nombre, moneda, moneda_secundaria) values
  ('CL', 'Chile', 'CLP', null),
  ('VE', 'Venezuela', 'USD', 'VES');

alter table public.branches
  add constraint branches_pais_fkey foreign key (pais) references public.paises (codigo);

alter table public.orders add column moneda char(3) not null default 'CLP' check (moneda in ('CLP', 'USD'));
comment on column public.orders.total is 'Unidad mínima de la moneda: pesos (CLP) o centavos (USD).';
alter table public.payments add column moneda char(3) not null default 'CLP' check (moneda in ('CLP', 'USD'));

-- Puntos: por ahora solo pedidos en pesos chilenos
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

  if new.estado = 'pagado' and new.moneda = 'CLP' and (tg_op = 'INSERT' or old.estado is distinct from 'pagado') then
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
