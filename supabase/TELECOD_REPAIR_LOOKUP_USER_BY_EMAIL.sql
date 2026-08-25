-- TELECOD — REPAIR lookup_user_by_email
-- Safe: drops ONLY the function with signature (text), not any table or data.

drop function if exists public.lookup_user_by_email(text);

create or replace function public.lookup_user_by_email(p_email text)
returns table(
  id uuid,
  username text,
  display_name text,
  is_banned boolean
)
language sql
stable
security definer
set search_path=public
as $$
  select
    p.id,
    p.username,
    p.display_name,
    coalesce(p.is_banned,false)
  from public.profiles p
  join auth.users u on u.id=p.id
  where lower(u.email)=lower(trim(p_email))
  limit 1;
$$;

grant execute on function public.lookup_user_by_email(text) to anon, authenticated;

-- Verify the resulting signature:
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname='lookup_user_by_email';
