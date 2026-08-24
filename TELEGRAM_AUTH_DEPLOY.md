# TeleCod — Telegram Auth Deployment

## Supabase Edge Function
Deploy `supabase/functions/telegram-login` as `telegram-login`.

Required Supabase secrets:

- `TELEGRAM_BOT_TOKEN` — token from @BotFather for `@telecodrobot`
- `TELECOD_SITE_URL` — your production site, for example `https://telecod.biz.id`
- `ADMIN_TELEGRAM_ID` — master Telegram ID (currently `6665664367` in the frontend config)

The function also accepts `SUPABASE_SERVICE_ROLE_KEY` or `SERVICE_ROLE_KEY` for the service-role key.

## BotFather

For Telegram Login Widget, the website domain must be registered for the same bot in BotFather. Register the bare domain, e.g. `telecod.biz.id`, not the Supabase function URL.

## Deploy

From the project root:

```bash
supabase functions deploy telegram-login --no-verify-jwt
```

If using the Supabase Dashboard, replace the contents of:

`supabase/functions/telegram-login/index.ts`

and deploy the function with JWT verification disabled. The included `config.toml` already contains:

```toml
[functions.telegram-login]
verify_jwt = false
```

## Important

Do not put `TELEGRAM_BOT_TOKEN` or a Supabase service-role key into `js/config.js` or any browser file.
