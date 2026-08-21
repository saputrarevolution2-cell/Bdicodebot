// TeleCod frontend configuration.
// Replace the empty values with your real public Supabase/Telegram settings before production auth.
// NEVER put Supabase service-role keys, bot tokens, payment secrets, or webhook secrets here.

window.TELECOD_CONFIG={
  SUPABASE_URL:"https://qrhbgffmqorzbcfvnbkk.supabase.co",

  SUPABASE_ANON_KEY:"YOUR_ANON_KEY",

  TELEGRAM_BOT_USERNAME:"mktplbot",

  TELEGRAM_AUTH_FUNCTION_URL:"https://qrhbgffmqorzbcfvnbkk.supabase.co/functions/v1/telegram-login",

  USERNAME_AUTH_FUNCTION_URL:"https://qrhbgffmqorzbcfvnbkk.supabase.co/functions/v1/username-auth",

  MARKETPLACE_FUNCTION_URL:"https://qrhbgffmqorzbcfvnbkk.supabase.co/functions/v1/marketplace",

  PAYMENT_CREATE_FUNCTION_URL:"https://qrhbgffmqorzbcfvnbkk.supabase.co/functions/v1/payment-create",

  PAYMENT_STATUS_FUNCTION_URL:"https://qrhbgffmqorzbcfvnbkk.supabase.co/functions/v1/payment-status",

  PAYMENT_WEBHOOK_URL:"https://qrhbgffmqorzbcfvnbkk.supabase.co/functions/v1/payment-webhook",

  SITE_URL:location.origin,

  DOMPETX_API_BASE:"https://api.dompetx.com",

  DOMPETX_PAYMENT_METHOD:"QRIS"
};
