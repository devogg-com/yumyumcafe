@echo off
title Yum Yum Billing - Local Server
cd /d "%~dp0"

echo ====================================================
echo        YUM YUM BILLING - SERVER LAUNCHER
echo                 FOR YUM YUM CAFE
echo ====================================================
echo.
echo Starting local LAN server on port 4500...
echo.

node server/index.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server terminated unexpectedly (Error Code: %ERRORLEVEL%).
    echo Ensure Node.js is installed and port 4500 is not in use by another app.
    pause
)
