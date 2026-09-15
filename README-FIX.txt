PasTele / TeleCod — FULL FIX PREMIUM
================================

This package keeps the existing project structure and data model.

FIXES INCLUDED
- One canonical database.sql: duplicate marketplace_public definitions removed.
- Marketplace view aligned to products, telegram_products, telegram_channels, pastelinks and pastes.
- Paid PasteLink content is NOT exposed by marketplace_public.
- Marketplace JS uses only columns/tables present in database.sql.
- Engagement counters use target_id + target_type to avoid cross-content collisions.
- Comments are read from content_comments; shares from analytics_events.
- Public marketplace works for guests; no authentication is required to browse.
- Share button and premium responsive marketplace cards added.
- Top Konten and Creator Populer rankings aligned with public marketplace data.
- Search/filter/pagination retained.
- Premium clean SaaS responsive visual layer for mobile and desktop.
- Cashi Cloudflare endpoints remain in functions/api/cashi/ and secrets must stay server-side.

SUPABASE
Use the public anon/publishable key only in browser code. Never expose service_role or Cashi secret keys.

SQL
Run only the root database.sql as the canonical database file. Do NOT run an additional marketplace_public patch afterward.

DEPLOY
Deploy the whole project as before. The marketplace page is /marketplace/ and its assets are /css/marketplace.css and /js/marketplace.js.
