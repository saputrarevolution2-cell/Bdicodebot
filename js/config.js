// TeleCod frontend configuration.
// Replace the empty values with your real public Supabase/Telegram settings before production auth.
// NEVER put Supabase service-role keys, bot tokens, payment secrets, or webhook secrets here.

window.TELECOD_CONFIG={
    ADMIN_GMAIL:"",
SUPABASE_URL:"https://qrhbgffmqorzbcfvnbkk.supabase.co",

  SUPABASE_ANON_KEY:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyaGJnZmZtcW9yemJjZnZuYmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NTEzOTIsImV4cCI6MjEwMjUyNzM5Mn0.W9tWYiPmYOC9wsruJMypH_Kg0dQpw_klCbACS6PYp48",

  MARKETPLACE_FUNCTION_URL:"https://qrhbgffmqorzbcfvnbkk.supabase.co/functions/v1/marketplace",
  REGISTER_FUNCTION_URL:"https://qrhbgffmqorzbcfvnbkk.supabase.co/functions/v1/register-account",

  PAYMENT_CREATE_FUNCTION_URL:"https://qrhbgffmqorzbcfvnbkk.supabase.co/functions/v1/payment-create",

  PAYMENT_STATUS_FUNCTION_URL:"https://qrhbgffmqorzbcfvnbkk.supabase.co/functions/v1/payment-status",

  PAYMENT_WEBHOOK_URL:"https://qrhbgffmqorzbcfvnbkk.supabase.co/functions/v1/payment-webhook",

  SITE_URL:location.origin,

  DOMPETX_API_BASE:"https://api.dompetx.com",

  DOMPETX_PAYMENT_METHOD:"QRIS"
};
