@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM TANKR Cache & Build Artifact Cleaner (Windows CMD)
REM ==============================================================================

cd /d "%~dp0..\.."

echo ================================================================
echo           TANKR - Cache & Build Artifact Cleaner
echo ================================================================
echo.
echo This utility will remove temporary build caches and bundler outputs:
echo   - .expo\ (Metro bundler cache)
echo   - web-build\ and dist\ (Production web outputs)
echo   - *.tsbuildinfo (TypeScript build cache)
echo   - node_modules\.cache (Jest and Babel caches)
echo.

set /p CONFIRM="Do you want to proceed with clearing temporary caches? [y/N]: "
if /i not "%CONFIRM%"=="y" (
    echo Operation cancelled.
    exit /b 0
)

echo.
echo Cleaning Metro and Expo caches...
if exist ".expo" rmdir /s /q ".expo"
if exist "dist" rmdir /s /q "dist"
if exist "web-build" rmdir /s /q "web-build"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"
if exist "tsconfig.tsbuildinfo" del /f /q "tsconfig.tsbuildinfo"

echo [SUCCESS] Temporary caches removed.
exit /b 0
