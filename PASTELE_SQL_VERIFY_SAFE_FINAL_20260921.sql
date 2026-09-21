-- SAFE POST-MIGRATION CHECKS
-- Run this ONLY after the master SQL finishes successfully.

SELECT extname, extnamespace::regnamespace AS schema_name
FROM pg_extension
WHERE extname='pgcrypto';

SELECT n.nspname AS schema_name,
       p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN (
    'create_pastelink_content',
    'verify_pastelink_password',
    'handle_new_user'
  )
ORDER BY p.proname, arguments;

SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema='public'
  AND (
    (table_name='purchases' AND column_name IN ('buyer_id','item_id','item_title'))
    OR
    (table_name='orders' AND column_name IN ('buyer_id','item_id','item_title'))
  )
ORDER BY table_name, column_name;

SELECT encode(
  extensions.digest(convert_to('test1234','UTF8'),'sha256'),
  'hex'
) AS pgcrypto_sha256_test;
