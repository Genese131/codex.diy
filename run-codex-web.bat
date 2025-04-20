@echo off
setlocal enabledelayedexpansion

echo Codex Web Interface - Docker Edition
echo =================================

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

:: Build the Docker image directly
echo Building Codex Web Docker image...
docker build -t codex-web -f Dockerfile.web .

if %errorlevel% neq 0 (
    echo Failed to build Docker image. See error messages above.
    pause
    exit /b 1
)

:: Run the container
echo Starting Codex Web Interface in Docker...
docker run --rm -it ^
  -p 3000:3000 ^
  -v "%CD%:/workspace" ^
  --env-file .env ^
  codex-web

echo Codex Web Interface Docker session ended.
pause
