
-- PasTele: login history + bot controls
create table if not exists public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ip_address inet,
  city text,
  region text,
  country text,
  latitude double precision,
  longitude double precision,
  user_agent text,
  logged_in_at timestamptz not null default now()
);
create index if not exists login_history_user_time_idx on public.login_history(user_id,logged_in_at desc);
alter table public.login_history enable row level security;
drop policy if exists "Users can read own login history" on public.login_history;
create policy "Users can read own login history" on public.login_history for select using (auth.uid()=user_id);

create or replace function public.record_login(
  p_city text default null,p_region text default null,p_country text default null,
  p_latitude double precision default null,p_longitude double precision default null,p_user_agent text default null
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v_ip text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  begin
    v_ip := coalesce(
      (current_setting('request.headers',true)::jsonb->>'x-forwarded-for'),
      (current_setting('request.headers',true)::jsonb->>'x-real-ip')
    );
  exception when others then v_ip := null;
  end;
  if v_ip is not null and position(',' in v_ip)>0 then v_ip:=split_part(v_ip,',',1); end if;
  insert into public.login_history(user_id,ip_address,city,region,country,latitude,longitude,user_agent)
  values(auth.uid(),nullif(trim(v_ip),'' )::inet,p_city,p_region,p_country,p_latitude,p_longitude,p_user_agent);
  return jsonb_build_object('ok',true);
exception when invalid_text_representation then
  insert into public.login_history(user_id,city,region,country,latitude,longitude,user_agent)
  values(auth.uid(),p_city,p_region,p_country,p_latitude,p_longitude,p_user_agent);
  return jsonb_build_object('ok',true);
end
$$;

create or replace function public.get_login_info() returns jsonb
language plpgsql security definer set search_path=public
as $$
declare a jsonb; b jsonb;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 select to_jsonb(x) into a from (
   select id,ip_address::text as ip_address,city,region,country,latitude,longitude,logged_in_at
   from public.login_history where user_id=auth.uid() order by logged_in_at desc limit 1
 ) x;
 select to_jsonb(x) into b from (
   select id,ip_address::text as ip_address,city,region,country,latitude,longitude,logged_in_at
   from public.login_history where user_id=auth.uid() order by logged_in_at desc offset 1 limit 1
 ) x;
 return jsonb_build_object('current',a,'last',b);
end
$$;

-- Only admins may toggle whether a bot appears in Create Code.
create or replace function public.admin_set_bot_active(p_bot_id uuid,p_active boolean)
returns jsonb language plpgsql security definer set search_path=public
as $$
begin
 perform public.assert_admin();
 update public.approved_bots set is_active=coalesce(p_active,false),updated_at=now() where id=p_bot_id;
 if not found then raise exception 'Bot tidak ditemukan'; end if;
 insert into public.admin_logs(admin_id,action,target_id,details)
 values(auth.uid(),'set_bot_active',p_bot_id,jsonb_build_object('active',p_active));
 return jsonb_build_object('ok',true);
end $$;
