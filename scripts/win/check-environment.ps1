<#
.SYNOPSIS
    TANKR Environment Health Check Utility (PowerShell)
#>

[CmdletBinding()]
param()

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $ProjectRoot

$PassCount = 0
$WarnCount = 0
$FailCount = 0

function Write-Pass {
    param([string]$Text)
    Write-Host "  [PASS] $Text" -ForegroundColor Green
    $script:PassCount++
}

function Write-WarningMsg {
    param([string]$Text)
    Write-Host "  [WARN] $Text" -ForegroundColor Yellow
    $script:WarnCount++
}

function Write-FailMsg {
    param([string]$Text)
    Write-Host "  [FAIL] $Text" -ForegroundColor Red
    $script:FailCount++
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "       TANKR - Environment Health Check Utility (Windows)       " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. OS
Write-Host "1. Operating System:" -ForegroundColor White
Write-Pass "Windows $([System.Environment]::OSVersion.VersionString)"

# 2. Node.js
Write-Host "`n2. Node.js Runtime Check:" -ForegroundColor White
try {
    $nodeVer = & node -v
    $major = [int]($nodeVer -replace 'v','' -split '\.')[0]
    if ($major -ge 18) {
        Write-Pass "Node.js $nodeVer (supported >= v18.0.0)"
    } else {
        Write-FailMsg "Node.js $nodeVer is outdated (requires >= v18.0.0)"
    }
} catch {
    Write-FailMsg "Node.js is not installed."
}

# 3. npm
Write-Host "`n3. Package Manager Check:" -ForegroundColor White
try {
    $npmVer = & npm -v
    Write-Pass "npm v$npmVer"
} catch {
    Write-FailMsg "npm is not installed."
}

# 4. Git
Write-Host "`n4. Git Version Control:" -ForegroundColor White
try {
    $gitVer = & git --version
    Write-Pass $gitVer
} catch {
    Write-WarningMsg "Git is not installed or not in PATH."
}

# 5. Docker
Write-Host "`n5. Docker Engine:" -ForegroundColor White
try {
    $dockerVer = & docker --version
    Write-Pass $dockerVer
} catch {
    Write-WarningMsg "Docker is not detected (only needed for local Supabase)."
}

# 6. Supabase CLI
Write-Host "`n6. Supabase CLI Check:" -ForegroundColor White
try {
    $supaVer = & supabase --version
    Write-Pass "Supabase CLI $supaVer"
} catch {
    Write-Pass "Supabase CLI accessible via npx supabase"
}

# 7. Expo CLI
Write-Host "`n7. Expo CLI Tooling:" -ForegroundColor White
Write-Pass "Expo CLI accessible via npx expo"

# 8. Environment File
Write-Host "`n8. Environment Configuration (.env):" -ForegroundColor White
if (Test-Path ".env") {
    Write-Pass ".env file is present"
} elseif (Test-Path ".env.example") {
    Write-WarningMsg ".env missing. Run scripts\win\setup.ps1 to copy from .env.example."
} else {
    Write-FailMsg "Neither .env nor .env.example found."
}

# Summary
Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "Health Check: $PassCount Passed, $WarnCount Warnings, $FailCount Failures" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan

if ($FailCount -gt 0) {
    Write-Host "Some critical prerequisites failed. Please resolve them." -ForegroundColor Red
    exit 1
} else {
    Write-Host "Environment is fully operational for TANKR development!" -ForegroundColor Green
    exit 0
}
