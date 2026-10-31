@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM TANKR Windows Developer Setup Automation (CMD)
REM Auto-installs missing prerequisites (Node.js LTS, Git) rather than exiting.
REM ==============================================================================

echo ================================================================
echo        TANKR - Windows Developer Setup Automation
echo ================================================================
echo.

REM Move to project root if invoked from scripts\win
cd /d "%~dp0..\.."

REM 1. Verify Repository Root
if not exist "package.json" (
    echo [ERROR] package.json not found. Please run this script from the TANKR repository root.
    pause
    exit /b 1
)
echo [1/6] Repository root verified.
echo.

REM 2. Check & Auto-Install Prerequisites
echo [2/6] Checking ^& Auto-Installing Prerequisites...

REM Check Git
where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [AUTO-INSTALL] Git is missing. Installing Git automatically...
    where winget >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --silent
    ) else (
        echo   Downloading Git for Windows installer...
        powershell -Command "Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/Git-2.44.0-64-bit.exe' -OutFile '$env:TEMP\git-setup.exe' -UseBasicParsing; Start-Process '$env:TEMP\git-setup.exe' -ArgumentList '/VERYSILENT', '/NORESTART', '/NOCANCEL', '/SP-' -Wait"
    )
    set "PATH=C:\Program Files\Git\cmd;C:\Program Files\Git\bin;!PATH!"
)
echo   [PASS] Git verification complete.

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo   [AUTO-INSTALL] Node.js is missing. Installing Node.js v20 LTS automatically...
    where winget >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-source-agreements --accept-package-agreements --silent
    ) else (
        echo   Downloading official Node.js LTS MSI package...
        powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile '$env:TEMP\node-lts.msi' -UseBasicParsing; Start-Process msiexec.exe -ArgumentList '/i', '$env:TEMP\node-lts.msi', '/passive', '/norestart' -Wait"
    )
    set "PATH=C:\Program Files\nodejs;!PATH!"
)

where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
    echo   [PASS] Node.js active: !NODE_VER!
) else (
    echo   [WARN] Node installed; if not detected immediately in this window, please restart command prompt.
)

where npm >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
    echo   [PASS] npm active: v!NPM_VER!
)
echo.

REM 3. Setup .env
echo [3/6] Setting up Environment Configuration...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo   [CREATED] .env created from .env.example
    ) else (
        echo   [WARN] Neither .env nor .env.example found.
    )
) else (
    echo   [EXISTS] .env already present.
)
echo.

REM 4. Install Dependencies
echo [4/6] Installing Dependencies (npm install)...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [FAIL] npm install encountered errors.
    pause
    exit /b 1
)
echo   [PASS] Dependencies installed.
echo.

REM 5. Run Typecheck & Tests
echo [5/6] Running Quality & Regression Checks...
echo   Running TypeScript compiler (tsc --noEmit)...
call npx tsc --noEmit
if %ERRORLEVEL% neq 0 (
    echo   [FAIL] TypeScript compilation encountered errors.
    pause
    exit /b 1
)
echo   [PASS] TypeScript check passed with 0 errors.

echo   Running Jest unit tests...
call npm test -- --watchAll=false
if %ERRORLEVEL% neq 0 (
    echo   [FAIL] One or more test suites failed.
    pause
    exit /b 1
)
echo   [PASS] All test suites passed!
echo.

REM 6. Summary & Demo Credentials
echo ================================================================
echo           TANKR WINDOWS ENVIRONMENT SETUP COMPLETE!
echo ================================================================
echo.
echo To start the application:
echo   scripts\win\start-dev.bat web       (Open Web Browser)
echo   scripts\win\start-dev.bat android   (Android Emulator)
echo.
echo Local Demo Credentials (OTP: 123456):
echo   * Admin Portal:     Phone: 8888888888 (Super Admin, all 10 desks)
echo   * Supplier Portal:  Phone: 9999999999 (Marol Potable Water Hub)
echo   * Driver Console:   Phone: 9000000001 (Rajesh Sharma)
echo   * Customer App:     Phone: 9876543210 (Vikram Malhotra)
echo ================================================================
echo.
pause
