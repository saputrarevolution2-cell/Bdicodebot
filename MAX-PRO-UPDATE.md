# TeleCod MAX PRO UI Update — 2026-08-26

## Landing page
- Image-free visual system: no `<img>` hero artwork on index.
- Premium realistic neon cyber UI built with CSS, gradients, glass panels and Font Awesome icons.
- Full PasteLink editor remains available and its feature set is surfaced clearly.
- Added detailed PasteLink privacy/security/how-it-works guidance.
- Added adult 18+ community policy section with clear age/safety boundaries; no explicit content is generated or embedded.
- Android and desktop responsive polish.

## Dashboard
- Single notification bell via notification host; removed duplicate explicit bell.
- Creator product picker: Add Code / Add Channel.
- Product overview split into Code and Channel sections.
- Per-section product count, views, revenue and daily/weekly/monthly reporting.
- Overall sales report.
- Payment page redesigned with deposit notice, Code/Channel balances, available/pending balance, monthly/daily transactions.
- Withdraw Auto and Instant guidance with daily limits and Bank/E-Wallet form.
- Profile expanded with Telegram ID, Telegram username, display name, wallet destination and logout/delete-account controls.
- Settings expanded for login email/username and password management.

## Database migration
Added optional profile fields for saved withdrawal destination:
- withdraw_method
- withdraw_account_number
- withdraw_account_name

Run the updated `supabase/TELECOD_FULL_FINAL.sql` against the project if those columns are not already present.
