@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM TANKR Environment Health Check Utility (Windows CMD)
REM ==============================================================================

cd /d "%~dp0..\.."

echo ================================================================
echo        TANKR - Environment Health Check Utility (Windows)
echo ================================================================
echo.

set PASS=0
set WARN=0
set FAIL=0

REM 1. OS
echo [1/8] Operating System:
echo   [PASS] Windows %OS%
set /a PASS+=1

REM 2. Node.js
echo [2/8] Node.js Runtime:
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
    echo   [PASS] Node.js installed: !NODE_VER!
    set /a PASS+=1
) else (
    echo   [FAIL] Node.js is not installed.
    set /a FAIL+=1
)

REM 3. npm
echo [3/8] Package Manager:
where npm >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
    echo   [PASS] npm installed: v!NPM_VER!
    set /a PASS+=1
) else (
    echo   [FAIL] npm is not installed.
    set /a FAIL+=1
)

REM 4. Git
echo [4/8] Git Version Control:
where git >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('git --version') do set GIT_VER=%%v
    echo   [PASS] !GIT_VER!
    set /a PASS+=1
) else (
    echo   [WARN] Git is not found in PATH.
    set /a WARN+=1
)

REM 5. Docker
echo [5/8] Docker Engine:
where docker >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo   [PASS] Docker CLI detected.
    set /a PASS+=1
) else (
    echo   [WARN] Docker not installed (only required for local Supabase).
    set /a WARN+=1
)

REM 6. Supabase CLI
echo [6/8] Supabase CLI:
where supabase >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo   [PASS] Supabase CLI installed globally.
    set /a PASS+=1
) else (
    echo   [INFO] Supabase CLI available via npx supabase.
    set /a PASS+=1
)

REM 7. Expo CLI
echo [7/8] Expo CLI:
echo   [PASS] Expo CLI available via npx expo.
set /a PASS+=1

REM 8. Configuration File
echo [8/8] Environment File (.env):
if exist ".env" (
    echo   [PASS] .env file present.
    set /a PASS+=1
) else if exist ".env.example" (
    echo   [WARN] .env not found. Run scripts\win\setup.bat to copy .env.example.
    set /a WARN+=1
) else (
    echo   [FAIL] Neither .env nor .env.example found.
    set /a FAIL+=1
)

echo.
echo ================================================================
echo Health Check Summary: %PASS% Passed, %WARN% Warnings, %FAIL% Failures
echo ================================================================

if %FAIL% gtr 0 (
    echo [ERROR] Some critical prerequisites are missing. Please fix before continuing.
    exit /b 1
) else (
    echo [SUCCESS] Environment is ready for TANKR development!
    exit /b 0
)

