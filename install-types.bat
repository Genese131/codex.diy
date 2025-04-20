@echo off
setlocal enabledelayedexpansion

echo Installing TypeScript type definitions for Codex
echo ==============================================

:: Navigate to the Codex directory
cd /d "%~dp0"

:: Install type definitions for Node.js and other dependencies
echo Installing @types/node...
call npm install --save-dev @types/node

echo Installing @types/js-yaml...
call npm install --save-dev @types/js-yaml

echo Installing OpenAI SDK types...
call npm install --save-dev openai

echo Type definitions installed successfully!
pause
