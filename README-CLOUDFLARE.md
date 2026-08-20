

## Marketplace fee
Default fee is **20%**. Example: Rp10.000 sale -> Rp2.000 fee -> Rp8.000 seller net.
For production, set Cloudflare Pages environment variable `MARKET_FEE_PERCENT=20`.
Run `supabase/marketplace_fee.sql` in Supabase before using the fee ledger.
The frontend helper is display-only; the final balance update must be performed by the server/database transaction so users cannot manipulate the fee from the browser.

## Telegram marketplace
The marketplace now has a catalog model for Telegram code/bots and channels, with Free/Paid access types. Run `supabase/telegram_marketplace.sql`. Bot tokens must remain server-side/encrypted; the Admin Panel should be the control point for bot integrations, publishing, activation and moderation.
