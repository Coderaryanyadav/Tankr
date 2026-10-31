<#
.SYNOPSIS
    TANKR Cache & Build Artifact Cleaner (PowerShell)
#>

[CmdletBinding()]
param(
    [switch]$Force
)

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $ProjectRoot

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "          TANKR - Cache & Build Artifact Cleaner               " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will remove temporary caches:" -ForegroundColor Yellow
Write-Host "  - .expo (Metro bundler cache)" -ForegroundColor Gray
Write-Host "  - dist & web-build (Production web outputs)" -ForegroundColor Gray
Write-Host "  - node_modules\.cache" -ForegroundColor Gray
Write-Host "  - tsconfig.tsbuildinfo" -ForegroundColor Gray
Write-Host ""

if (-not $Force) {
    $confirm = Read-Host "Proceed with clearing temporary caches? (y/N)"
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Host "Clean aborted." -ForegroundColor Yellow
        exit 0
    }
}

@(".expo", "dist", "web-build", "node_modules\.cache") | ForEach-Object {
    if (Test-Path $_) {
        Remove-Item -Recurse -Force $_
        Write-Host "Removed: $_" -ForegroundColor Green
    }
}

if (Test-Path "tsconfig.tsbuildinfo") {
    Remove-Item -Force "tsconfig.tsbuildinfo"
    Write-Host "Removed: tsconfig.tsbuildinfo" -ForegroundColor Green
}

Write-Host "`n[SUCCESS] Temporary caches removed successfully!" -ForegroundColor Green

