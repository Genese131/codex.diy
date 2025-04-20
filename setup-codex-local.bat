@echo off
setlocal enabledelayedexpansion

echo Codex CLI - Complete Local Setup
echo ===============================

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

if %NODE_MAJOR% LSS 22 (
    echo Warning: Codex requires Node.js 22 or higher.
    echo Current version: !NODE_MAJOR!
    echo Please consider upgrading your Node.js installation.
    echo.
    set /p CONTINUE=Continue anyway? (y/n): 
    if /i "!CONTINUE!" neq "y" (
        exit /b 1
    )
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

:: Install root dependencies
echo Installing root dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Failed to install root dependencies.
    pause
    exit /b 1
)

:: Install codex-cli dependencies
echo Installing codex-cli dependencies...
pushd codex-cli
call npm install
popd
if %errorlevel% neq 0 (
    echo Failed to install codex-cli dependencies.
    pause
    exit /b 1
)

:: Install TypeScript type definitions
echo Installing TypeScript type definitions...
call npm install --save-dev @types/node @types/js-yaml openai
if %errorlevel% neq 0 (
    echo Failed to install TypeScript type definitions.
    echo This is not critical, continuing...
)

:: Build the application
echo Building Codex...
pushd codex-cli
call npm run build
popd
if %errorlevel% neq 0 (
    echo Failed to build Codex.
    pause
    exit /b 1
)

:: Install dotenv-cli globally
echo Installing dotenv-cli globally...
call npm install -g dotenv-cli
if %errorlevel% neq 0 (
    echo Failed to install dotenv-cli.
    pause
    exit /b 1
)

:: Create desktop shortcut
echo Creating desktop shortcut...
powershell -ExecutionPolicy Bypass -File create-desktop-shortcut.ps1
if %errorlevel% neq 0 (
    echo Failed to create desktop shortcut.
    echo This is not critical, continuing...
)

echo.
echo ===============================================
echo Codex has been successfully set up locally!
echo.
echo You can now run Codex using:
echo   1. The desktop shortcut "Codex (Local)"
echo   2. The run-codex-local.bat script
echo ===============================================
echo.

pause
