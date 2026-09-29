@echo off
title Honk Windows Device Agent
echo ========================================================
echo   HONK WINDOWS DEVICE AGENT V1
echo   Connecting to Honk Web Application
echo ========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/ to run Honk Device Agent.
    pause
    exit /b 1
)

echo Starting Honk Windows Agent on http://127.0.0.1:3001 ...
node "%~dp0honk-windows-agent.js"
pause
