# TeleCod Authentication

## Register
- Username
- Gmail
- Password (show/hide)
- Confirm password (show/hide)
- Register
- Forgot password
- Register/Login with Google
- Existing account → Login

## Login
- Gmail or username
- Account existence indicator ✓ / ✕
- If found: shows "Masuk sebagai ..."
- If missing: says account is not registered and offers Register
- Then password
- Forgot/reset password
- Login
- New account → Register

## Admin
Admin panel uses **Gmail only**. The Gmail account must have `profiles.is_admin = true`.

After the intended admin Gmail logs in once:
```sql
update public.profiles p
set is_admin = true
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('YOUR_GMAIL@gmail.com');
```

Enable Google provider in Supabase Authentication → Providers → Google.
