@echo off
echo Deploying Supabase Edge Functions...
echo.

echo Checking Supabase CLI installation...
where supabase >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Supabase CLI is not installed!
    echo.
    echo Please install it first:
    echo   npm install -g supabase
    echo.
    echo Or visit: https://supabase.com/docs/guides/cli
    pause
    exit /b 1
)

echo.
echo Deploying fetch-content function...
supabase functions deploy fetch-content
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy fetch-content
    pause
    exit /b 1
)

echo.
echo Deploying ai-enhance function...
supabase functions deploy ai-enhance
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy ai-enhance
    pause
    exit /b 1
)

echo.
echo Deploying translate function...
supabase functions deploy translate
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to deploy translate
    pause
    exit /b 1
)

echo.
echo ========================================
echo Functions deployed successfully!
echo ========================================
echo.
echo IMPORTANT: Set environment variables in Supabase Dashboard:
echo   1. Go to: https://supabase.com/dashboard/project/qsmllpflneqlpmwzhjou/settings/functions
echo   2. Add secret: LOVABLE_API_KEY (your API key)
echo   3. Optional: Add ALLOWED_ORIGINS (comma-separated list)
echo.
pause

