# Codex CLI - Local Installation Guide

This guide explains how to set up and run Codex CLI directly on your local machine without Docker.

## Prerequisites

- **Node.js**: Version 22 or higher is recommended
- **Windows**: This guide is specifically for Windows users

## Quick Setup

1. Run the complete setup script:
   ```
   setup-codex-local.bat
   ```

   This script will:
   - Check for Node.js installation
   - Set up your environment file (.env) if needed
   - Install all dependencies
   - Build the application
   - Create a desktop shortcut

2. Launch Codex using one of these methods:
   - Double-click the "Codex (Local)" desktop shortcut
   - Run `run-codex-local.bat` from the Codex directory

## Manual Setup Steps

If you prefer to set up Codex manually or if the automatic setup fails, follow these steps:

1. **Create environment file**:
   ```
   powershell -ExecutionPolicy Bypass -File setup-env.ps1
   ```

2. **Install dependencies**:
   ```
   npm install
   cd codex-cli
   npm install
   cd ..
   ```

3. **Build the application**:
   ```
   cd codex-cli
   npm run build
   cd ..
   ```

4. **Install dotenv-cli globally**:
   ```
   npm install -g dotenv-cli
   ```

5. **Run Codex**:
   ```
   run-codex-local.bat
   ```

## Configuration

All configuration is done through the `.env` file in the root directory. You can edit this file to change settings like:

- `OPENAI_API_KEY`: Your OpenAI API key
- `CODEX_MODEL`: The AI model to use (supports `gpt-4o`, `gpt-4o-mini`, and legacy models)
- `CODEX_APPROVAL_MODE`: Set to "suggest", "auto-edit", or "full-auto"

## Troubleshooting

If you encounter issues:

1. **Missing dependencies**: Run `npm install` in both the root directory and the `codex-cli` directory
2. **TypeScript errors**: Run `install-types.bat` to install required type definitions
3. **Build errors**: Make sure you have Node.js 22+ installed
4. **Runtime errors**: Check your `.env` file for correct configuration

## Updating

To update Codex to use the latest models or features:

1. Pull the latest code from the repository
2. Run `setup-codex-local.bat` again to rebuild with the latest changes

## Notes on GPT-4o and GPT-4o-mini

This version of Codex has been updated to support the latest OpenAI models:

- `gpt-4o`: High-performance model with full context capabilities
- `gpt-4o-mini`: Efficient model for most coding tasks

You can select your preferred model by setting `CODEX_MODEL` in your `.env` file.
