@echo off
setlocal enabledelayedexpansion

echo Ultra-Simple Codex Docker Setup
echo =============================

:: Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is not running! Please start Docker Desktop first.
    pause
    exit /b 1
)

:: Navigate to the Codex directory
cd /d "%~dp0"

:: Create a temporary directory for the Docker build
if not exist "temp-docker" mkdir temp-docker

:: Copy only the necessary files to the temporary directory
copy simple-codex.js temp-docker\
copy .env temp-docker\ 2>nul
if not exist "temp-docker\.env" (
    echo Environment file not found. Setting up...
    powershell -ExecutionPolicy Bypass -File setup-env.ps1
    copy .env temp-docker\ 2>nul
)

:: Create a minimal Dockerfile directly in the temp directory
echo FROM node:22-alpine > temp-docker\Dockerfile
echo WORKDIR /app >> temp-docker\Dockerfile
echo COPY simple-codex.js /app/ >> temp-docker\Dockerfile
echo COPY .env /app/ >> temp-docker\Dockerfile
echo ENV NODE_ENV=production >> temp-docker\Dockerfile
echo ENTRYPOINT ["node", "--experimental-modules", "simple-codex.js"] >> temp-docker\Dockerfile

:: Change to the temp directory
cd temp-docker

:: Build the Docker image directly
echo Building Ultra-Simple Codex Docker image...
docker build -t ultra-simple-codex .

if %errorlevel% neq 0 (
    echo Failed to build Docker image. See error messages above.
    cd ..
    pause
    exit /b 1
)

:: Return to the original directory
cd ..

:: Run the container directly
echo Starting Ultra-Simple Codex in Docker...
docker run --rm -it ^
  -v "%CD%:/workspace" ^
  --env-file .env ^
  ultra-simple-codex

echo Ultra-Simple Codex Docker session ended.
pause
