@echo off
setlocal enabledelayedexpansion

echo Codex.diy - Unified Interface (All Models Enabled)
echo ===============================================

:: Navigate to the Codex directory
cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js to use Codex.
    echo Visit https://nodejs.org/ to download and install Node.js.
    pause
    exit /b 1
)

:: Check Node.js version
for /f "tokens=1,2,3 delims=." %%a in ('node --version') do (
    set NODE_MAJOR=%%a
    set NODE_MINOR=%%b
    set NODE_PATCH=%%c
)

set NODE_MAJOR=!NODE_MAJOR:~1!

if !NODE_MAJOR! LSS 16 (
    echo Your Node.js version is !NODE_MAJOR!.!NODE_MINOR!.!NODE_PATCH!
    echo Codex requires Node.js version 16 or higher.
    echo Please update your Node.js installation.
    pause
    exit /b 1
)

:: Check if .env file exists, if not, run setup-env.ps1
if not exist .env (
    echo Environment file not found. Setting up environment...
    powershell -ExecutionPolicy Bypass -File setup-env.ps1
)

:: Check if required dependencies are installed
echo Checking dependencies...
if not exist node_modules (
    echo Installing dependencies...
    npm install
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

:: Start the Codex unified interface
echo Starting Codex.diy unified interface...
start "" http://localhost:3030
node codex-unified.js

echo Codex.diy session ended.
pause
