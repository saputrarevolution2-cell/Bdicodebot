# PasTele Final Sync

This build synchronizes the frontend with SUPABASE_MASTER_FINAL_FULL_FIX_IDEMPOTENT.sql and adds the final access rules requested:

- PasteLink / Code / Channel / Group support FREE and PAID.
- Guest can visit only FREE content.
- PAID detail payload is hidden until owner/admin/completed purchase.
- Guest can create FREE content through SECURITY DEFINER RPCs.
- PAID creation requires authentication.
- Navbar is sticky and replaces wallet amount with Telegram/Facebook/Instagram/YouTube icons.
- Footer uses a horizontal desktop grid.
- Notification long body has Read More support.
- Manual withdrawal form is visually/interaction disabled when the SQL schedule RPC reports closed.
- Final UI polish CSS is loaded last to reduce style collisions.
