-- =====================================================================
-- TAMBÚ SUSHI · Clientes, pedidos y programa de puntos
-- Principio: el saldo de puntos NO es un número editable. Es la suma de
-- movimientos (points_ledger) que solo crea el servidor.
-- (Copia de la migración ya aplicada en el proyecto Supabase "Tambu Sushi")
-- =====================================================================

-- ---------- Tipos ----------
create type public.estado_pedido as enum ('pendiente_pago', 'pagado', 'en_preparacion', 'listo', 'entregado', 'cancelado');
create type public.modalidad_entrega as enum ('retiro', 'despacho');
create type public.tipo_movimiento as enum ('acumulacion', 'canje', 'reverso', 'ajuste', 'vencimiento');
create type public.estado_canje as enum ('solicitado', 'entregado', 'cancelado');
create type public.estado_pago as enum ('iniciado', 'autorizado', 'rechazado', 'anulado', 'error');

-- ---------- Utilidad: updated_at automático ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- Perfiles de clientes (1 por usuario de Supabase Auth) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '' check (char_length(nombre) <= 120),
  telefono text check (telefono is null or char_length(telefono) <= 30),
  fecha_nacimiento date,
  acepta_comunicaciones boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Datos del cliente. Se crea automáticamente al registrarse.';
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- Configuración del programa (una sola fila) ----------
create table public.loyalty_settings (
  id smallint primary key default 1 check (id = 1),
  activo boolean not null default false,
  puntos_por_monto integer not null default 1 check (puntos_por_monto >= 0),
  monto_base integer not null default 1000 check (monto_base > 0),
  meses_vigencia integer check (meses_vigencia is null or meses_vigencia > 0),
  updated_at timestamptz not null default now()
);
comment on table public.loyalty_settings is 'Reglas configurables: X puntos por cada monto_base pesos. activo=false mientras no se lance.';
create trigger loyalty_settings_updated_at before update on public.loyalty_settings
  for each row execute function public.set_updated_at();
insert into public.loyalty_settings (id) values (1);

-- ---------- Recompensas canjeables ----------
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 120),
  descripcion text,
  puntos_requeridos integer not null check (puntos_requeridos > 0),
  activo boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger rewards_updated_at before update on public.rewards
  for each row execute function public.set_updated_at();

-- ---------- Pedidos ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  user_id uuid references public.profiles (id) on delete set null,
  estado public.estado_pedido not null default 'pendiente_pago',
  modalidad public.modalidad_entrega not null default 'retiro',
  nombre_contacto text not null,
  telefono_contacto text not null,
  direccion text,
  observaciones text check (observaciones is null or char_length(observaciones) <= 300),
  subtotal integer not null check (subtotal >= 0),
  costo_despacho integer not null default 0 check (costo_despacho >= 0),
  descuento integer not null default 0 check (descuento >= 0),
  total integer not null check (total >= 0),
  referencia_externa text,          -- id del pedido en Fudo u otro sistema de caja
  pagado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.orders.referencia_externa is 'Identificador en el sistema de caja (Fudo u otro). La web no depende de él.';
create index orders_user_id_idx on public.orders (user_id);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  producto_id text not null,
  nombre text not null,
  cantidad integer not null check (cantidad between 1 and 99),
  precio_unitario integer not null check (precio_unitario >= 0),
  detalle text,
  opciones jsonb not null default '{}'::jsonb,
  subtotal integer generated always as (cantidad * precio_unitario) stored
);
create index order_items_order_id_idx on public.order_items (order_id);

-- ---------- Pagos (Webpay Plus u otro) ----------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  proveedor text not null default 'webpay_plus',
  token text not null unique,       -- token de la transacción: evita procesar dos veces
  estado public.estado_pago not null default 'iniciado',
  monto integer not null check (monto >= 0),
  codigo_autorizacion text,
  respuesta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order_id_idx on public.payments (order_id);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------- Canjes ----------
create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reward_id uuid not null references public.rewards (id),
  puntos integer not null check (puntos > 0),
  estado public.estado_canje not null default 'solicitado',
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index redemptions_user_id_idx on public.redemptions (user_id);
create index redemptions_reward_id_idx on public.redemptions (reward_id);
create index redemptions_order_id_idx on public.redemptions (order_id);
create trigger redemptions_updated_at before update on public.redemptions
  for each row execute function public.set_updated_at();

-- ---------- Libro de movimientos de puntos ----------
create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  puntos integer not null check (puntos <> 0),
  tipo public.tipo_movimiento not null,
  order_id uuid references public.orders (id) on delete set null,
  redemption_id uuid references public.redemptions (id) on delete set null,
  descripcion text,
  created_at timestamptz not null default now()
);
comment on table public.points_ledger is 'Fuente única del saldo. Solo el servidor inserta filas; nunca se editan ni se borran.';
create index points_ledger_user_id_idx on public.points_ledger (user_id, created_at desc);
create index points_ledger_order_id_idx on public.points_ledger (order_id);
create index points_ledger_redemption_id_idx on public.points_ledger (redemption_id);
-- Un pedido acumula una sola vez y se revierte una sola vez (protege contra notificaciones repetidas)
create unique index points_ledger_una_acumulacion_por_pedido on public.points_ledger (order_id) where tipo = 'acumulacion';
create unique index points_ledger_un_reverso_por_pedido on public.points_ledger (order_id) where tipo = 'reverso' and order_id is not null;
create unique index points_ledger_un_movimiento_por_canje on public.points_ledger (redemption_id, tipo) where redemption_id is not null;
