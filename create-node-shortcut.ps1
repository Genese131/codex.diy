$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Codex (Node).lnk")
$Shortcut.TargetPath = "$PSScriptRoot\run-codex-node.bat"
$Shortcut.WorkingDirectory = "$PSScriptRoot"
$Shortcut.IconLocation = "$PSScriptRoot\codex-cli\src\assets\codex-icon.ico"
if (-not (Test-Path "$PSScriptRoot\codex-cli\src\assets\codex-icon.ico")) {
    # If icon doesn't exist, use a system icon
    $Shortcut.IconLocation = "shell32.dll,21"
}
$Shortcut.Description = "Codex AI Coding Assistant (Node.js Edition)"
$Shortcut.Save()

Write-Host "Desktop shortcut created successfully!"
