@echo off
setlocal enabledelayedexpansion

echo Rebuilding Codex Docker image from scratch...

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

:: Clean up any existing Docker resources
echo Cleaning up existing Docker resources...
docker-compose down -v 2>nul
docker rm -f codex-cli 2>nul
docker volume rm codex-data 2>nul

:: Remove any existing images
echo Removing existing Codex Docker images...
for /f "tokens=*" %%i in ('docker images -q codex-main_codex 2^>nul') do (
    docker rmi -f %%i
)

:: Build the Docker image with no cache
echo Building Codex Docker image with no cache...
docker-compose -f docker-compose.windows.yml build --no-cache

if %errorlevel% neq 0 (
    echo Failed to build Docker image. See error messages above.
    pause
    exit /b 1
)

echo.
echo Docker image rebuilt successfully!
echo.
echo To run Codex, use the launch-codex.bat script.
echo.

pause
