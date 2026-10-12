-- Corrige la validación de enlaces del menú (límite de repeticiones de expresiones regulares)
create or replace function public.guardar_contenido(p_clave text, p_valor jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare k text; v jsonb; x text;
  fuentes_ok text[] := array['Poppins','Inter','Montserrat','DM Sans','Outfit','Manrope','Space Grotesk','Plus Jakarta Sans',
    'Work Sans','Nunito Sans','Lato','Raleway','Josefin Sans','Playfair Display','Cormorant Garamond','Noto Serif JP',
    'Shippori Mincho','Zen Kaku Gothic New','Noto Sans JP','M PLUS Rounded 1c','Sawarabi Gothic'];
begin
  perform public._exigir_superadmin();
  if p_clave not in ('textos','imagenes','menu','fuentes','categorias','marca','negocio','horario','faq','etiquetas') then
    raise exception 'Sección desconocida.' using errcode = '22023';
  end if;
  if p_valor is null or pg_column_size(p_valor) > 300000 then raise exception 'El contenido es demasiado grande.' using errcode = '22023'; end if;
  if p_clave in ('menu', 'categorias') then
    if jsonb_typeof(p_valor) <> 'array' then raise exception 'Formato inválido.' using errcode = '22023'; end if;
  elsif jsonb_typeof(p_valor) <> 'object' then
    raise exception 'Formato inválido.' using errcode = '22023';
  end if;

  if p_clave = 'imagenes' then
    for k, v in select * from jsonb_each(p_valor) loop
      if jsonb_typeof(v) <> 'string' or (v #>> '{}' <> '' and not public._imagen_valida(v #>> '{}')) then
        raise exception 'Imagen inválida: %.', k using errcode = '22023';
      end if;
    end loop;
  elsif p_clave = 'menu' then
    for v in select * from jsonb_array_elements(p_valor) loop
      x := coalesce(v->>'href', '');
      if x !~ '^([a-z0-9-]+\.html(#[a-z0-9-]*)?|https://[^\s"<>]{3,250})$' or char_length(coalesce(v->>'texto', '')) not between 1 and 40 then
        raise exception 'Revisa el enlace «%» del menú.', coalesce(v->>'texto', '?') using errcode = '22023';
      end if;
    end loop;
  elsif p_clave = 'fuentes' then
    if not (coalesce(p_valor->>'titulo', 'Poppins') = any (fuentes_ok)) or not (coalesce(p_valor->>'texto', 'Inter') = any (fuentes_ok)) then
      raise exception 'Fuente no disponible.' using errcode = '22023';
    end if;
  elsif p_clave = 'textos' then
    for k, v in select * from jsonb_each(p_valor) loop
      if k !~ '^[a-z0-9._-]{1,80}$' or jsonb_typeof(v) <> 'string' or char_length(v #>> '{}') > 1500 then
        raise exception 'Texto inválido: %.', k using errcode = '22023';
      end if;
    end loop;
  end if;

  insert into public.site_content (clave, valor, updated_at, updated_by)
  values (p_clave, p_valor, now(), (select auth.uid()))
  on conflict (clave) do update set valor = excluded.valor, updated_at = now(), updated_by = excluded.updated_by;
  perform public._registrar('contenido', jsonb_build_object('seccion', p_clave));
end $$;
