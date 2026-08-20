export function onRequestGet({ env }) {
  return Response.json({
    supabaseUrl: env.SUPABASE_URL || "",
    supabaseAnonKey: env.SUPABASE_ANON_KEY || "",
    telegramBotUsername: env.TELEGRAM_BOT_USERNAME || "",
    siteUrl: env.SITE_URL || ""
  }, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
