// Simple Codex CLI - Standalone JavaScript version
// This script provides a basic interface to OpenAI's GPT-4o and GPT-4o-mini models
// without requiring complex builds or Docker

import { createInterface } from 'readline';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

// OpenAI API configuration
let apiKey = process.env.OPENAI_API_KEY;
let model = process.env.CODEX_MODEL || 'gpt-4o-mini';

// Available models
const RECOMMENDED_MODELS = [
  "gpt-4o", "gpt-4o-mini", 
  "o4", "o4-mini", "o3",
  "gpt-4o-2024-05-13", "gpt-4o-mini-2024-07-18", "gpt-3.5-turbo-0125"
];

// Create readline interface for user input
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    crimson: '\x1b[38m'
  },
  
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
    crimson: '\x1b[48m'
  }
};

// Function to load API key from file
async function loadApiKey() {
  const apiKeyFile = join(homedir(), '.openai-api-key');
  try {
    return await fs.readFile(apiKeyFile, 'utf8');
  } catch (error) {
    return null;
  }
}

// Function to save API key to file
async function saveApiKey(key) {
  const apiKeyFile = join(homedir(), '.openai-api-key');
  await fs.writeFile(apiKeyFile, key, 'utf8');
}

// Function to load environment variables from .env file
async function loadEnvFile() {
  try {
    const envContent = await fs.readFile('.env', 'utf8');
    const envVars = envContent.split('\n');
    
    for (const line of envVars) {
      if (line.trim() && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
          process.env[key.trim()] = value.trim();
          
          // Set variables for this session
          if (key.trim() === 'OPENAI_API_KEY') {
            apiKey = value.trim();
          } else if (key.trim() === 'CODEX_MODEL') {
            model = value.trim();
          }
        }
      }
    }
  } catch (error) {
    console.log(`${colors.fg.yellow}No .env file found. Using default settings.${colors.reset}`);
  }
}

// Function to make API request to OpenAI
async function callOpenAI(prompt) {
  try {
    // Get max tokens from environment or use default
    // Support both old and new parameter names
    const maxTokens = process.env.CODEX_MAX_COMPLETION_TOKENS || process.env.CODEX_MAX_TOKENS || 4096;
    const temperature = process.env.CODEX_TEMPERATURE || 0.7;
    
    // Use fetch API for Node.js 22+
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: parseFloat(temperature),
        max_completion_tokens: parseInt(maxTokens)
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error(`${colors.fg.red}Error: ${data.error.message}${colors.reset}`);
      return null;
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error(`${colors.fg.red}Error calling OpenAI API: ${error.message}${colors.reset}`);
    return null;
  }
}

// Function to display welcome message
function displayWelcome() {
  console.log(`
${colors.fg.cyan}${colors.bright}=================================================
             SIMPLE CODEX CLI
=================================================
${colors.reset}
A lightweight interface to OpenAI's coding models.

${colors.fg.green}Current model: ${colors.bright}${model}${colors.reset}
${colors.fg.yellow}Type 'help' for commands or start typing your coding question.${colors.reset}
`);
}

// Function to display help
function displayHelp() {
  console.log(`
${colors.fg.cyan}${colors.bright}Available Commands:${colors.reset}
  ${colors.fg.yellow}help${colors.reset}          - Display this help message
  ${colors.fg.yellow}model <name>${colors.reset}  - Change the AI model
  ${colors.fg.yellow}models${colors.reset}        - List available models
  ${colors.fg.yellow}clear${colors.reset}         - Clear the screen
  ${colors.fg.yellow}exit${colors.reset}          - Exit the application
`);
}

// Function to list available models
function displayModels() {
  console.log(`
${colors.fg.cyan}${colors.bright}Available Models:${colors.reset}`);
  
  for (const modelName of RECOMMENDED_MODELS) {
    if (modelName === model) {
      console.log(`  ${colors.fg.green}${colors.bright}* ${modelName}${colors.reset} (current)`);
    } else {
      console.log(`  ${colors.fg.yellow}${modelName}${colors.reset}`);
    }
  }
  
  console.log(`
${colors.fg.yellow}Use 'model <name>' to change the model.${colors.reset}
`);
}

// Function to change the model
function changeModel(newModel) {
  if (RECOMMENDED_MODELS.includes(newModel)) {
    model = newModel;
    console.log(`${colors.fg.green}Model changed to ${colors.bright}${model}${colors.reset}`);
  } else {
    console.log(`${colors.fg.red}Unknown model: ${newModel}${colors.reset}`);
    displayModels();
  }
}

// Main function
async function main() {
  console.clear();
  
  // Load API key from file or environment
  apiKey = process.env.OPENAI_API_KEY || await loadApiKey();
  
  // Load environment variables
  await loadEnvFile();
  
  // If API key is still not set, prompt user
  if (!apiKey) {
    console.log(`${colors.fg.yellow}OpenAI API key not found.${colors.reset}`);
    rl.question('Please enter your OpenAI API key: ', async (key) => {
      apiKey = key.trim();
      await saveApiKey(apiKey);
      console.log(`${colors.fg.green}API key saved.${colors.reset}`);
      startPrompt();
    });
  } else {
    startPrompt();
  }
}

// Function to start the prompt loop
function startPrompt() {
  displayWelcome();
  promptUser();
}

// Function to prompt the user for input
function promptUser() {
  rl.question(`${colors.fg.cyan}${colors.bright}> ${colors.reset}`, async (input) => {
    const command = input.trim();
    
    if (command === 'exit') {
      console.log(`${colors.fg.green}Goodbye!${colors.reset}`);
      rl.close();
      return;
    } else if (command === 'help') {
      displayHelp();
    } else if (command === 'models') {
      displayModels();
    } else if (command === 'clear') {
      console.clear();
      displayWelcome();
    } else if (command.startsWith('model ')) {
      const newModel = command.substring(6).trim();
      changeModel(newModel);
    } else if (command) {
      console.log(`${colors.fg.blue}Sending request to ${model}...${colors.reset}`);
      const response = await callOpenAI(command);
      
      if (response) {
        console.log(`\n${colors.fg.green}${colors.bright}Response:${colors.reset}\n${response}\n`);
      }
    }
    
    promptUser();
  });
}

// Start the application
main().catch(error => {
  console.error(`${colors.fg.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
