# Setup environment file for Codex
# This script creates a .env file from .env.example if it doesn't exist

$envFile = Join-Path $PSScriptRoot ".env"
$envExampleFile = Join-Path $PSScriptRoot ".env.example"

# Check if .env file already exists
if (-not (Test-Path $envFile)) {
    Write-Host "Creating .env file from .env.example..."
    
    # Read the example file
    $envContent = Get-Content $envExampleFile -Raw
    
    # Ask for OpenAI API key
    $apiKey = Read-Host "Enter your OpenAI API key"
    
    # Replace the placeholder with the actual API key
    $envContent = $envContent -replace "OPENAI_API_KEY=your-api-key-here", "OPENAI_API_KEY=$apiKey"
    
    # Write the content to the .env file
    $envContent | Out-File -FilePath $envFile -Encoding utf8
    
    Write-Host "Created .env file with your API key."
    Write-Host "You can edit this file anytime to update your configuration."
} else {
    Write-Host ".env file already exists."
}

# Display the current configuration
Write-Host "`nCurrent Codex Configuration:"
Write-Host "------------------------"
$currentEnv = Get-Content $envFile | Where-Object { $_ -match "^[^#]" } # Skip comments
$currentEnv | ForEach-Object {
    # Mask the API key for security
    if ($_ -match "OPENAI_API_KEY=") {
        $key = $_ -replace "OPENAI_API_KEY=", ""
        $maskedKey = $key.Substring(0, 3) + "..." + $key.Substring($key.Length - 4)
        Write-Host "OPENAI_API_KEY=$maskedKey"
    } else {
        Write-Host $_
    }
}
