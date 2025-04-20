@echo off
echo Starting Ollama service...
powershell -ExecutionPolicy Bypass -File "%~dp0start-ollama.ps1"
if %ERRORLEVEL% EQU 0 (
  echo Ollama started successfully! Starting Codex...
  timeout /t 2 /nobreak > nul
  call "%~dp0run-codex-unified.bat"
) else (
  echo Failed to start Ollama. Please start it manually.
  echo You can download Ollama from: https://ollama.ai/download
  pause
)
