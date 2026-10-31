@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM TANKR Environment Configuration Validator (Windows CMD)
REM ==============================================================================

cd /d "%~dp0..\.."

where powershell >nul 2>&1
if %ERRORLEVEL% equ 0 (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0validate-env.ps1"
    exit /b %ERRORLEVEL%
)

echo ================================================================
echo            TANKR - Environment Variable Validation
echo ================================================================
echo.

if not exist ".env" (
    echo [ERROR] .env file not found. Copy from .env.example.
    exit /b 1
)

echo [INFO] Validating required keys in .env...
findstr /R /C:"^EXPO_PUBLIC_SUPABASE_URL=" .env >nul
if %ERRORLEVEL% neq 0 (
    echo [FAIL] EXPO_PUBLIC_SUPABASE_URL is missing.
    exit /b 1
) else (
    echo [PASS] EXPO_PUBLIC_SUPABASE_URL found.
)

findstr /R /C:"^EXPO_PUBLIC_SUPABASE_ANON_KEY=" .env >nul
if %ERRORLEVEL% neq 0 (
    echo [FAIL] EXPO_PUBLIC_SUPABASE_ANON_KEY is missing.
    exit /b 1
) else (
    echo [PASS] EXPO_PUBLIC_SUPABASE_ANON_KEY found.
)

echo [SUCCESS] Mandatory variables verified.
exit /b 0
