-- Quitar acceso = desactivarlo (queda registro de quién tuvo acceso).
alter table public.admins add column activo boolean not null default true;
alter table public.branch_staff add column activo boolean not null default true;

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()) and a.activo);
$$;
create or replace function public.es_superadmin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()) and a.rol = 'superadmin' and a.activo);
$$;
create or replace function public.es_personal_de(p_sucursal text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.branch_staff s
    where s.user_id = (select auth.uid()) and s.sucursal_id = p_sucursal and s.activo
  );
$$;

alter policy "personal: ver su propia asignación" on public.branch_staff
  using (user_id = (select auth.uid()) and activo);

create or replace function public.asignar_rol(p_email text, p_rol text, p_sucursal text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid;
begin
  perform public._exigir_superadmin();
  select id into v_uid from auth.users where lower(email) = lower(trim(p_email));
  if v_uid is null then
    raise exception 'No existe una cuenta con ese correo. La persona debe crear su cuenta en la web primero.' using errcode = 'P0002';
  end if;
  if p_rol in ('admin', 'superadmin') then
    insert into public.admins (user_id, rol, activo) values (v_uid, p_rol, true)
      on conflict (user_id) do update set rol = excluded.rol, activo = true;
  elsif p_rol = 'personal' then
    if not exists (select 1 from public.branches where id = p_sucursal) then
      raise exception 'Elige una sucursal.' using errcode = '22023';
    end if;
    insert into public.branch_staff (user_id, sucursal_id, activo) values (v_uid, p_sucursal, true)
      on conflict (user_id, sucursal_id) do update set activo = true;
  else
    raise exception 'Rol inválido.' using errcode = '22023';
  end if;
  perform public._registrar('equipo_asignar', jsonb_build_object('email', lower(trim(p_email)), 'rol', p_rol, 'sucursal', p_sucursal));
end $$;
revoke execute on function public.asignar_rol(text, text, text) from public, anon;
grant execute on function public.asignar_rol(text, text, text) to authenticated;

create or replace function public.quitar_rol(p_user_id uuid, p_rol text, p_sucursal text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_superadmin();
  if p_rol in ('admin', 'superadmin') then
    if p_user_id = (select auth.uid()) then
      raise exception 'No puedes quitarte tu propio acceso de superadministrador.' using errcode = '42501';
    end if;
    update public.admins set activo = false where user_id = p_user_id;
  elsif p_rol = 'personal' then
    update public.branch_staff set activo = false where user_id = p_user_id and sucursal_id = p_sucursal;
  else
    raise exception 'Rol inválido.' using errcode = '22023';
  end if;
  perform public._registrar('equipo_quitar', jsonb_build_object('user_id', p_user_id, 'rol', p_rol, 'sucursal', p_sucursal));
end $$;
revoke execute on function public.quitar_rol(uuid, text, text) from public, anon;
grant execute on function public.quitar_rol(uuid, text, text) to authenticated;

create or replace function public.listar_equipo()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._exigir_superadmin();
  return jsonb_build_object(
    'admins', (select jsonb_agg(jsonb_build_object('user_id', a.user_id, 'email', u.email, 'rol', a.rol) order by a.created_at)
               from public.admins a join auth.users u on u.id = a.user_id where a.activo),
    'personal', (select jsonb_agg(jsonb_build_object('user_id', s.user_id, 'email', u.email, 'sucursal_id', s.sucursal_id) order by s.created_at)
                 from public.branch_staff s join auth.users u on u.id = s.user_id where s.activo)
  );
end $$;
revoke execute on function public.listar_equipo() from public, anon;
grant execute on function public.listar_equipo() to authenticated;
