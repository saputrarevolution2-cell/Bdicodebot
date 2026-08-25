-- ============================================================
-- TELECOD — PRE-FLIGHT / CONFLICT CHECK
-- ============================================================
-- SAFE: READ-ONLY. THIS FILE DOES NOT CREATE, ALTER, UPDATE OR DELETE.
-- Run this FIRST if you are unsure what already exists.
-- ============================================================

-- 1) Existing public objects
select
  n.nspname as schema_name,
  c.relname as object_name,
  case c.relkind
    when 'r' then 'table'
    when 'p' then 'partitioned table'
    when 'v' then 'view'
    when 'm' then 'materialized view'
    when 'f' then 'foreign table'
    else c.relkind::text
  end as object_type
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
order by c.relname;

-- 2) Objects that can cause the biggest table/view collision.
select
  c.relname,
  case c.relkind when 'r' then 'TABLE' when 'v' then 'VIEW' else c.relkind::text end as type
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname='marketplace_public';

-- 3) Duplicate profiles.
select lower(username) as username, count(*) total
from public.profiles
where username is not null and trim(username)<>''
group by lower(username)
having count(*)>1;

select lower(telegram_username) as telegram_username, count(*) total
from public.profiles
where telegram_username is not null and trim(telegram_username)<>''
group by lower(telegram_username)
having count(*)>1;

-- 4) Duplicate product slugs.
select lower(slug) as slug, count(*) total
from public.products
where slug is not null and trim(slug)<>''
group by lower(slug)
having count(*)>1;

-- 5) Duplicate payment references.
select order_id, count(*) total
from public.payments
where order_id is not null
group by order_id
having count(*)>1;

select provider_reference, count(*) total
from public.payments
where provider_reference is not null
group by provider_reference
having count(*)>1;

-- 6) Existing functions with duplicate signatures.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  count(*) over (
    partition by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)
  ) as same_signature_count
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
order by p.proname, arguments;

-- 7) Existing policies.
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname='public'
order by tablename, policyname;

-- 8) Existing triggers.
select
  n.nspname as schema_name,
  c.relname as table_name,
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid) as definition
from pg_trigger t
join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where not t.tgisinternal
  and n.nspname='public'
order by c.relname,t.tgname;

-- ============================================================
-- END — READ ONLY
-- ============================================================
