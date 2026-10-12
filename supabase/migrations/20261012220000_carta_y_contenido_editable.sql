-- Panel del superadministrador: carta, promociones y contenido de la web editables.
-- Todo cambio pasa por funciones que verifican en el servidor que la cuenta sea superadministradora.

-- ---------- 1. Carta: campos que muestra la web ----------
alter table public.products
  add column descripcion_larga text check (descripcion_larga is null or char_length(descripcion_larga) <= 2000),
  add column precio_antes integer check (precio_antes is null or precio_antes >= 0),
  add column piezas integer check (piezas is null or (piezas > 0 and piezas <= 500)),
  add column ingredientes text[] not null default '{}',
  add column etiquetas text[] not null default '{}',
  add column imagenes text[] not null default '{}',
  add column destacado boolean not null default false,
  add column promo boolean not null default false,
  add column relevancia integer not null default 0,
  add column archivado boolean not null default false;

-- ---------- 2. Contenido de la web (textos, imágenes, menú, fuentes...) ----------
create table public.site_content (
  clave text primary key check (clave in ('textos','imagenes','menu','fuentes','categorias','marca','negocio','horario','faq','etiquetas')),
  valor jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table public.site_content enable row level security;
revoke all on public.site_content from anon, authenticated;
grant select on public.site_content to anon, authenticated;
create policy "contenido: lectura pública" on public.site_content for select to anon, authenticated using (true);

-- ---------- 3. Lectura pública en una sola consulta ----------
create or replace function public.contenido_publico()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'version', greatest((select max(updated_at) from public.products), (select max(updated_at) from public.site_content)),
    'productos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'pais', p.pais, 'categoria', p.categoria, 'nombre', p.nombre, 'descripcion', p.descripcion,
        'descripcion_larga', p.descripcion_larga, 'precio', p.precio, 'precio_antes', p.precio_antes, 'piezas', p.piezas,
        'ingredientes', to_jsonb(p.ingredientes), 'etiquetas', to_jsonb(p.etiquetas), 'imagenes', to_jsonb(p.imagenes),
        'opciones', p.opciones, 'destacado', p.destacado, 'promo', p.promo, 'relevancia', p.relevancia, 'demo', p.demo)
        order by p.relevancia desc, p.nombre)
      from public.products p where p.activo and not p.archivado), '[]'::jsonb),
    'contenido', coalesce((select jsonb_object_agg(c.clave, c.valor) from public.site_content c), '{}'::jsonb)
  );
$$;
revoke execute on function public.contenido_publico() from public;
grant execute on function public.contenido_publico() to anon, authenticated;

-- ---------- 4. Validación de direcciones de imágenes ----------
create or replace function public._imagen_valida(p_url text)
returns boolean language sql immutable set search_path = '' as $$
  select p_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/tienda/[A-Za-z0-9._/-]{1,200}$'
      or p_url ~ '^assets/images/[A-Za-z0-9._/-]{1,120}$';
$$;

-- ---------- 5. Carta: listar, guardar y archivar (solo superadministrador) ----------
create or replace function public.listar_productos_admin(p_archivados boolean default false)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._exigir_superadmin();
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', p.id, 'pais', p.pais, 'categoria', p.categoria, 'nombre', p.nombre, 'descripcion', p.descripcion,
      'descripcion_larga', p.descripcion_larga, 'precio', p.precio, 'precio_antes', p.precio_antes, 'piezas', p.piezas,
      'ingredientes', to_jsonb(p.ingredientes), 'etiquetas', to_jsonb(p.etiquetas), 'imagenes', to_jsonb(p.imagenes),
      'opciones', p.opciones, 'destacado', p.destacado, 'promo', p.promo, 'relevancia', p.relevancia, 'demo', p.demo,
      'activo', p.activo, 'archivado', p.archivado, 'updated_at', p.updated_at)
      order by p.pais, p.categoria, p.relevancia desc, p.nombre)
    from public.products p where p.archivado = p_archivados), '[]'::jsonb);
