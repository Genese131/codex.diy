@echo off
setlocal enabledelayedexpansion

echo Launching Codex in Docker...

:: Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not running! Please start Docker Desktop first.
    pause
    exit /b 1
)

:: Set the current directory as the workspace
set WORKSPACE=%CD%

:: Convert Windows path to Docker-compatible path format
set DOCKER_WORKSPACE=%WORKSPACE:\=/%
set DOCKER_WORKSPACE=%DOCKER_WORKSPACE::=%

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

:: Navigate to the Codex directory
cd /d "%~dp0"

:: Build the Docker image if it doesn't exist
docker images | findstr codex-cli >nul 2>&1
if %errorlevel% neq 0 (
    echo Building Codex Docker image for the first time...
    docker-compose build
)

:: Make sure we're in the right directory for Docker Compose
cd /d "%~dp0"

:: Run Codex in Docker
echo Starting Codex...

:: Use Windows-specific docker-compose file if it exists
if exist "docker-compose.windows.yml" (
    docker-compose -f docker-compose.windows.yml run --rm codex %*
) else (
    docker-compose run --rm codex %*
)

echo Codex session ended.
pause
