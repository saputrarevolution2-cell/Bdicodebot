Development reset SQL: PasTele_DATABASE_MASTER_FULL_RESET_RPC_FINAL.sql
Run only while this is still development because it drops public application tables/data.
It preserves Supabase auth.users and promotes existing username admim to admin.
Deploy the Edge Functions after applying the SQL.
