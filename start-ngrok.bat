@echo off
REM WhatsApp SaaS - ngrok Quick Start
REM Double-click this file to start ngrok tunnel

echo ========================================
echo WhatsApp SaaS - ngrok Tunnel Setup
echo ========================================
echo.

REM Check if PowerShell is available
where powershell >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PowerShell not found!
    echo Please install PowerShell to use this script.
    pause
    exit /b 1
)

REM Run PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start-ngrok.ps1"

pause
