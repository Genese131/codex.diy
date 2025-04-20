@echo off
setlocal enabledelayedexpansion

echo Codex CLI - Standalone Docker Build
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

:: Create a temporary Dockerfile with minimal configuration
echo Creating temporary Dockerfile...
(
echo FROM node:22-alpine
echo WORKDIR /app
echo RUN npm install -g dotenv-cli
echo COPY package.json .
echo COPY codex-cli/package.json ./codex-cli/
echo RUN npm install
echo RUN cd codex-cli ^&^& npm install
echo COPY . .
echo RUN npm run build
echo ENV NODE_ENV=production
echo ENV CODEX_SANDBOX=docker
echo ENTRYPOINT ["dotenv", "--", "codex"]
) > temp-dockerfile

:: Build the Docker image directly with a simple tag
echo Building Codex Docker image...
docker build -t codex-standalone -f temp-dockerfile .

if %errorlevel% neq 0 (
    echo Failed to build Docker image. See error messages above.
    del temp-dockerfile
    pause
    exit /b 1
)

:: Clean up temporary file
del temp-dockerfile

:: Get absolute path of current directory and convert to Docker-compatible format
set "CURRENT_DIR=%CD%"
set "DOCKER_PATH=%CURRENT_DIR:\=/%"

:: Run Codex in Docker directly
echo Starting Codex...
docker run --rm -it ^
  -v "%CURRENT_DIR%:/workspace" ^
  -w /workspace ^
  --env-file .env ^
  -e CODEX_SANDBOX=docker ^
  codex-standalone

echo Codex session ended.
pause
