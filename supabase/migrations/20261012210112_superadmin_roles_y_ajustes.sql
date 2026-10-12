-- Superadministrador: rol, ajustes generales y registro de cambios
alter table public.admins add column rol text not null default 'admin' check (rol in ('admin', 'superadmin'));

create or replace function public.es_superadmin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()) and a.rol = 'superadmin');
$$;
revoke execute on function public.es_superadmin() from public, anon;
grant execute on function public.es_superadmin() to authenticated;

create table public.app_settings (
  id smallint primary key default 1 check (id = 1),
  efectivo_prueba boolean not null default true,
  flow_modo text not null default 'sandbox' check (flow_modo in ('sandbox', 'produccion')),
  flow_api_key_id uuid,
  flow_secret_key_id uuid,
  flow_actualizado_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (1);
create trigger app_settings_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
grant select (id, efectivo_prueba) on public.app_settings to anon, authenticated;
create policy "ajustes públicos: lectura" on public.app_settings for select to anon, authenticated using (true);

create table public.config_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  accion text not null,
  detalle jsonb,
  created_at timestamptz not null default now()
);
create index config_log_created_idx on public.config_log (created_at desc);
alter table public.config_log enable row level security;
revoke all on public.config_log from anon, authenticated;

create or replace function public._exigir_superadmin()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_superadmin() then
    raise exception 'Solo el superadministrador puede hacer esto.' using errcode = '42501';
  end if;
end $$;
revoke execute on function public._exigir_superadmin() from public, anon, authenticated;

create or replace function public._registrar(p_accion text, p_detalle jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.config_log (user_id, accion, detalle) values ((select auth.uid()), p_accion, p_detalle);
$$;
revoke execute on function public._registrar(text, jsonb) from public, anon, authenticated;

update public.admins set rol = 'superadmin'
where user_id = (select id from auth.users where lower(email) = 'juandaniel30917@gmail.com');
