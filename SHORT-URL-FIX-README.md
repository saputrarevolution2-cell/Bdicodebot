# TeleCod Short Public URL Fix

Run `supabase/SHORT-PUBLIC-URL-FIX.sql` once.

New URLs:
- PasteLink: `/p/<5-char-token>`
- Code paid: `/c/p/<5-char-token>`
- Code free: `/c/f/<5-char-token>`
- Channel paid/free: `/ch/p/...` or `/ch/f/...`
- Group paid/free: `/g/p/...` or `/g/f/...`

The frontend now generates 5-character mixed alphanumeric tokens for new content,
stores them in Supabase, and redirects Cloudflare Pages short URLs to the existing
detail pages without exposing UUIDs.
