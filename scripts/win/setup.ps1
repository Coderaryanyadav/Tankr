<#
.SYNOPSIS
    TANKR Windows Developer Setup Automation (PowerShell)
.DESCRIPTION
    Automates environment verification, auto-installation of missing tools (Git, Node.js),
    dependency installation, .env configuration, and quality verification.
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

function Write-AutoInstall {
    param([string]$Message)
    Write-Host "  [AUTO-INSTALL] $Message" -ForegroundColor Magenta
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
    Write-Host "[ERROR] package.json not found in $ProjectRoot" -ForegroundColor Red
    exit 1
}
Write-Success "Repository root verified at $ProjectRoot"

# Helper to refresh current process PATH environment
function Refresh-ProcessPath {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $extraPaths = @("C:\Program Files\nodejs", "C:\Program Files\Git\cmd", "C:\Program Files\Git\bin")
    $env:Path = "$machinePath;$userPath;" + ($extraPaths -join ";")
}

# 2. Check & Auto-Install Prerequisites
Write-Step "Checking & Auto-Installing Prerequisites..." "2/6"

# Check & Install Git if missing
$gitAvailable = $false
try {
    & git --version | Out-Null
    $gitAvailable = $true
} catch {
    $gitAvailable = $false
}

if (-not $gitAvailable) {
    Write-AutoInstall "Git is missing. Attempting automated installation..."
    $installedGit = $false
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "    Installing Git via winget..." -ForegroundColor Gray
        & winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements --silent
        $installedGit = $true
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host "    Installing Git via Chocolatey..." -ForegroundColor Gray
        & choco install git -y
        $installedGit = $true
    } elseif (Get-Command scoop -ErrorAction SilentlyContinue) {
        Write-Host "    Installing Git via Scoop..." -ForegroundColor Gray
        & scoop install git
        $installedGit = $true
    } else {
        Write-Host "    Downloading Git standalone installer..." -ForegroundColor Gray
        $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/Git-2.44.0-64-bit.exe"
        $gitInstaller = Join-Path $env:TEMP "git-installer.exe"
        try {
            Invoke-WebRequest -Uri $gitUrl -OutFile $gitInstaller -UseBasicParsing
            Start-Process -FilePath $gitInstaller -ArgumentList "/VERYSILENT", "/NORESTART", "/NOCANCEL", "/SP-" -Wait
            $installedGit = $true
        } catch {
            Write-Warning "Could not download Git installer automatically: $_"
        }
    }
    Refresh-ProcessPath
}

try {
    $gitVersion = & git --version
    Write-Success "Git available: $gitVersion"
} catch {
    Write-Warning "Git was installed; terminal restart may be required for full CLI detection."
}

# Check & Install Node.js if missing or < v18
$needNode = $false
try {
    $nodeVersion = & node -v
    $major = [int]($nodeVersion -replace 'v','' -split '\.')[0]
    if ($major -lt 18) {
        Write-Warning "Node.js $nodeVersion is older than required v18.0.0."
        $needNode = $true
    } else {
        Write-Success "Node.js installed: $nodeVersion"
    }
} catch {
    $needNode = $true
}

if ($needNode) {
    Write-AutoInstall "Node.js v20 LTS is missing or outdated. Installing automatically..."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "    Installing Node.js v20 LTS via winget..." -ForegroundColor Gray
        & winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-source-agreements --accept-package-agreements --silent
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host "    Installing Node.js via Chocolatey..." -ForegroundColor Gray
        & choco install nodejs-lts -y
    } elseif (Get-Command scoop -ErrorAction SilentlyContinue) {
        Write-Host "    Installing Node.js via Scoop..." -ForegroundColor Gray
        & scoop install nodejs-lts
    } else {
        Write-Host "    Downloading official Node.js v20 LTS MSI..." -ForegroundColor Gray
        $nodeUrl = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi"
        $nodeMsi = Join-Path $env:TEMP "node-v20-lts.msi"
        try {
            Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeMsi -UseBasicParsing
            Start-Process msiexec.exe -ArgumentList "/i", "`"$nodeMsi`"", "/passive", "/norestart" -Wait
        } catch {
            Write-Host "    [ERROR] Automatic Node.js download failed: $_" -ForegroundColor Red
        }
    }
    Refresh-ProcessPath
}

# Verify npm
try {
    $npmVersion = & npm -v
    Write-Success "npm installed: v$npmVersion"
} catch {
    Write-Warning "npm not in immediate process path. Using updated environment..."
    Refresh-ProcessPath
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
        Write-Host "  [FAIL] npm install encountered an issue." -ForegroundColor Red
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
        Write-Host "  [FAIL] TypeScript compilation failed." -ForegroundColor Red
        exit 1
    }
    Write-Success "TypeScript compilation passed with 0 errors."

    Write-Host "  Running Jest unit test suite..." -ForegroundColor Gray
    & npm test -- --watchAll=false
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] Jest unit tests failed." -ForegroundColor Red
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
