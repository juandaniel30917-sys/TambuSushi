-- =====================================================================
-- Sucursales: cada pedido pertenece a una sucursal, con su propio
-- WhatsApp, horario y (más adelante) su propia conexión de caja (Fudo).
-- (Copia de la migración ya aplicada en el proyecto Supabase "Tambu Sushi")
-- =====================================================================
create table public.branches (
  id text primary key check (id ~ '^[a-z0-9-]{3,60}$'),
  nombre text not null,
  nombre_corto text not null,
  pais char(2) not null check (pais in ('CL', 'VE')),
  region text not null,
  ciudad text not null,
  direccion text not null,
  detalle text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{8,15}$'),
  telefono text,
  zona_horaria text not null,
  moneda char(3),
  precios_confirmados boolean not null default false,
  acepta_pago_en_linea boolean not null default false,   -- Webpay solo aplica en Chile
  referencia_caja text,                                  -- id de la sucursal en Fudo u otro sistema
  activa boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.branches is 'Sucursales de Tambú Sushi. Los datos públicos se muestran en la web.';
create trigger branches_updated_at before update on public.branches
  for each row execute function public.set_updated_at();

alter table public.branches enable row level security;
revoke insert, update, delete, truncate on public.branches from anon, authenticated;
create policy "sucursales activas: lectura pública" on public.branches
  for select to anon, authenticated using (activa);
-- La referencia de caja es interna: no se expone en la web
revoke select on public.branches from anon, authenticated;
grant select (id, nombre, nombre_corto, pais, region, ciudad, direccion, detalle, lat, lng, whatsapp, telefono,
              zona_horaria, moneda, precios_confirmados, acepta_pago_en_linea, activa, orden)
  on public.branches to anon, authenticated;

insert into public.branches (id, nombre, nombre_corto, pais, region, ciudad, direccion, detalle, lat, lng, zona_horaria, moneda, precios_confirmados, acepta_pago_en_linea, orden) values
  ('talca-go-florida',   'Mall Go Florida',                      'Go Florida',      'CL', 'Talca',     'Talca, Maule',      'Av. Colín 635, Talca',                 'Local por confirmar', -35.4439255, -71.6887679, 'America/Santiago', 'CLP', true,  true,  1),
  ('talca-portal-3',     'Mall Portal Centro · 3er piso',        'Portal 3er piso', 'CL', 'Talca',     'Talca, Maule',      '1 Sur 1537, Talca',                    'Tercer piso',         -35.4275679, -71.6544093, 'America/Santiago', 'CLP', true,  true,  2),
  ('talca-portal-4',     'Mall Portal Centro · 4to piso',        'Portal 4to piso', 'CL', 'Talca',     'Talca, Maule',      '1 Sur 1537, Talca',                    'Cuarto piso',         -35.4275679, -71.6544093, 'America/Santiago', 'CLP', true,  true,  3),
  ('talca-jumbo-rastras','Jumbo Las Rastras',                    'Las Rastras',     'CL', 'Talca',     'Talca, Maule',      'Calle 30 Oriente, Talca',              'Local por confirmar', -35.43188,   -71.627509,  'America/Santiago', 'CLP', true,  true,  4),
  ('ve-las-virtudes',    'C.C. Las Virtudes · Patio de comidas', 'Las Virtudes',    'VE', 'Venezuela', 'Punto Fijo, Falcón','Av. 6, Comunidad Cardón, Punto Fijo',  'Patio de comidas',     11.6580284, -70.2054868, 'America/Caracas',  null,  false, false, 5);

alter table public.orders add column sucursal_id text references public.branches (id);
create index orders_sucursal_id_idx on public.orders (sucursal_id);
comment on column public.orders.sucursal_id is 'Sucursal que prepara el pedido (elegida por el cliente o por cercanía).';
