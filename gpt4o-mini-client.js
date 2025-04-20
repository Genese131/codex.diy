// GPT-4o-mini Client - Specifically designed for the latest OpenAI models
// This script ensures compatibility with GPT-4o and GPT-4o-mini

import { createInterface } from 'readline';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Terminal colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  fg: {
    green: '\x1b[32m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    yellow: '\x1b[33m'
  }
};

// Create readline interface
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// OpenAI API configuration
let apiKey = process.env.OPENAI_API_KEY;
const defaultModel = 'o4-mini';
let currentModel = process.env.CODEX_MODEL || defaultModel;

// Available models
const RECOMMENDED_MODELS = [
  "gpt-4o", "gpt-4o-mini", 
  "o4", "o4-mini",
  "gpt-4o-2024-05-13", "gpt-4o-mini-2024-07-18"
];

// Function to load API key from file
async function loadApiKey() {
  const apiKeyFile = join(homedir(), '.openai-api-key');
  try {
    return await fs.readFile(apiKeyFile, 'utf8');
  } catch (error) {
    return null;
  }
}

// Function to call OpenAI API
async function callOpenAI(prompt) {
  try {
    console.log(`${colors.fg.blue}Sending request to ${currentModel}...${colors.reset}`);
    
    // Create the request body with the correct parameters for GPT-4o models
    const requestBody = {
      model: currentModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: parseFloat(process.env.CODEX_TEMPERATURE || 0.7)
    };
    
    // Add max_completion_tokens for all the latest models
    // This includes both naming formats (with 'o' and with '0')
    if (currentModel.includes('gpt-4o') || 
        currentModel.includes('o4') || 
        currentModel === 'o4' || 
        currentModel === 'o4-mini') {
      requestBody.max_completion_tokens = parseInt(process.env.CODEX_MAX_COMPLETION_TOKENS || 8192);
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
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
             GPT-4o-mini Client
=================================================
${colors.reset}
A lightweight interface specifically designed for OpenAI's latest models.

${colors.fg.green}Current model: ${colors.bright}${currentModel}${colors.reset}
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
    if (modelName === currentModel) {
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
    currentModel = newModel;
    console.log(`${colors.fg.green}Model changed to ${colors.bright}${currentModel}${colors.reset}`);
  } else {
    console.log(`${colors.fg.red}Unknown model: ${newModel}${colors.reset}`);
    displayModels();
  }
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
      const response = await callOpenAI(command);
      
      if (response) {
        console.log(`\n${colors.fg.green}${colors.bright}Response:${colors.reset}\n${response}\n`);
      }
    }
    
    promptUser();
  });
}

// Main function
async function main() {
  console.clear();
  
  // Load API key from file or environment
  if (!apiKey) {
    apiKey = await loadApiKey();
    if (!apiKey) {
      console.log(`${colors.fg.yellow}OpenAI API key not found.${colors.reset}`);
      rl.question('Please enter your OpenAI API key: ', async (key) => {
        apiKey = key.trim();
        await fs.writeFile(join(homedir(), '.openai-api-key'), apiKey, 'utf8');
        console.log(`${colors.fg.green}API key saved.${colors.reset}`);
        startPrompt();
      });
    } else {
      startPrompt();
    }
  } else {
    startPrompt();
  }
}

// Function to start the prompt loop
function startPrompt() {
  displayWelcome();
  promptUser();
}

// Start the application
main().catch(error => {
  console.error(`${colors.fg.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
