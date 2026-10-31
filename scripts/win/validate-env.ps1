<#
.SYNOPSIS
    TANKR Environment Configuration Validator (PowerShell)
#>

[CmdletBinding()]
param()

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $ProjectRoot

$EnvPath = Join-Path $ProjectRoot ".env"

if (-not (Test-Path $EnvPath)) {
    Write-Host "[ERROR] .env file not found at $EnvPath" -ForegroundColor Red
    Write-Host "Please copy .env.example to .env first." -ForegroundColor Yellow
    exit 1
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "            TANKR - Environment Variable Validation             " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$envMap = @{}
Get-Content $EnvPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line.Split("=", 2)
        if ($parts.Count -eq 2) {
            $key = $parts[0].Trim()
            $val = $parts[1].Trim().Trim('"').Trim("'")
            $envMap[$key] = $val
        }
    }
}

function Mask-Value {
    param([string]$val)
    if ($val.Length -le 8) {
        return "********"
    } else {
        $start = $val.Substring(0, 4)
        $end = $val.Substring($val.Length - 4, 4)
        return "$start****$end ($($val.Length) chars)"
    }
}

$Errors = 0
$Warnings = 0

function Check-Var {
    param(
        [string]$Name,
        [bool]$Required,
        [string]$Description
    )

    $val = $script:envMap[$Name]
    if ([string]::IsNullOrWhiteSpace($val)) {
        if ($Required) {
            Write-Host "  [MISSING] $Name ($Description)" -ForegroundColor Red
            $script:Errors++
        } else {
            Write-Host "  [OPTIONAL] $Name is not set ($Description)" -ForegroundColor Yellow
            $script:Warnings++
        }
    } elseif ($val -match "your-" -or $val -match "example" -or $val -match "placeholder") {
        if ($Required) {
            Write-Host "  [PLACEHOLDER] $Name has unconfigured value: $(Mask-Value $val)" -ForegroundColor Red
            $script:Errors++
        } else {
            Write-Host "  [PLACEHOLDER] $Name has placeholder value: $(Mask-Value $val)" -ForegroundColor Yellow
            $script:Warnings++
        }
    } else {
        Write-Host "  [CONFIGURED] $Name : $(Mask-Value $val)" -ForegroundColor Green
    }
}

Write-Host "1. Supabase Backend Connectivity (Mandatory):" -ForegroundColor White
Check-Var "EXPO_PUBLIC_SUPABASE_URL" $true "Supabase Project URL"
Check-Var "EXPO_PUBLIC_SUPABASE_ANON_KEY" $true "Supabase Anon Key"

Write-Host "`n2. Maps & Geospatial Services (Optional Fallbacks):" -ForegroundColor White
Check-Var "EXPO_PUBLIC_MAPPLS_REST_KEY" $false "Mappls API Key"
Check-Var "EXPO_PUBLIC_CARTO_API_KEY" $false "Carto Basemaps API Key"

Write-Host "`n3. Payment Gateway:" -ForegroundColor White
Check-Var "EXPO_PUBLIC_RAZORPAY_KEY_ID" $false "Razorpay Key ID"

Write-Host "`n================================================================" -ForegroundColor Cyan
if ($Errors -gt 0) {
    Write-Host "Validation failed with $Errors error(s). Please configure missing variables in .env." -ForegroundColor Red
    exit 1
} elseif ($Warnings -gt 0) {
    Write-Host "Validation passed with $Warnings optional notice(s). TANKR will use mock fallbacks." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "All environment variables are properly configured!" -ForegroundColor Green
    exit 0
}

