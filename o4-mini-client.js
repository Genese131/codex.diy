// o4-mini Client - Specifically designed for the latest OpenAI models
// This script ensures compatibility with both naming formats (o4 and gpt-4o)

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

// API configuration
let apiKey = process.env.OPENAI_API_KEY;
const defaultModel = 'o4-mini'; // Using the short format as default
let currentModel = process.env.CODEX_MODEL || defaultModel;

// Ollama configuration
const useOllama = process.env.USE_OLLAMA === 'true';
const ollamaApiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
let ollamaModel = process.env.OLLAMA_MODEL || 'codellama';

// Available models with both naming formats
const RECOMMENDED_MODELS = [
  // Short format
  "o4", "o4-mini",
  // Long format
  "gpt-4o", "gpt-4o-mini"
];

// Available Ollama models
const OLLAMA_MODELS = [
  "codellama", "llama3", "mistral", "gemma", "phi", "mixtral"
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

// Function to call Ollama API
async function callOllama(prompt) {
  try {
    console.log(`${colors.fg.blue}Sending request to Ollama (${ollamaModel})...${colors.reset}`);
    
    const requestBody = {
      model: ollamaModel,
      prompt: prompt,
      stream: false
    };
    
    // Log the request for debugging
    console.log(`${colors.fg.yellow}Request parameters:${colors.reset}`);
    console.log(`Model: ${requestBody.model}`);
    console.log(`API URL: ${ollamaApiUrl}/api/generate`);
    
    const response = await fetch(`${ollamaApiUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error(`${colors.fg.red}Error: ${data.error}${colors.reset}`);
      return null;
    }
    
    return data.response;
  } catch (error) {
    console.error(`${colors.fg.red}Error calling Ollama API: ${error.message}${colors.reset}`);
    console.error(`${colors.fg.yellow}Make sure Ollama is running on ${ollamaApiUrl}${colors.reset}`);
    return null;
  }
}

// Function to call OpenAI API
async function callOpenAI(prompt) {
  try {
    console.log(`${colors.fg.blue}Sending request to ${currentModel}...${colors.reset}`);
    
    // Create the request body with the correct parameters
    const requestBody = {
      model: currentModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: parseFloat(process.env.CODEX_TEMPERATURE || 0.7)
    };
    
    // Always use max_completion_tokens for these models
    requestBody.max_completion_tokens = parseInt(process.env.CODEX_MAX_COMPLETION_TOKENS || 8192);
    
    // Log the request for debugging
    console.log(`${colors.fg.yellow}Request parameters:${colors.reset}`);
    console.log(`Model: ${requestBody.model}`);
    console.log(`Max completion tokens: ${requestBody.max_completion_tokens}`);
    console.log(`Temperature: ${requestBody.temperature}`);
    
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
      if (data.error.message.includes('max_tokens')) {
        console.error(`${colors.fg.yellow}Try using one of these model names: o4-mini, o4${colors.reset}`);
      }
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
  const apiType = useOllama ? 'Ollama (Local LLM)' : 'OpenAI';
  const modelName = useOllama ? ollamaModel : currentModel;
  
  console.log(`
${colors.fg.cyan}${colors.bright}=================================================
                Codex Client
=================================================
${colors.reset}
A lightweight interface for AI coding assistance.

${colors.fg.green}API: ${colors.bright}${apiType}${colors.reset}
${colors.fg.green}Current model: ${colors.bright}${modelName}${colors.reset}
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
  ${colors.fg.yellow}api${colors.reset}           - Toggle between OpenAI and Ollama
  ${colors.fg.yellow}ollama <name>${colors.reset} - Change the Ollama model
  ${colors.fg.yellow}clear${colors.reset}         - Clear the screen
  ${colors.fg.yellow}exit${colors.reset}          - Exit the application
`);
}

// Function to list available models
function displayModels() {
  if (useOllama) {
    console.log(`
${colors.fg.cyan}${colors.bright}Available Ollama Models:${colors.reset}`);
    
    for (const model of OLLAMA_MODELS) {
      if (model === ollamaModel) {
        console.log(`  ${colors.fg.green}${colors.bright}* ${model}${colors.reset} (current)`);
      } else {
        console.log(`  ${colors.fg.yellow}${model}${colors.reset}`);
      }
    }
    
    console.log(`
${colors.fg.yellow}Use 'ollama <name>' to change the Ollama model.${colors.reset}`);
    console.log(`${colors.fg.yellow}Use 'api' to switch to OpenAI.${colors.reset}
`);
  } else {
    console.log(`
${colors.fg.cyan}${colors.bright}Available OpenAI Models:${colors.reset}`);
    
    console.log(`${colors.fg.yellow}Short format (recommended):${colors.reset}`);
    console.log(`  ${currentModel === "o4" ? colors.fg.green + colors.bright + "* " : "  "}o4${colors.reset}${currentModel === "o4" ? " (current)" : ""}`);
    console.log(`  ${currentModel === "o4-mini" ? colors.fg.green + colors.bright + "* " : "  "}o4-mini${colors.reset}${currentModel === "o4-mini" ? " (current)" : ""}`);
    
    console.log(`\n${colors.fg.yellow}Long format:${colors.reset}`);
    console.log(`  ${currentModel === "gpt-4o" ? colors.fg.green + colors.bright + "* " : "  "}gpt-4o${colors.reset}${currentModel === "gpt-4o" ? " (current)" : ""}`);
    console.log(`  ${currentModel === "gpt-4o-mini" ? colors.fg.green + colors.bright + "* " : "  "}gpt-4o-mini${colors.reset}${currentModel === "gpt-4o-mini" ? " (current)" : ""}`);
    
    console.log(`
${colors.fg.yellow}Use 'model <name>' to change the model.${colors.reset}`);
    console.log(`${colors.fg.yellow}Use 'api' to switch to Ollama.${colors.reset}
`);
  }
}

// Function to change the model
function changeModel(newModel) {
  if (useOllama) {
    console.log(`${colors.fg.yellow}Currently using Ollama. Use 'api' to switch to OpenAI first.${colors.reset}`);
    return;
  }
  
  if (RECOMMENDED_MODELS.includes(newModel)) {
    currentModel = newModel;
    console.log(`${colors.fg.green}Model changed to ${colors.bright}${currentModel}${colors.reset}`);
  } else {
    console.log(`${colors.fg.red}Unknown model: ${newModel}${colors.reset}`);
    displayModels();
  }
}

// Function to change the Ollama model
function changeOllamaModel(newModel) {
  if (!useOllama) {
    console.log(`${colors.fg.yellow}Currently using OpenAI. Use 'api' to switch to Ollama first.${colors.reset}`);
    return;
  }
  
  if (OLLAMA_MODELS.includes(newModel)) {
    ollamaModel = newModel;
    console.log(`${colors.fg.green}Ollama model changed to ${colors.bright}${ollamaModel}${colors.reset}`);
  } else {
    console.log(`${colors.fg.red}Unknown Ollama model: ${newModel}${colors.reset}`);
    displayModels();
  }
}

// Function to toggle between OpenAI and Ollama
function toggleApi() {
  useOllama = !useOllama;
  if (useOllama) {
    console.log(`${colors.fg.green}Switched to ${colors.bright}Ollama${colors.reset} (Local LLM)`);
    console.log(`${colors.fg.green}Current model: ${colors.bright}${ollamaModel}${colors.reset}`);
  } else {
    console.log(`${colors.fg.green}Switched to ${colors.bright}OpenAI${colors.reset} API`);
    console.log(`${colors.fg.green}Current model: ${colors.bright}${currentModel}${colors.reset}`);
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
    } else if (command === 'api') {
      toggleApi();
    } else if (command.startsWith('model ')) {
      const newModel = command.substring(6).trim();
      changeModel(newModel);
    } else if (command.startsWith('ollama ')) {
      const newModel = command.substring(7).trim();
      changeOllamaModel(newModel);
    } else if (command) {
      let response;
      if (useOllama) {
        response = await callOllama(command);
      } else {
        response = await callOpenAI(command);
      }
      
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
