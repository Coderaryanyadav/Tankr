<#
.SYNOPSIS
    TANKR Windows Developer Setup Automation (PowerShell)
.DESCRIPTION
    Automates environment verification, dependency installation, .env configuration,
    and quality verification for TANKR on Windows.
#>

[CmdletBinding()]
param(
    [switch]$SkipTests,
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message, [string]$Step)
    Write-Host "`n[$Step] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "  [PASS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  [WARN] $Message" -ForegroundColor Yellow
}

function Write-Fail {
    param([string]$Message)
    Write-Host "  [FAIL] $Message" -ForegroundColor Red
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "       TANKR - Windows Developer Setup Automation (PS)          " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Navigate to project root
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $ProjectRoot

# 1. Verify Project Root
Write-Step "Verifying Repository Root..." "1/6"
if (-not (Test-Path "package.json")) {
    Write-Fail "package.json not found in $ProjectRoot"
    exit 1
}
Write-Success "Repository root verified at $ProjectRoot"

# 2. Check Prerequisites
Write-Step "Checking Prerequisites..." "2/6"

# Check Node.js
try {
    $nodeVersion = & node -v
    Write-Success "Node.js detected: $nodeVersion"
    $major = [int]($nodeVersion -replace 'v','' -split '\.')[0]
    if ($major -lt 18) {
        Write-Warning "TANKR recommends Node.js v20+ LTS. You are running $nodeVersion."
    }
} catch {
    Write-Fail "Node.js is not installed or not in PATH. Download from https://nodejs.org"
    exit 1
}

# Check npm
try {
    $npmVersion = & npm -v
    Write-Success "npm detected: v$npmVersion"
} catch {
    Write-Fail "npm is not installed."
    exit 1
}

# Check Git
try {
    $gitVersion = & git --version
    Write-Success "Git detected: $gitVersion"
} catch {
    Write-Warning "Git was not found in PATH."
}

# 3. Environment Configuration
Write-Step "Configuring Environment (.env)..." "3/6"
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Success "Created .env from .env.example"
    } else {
        Write-Warning "Neither .env nor .env.example was found."
    }
} else {
    Write-Success ".env file already exists."
}

# 4. Install Dependencies
Write-Step "Installing Project Dependencies..." "4/6"
if ($SkipInstall) {
    Write-Warning "Skipping npm install as requested."
} else {
    Write-Host "  Running npm install (this may take 1-2 minutes)..." -ForegroundColor Gray
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "npm install failed."
        exit 1
    }
    Write-Success "Dependencies installed successfully."
}

# 5. Quality & Regression Verification
Write-Step "Running Quality Verification..." "5/6"
if ($SkipTests) {
    Write-Warning "Skipping tests as requested."
} else {
    Write-Host "  Checking TypeScript types (tsc --noEmit)..." -ForegroundColor Gray
    & npx tsc --noEmit
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "TypeScript compilation failed."
        exit 1
    }
    Write-Success "TypeScript compilation passed with 0 errors."

    Write-Host "  Running Jest unit test suite..." -ForegroundColor Gray
    & npm test -- --watchAll=false
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Jest unit tests failed."
        exit 1
    }
    Write-Success "All Jest test suites passed."
}

# 6. Summary & Credentials
Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "           TANKR WINDOWS ENVIRONMENT SETUP COMPLETE!            " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the development server:" -ForegroundColor White
Write-Host "  scripts\win\start-dev.bat web        (Launch Web App)" -ForegroundColor Yellow
Write-Host "  scripts\win\start-dev.bat android    (Launch Android Emulator)" -ForegroundColor Yellow
Write-Host "  powershell -File scripts\win\start-dev.ps1 -Platform web" -ForegroundColor Yellow
Write-Host ""
Write-Host "Local Demo Phone Numbers (OTP: 123456):" -ForegroundColor White
Write-Host "  * Super Admin:     8888888888 (All 10 Operations Desks)" -ForegroundColor Gray
Write-Host "  * Supplier Portal: 9999999999 (Marol Potable Water Hub)" -ForegroundColor Gray
Write-Host "  * Driver Console:  9000000001 (Rajesh Sharma - MH-02-MN-1002)" -ForegroundColor Gray
Write-Host "  * Customer App:    9876543210 (Vikram Malhotra)" -ForegroundColor Gray
Write-Host "================================================================`n" -ForegroundColor Cyan
