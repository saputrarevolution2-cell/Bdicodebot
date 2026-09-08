PasTele / Bdicodebot — FINAL SOURCE FIX

FIXED IN SOURCE
- Username login resolves canonical email from auth.users through SECURITY DEFINER RPC.
- Register username checking no longer silently says available when the database is unreachable.
- Auth trigger retries username collisions and no longer fails signup just because a legacy wallets table is absent.
- Existing auth users missing a profile are repaired by the SQL patch.
- Google OAuth callback explicitly exchanges PKCE code before redirecting to dashboard.
- Login no longer gets permanently bricked when Turnstile site key is absent; Supabase password login itself does not consume a Turnstile token.
- Added a safe global responsive/stability CSS layer.

DATABASE STEP (REQUIRED)
1. Open Supabase SQL Editor.
2. Run AUTH_REGISTER_LOGIN_FINAL_PATCH.sql as postgres/service-role.
3. Make sure Supabase Auth URL configuration allows your deployed site and /auth-callback.html.
4. Deploy the updated frontend.
5. Clear site data once, then test: register -> logout -> login by username -> login by email -> Google.

IMPORTANT
The browser source cannot repair a Supabase schema that has not been migrated. The included SQL patch is part of the fix.
