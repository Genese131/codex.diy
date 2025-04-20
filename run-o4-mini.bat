@echo off
setlocal enabledelayedexpansion

echo Codex Client with Ollama Support
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

:: Install dotenv if not already installed
echo Checking for dotenv...
npm list dotenv >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing dotenv...
    npm install dotenv
)

:: Check if Ollama is installed
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo Ollama is not detected on your system.
    echo To use local LLMs, you'll need to install Ollama:
    echo 1. Visit https://ollama.com/download
    echo 2. Download and install Ollama
    echo 3. Run 'ollama pull codellama' to download the default model
    echo.
    echo You can still use OpenAI models without Ollama.
    echo.
)

:: Run the client
echo Starting Codex client...
node --experimental-modules o4-mini-client.js

echo Codex client session ended.
pause
