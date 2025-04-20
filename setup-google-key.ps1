# Setup script for Google API key
Write-Host "Google Gemini API Key Setup" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

$apiKeyFile = Join-Path $PSScriptRoot "google-api-key.txt"

# Check if API key file already exists
if (Test-Path $apiKeyFile) {
    $existingKey = Get-Content $apiKeyFile -Raw
    Write-Host "An existing Google API key was found." -ForegroundColor Yellow
    Write-Host "Current key: $($existingKey.Substring(0, 4))..." + ("*" * 20)
    
    $replaceKey = Read-Host "Do you want to replace it? (y/n)"
    if ($replaceKey -ne "y") {
        Write-Host "Keeping existing API key." -ForegroundColor Green
        exit 0
    }
}

# Get the API key from the user
Write-Host "Please enter your Google API key for Gemini models." -ForegroundColor Cyan
Write-Host "You can get an API key from: https://ai.google.dev/" -ForegroundColor Cyan
Write-Host ""
$apiKey = Read-Host "Enter your Google API key"

if ([string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Host "No API key provided. Exiting." -ForegroundColor Red
    exit 1
}

# Save the API key to a file
$apiKey | Out-File -FilePath $apiKeyFile -NoNewline
Write-Host "Google API key saved successfully!" -ForegroundColor Green

# Update .env file if it exists
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    
    # Check if GOOGLE_API_KEY already exists in the file
    if ($envContent -match "GOOGLE_API_KEY=") {
        # Replace existing key
        $envContent = $envContent -replace "GOOGLE_API_KEY=.*", "GOOGLE_API_KEY=$apiKey"
    } else {
        # Add new key
        $envContent += "`nGOOGLE_API_KEY=$apiKey`n"
    }
    
    # Write updated content back to .env file
    $envContent | Out-File -FilePath $envFile -NoNewline
    Write-Host "Updated .env file with Google API key." -ForegroundColor Green
}

Write-Host ""
Write-Host "Setup complete! You can now use Google Gemini models." -ForegroundColor Green
Write-Host "Restart the Codex unified interface to apply changes." -ForegroundColor Yellow
