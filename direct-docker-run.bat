@echo off
setlocal enabledelayedexpansion

echo Codex CLI - Direct Docker Run
echo ============================

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

:: Get absolute path of current directory
set "CURRENT_DIR=%CD%"
echo Current directory: %CURRENT_DIR%

:: Build the Docker image directly
echo Building Codex Docker image...
docker build -t codex-direct -f simple-dockerfile .

if %errorlevel% neq 0 (
    echo Failed to build Docker image. See error messages above.
    pause
    exit /b 1
)

:: Run Codex in Docker directly without Docker Compose
echo Starting Codex...
docker run --rm -it ^
  -v "%CURRENT_DIR%:/workspace" ^
  -w /workspace ^
  --env-file .env ^
  -e CODEX_SANDBOX=docker ^
  codex-direct

echo Codex session ended.
pause
