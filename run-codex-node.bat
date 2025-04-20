@echo off
setlocal enabledelayedexpansion

echo Codex CLI - Node.js Edition
echo =========================

:: Navigate to the Codex directory
cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed! Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

:: Check Node.js version
for /f "tokens=1,2,3 delims=." %%a in ('node --version') do (
    set NODE_MAJOR=%%a
    set NODE_MAJOR=!NODE_MAJOR:~1!
)

if %NODE_MAJOR% LSS 18 (
    echo Warning: Codex requires Node.js 18 or higher.
    echo Current version: !NODE_MAJOR!
    echo Please consider upgrading your Node.js installation.
    pause
    exit /b 1
)

:: Check if .env file exists, if not run the setup script
if not exist ".env" (
    echo Environment file not found. Setting up...
    powershell -ExecutionPolicy Bypass -File setup-env.ps1
    if %errorlevel% neq 0 (
        echo Failed to set up environment file.
        pause
        exit /b 1
    )
)

:: Load environment variables from .env file
echo Loading environment variables...
for /f "tokens=*" %%a in (.env) do (
    set line=%%a
    if "!line:~0,1!" neq "#" (
        if "!line!" neq "" (
            for /f "tokens=1,2 delims==" %%b in ("!line!") do (
                set "%%b=%%c"
            )
        )
    )
)

:: Run the simple Codex script
echo Starting Codex...
node --experimental-modules simple-codex.js

echo Codex session ended.
pause
