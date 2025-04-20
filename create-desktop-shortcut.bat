@echo off
setlocal enabledelayedexpansion

echo Creating Codex Desktop Shortcut
echo =============================

:: Get the current directory path
set "CURRENT_DIR=%~dp0"
set "SHORTCUT_NAME=Codex CLI.lnk"
set "DESKTOP_PATH=%USERPROFILE%\Desktop"
set "TARGET_PATH=%CURRENT_DIR%run-codex-local.bat"
set "ICON_PATH=%CURRENT_DIR%codex-cli\assets\icon.ico"

:: Check if icon exists, if not use a default Windows icon
if not exist "%ICON_PATH%" (
    set "ICON_PATH=%SystemRoot%\System32\shell32.dll,0"
)

:: Create the shortcut using PowerShell
echo Creating shortcut on desktop...
powershell -ExecutionPolicy Bypass -Command ^
"$WshShell = New-Object -ComObject WScript.Shell; ^
$Shortcut = $WshShell.CreateShortcut('%DESKTOP_PATH%\%SHORTCUT_NAME%'); ^
$Shortcut.TargetPath = '%TARGET_PATH%'; ^
$Shortcut.IconLocation = '%ICON_PATH%'; ^
$Shortcut.Description = 'Codex CLI with GPT-4o Support'; ^
$Shortcut.WorkingDirectory = '%CURRENT_DIR%'; ^
$Shortcut.Save()"

if %errorlevel% neq 0 (
    echo Failed to create desktop shortcut.
    pause
    exit /b 1
)

echo Desktop shortcut created successfully!
echo You can now launch Codex by double-clicking the "Codex CLI" icon on your desktop.
pause