end $$;
revoke execute on function public.listar_productos_admin(boolean) from public, anon;
grant execute on function public.listar_productos_admin(boolean) to authenticated;

create or replace function public.guardar_producto(p jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_id text := p->>'id';
  v_pais text := p->>'pais';
  v_nombre text := trim(coalesce(p->>'nombre', ''));
  v_cat text := coalesce(p->>'categoria', '');
  v_precio integer; v_antes integer; v_piezas integer; v_rel integer;
  v_ops jsonb := coalesce(p->'opciones', '[]'::jsonb);
  v_ingr text[]; v_etiq text[]; v_imgs text[];
  g jsonb; v jsonb; x text;
begin
  perform public._exigir_superadmin();
  if v_id is null or v_id !~ '^[a-z0-9-]{3,80}$' then raise exception 'Código de producto inválido.' using errcode = '22023'; end if;
  if v_pais is null or v_pais not in ('CL', 'VE') then raise exception 'País inválido.' using errcode = '22023'; end if;
  if char_length(v_nombre) < 2 or char_length(v_nombre) > 120 then raise exception 'El nombre debe tener entre 2 y 120 caracteres.' using errcode = '22023'; end if;
  if v_cat !~ '^[a-z0-9-]{2,60}$' then raise exception 'Elige una categoría.' using errcode = '22023'; end if;
  if char_length(coalesce(p->>'descripcion', '')) > 300 then raise exception 'La descripción corta admite hasta 300 caracteres.' using errcode = '22023'; end if;
  if char_length(coalesce(p->>'descripcion_larga', '')) > 2000 then raise exception 'La descripción larga admite hasta 2000 caracteres.' using errcode = '22023'; end if;
  begin
    v_precio := (p->>'precio')::integer;
    v_antes := nullif(p->>'precio_antes', '')::integer;
    v_piezas := nullif(p->>'piezas', '')::integer;
    v_rel := coalesce(nullif(p->>'relevancia', '')::integer, 0);
  exception when others then
    raise exception 'Revisa los precios y las piezas: deben ser números enteros.' using errcode = '22023';
  end;
  if v_precio is null or v_precio < 0 or v_precio > 100000000 then raise exception 'Precio inválido.' using errcode = '22023'; end if;
  if v_antes is not null and v_antes <= v_precio then raise exception 'El precio «antes» debe ser mayor que el precio actual (o déjalo vacío).' using errcode = '22023'; end if;
  if v_piezas is not null and (v_piezas < 1 or v_piezas > 500) then raise exception 'Cantidad de piezas inválida.' using errcode = '22023'; end if;

  -- Opciones (lo que el servidor usa para cobrar los suplementos)
  if jsonb_typeof(v_ops) <> 'array' or jsonb_array_length(v_ops) > 10 then raise exception 'Máximo 10 grupos de opciones.' using errcode = '22023'; end if;
  for g in select * from jsonb_array_elements(v_ops) loop
    if jsonb_typeof(g) <> 'object' or coalesce(g->>'id', '') !~ '^[a-z0-9-]{1,40}$'
       or char_length(coalesce(g->>'nombre', '')) not between 1 and 60
       or coalesce(g->>'tipo', '') not in ('unica', 'multiple')
       or jsonb_typeof(g->'valores') is distinct from 'array'
       or jsonb_array_length(g->'valores') not between 1 and 30 then
      raise exception 'Revisa el grupo de opciones «%».', coalesce(g->>'nombre', '?') using errcode = '22023';
    end if;
    for v in select * from jsonb_array_elements(g->'valores') loop
      if jsonb_typeof(v) <> 'object' or coalesce(v->>'id', '') !~ '^[a-z0-9-]{1,40}$'
         or char_length(coalesce(v->>'nombre', '')) not between 1 and 80
         or jsonb_typeof(v->'extra') is distinct from 'number'
         or (v->>'extra')::numeric < 0 or (v->>'extra')::numeric > 10000000
         or (v->>'extra')::numeric <> trunc((v->>'extra')::numeric) then
        raise exception 'Revisa la opción «%» de «%».', coalesce(v->>'nombre', '?'), g->>'nombre' using errcode = '22023';
      end if;
    end loop;
  end loop;

  v_ingr := array(select left(trim(t), 60) from jsonb_array_elements_text(coalesce(p->'ingredientes', '[]'::jsonb)) t where trim(t) <> '' limit 30);
  v_etiq := array(select t from jsonb_array_elements_text(coalesce(p->'etiquetas', '[]'::jsonb)) t limit 6);
  foreach x in array v_etiq loop
    if x !~ '^[a-z0-9-]{1,40}$' then raise exception 'Etiqueta inválida.' using errcode = '22023'; end if;
  end loop;
  v_imgs := array(select t from jsonb_array_elements_text(coalesce(p->'imagenes', '[]'::jsonb)) t limit 8);
  foreach x in array v_imgs loop
    if not public._imagen_valida(x) then raise exception 'Una de las fotos no es válida. Súbela desde el panel.' using errcode = '22023'; end if;
  end loop;

  insert into public.products (id, pais, categoria, nombre, descripcion, descripcion_larga, precio, precio_antes, piezas,
    ingredientes, etiquetas, imagenes, opciones, destacado, promo, relevancia, activo, demo, archivado)
  values (v_id, v_pais, v_cat, v_nombre, nullif(trim(coalesce(p->>'descripcion', '')), ''), nullif(trim(coalesce(p->>'descripcion_larga', '')), ''),
    v_precio, v_antes, v_piezas, v_ingr, v_etiq, v_imgs, v_ops,
    coalesce((p->>'destacado')::boolean, false), coalesce((p->>'promo')::boolean, false), v_rel,
    coalesce((p->>'activo')::boolean, true), coalesce((p->>'demo')::boolean, false), false)
  on conflict (id) do update set
    pais = excluded.pais, categoria = excluded.categoria, nombre = excluded.nombre, descripcion = excluded.descripcion,
    descripcion_larga = excluded.descripcion_larga, precio = excluded.precio, precio_antes = excluded.precio_antes,
    piezas = excluded.piezas, ingredientes = excluded.ingredientes, etiquetas = excluded.etiquetas, imagenes = excluded.imagenes,
    opciones = excluded.opciones, destacado = excluded.destacado, promo = excluded.promo, relevancia = excluded.relevancia,
    activo = excluded.activo, demo = excluded.demo, archivado = false, updated_at = now();

  perform public._registrar('producto', jsonb_build_object('id', v_id, 'nombre', v_nombre, 'pais', v_pais, 'precio', v_precio));
  return v_id;
end $$;
revoke execute on function public.guardar_producto(jsonb) from public, anon;
grant execute on function public.guardar_producto(jsonb) to authenticated;

-- "Eliminar" = archivar: deja de verse y de poder comprarse; los pedidos antiguos conservan su detalle.
create or replace function public.archivar_producto(p_id text, p_archivar boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_superadmin();
  update public.products set archivado = p_archivar, activo = case when p_archivar then false else activo end, updated_at = now() where id = p_id;
  if not found then raise exception 'Producto no encontrado.' using errcode = 'P0002'; end if;
  perform public._registrar(case when p_archivar then 'producto_archivado' else 'producto_restaurado' end, jsonb_build_object('id', p_id));
end $$;
revoke execute on function public.archivar_producto(text, boolean) from public, anon;
grant execute on function public.archivar_producto(text, boolean) to authenticated;

-- ---------- 6. Guardar contenido (textos, imágenes, menú, fuentes, categorías...) ----------
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
revoke execute on function public.guardar_contenido(text, jsonb) from public, anon;
grant execute on function public.guardar_contenido(text, jsonb) to authenticated;
