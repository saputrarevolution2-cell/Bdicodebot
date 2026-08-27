# TeleCod NEON Frontend

Static Supabase frontend matching the requested file structure.

## Setup
1. Edit `js/supabase.js` and set `SUPABASE_URL` and `SUPABASE_ANON_KEY`, or define `window.TELECOD_SUPABASE_URL` and `window.TELECOD_SUPABASE_ANON_KEY` before loading it.
2. Host the folder on Cloudflare Pages, Netlify, Vercel, or any static host.
3. In Supabase Auth, add your deployed URL to Site URL / Redirect URLs.
4. Google login requires Google provider configuration in Supabase.

## Important security
Never put a Supabase service-role key in this frontend. Only the anon/public key belongs here. Sensitive admin operations are routed through the existing database RPCs and RLS.

## PasteLink
Uses the existing `pastelinks` table and supports title, author, HTML/text content, syntax, description, tags, visibility, expiry, comments/download/raw/timeline/anonymous flags, destination URL, copy and raw viewing.

## Translation
The base UI includes ID/EN language support via localStorage. Extend `LANGS` in `js/auth.js` and add `data-i18n` keys for additional languages.
