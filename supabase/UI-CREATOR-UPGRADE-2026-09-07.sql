-- PasTele UI/Creator upgrade migration — 2026-09-07
begin;
alter table public.profiles add column if not exists country text;
create index if not exists profiles_country_idx on public.profiles(country);
create table if not exists public.content_comments (
 id uuid primary key default gen_random_uuid(), target_id uuid not null, target_type text not null default 'product',
 user_id uuid references auth.users(id) on delete set null, body text not null check(length(trim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index if not exists content_comments_target_idx on public.content_comments(target_id,created_at desc);
alter table public.content_comments enable row level security;
drop policy if exists content_comments_public_read on public.content_comments;
create policy content_comments_public_read on public.content_comments for select using(true);
drop policy if exists content_comments_insert_own on public.content_comments;
create policy content_comments_insert_own on public.content_comments for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists content_comments_update_own on public.content_comments;
create policy content_comments_update_own on public.content_comments for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists content_comments_delete_own on public.content_comments;
create policy content_comments_delete_own on public.content_comments for delete to authenticated using(auth.uid()=user_id);
grant select on public.content_comments to anon,authenticated;
grant insert,update,delete on public.content_comments to authenticated;
drop policy if exists follows_authenticated_insert on public.creator_followers;
create policy follows_authenticated_insert on public.creator_followers for insert to authenticated with check(auth.uid()=follower_id and creator_id<>follower_id);
drop policy if exists follows_authenticated_delete on public.creator_followers;
create policy follows_authenticated_delete on public.creator_followers for delete to authenticated using(auth.uid()=follower_id);

-- My Links: allow owners to delete their own Telegram content.
drop policy if exists telegram_products_own_delete on public.telegram_products;
create policy telegram_products_own_delete on public.telegram_products for delete to authenticated using(auth.uid()=owner_id);
drop policy if exists telegram_channels_own_delete on public.telegram_channels;
create policy telegram_channels_own_delete on public.telegram_channels for delete to authenticated using(auth.uid()=owner_id);

-- Marketplace products already use creator/seller ownership policies in the base migration.

drop view if exists public.profile_public;
create view public.profile_public as select id,username,display_name,avatar_url,country,created_at from public.profiles;
grant select on public.profile_public to anon,authenticated;
commit;
