@echo off
setlocal enabledelayedexpansion

echo Codex - Using Pre-built Docker Image
echo ==================================

:: Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not running! Please start Docker Desktop first.
    pause
    exit /b 1
)

:: Navigate to the Codex directory
cd /d "%~dp0"

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

:: Pull the pre-built Node.js image with web server capabilities
echo Pulling pre-built Docker image...
docker pull node:22-alpine

if %errorlevel% neq 0 (
    echo Failed to pull Docker image. See error messages above.
    pause
    exit /b 1
)

:: Create a temporary container with Node.js and Express
echo Setting up temporary container...
docker run --rm -d ^
  --name codex-temp ^
  -p 3000:3000 ^
  -v "%CD%:/app" ^
  --env-file .env ^
  -w /app ^
  node:22-alpine ^
  sh -c "npm install express dotenv && node --experimental-modules codex-web.js"

:: Open browser to the web interface
echo Opening Codex Web Interface in your browser...
start http://localhost:3000

echo.
echo Codex Web Interface is now running in Docker.
echo Press Ctrl+C to stop the server when you're done.
echo.

:: Wait for user to press Ctrl+C
echo Press Ctrl+C to stop the server...
timeout /t 86400 >nul

:: Clean up
docker stop codex-temp

echo Codex Web Interface Docker session ended.
pause
