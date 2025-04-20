@echo off
setlocal enabledelayedexpansion

echo Codex CLI - Windows Edition
echo ===========================

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

:: Build the Docker image if it doesn't exist
docker images | findstr codex-cli >nul 2>&1
if %errorlevel% neq 0 (
    echo Building Codex Docker image for the first time...
    docker-compose -f docker-compose.win.yml build
    if %errorlevel% neq 0 (
        echo Failed to build Docker image. Trying to rebuild...
        docker-compose -f docker-compose.win.yml build --no-cache
        if %errorlevel% neq 0 (
            echo Failed to build Docker image. See error messages above.
            pause
            exit /b 1
        )
    )
)

:: Run Codex in Docker
echo Starting Codex...
docker-compose -f docker-compose.win.yml run --rm codex %*

echo Codex session ended.
pause
