# PasTele Admin Console

## Coverage
- Dashboard/overview
- Users: search, ban/unban, admin role, balance adjustment
- Products/content moderation
- Orders/payments
- Withdrawals
- Transactions
- Pastes
- Telegram bots
- Logs
- Security/session/password recovery

## Security
The browser must use only the Supabase anon/publishable key. Never place a service-role key in HTML/JS.

Admin mutations must be implemented by protected RPCs that verify the authenticated admin server-side.

## Password recovery
`forgot-password.html` -> Supabase Auth email -> `reset-password.html`.

## Important
The exact RPC/table names must match `database.sql`. The UI does not bypass RLS or invent permissions.
