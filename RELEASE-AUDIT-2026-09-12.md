# PasTele Release Audit — 2026-09-12

## Release cleanup
- Removed `patch.py` and `patch2.py` (development-only patch scripts).
- Removed stray `css/css` artifact.
- Canonical theme files: `js/theme-preload.js` + `js/theme.js`.
- Removed duplicated inline theme implementations from HTML pages.

## Theme
- Default mode: `auto`.
- 06:00–17:59: light.
- 18:00–05:59: dark.
- Manual: auto / light / dark / system.
- Theme is persisted in `localStorage` key `pastele-theme`.

## Session
- Authenticated pages: 24 hours of inactivity.
- Activity events refresh the inactivity timestamp.
- Session is checked on page load, tab return, and every minute.
- Expired/no-auth sessions are shown a login prompt.

## Navigation
- Public standalone pages can explicitly hide the navbar.
- Authenticated navbar requires a valid Supabase user.
- Navbar theme control uses the same canonical theme manager.

## Validation
- All HTML pages: one html/head/body structure.
- All local CSS/JS references: resolved.
- All JS files: passed `node --check`.
