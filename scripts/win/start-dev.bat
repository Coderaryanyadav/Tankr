@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM TANKR Development Server Launcher (Windows CMD)
REM ==============================================================================

cd /d "%~dp0..\.."

echo ================================================================
echo             TANKR - Development Server Launcher
echo ================================================================
echo.

if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Copying .env from .env.example...
        copy ".env.example" ".env" >nul
    )
)

set MODE=%~1
if "%MODE%"=="" set MODE=web

if /i "%MODE%"=="web" (
    echo [START] Starting Expo for Web Browser (http://localhost:8081)...
    call npx expo start --web
) else if /i "%MODE%"=="android" (
    echo [START] Starting Expo for Android Emulator...
    call npx expo start --android
) else if /i "%MODE%"=="clear" (
    echo [START] Starting Expo with cleared cache...
    call npx expo start -c
) else if /i "%MODE%"=="tunnel" (
    echo [START] Starting Expo with Tunnel...
    call npx expo start --tunnel
) else (
    echo [START] Starting Expo Interactive Console...
    call npx expo start %*
)
