@echo off
setlocal enabledelayedexpansion

echo GPT-4o-mini Client
echo =================

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

:: Install dotenv if not already installed
echo Checking for dotenv...
npm list dotenv >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing dotenv...
    npm install dotenv
)

:: Run the GPT-4o-mini client
echo Starting GPT-4o-mini client...
node --experimental-modules gpt4o-mini-client.js

echo GPT-4o-mini client session ended.
pause
