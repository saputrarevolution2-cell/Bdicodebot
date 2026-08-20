@echo off
set PROJECT_REF=%1
if "%PROJECT_REF%"=="" (
  echo Usage: deploy.bat YOUR_SUPABASE_PROJECT_REF
  exit /b 1
)

supabase db push --project-ref %PROJECT_REF%
supabase functions deploy username-auth --project-ref %PROJECT_REF% --no-verify-jwt
supabase functions deploy telegram-login --project-ref %PROJECT_REF% --no-verify-jwt

echo Done.
