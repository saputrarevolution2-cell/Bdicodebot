# TeleCod — Final Premium Dark

TeleCod is a static-first Telegram digital marketplace with PasteLink, creator products, checkout, withdrawals and an admin control center.

## Included

- Premium Dark UI, responsive for mobile/desktop.
- Indonesian / English translation with language preference saved in browser.
- PasteLink with public, unlisted and private visibility.
- Password-protected PasteLink without exposing the stored password through public table reads.
- Marketplace for digital products.
- Seller / creator product publishing.
- Secure order creation through `create_order()` so price and seller are read from the database.
- Checkout page supporting manual QRIS mode and API mode.
- User balance and withdrawal request flow.
- Admin panel: payment settings, payment order queue, withdrawal queue, product moderation, PasteLink moderation, member roles and balance adjustments.
- Supabase RLS and security-definer RPCs for sensitive operations.
- Generic Supabase Edge Functions for payment creation and webhook handling.

## 1. Supabase database

Open Supabase SQL Editor and run **all of `database.sql`** from top to bottom.

After registering your own account, find its Auth user UUID and run:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR-AUTH-USER-UUID';
```

Do this only for trusted administrator accounts.

## 2. Frontend configuration

Edit `assets/config.js` only with the Supabase project URL and public anon/publishable key.

Never put these in the frontend:

- Supabase service-role key
- payment API secret
- payment webhook secret
- private merchant credentials

## 3. Manual payment

In **Admin Panel → Payment**:

1. Enable the payment setting in the database if needed.
2. Set `Mode` to `Manual QRIS`.
3. Set the QR image URL.
4. Set payment instructions.
5. Save.

The admin can see pending orders in the payment queue and mark a verified manual payment as **Paid**. The trusted database function then credits the seller and creates product access.

## 4. Automatic payment API

The frontend is intentionally not given payment secrets.

In **Admin Panel → Payment** configure:

- Provider name
- Mode = `API / Automatic`
- Merchant ID / public key if the provider needs one
- API endpoint

Then deploy the Edge Functions in:

- `supabase/functions/create-payment`
- `supabase/functions/payment-webhook`

Set these Supabase Edge Function secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYMENT_API_KEY`
- `PAYMENT_API_SECRET` (only if your provider needs it)
- `PAYMENT_WEBHOOK_SECRET`
- `PAYMENT_API_ENDPOINT` (optional fallback)

The generic `create-payment` function sends `{ order_id, amount, currency, product, callback_url }` to the configured provider endpoint and accepts common response fields such as `payment_url`, `checkout_url`, `invoice_url`, `reference`, or `invoice_id`.

**Important:** each payment provider has its own authentication, request payload, signature and webhook format. If you use BayarGG, Tripay, Xendit, Duitku, Midtrans, etc., adapt only the provider request/response mapping inside the Edge Function. Do not move the secret into `assets/config.js`.

## 5. Withdrawal

Users request withdrawals from their Dashboard.

Rules enforced in the database:

- Minimum Rp10.000.
- Balance is reserved immediately when the request is created.
- Only one pending/processing withdrawal per user.
- Rejected withdrawal returns the balance automatically.
- Admin controls processing / paid / rejected status.

## 6. Admin control

Open:

`admin.html`

The page checks the logged-in user's `profiles.role` and `profiles.status` before showing the control center.

Admin modules:

- Overview / system status
- Payment configuration
- Payment order queue
- Withdrawal management
- Product / Sell Link moderation
- PasteLink moderation
- Member role management
- Balance adjustment

## 7. Telegram delivery

For products that deliver Telegram channel access, the database stores the delivery reference. Automatic channel invite/member management still requires a Telegram bot/server integration.

Recommended production sequence:

1. Verify payment on the trusted backend/webhook.
2. Call `complete_paid_order()`.
3. Create/issue the Telegram access link with the bot.
4. Store the final access URL/reference in `product_access`.

## 8. Deploy

Static frontend:

- GitHub Pages
- Cloudflare Pages
- Vercel
- Netlify
- Any static hosting

Supabase:

- Database SQL
- Authentication settings
- Edge Functions for automatic payment

No frontend build step is required.
