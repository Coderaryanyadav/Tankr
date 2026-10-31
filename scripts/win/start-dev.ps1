<#
.SYNOPSIS
    TANKR Development Server Launcher (PowerShell)
.PARAMETER Platform
    Target platform: 'web' (default), 'android', 'tunnel', or 'clear'
#>

[CmdletBinding()]
param(
    [ValidateSet("web", "android", "tunnel", "clear", "interactive")]
    [string]$Platform = "web"
)

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $ProjectRoot

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "             TANKR - Development Server Launcher               " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "[INFO] Copying .env from .env.example..." -ForegroundColor Gray
        Copy-Item ".env.example" ".env"
    }
}

switch ($Platform) {
    "web" {
        Write-Host "Starting Expo for Web Browser (http://localhost:8081)..." -ForegroundColor Green
        & npx expo start --web
    }
    "android" {
        Write-Host "Starting Expo for Android Emulator..." -ForegroundColor Green
        & npx expo start --android
    }
    "tunnel" {
        Write-Host "Starting Expo with Tunneling..." -ForegroundColor Green
        & npx expo start --tunnel
    }
    "clear" {
        Write-Host "Starting Expo with cleared bundler cache..." -ForegroundColor Green
        & npx expo start -c
    }
    default {
        Write-Host "Starting Expo interactive console..." -ForegroundColor Green
        & npx expo start
    }
}
