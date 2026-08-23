-- TeleCod Master Control Center
-- Run after schema.sql. These functions keep admin operations behind is_admin()/master session.

create or replace function public.admin_site_stats()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return coalesce((select jsonb_object_agg(key,value) from public.site_stats), '{}'::jsonb);
end; $$;

grant execute on function public.admin_site_stats() to authenticated;

create or replace function public.admin_logs(p_limit int default 200, p_offset int default 0)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return coalesce((select jsonb_agg(x) from (select id,admin_id,action,target_type,target_id,details,created_at from public.admin_logs order by created_at desc limit greatest(1,least(p_limit,1000)) offset greatest(0,p_offset)) x),'[]'::jsonb);
end; $$;

grant execute on function public.admin_logs(int,int) to authenticated;
