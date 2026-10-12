-- Al entrar con Google, el nombre llega como full_name o name (no como "nombre")
-- (Copia de la migración ya aplicada en el proyecto Supabase "Tambu Sushi")
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nombre, telefono)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'nombre', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      ''
    ), 120),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'telefono', ''), 30), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
