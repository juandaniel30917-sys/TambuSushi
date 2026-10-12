-- Claves de Flow en Vault (solo escritura desde la web) y funciones de configuración
create or replace function public.guardar_claves_flow(p_api_key text, p_secret_key text, p_modo text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.app_settings%rowtype;
  v_api text := trim(coalesce(p_api_key, ''));
  v_sec text := trim(coalesce(p_secret_key, ''));
begin
  perform public._exigir_superadmin();
  if p_modo not in ('sandbox', 'produccion') then
    raise exception 'Modo inválido.' using errcode = '22023';
  end if;
  if length(v_api) < 10 or length(v_api) > 200 or length(v_sec) < 10 or length(v_sec) > 200 then
    raise exception 'Las claves de Flow no tienen un formato válido.' using errcode = '22023';
  end if;
  select * into s from public.app_settings where id = 1 for update;
  if s.flow_api_key_id is null then
    s.flow_api_key_id := vault.create_secret(v_api, 'flow_api_key', 'API Key de Flow');
  else
    perform vault.update_secret(s.flow_api_key_id, v_api);
  end if;
  if s.flow_secret_key_id is null then
    s.flow_secret_key_id := vault.create_secret(v_sec, 'flow_secret_key', 'Secret Key de Flow');
  else
    perform vault.update_secret(s.flow_secret_key_id, v_sec);
  end if;
  update public.app_settings set flow_api_key_id = s.flow_api_key_id, flow_secret_key_id = s.flow_secret_key_id,
    flow_modo = p_modo, flow_actualizado_at = now() where id = 1;
  perform public._registrar('flow_claves', jsonb_build_object('modo', p_modo, 'api_key_termina_en', right(v_api, 4)));
end $$;
revoke execute on function public.guardar_claves_flow(text, text, text) from public, anon;
grant execute on function public.guardar_claves_flow(text, text, text) to authenticated;

-- "Desconectar Flow": deja de usar las claves (el registro en Vault se reemplaza al guardar nuevas)
create or replace function public.desconectar_flow()
returns void language plpgsql security definer set search_path = '' as $$
declare s public.app_settings%rowtype;
begin
  perform public._exigir_superadmin();
  select * into s from public.app_settings where id = 1 for update;
  if s.flow_api_key_id is not null then perform vault.update_secret(s.flow_api_key_id, 'desconectado'); end if;
  if s.flow_secret_key_id is not null then perform vault.update_secret(s.flow_secret_key_id, 'desconectado'); end if;
  update public.app_settings set flow_api_key_id = null, flow_secret_key_id = null, flow_actualizado_at = now() where id = 1;
  perform public._registrar('flow_desconectado', '{}'::jsonb);
end $$;
revoke execute on function public.desconectar_flow() from public, anon;
grant execute on function public.desconectar_flow() to authenticated;

-- Solo para las funciones del servidor (service_role). Nunca para la web.
create or replace function public.obtener_claves_flow()
returns table (api_key text, secret_key text, modo text) language sql stable security definer set search_path = '' as $$
  select (select decrypted_secret from vault.decrypted_secrets where id = s.flow_api_key_id),
         (select decrypted_secret from vault.decrypted_secrets where id = s.flow_secret_key_id),
         s.flow_modo
  from public.app_settings s where s.id = 1;
$$;
revoke execute on function public.obtener_claves_flow() from public, anon, authenticated;
grant execute on function public.obtener_claves_flow() to service_role;

create or replace function public.estado_configuracion()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare s public.app_settings%rowtype; r jsonb;
begin
  perform public._exigir_superadmin();
  select * into s from public.app_settings where id = 1;
  select jsonb_build_object(
    'flow_configurado', s.flow_api_key_id is not null and s.flow_secret_key_id is not null,
    'flow_api_key_termina_en', (select right(decrypted_secret, 4) from vault.decrypted_secrets where id = s.flow_api_key_id),
    'flow_modo', s.flow_modo,
    'flow_actualizado_at', s.flow_actualizado_at,
    'efectivo_prueba', s.efectivo_prueba,
    'puntos', (select jsonb_agg(jsonb_build_object('pais', l.pais, 'activo', l.activo, 'puntos_por_monto', l.puntos_por_monto, 'monto_base', l.monto_base) order by l.id) from public.loyalty_settings l),
    'sucursales', (select jsonb_agg(jsonb_build_object('id', b.id, 'nombre', b.nombre, 'pais', b.pais, 'whatsapp', b.whatsapp, 'telefono', b.telefono, 'activa', b.activa, 'acepta_pago_en_linea', b.acepta_pago_en_linea) order by b.orden) from public.branches b),
    'tasa_bs', (select jsonb_build_object('valor', p.tasa_secundaria, 'actualizada', p.tasa_actualizada_at) from public.paises p where p.codigo = 'VE'),
    'historial', (select jsonb_agg(x) from (select jsonb_build_object('accion', c.accion, 'detalle', c.detalle, 'fecha', c.created_at, 'por', u.email) x
                   from public.config_log c left join auth.users u on u.id = c.user_id order by c.created_at desc limit 20) h)
  ) into r;
  return r;
end $$;
revoke execute on function public.estado_configuracion() from public, anon;
grant execute on function public.estado_configuracion() to authenticated;

create or replace function public.actualizar_ajustes(p_efectivo_prueba boolean, p_flow_modo text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_superadmin();
  if p_flow_modo not in ('sandbox', 'produccion') then raise exception 'Modo inválido.' using errcode = '22023'; end if;
  update public.app_settings set efectivo_prueba = p_efectivo_prueba, flow_modo = p_flow_modo where id = 1;
  perform public._registrar('ajustes', jsonb_build_object('efectivo_prueba', p_efectivo_prueba, 'flow_modo', p_flow_modo));
end $$;
revoke execute on function public.actualizar_ajustes(boolean, text) from public, anon;
grant execute on function public.actualizar_ajustes(boolean, text) to authenticated;

create or replace function public.actualizar_sucursal(p_id text, p_whatsapp text, p_telefono text, p_activa boolean, p_pago_en_linea boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_wa text := nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), '');
        v_pais char(2);
begin
  perform public._exigir_superadmin();
  if v_wa is not null and (length(v_wa) < 8 or length(v_wa) > 15) then
    raise exception 'El WhatsApp debe tener entre 8 y 15 dígitos, con código de país.' using errcode = '22023';
  end if;
  select pais into v_pais from public.branches where id = p_id;
  if v_pais is null then raise exception 'Sucursal no encontrada.' using errcode = 'P0002'; end if;
  update public.branches set whatsapp = v_wa, telefono = nullif(left(trim(coalesce(p_telefono, '')), 30), ''),
    activa = p_activa, acepta_pago_en_linea = (p_pago_en_linea and v_pais = 'CL') where id = p_id;
  perform public._registrar('sucursal', jsonb_build_object('id', p_id, 'whatsapp', v_wa, 'activa', p_activa, 'pago_en_linea', p_pago_en_linea and v_pais = 'CL'));
end $$;
revoke execute on function public.actualizar_sucursal(text, text, text, boolean, boolean) from public, anon;
grant execute on function public.actualizar_sucursal(text, text, text, boolean, boolean) to authenticated;

create or replace function public.actualizar_puntos(p_pais char, p_activo boolean, p_puntos_por_monto integer, p_monto_base integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_superadmin();
  if p_puntos_por_monto < 0 or p_puntos_por_monto > 1000 or p_monto_base < 1 then
    raise exception 'Valores de puntos inválidos.' using errcode = '22023';
  end if;
  update public.loyalty_settings set activo = p_activo, puntos_por_monto = p_puntos_por_monto, monto_base = p_monto_base where pais = p_pais;
  if not found then raise exception 'País no encontrado.' using errcode = 'P0002'; end if;
  perform public._registrar('puntos', jsonb_build_object('pais', p_pais, 'activo', p_activo, 'puntos_por_monto', p_puntos_por_monto, 'monto_base', p_monto_base));
end $$;
revoke execute on function public.actualizar_puntos(char, boolean, integer, integer) from public, anon;
grant execute on function public.actualizar_puntos(char, boolean, integer, integer) to authenticated;

create or replace function public.actualizar_tasa_bs(p_tasa numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_superadmin();
  if p_tasa is not null and (p_tasa <= 0 or p_tasa > 100000000) then raise exception 'Tasa inválida.' using errcode = '22023'; end if;
  update public.paises set tasa_secundaria = p_tasa where codigo = 'VE';
  perform public._registrar('tasa_bs', jsonb_build_object('tasa', p_tasa));
end $$;
revoke execute on function public.actualizar_tasa_bs(numeric) from public, anon;
grant execute on function public.actualizar_tasa_bs(numeric) to authenticated;

-- listar_equipo() y asignar_rol(): versión final en 20261012210223_superadmin_quitar_acceso.sql
