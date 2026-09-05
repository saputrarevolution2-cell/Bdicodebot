-- ============================================================
-- TeleCod — SHORT PUBLIC URL TOKENS
-- Run this once in Supabase SQL Editor.
--
-- Public URL format:
-- PasteLink : /p/Ab3xQ
-- Code paid : /c/p/Z4aQx
-- Code free : /c/f/Z4aQx
-- Channel paid/free : /ch/p/... or /ch/f/...
-- Group paid/free   : /g/p/... or /g/f/...
-- ============================================================

alter table public.telegram_products
  add column if not exists slug text;

alter table public.telegram_channels
  add column if not exists slug text;

-- Existing records are left intact. New records receive a 5-char slug
-- from js/paste.js. Only non-empty values need uniqueness.
create unique index if not exists telegram_products_slug_uidx
  on public.telegram_products(slug)
  where slug is not null and btrim(slug) <> '';

create unique index if not exists telegram_channels_slug_uidx
  on public.telegram_channels(slug)
  where slug is not null and btrim(slug) <> '';

create index if not exists telegram_products_slug_idx
  on public.telegram_products(slug);

create index if not exists telegram_channels_slug_idx
  on public.telegram_channels(slug);

-- Optional: backfill old rows that do not yet have a public slug.
-- This generates 5 URL-safe characters. It is safe to run once.
do $$
declare
  r record;
  v_slug text;
begin
  for r in
    select id from public.telegram_products
    where slug is null or btrim(slug) = ''
  loop
    loop
      v_slug := substr(
        md5(random()::text || clock_timestamp()::text || r.id::text),
        1, 5
      );
      exit when not exists (
        select 1 from public.telegram_products p where p.slug = v_slug
      );
    end loop;

    update public.telegram_products
      set slug = v_slug
      where id = r.id;
  end loop;

  for r in
    select id from public.telegram_channels
    where slug is null or btrim(slug) = ''
  loop
    loop
      v_slug := substr(
        md5(random()::text || clock_timestamp()::text || r.id::text),
        1, 5
      );
      exit when not exists (
        select 1 from public.telegram_channels c where c.slug = v_slug
      );
    end loop;

    update public.telegram_channels
      set slug = v_slug
      where id = r.id;
  end loop;
end $$;
