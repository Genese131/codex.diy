@echo off
echo Starting Codex with simplified Docker setup...

:: Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not running! Please start Docker Desktop first.
    pause
    exit /b 1
)

:: Navigate to the Codex directory
cd /d "%~dp0"

:: Build the Docker image
echo Building Codex Docker image...
docker-compose -f simple-compose.yml build

if %errorlevel% neq 0 (
    echo Failed to build Docker image. See error messages above.
    pause
    exit /b 1
)

:: Run Codex in Docker
echo Starting Codex...
docker-compose -f simple-compose.yml run --rm codex

echo Codex session ended.
pause
