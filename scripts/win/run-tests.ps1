<#
.SYNOPSIS
    TANKR Automated Test Runner (PowerShell)
#>

[CmdletBinding()]
param(
    [switch]$Coverage
)

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $ProjectRoot

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "                TANKR - Automated Test Suite                    " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$failed = $false

Write-Host "1. Running TypeScript Static Type Checking (tsc --noEmit)..." -ForegroundColor White
& npx tsc --noEmit
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [PASS] TypeScript check passed with 0 errors." -ForegroundColor Green
} else {
    Write-Host "  [FAIL] TypeScript compilation encountered errors." -ForegroundColor Red
    $failed = $true
}

Write-Host "`n2. Running Jest Regression & Domain Unit Test Suites..." -ForegroundColor White
$jestArgs = @("--watchAll=false")
if ($Coverage) {
    $jestArgs += "--coverage"
}

& npm test -- @jestArgs
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [PASS] Jest test suite passed." -ForegroundColor Green
} else {
    Write-Host "  [FAIL] One or more Jest tests failed." -ForegroundColor Red
    $failed = $true
}

Write-Host "`n================================================================" -ForegroundColor Cyan
if ($failed) {
    Write-Host "Test suite failed. Please review errors above." -ForegroundColor Red
    exit 1
} else {
    Write-Host "All tests and typechecks passed successfully!" -ForegroundColor Green
    exit 0
}
