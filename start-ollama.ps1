# PowerShell script to check if Ollama is running and start it if needed
Write-Host "Checking if Ollama is running..." -ForegroundColor Cyan

# Function to check if Ollama is running
function Test-OllamaRunning {
    try {
        # Try to connect to Ollama API
        $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method GET -TimeoutSec 2 -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

# Function to find Ollama executable
function Find-OllamaExe {
    $possiblePaths = @(
        "C:\Program Files\Ollama\ollama.exe",
        "$env:LOCALAPPDATA\Ollama\ollama.exe",
        "$env:ProgramFiles\Ollama\ollama.exe"
    )

    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            return $path
        }
    }

    # Try to find it in PATH
    $ollamaInPath = Get-Command "ollama" -ErrorAction SilentlyContinue
    if ($ollamaInPath) {
        return $ollamaInPath.Source
    }

    return $null
}

# Check if Ollama is already running
if (Test-OllamaRunning) {
    Write-Host "Ollama is already running!" -ForegroundColor Green
    exit 0
}

Write-Host "Ollama is not running. Attempting to start Ollama..." -ForegroundColor Yellow

# Try to find Ollama executable
$ollamaExe = Find-OllamaExe
if (-not $ollamaExe) {
    Write-Host "Could not find Ollama executable. Please make sure Ollama is installed." -ForegroundColor Red
    Write-Host "You can download it from: https://ollama.ai/download" -ForegroundColor Cyan
    exit 1
}

Write-Host "Found Ollama at: $ollamaExe" -ForegroundColor Green

# Start Ollama
try {
    Write-Host "Starting Ollama..." -ForegroundColor Cyan
    Start-Process -FilePath $ollamaExe -WindowStyle Minimized
    
    # Wait for Ollama to start (up to 10 seconds)
    $maxWaitTime = 10
    $waited = 0
    $started = $false
    
    while (-not $started -and $waited -lt $maxWaitTime) {
        Start-Sleep -Seconds 1
        $waited++
        Write-Host "Waiting for Ollama to start... ($waited/$maxWaitTime)" -ForegroundColor Yellow
        $started = Test-OllamaRunning
    }
    
    if ($started) {
        Write-Host "Ollama started successfully!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Ollama did not start within the expected time." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error starting Ollama: $_" -ForegroundColor Red
    exit 1
}
