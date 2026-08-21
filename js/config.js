// TeleCod frontend configuration. Replace the empty values with your real public Supabase/Telegram settings before production auth.
// NEVER put Supabase service-role keys, bot tokens, payment secrets, or webhook secrets here.
window.TELECOD_CONFIG={
  SUPABASE_URL:"",
  SUPABASE_ANON_KEY:"",
  TELEGRAM_BOT_USERNAME:"",
  TELEGRAM_AUTH_FUNCTION_URL:"",
  USERNAME_AUTH_FUNCTION_URL:"",
  MARKETPLACE_FUNCTION_URL:"",
  PAYMENT_CREATE_FUNCTION_URL:"",
  PAYMENT_STATUS_FUNCTION_URL:"",
  PAYMENT_WEBHOOK_URL:"",
  SITE_URL:location.origin,
  DOMPETX_API_BASE:"https://api.dompetx.com",
  DOMPETX_PAYMENT_METHOD:"QRIS"
};
