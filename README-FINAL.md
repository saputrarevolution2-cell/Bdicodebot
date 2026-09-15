# PasTele Final SaaS Build

This build keeps the existing page structure and Settings page untouched as the visual reference.

## Database
Run `database.sql` in Supabase SQL Editor.

Financial rules enforced server-side:
- Creator marketplace revenue: 70%
- Platform share: 30%
- Creator settlement: exactly H+2 / 48 hours after verified payment
- Manual withdrawal: Monday-Friday 09:00-17:00 WIB
- Saturday and Sunday: manual withdrawal closed
- Manual minimum: Rp100.000
- Manual daily requests: Free 1x, Subscription 2x, Premium 5x
- Manual fee: Free/Subscription Rp7.000, Premium Rp2.000
- Instant daily limit: Free Rp100.000, Subscription Rp300.000, Premium Rp500.000
- Instant fee: Free Rp15.000, Subscription Rp13.000, Premium Rp10.000
- Instant withdrawal remains available 24/7

## Frontend
The page-specific JavaScript from the last functional build is restored so the HTML pages actually call the database RPCs they use. CSS receives an additive SaaS polish layer. `settings.css` is intentionally not modified.

Never put Supabase `service_role` or other secrets in browser JavaScript.
