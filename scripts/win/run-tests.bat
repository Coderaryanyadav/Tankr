@echo off
setlocal enabledelayedexpansion

REM ==============================================================================
REM TANKR Automated Test Runner (Windows CMD)
REM ==============================================================================

cd /d "%~dp0..\.."

echo ================================================================
echo                 TANKR - Automated Test Suite
echo ================================================================
echo.

set OVERALL_STATUS=0

echo [1/2] Running TypeScript Static Type Checking (tsc --noEmit)...
call npx tsc --noEmit
if %ERRORLEVEL% equ 0 (
    echo   [PASS] TypeScript check passed with 0 errors.
) else (
    echo   [FAIL] TypeScript compilation encountered errors.
    set OVERALL_STATUS=1
)
echo.

echo [2/2] Running Jest Unit ^& Regression Test Suites...
call npm test -- --watchAll=false %*
if %ERRORLEVEL% equ 0 (
    echo   [PASS] Jest test suite passed.
) else (
    echo   [FAIL] One or more Jest tests failed.
    set OVERALL_STATUS=1
)
echo.

echo ================================================================
if %OVERALL_STATUS% equ 0 (
    echo [SUCCESS] All tests and typechecks passed!
    exit /b 0
) else (
    echo [ERROR] Test suite failed. Please review errors above.
    exit /b 1
)

