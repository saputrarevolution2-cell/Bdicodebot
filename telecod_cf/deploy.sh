#!/usr/bin/env bash
set -euo pipefail
PROJECT_REF="${1:-}"
if [ -z "$PROJECT_REF" ]; then
  echo "Usage: ./deploy.sh YOUR_SUPABASE_PROJECT_REF"
  exit 1
fi

supabase db push --project-ref "$PROJECT_REF"
supabase functions deploy username-auth --project-ref "$PROJECT_REF" --no-verify-jwt
supabase functions deploy telegram-login --project-ref "$PROJECT_REF" --no-verify-jwt

echo "Done."
