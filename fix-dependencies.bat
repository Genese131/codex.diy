@echo off
setlocal enabledelayedexpansion

echo Fixing Codex Dependencies
echo =======================

:: Navigate to the Codex directory
cd /d "%~dp0"

:: Install missing dependencies in codex-cli
echo Installing missing dependencies in codex-cli...
pushd codex-cli
call npm install --save figures ink
popd

echo Dependencies installed. Now rebuilding...
pushd codex-cli
call npm run build
popd

echo Done!
pause
