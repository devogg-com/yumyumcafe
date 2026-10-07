@echo off
title Yum Yum Billing - Windows Firewall Setup
cd /d "%~dp0"

echo ====================================================
echo    YUM YUM BILLING - WINDOWS FIREWALL CONFIGURATION
echo ====================================================
echo.
echo This script will add an Inbound Rule in Windows Firewall
echo to allow incoming connections on TCP Port 4500.
echo This is required so other PCs on your Wi-Fi/LAN can connect.
echo.
echo Checking Administrator privileges...

net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] ADMINISTRATOR PRIVILEGES REQUIRED!
    echo ----------------------------------------------------
    echo Please right-click 'setup-firewall.bat' and select:
    echo        "Run as administrator"
    echo ----------------------------------------------------
    echo.
    pause
    exit /b 1
)

echo Adding Windows Firewall rule for TCP port 4500...
netsh advfirewall firewall add rule name="Yum Yum Billing Server (TCP 4500)" dir=in action=allow protocol=TCP localport=4500 description="Allows client PCs to access Yum Yum Billing POS Server"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Port 4500 is now OPEN in Windows Firewall!
    echo Other PCs on your local Wi-Fi / LAN can now connect to this server.
    echo.
) else (
    echo.
    echo [ERROR] Failed to add firewall rule. Please check Windows Defender Firewall settings.
    echo.
)

pause
