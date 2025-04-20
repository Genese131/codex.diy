@echo off
setlocal enabledelayedexpansion

echo Codex CLI - Local Installation
echo =============================

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

:: Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    
    if %errorlevel% neq 0 (
        echo Failed to install dependencies.
        pause
        exit /b 1
    )
)

:: Check if codex-cli/node_modules exists, if not install dependencies
if not exist "codex-cli\node_modules" (
    echo Installing codex-cli dependencies...
    pushd codex-cli
    call npm install
    popd
    
    if %errorlevel% neq 0 (
        echo Failed to install codex-cli dependencies.
        pause
        exit /b 1
    )
)

:: Build the application if needed
if not exist "codex-cli\dist" (
    echo Building Codex...
    pushd codex-cli
    call npm run build
    popd
    
    if %errorlevel% neq 0 (
        echo Failed to build Codex.
        pause
        exit /b 1
    )
)

:: Install dotenv-cli if not already installed
echo Checking for dotenv-cli...
npm list -g dotenv-cli >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing dotenv-cli...
    npm install -g dotenv-cli
    
    if %errorlevel% neq 0 (
        echo Failed to install dotenv-cli.
        pause
        exit /b 1
    )
)

:: Run Codex locally
echo Starting Codex...

:: Add the codex-cli/node_modules/.bin to the PATH temporarily
set "PATH=%CD%\codex-cli\node_modules\.bin;%PATH%"

:: Run Codex with dotenv
call dotenv -- codex %*

echo Codex session ended.
pause
