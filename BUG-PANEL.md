# PasTele Bug Panel

The universal bug panel is loaded on all pages through `js/debug-panel.js`.

Use the **🐞 BUG** button at the bottom-right.

It captures:
1. JavaScript runtime errors
2. unhandled Promise rejections
3. failed script/style/image resource loads
4. failed HTTP requests, including Supabase REST errors and response bodies
5. slow requests
6. console errors/warnings/logs
7. Supabase client status
8. current Auth/session status
9. live browser-side DB checks for `profiles` and `marketplace_public`

It also has **Test DB**, **Clear**, **Copy**, and **Close** controls.

Sensitive values such as API keys, authorization headers, passwords and tokens are redacted.
