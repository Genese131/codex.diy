# Codex Docker Setup

This document explains how to use the Docker containerized version of Codex and the desktop shortcut.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Windows 10/11 with PowerShell

## Getting Started

### Creating the Desktop Shortcut

1. Right-click on the `create-desktop-shortcut.ps1` file and select "Run with PowerShell"
2. A shortcut named "Codex" will be created on your desktop

### Using the Desktop Shortcut

1. Double-click the "Codex" shortcut on your desktop
2. The first time you run it, you'll be prompted for your OpenAI API key if it's not already set in your environment
3. The Docker container will be built (first time only) and then launched
4. Codex will run in the container with access to your current directory

## Manual Usage

If you prefer to run Codex manually without the shortcut:

```bash
# Navigate to the Codex directory
cd path\to\codex-main

# Run the batch file
.\launch-codex.bat
```

## Configuration

Codex is configured using a `.env` file. When you run the application for the first time, the setup script will create this file for you and prompt for your OpenAI API key.

### Environment Variables

The following variables can be configured in the `.env` file:

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `CODEX_MODEL`: The AI model to use. Supported models include:
  - Latest models (recommended):
    - `gpt-4o`: Most capable model with vision and advanced reasoning
    - `gpt-4o-mini`: Efficient and cost-effective model with strong capabilities
  - Legacy models:
    - `gpt-4`, `gpt-4-turbo`
    - `gpt-3.5-turbo`, `gpt-3.5-turbo-0125`
- `CODEX_APPROVAL_MODE`: Set to "suggest", "auto-edit", or "full-auto"
- `CODEX_DISABLE_NETWORK`: Set to "true" to disable network access in the sandbox
- `CODEX_DARK_MODE`: Set to "true" to use dark mode in the UI
- `CODEX_MAX_TOKENS`: Maximum tokens to generate
- `CODEX_TEMPERATURE`: Temperature for generation (0.0-2.0)

### Editing the Configuration

You can edit the `.env` file directly with any text editor to update your configuration. Alternatively, you can run the setup script again:

```bash
powershell -ExecutionPolicy Bypass -File setup-env.ps1
```

## Volumes and Data Persistence

The Docker setup includes the following volume mappings:

- Your current directory is mounted as the workspace inside the container
- A persistent volume for Codex data is created at `codex-data`
- Your OpenAI API key file is mounted from `~/.openai-api-key` (if it exists)

## Troubleshooting

If you encounter issues:

1. Ensure Docker Desktop is running
2. Check that your OpenAI API key is valid
3. Try rebuilding the Docker image: `docker-compose build --no-cache`
4. For permission issues, ensure you're running with appropriate privileges

### Windows-Specific Issues

On Windows, you might encounter volume mounting issues with Docker. The most common error is:

```
The "PWD" variable is not set. Defaulting to a blank string.
invalid spec: :/workspace: empty section between colons
```

This is fixed by using the Windows-specific Docker Compose file that's included in this repository. The launch script will automatically use this file if it exists.

If you're still having issues:

1. Make sure you're using the latest version of Docker Desktop for Windows
2. Try running the command with an explicit volume path:
   ```
   docker-compose -f docker-compose.windows.yml run --rm codex
   ```
3. If all else fails, you can manually specify the absolute path in the docker-compose.windows.yml file:
   ```yaml
   volumes:
     - C:/your/absolute/path:/workspace
   ```

## Security Notes

- Your OpenAI API key is stored in a file at `%USERPROFILE%\.openai-api-key`
- The container runs with network access to allow API calls to OpenAI
- The container has read/write access to your current directory
