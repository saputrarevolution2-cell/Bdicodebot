// Cloudflare Pages Function: GET /api/telegram-marketplace
// Public health/config endpoint. Secrets are never returned.
export function onRequestGet({ env }) {
  return Response.json({
    success: true,
    service: "telegram-marketplace",
    telegramBotUsername: env.TELEGRAM_BOT_USERNAME || "",
    siteUrl: env.SITE_URL || "",
    configured: Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY)
  }, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
