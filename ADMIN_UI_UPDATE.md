# TeleCod Admin UI Update

- `/admin/` is now the canonical Master Control UI.
- Admin layout is aligned with the TeleCod index visual language: glass header, gradient brand, ambient glow, rounded cards, purple/blue accents, dark/light mode, responsive mobile layout.
- Fixed asset paths for `admin/index.html` so `css/admin.css` and `js/admin.js` resolve from the `/admin/` directory.
- Root `admin.html` now redirects to `/admin/` to prevent duplicate/divergent admin layouts.
- Existing `js/admin.js` and Supabase logic are preserved.
