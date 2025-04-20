@echo off
setlocal enabledelayedexpansion

echo Simple Codex CLI - Docker Edition
echo ==============================

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

:: Build the Docker image directly (no Docker Compose)
echo Building Simple Codex Docker image...
docker build -t simple-codex -f Dockerfile.simple .

if %errorlevel% neq 0 (
    echo Failed to build Docker image. See error messages above.
    pause
    exit /b 1
)

:: Run the container directly (no Docker Compose)
echo Starting Simple Codex in Docker...
docker run --rm -it ^
  -v "%CD%:/workspace" ^
  --env-file .env ^
  simple-codex

echo Simple Codex Docker session ended.
pause
