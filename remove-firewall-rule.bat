@echo off
title Yum Yum Billing - Remove Firewall Rule
cd /d "%~dp0"

echo ====================================================
echo   YUM YUM BILLING - REMOVE FIREWALL RULE (PORT 4500)
echo ====================================================
echo.
echo Checking Administrator privileges...

net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] ADMINISTRATOR PRIVILEGES REQUIRED!
    echo ----------------------------------------------------
    echo Please right-click 'remove-firewall-rule.bat' and select:
    echo        "Run as administrator"
    echo ----------------------------------------------------
    echo.
    pause
    exit /b 1
)

echo Deleting firewall rule for port 4500...
netsh advfirewall firewall delete rule name="Yum Yum Billing Server (TCP 4500)"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Firewall rule removed successfully.
    echo.
) else (
    echo.
    echo [NOTICE] Rule not found or already deleted.
    echo.
)

pause
