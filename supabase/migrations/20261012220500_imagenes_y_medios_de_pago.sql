-- Fotos de la tienda (Supabase Storage) y medios de pago (Webpay on/off, Mercado Pago listo para conectar)

-- ---------- Fotos: carpeta pública «tienda». Solo el superadministrador sube, cambia o borra ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tienda', 'tienda', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])
on conflict (id) do nothing;

create policy "tienda: ver lista (superadmin)" on storage.objects for select to authenticated
  using (bucket_id = 'tienda' and public.es_superadmin());
create policy "tienda: subir (superadmin)" on storage.objects for insert to authenticated
  with check (bucket_id = 'tienda' and public.es_superadmin());
create policy "tienda: reemplazar (superadmin)" on storage.objects for update to authenticated
  using (bucket_id = 'tienda' and public.es_superadmin()) with check (bucket_id = 'tienda' and public.es_superadmin());
create policy "tienda: borrar (superadmin)" on storage.objects for delete to authenticated
  using (bucket_id = 'tienda' and public.es_superadmin());

-- ---------- Medios de pago ----------
alter table public.app_settings
  add column flow_activo boolean not null default true,
  add column mp_access_token_id uuid,
  add column mp_public_key text,
  add column mp_modo text not null default 'sandbox' check (mp_modo in ('sandbox', 'produccion')),
  add column mp_actualizado_at timestamptz;
grant select (flow_activo) on public.app_settings to anon, authenticated;

create or replace function public.actualizar_medios_pago(p_efectivo_prueba boolean, p_flow_activo boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_superadmin();
  update public.app_settings set efectivo_prueba = p_efectivo_prueba, flow_activo = p_flow_activo where id = 1;
  perform public._registrar('medios_pago', jsonb_build_object('efectivo_prueba', p_efectivo_prueba, 'webpay', p_flow_activo));
end $$;
revoke execute on function public.actualizar_medios_pago(boolean, boolean) from public, anon;
grant execute on function public.actualizar_medios_pago(boolean, boolean) to authenticated;

-- Mercado Pago: el Access Token queda cifrado en Vault (solo escritura desde la web).
create or replace function public.guardar_claves_mp(p_access_token text, p_public_key text, p_modo text)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.app_settings%rowtype;
  v_tok text := trim(coalesce(p_access_token, ''));
  v_pub text := trim(coalesce(p_public_key, ''));
begin
  perform public._exigir_superadmin();
  if p_modo not in ('sandbox', 'produccion') then raise exception 'Modo inválido.' using errcode = '22023'; end if;
  if v_tok !~ '^(APP_USR|TEST)-[A-Za-z0-9-]{20,250}$' then
    raise exception 'El Access Token de Mercado Pago empieza con APP_USR- o TEST-.' using errcode = '22023';
  end if;
  if v_pub !~ '^(APP_USR|TEST)-[A-Za-z0-9-]{20,120}$' then
    raise exception 'La Public Key de Mercado Pago empieza con APP_USR- o TEST-.' using errcode = '22023';
  end if;
  select * into s from public.app_settings where id = 1 for update;
  if s.mp_access_token_id is null then
    s.mp_access_token_id := vault.create_secret(v_tok, 'mp_access_token', 'Access Token de Mercado Pago');
  else
    perform vault.update_secret(s.mp_access_token_id, v_tok);
  end if;
  update public.app_settings set mp_access_token_id = s.mp_access_token_id, mp_public_key = v_pub,
    mp_modo = p_modo, mp_actualizado_at = now() where id = 1;
  perform public._registrar('mp_claves', jsonb_build_object('modo', p_modo, 'termina_en', right(v_pub, 4)));
end $$;
revoke execute on function public.guardar_claves_mp(text, text, text) from public, anon;
grant execute on function public.guardar_claves_mp(text, text, text) to authenticated;

create or replace function public.desconectar_mp()
returns void language plpgsql security definer set search_path = '' as $$
declare s public.app_settings%rowtype;
begin
  perform public._exigir_superadmin();
  select * into s from public.app_settings where id = 1 for update;
  if s.mp_access_token_id is not null then perform vault.update_secret(s.mp_access_token_id, 'desconectado'); end if;
  update public.app_settings set mp_access_token_id = null, mp_public_key = null, mp_actualizado_at = now() where id = 1;
  perform public._registrar('mp_desconectado', '{}'::jsonb);
end $$;
revoke execute on function public.desconectar_mp() from public, anon;
grant execute on function public.desconectar_mp() to authenticated;

-- Para la futura función de cobro con Mercado Pago (solo servidor)
create or replace function public.obtener_claves_mp()
returns table (access_token text, public_key text, modo text) language sql stable security definer set search_path = '' as $$
  select (select decrypted_secret from vault.decrypted_secrets where id = s.mp_access_token_id), s.mp_public_key, s.mp_modo
  from public.app_settings s where s.id = 1;
$$;
revoke execute on function public.obtener_claves_mp() from public, anon, authenticated;
grant execute on function public.obtener_claves_mp() to service_role;

-- Estado para el panel (incluye medios de pago)
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
    'flow_activo', s.flow_activo,
    'flow_actualizado_at', s.flow_actualizado_at,
    'efectivo_prueba', s.efectivo_prueba,
    'mp_configurado', s.mp_access_token_id is not null,
    'mp_public_key_termina_en', right(s.mp_public_key, 4),
    'mp_modo', s.mp_modo,
    'mp_actualizado_at', s.mp_actualizado_at,
    'puntos', (select jsonb_agg(jsonb_build_object('pais', l.pais, 'activo', l.activo, 'puntos_por_monto', l.puntos_por_monto, 'monto_base', l.monto_base) order by l.id) from public.loyalty_settings l),
    'sucursales', (select jsonb_agg(jsonb_build_object('id', b.id, 'nombre', b.nombre, 'pais', b.pais, 'whatsapp', b.whatsapp, 'telefono', b.telefono, 'activa', b.activa, 'acepta_pago_en_linea', b.acepta_pago_en_linea) order by b.orden) from public.branches b),
    'tasa_bs', (select jsonb_build_object('valor', p.tasa_secundaria, 'actualizada', p.tasa_actualizada_at) from public.paises p where p.codigo = 'VE'),
    'resumen', jsonb_build_object(
      'pedidos_hoy', (select count(*) from public.orders o where o.estado <> 'pendiente_pago' and o.created_at >= date_trunc('day', now() at time zone 'America/Santiago') at time zone 'America/Santiago'),
      'pendientes', (select count(*) from public.orders o where o.estado in ('pagado', 'en_preparacion', 'listo')),
      'ventas_hoy', (select coalesce(sum(o.total), 0) from public.orders o where o.moneda = 'CLP' and o.estado in ('pagado', 'en_preparacion', 'listo', 'entregado') and not o.es_prueba and o.created_at >= date_trunc('day', now() at time zone 'America/Santiago') at time zone 'America/Santiago'),
      'productos', (select count(*) from public.products p where p.activo and not p.archivado)),
    'historial', (select jsonb_agg(x) from (select jsonb_build_object('accion', c.accion, 'detalle', c.detalle, 'fecha', c.created_at, 'por', u.email) x
                   from public.config_log c left join auth.users u on u.id = c.user_id order by c.created_at desc limit 40) h)
  ) into r;
  return r;
end $$;
