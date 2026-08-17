# TeleCod Production Frontend

## 1. Supabase
1. Open Supabase SQL Editor.
2. Run `database.sql`.
3. Ensure Authentication > Email is configured as desired.
4. Ensure Data API exposes the public tables/functions required by the app.
5. Add your production site URL to Authentication redirect/site URL settings.

## 2. Frontend
The frontend uses `@supabase/supabase-js` v2 in the browser. The supplied legacy anon JWT is placed in `assets/config.js`. Supabase documents that anon/publishable keys are intended for public client applications, while secret/service-role keys must remain backend-only.

## 3. Real flows already wired
- Supabase email/password registration.
- Supabase email/password login.
- Profile creation by database trigger.
- Public product marketplace.
- Authenticated seller product creation.
- Public PasteLink creation.
- Database-backed paste reading.
- Authenticated order records.
- Secure order creation RPC that derives price/seller from the database.
- RLS policies.

## 4. Payment
A real payment provider cannot be implemented from a Supabase URL + anon key alone. The payment provider's API credentials/webhook specification are required. The database already contains `payment_provider`, `payment_reference`, and `payment_url`, plus a `complete_paid_order()` RPC intended to be called only by a trusted backend/webhook after payment verification.

Do NOT put payment secret keys, Supabase service_role keys, or provider secrets into `assets/config.js`.

## 5. Telegram automatic membership
Automatic Channel VIP membership also requires a Telegram Bot/API integration and a server-side process. Store only the delivery reference/URL in the product. The trusted payment webhook should:
1. verify payment,
2. call `complete_paid_order`,
3. create/issue the Telegram access,
4. record the resulting access URL/reference.

## 6. Deploy
Upload the whole folder to your static host/Cloudflare Pages/Vercel/etc. No build step is required for the static version.
