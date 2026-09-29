# Honk Windows Device Agent PowerShell Starter
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  HONK WINDOWS DEVICE AGENT V1" -ForegroundColor Yellow
Write-Host "  Native Windows Automation & Process Controller" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

$scriptPath = Join-Path $PSScriptRoot "honk-windows-agent.js"
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "Starting Agent on http://127.0.0.1:3001..." -ForegroundColor Green
    node $scriptPath
} else {
    Write-Host "[ERROR] Node.js is required to run the local agent." -ForegroundColor Red
    Write-Host "Download from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit..."
}
