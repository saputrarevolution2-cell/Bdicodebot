# TeleCod — Production Premium V2

TeleCod is a bilingual Telegram digital marketplace + PasteLink workspace with a creator dashboard, bot verification gate, secure paid-code delivery, BayarGG checkout, H+1 settlement, withdrawal queue, and admin control center.

## What was upgraded

- Premium responsive UI with dark/light mode and ID/EN language switching.
- Font Awesome icons and floating toast notifications for auth/payment/account events.
- Homepage can create a PasteLink immediately without registration.
- Homepage also has a direct marketplace search box.
- Marketplace categories for Telegram bot code, channel listings, drama/movie/anime/tools and other creator-defined categories.
- Creator-only Payment Link creation after login/registration.
- Bot Registry gate:
  - registered + active bot → code listing can publish immediately;
  - unknown bot → listing is stored as pending until admin approval/registration;
  - banned bot → related listings are archived and cannot be sold.
- Channel listings can publish immediately.
- Product code is stored in `product_secrets`, not in the public product row.
- Buyer gets the code only after a paid order is verified by the server.
- Platform fee is fixed at 20% for creator sales. Example: Rp10.000 sale → Rp8.000 creator net.
- Creator sale proceeds are pending for 24 hours and then become available for withdrawal (H+1).
- Withdrawal methods:
  - manual: fee Rp2.500;
  - instant: fee Rp10.000.
- Withdrawal requests appear in the admin queue.
- Dashboard contains available balance, pending balance, net earnings, sales, listings, notifications, purchases, PasteLinks and withdrawal controls.
- Profile contains Telegram/email identity, balance, pending settlement, creator assets and listing counts.
- Password reset:
  - email → Supabase email reset flow;
  - Telegram username → reset request is recorded for admin assistance. Never send plaintext passwords.
- BayarGG API checkout with hosted payment URL, QR payload when returned, webhook verification and payment-status polling.
- No demo members, demo products, demo orders or fake balances are seeded.

## Database

Run `database.sql` in Supabase SQL Editor. It is designed as a migration-safe production schema and includes the V2 additions.

The schema uses RLS and security-definer RPCs for privileged operations.

### First admin

Create your real Supabase account, then set the role once:

```sql
update public.profiles
set role='admin', status='active'
where id='YOUR-AUTH-USER-UUID';
```

Do not create a fake admin account in production.

### H+1 settlement scheduler

The database exposes:

```sql
select public.release_matured_settlements();
```

If `pg_cron` is enabled in your Supabase project, schedule it every 15 minutes:

```sql
select cron.schedule('telecod-release-h1','*/15 * * * *','select public.release_matured_settlements();');
```

The function is idempotent for each sale transaction.

## Frontend configuration

Edit only public values in `assets/config.js`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_AUTH_FUNCTION`

Never put Supabase service-role keys, BayarGG API keys, webhook secrets, or Telegram bot tokens in frontend files.

## BayarGG

The project is wired for the current BayarGG REST API flow:

- Create payment: `https://www.bayar.gg/api/create-payment.php`
- Check payment: `https://www.bayar.gg/api/check-payment.php`
- Webhook: `supabase/functions/payment-webhook`

Official API documentation: https://www.bayar.gg/api-docs

### Edge Function secrets

Set these in Supabase Edge Function secrets:

```text
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
APP_ORIGIN=https://your-domain.example
BAYARGG_API_KEY=...
BAYARGG_WEBHOOK_SECRET=...
BAYARGG_PAYMENT_METHOD=qris_bayar_gg
BAYARGG_PAYMENT_URL=https://www.bayar.gg/pay
TELEGRAM_BOT_TOKEN=...
TELEGRAM_ADMIN_CHAT_ID=...
```

Optional overrides:

```text
BAYARGG_API_ENDPOINT=https://www.bayar.gg/api/create-payment.php
BAYARGG_CHECK_ENDPOINT=https://www.bayar.gg/api/check-payment.php
```

BayarGG secrets stay server-side.

## Deploy Edge Functions

Deploy these functions:

- `telegram-auth`
- `create-payment`
- `check-payment`
- `payment-webhook`
- `notify-password-reset`

For example with Supabase CLI:

```bash
supabase functions deploy telegram-auth
supabase functions deploy create-payment
supabase functions deploy check-payment
supabase functions deploy payment-webhook
```

## Payment flow

1. Buyer clicks **Buy**.
2. `create_order()` creates a pending order.
3. Checkout calls `create-payment`.
4. Edge Function creates a BayarGG invoice and stores the invoice ID.
5. Buyer scans the QR / opens BayarGG hosted checkout.
6. BayarGG webhook is HMAC-verified server-side.
7. `complete_paid_order()` verifies the order amount and active listing.
8. Seller gets 80% into `pending_balance` with a 24-hour settlement timestamp.
9. Buyer can call `get_purchased_product()` only after the order is paid.
10. H+1 moves seller net earnings from pending to available balance.

## Creator approval flow

### Bot code

The creator submits:

- title
- category
- bot username
- price
- code
- setup instructions
- version
- thumbnail

The database checks `bot_registry`:

- `active` → publish immediately;
- missing/pending → save as pending;
- `banned` → archive and do not publish.

Admin can manage the registry from **Admin → Bot Registry**.

### Channel

Channel listings use the channel URL and can publish immediately. Admin can still manage the listing through the admin product controls.

## Security model

- Product code is separated from public product metadata.
- Public marketplace reads only `published + approved` listings.
- Paid code is delivered through a server-side RPC after a paid order exists.
- Payment completion is service-role only.
- BayarGG webhook signature is verified server-side.
- Payment amount is compared with the order amount before fulfillment.
- Seller cannot directly insert a product row; creator listing creation goes through `create_product_listing()`.
- Admin-only bot/product/withdrawal operations use protected RPCs.
- User balance is never directly writable from the browser.
- PasteLink content remains behind the existing `get_paste()` access RPC.

## Final production checklist

1. Configure the real Supabase project.
2. Run `database.sql`.
3. Set the first real admin.
4. Deploy the four Edge Functions above.
5. Set BayarGG secrets.
6. Set the BayarGG webhook URL to `https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/payment-webhook`.
7. Configure the Telegram Login domain in BotFather.
8. Enable Google OAuth if required.
9. Enable/schedule pg_cron for H+1 settlement.
10. Test a small real transaction end-to-end before public launch.
