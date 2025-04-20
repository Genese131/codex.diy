// Codex Unified Interface - Server
// Supports both OpenAI and Ollama models with advanced features

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import bodyParser from 'body-parser';
import fileUpload from 'express-fileupload';
import { exec } from 'child_process';
import archiver from 'archiver';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import simpleGit from 'simple-git';
import fetch from 'node-fetch';

// Initialize environment variables
dotenv.config();

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const port = process.env.PORT || 3030;
const httpServer = createServer(app);
const io = new Server(httpServer);

// Configure middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
}));
app.use(express.static(join(__dirname, 'public')));

// Serve the code editor page
app.get('/code-editor', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'code-editor.html'));
});

// Serve the fixed appliance dropdown page
app.get('/fixed-appliance-dropdown', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'fixed-appliance-dropdown.html'));
});

// Initialize git for version control
const git = simpleGit();

// Create project directory if it doesn't exist
const projectsDir = join(__dirname, 'projects');
fs.ensureDirSync(projectsDir);

// Track active terminal sessions
const terminalSessions = {};

// API Keys and Configuration
const getOpenAIKey = () => {
  const apiKeyPath = join(__dirname, 'openai-api-key.txt');
  if (fs.existsSync(apiKeyPath)) {
    return fs.readFileSync(apiKeyPath, 'utf8').trim();
  }
  return process.env.OPENAI_API_KEY || '';
};

// Default model lists (will be replaced with API-provided lists when available)
const DEFAULT_OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
  'gpt-4-vision',
  'gpt-4-turbo-preview',
  'gpt-4-32k',
  'gpt-3.5-turbo-16k'
];

// Default Google Gemini models (will be replaced with API-provided lists when available)
const DEFAULT_GEMINI_MODELS = [
  'gemini-pro',
  'gemini-pro-vision',
  'gemini-ultra',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.0-pro',
  'gemini-pro-code',
  'gemini-1.5-pro-latest',
  'gemini-1.5-flash-latest'
];

// Default Ollama models (will be used if Ollama API doesn't return any models)
const DEFAULT_OLLAMA_MODELS = [
  'codellama',
  'llama3',
  'mistral',
  'gemma',
  'phi',
  'mixtral',
  'llama2',
  'llama2-uncensored',
  'llama3-8b',
  'llama3-70b',
  'deepseek-coder',
  'neural-chat',
  'wizard-math',
  'falcon',
  'orca-mini',
  'stable-code',
  'qwen',
  'yi'
];

// Configure fetch to use IPv4 (needed for Node.js 17+)
import { setDefaultResultOrder } from 'dns';
// Use IPv4 first to avoid connection issues
try {
  setDefaultResultOrder('ipv4first');
  console.log('DNS resolver set to IPv4 first');
} catch (error) {
  console.warn('Could not set DNS resolver order:', error.message);
}

// Get environment variables with fallbacks
const openaiApiKey = process.env.OPENAI_API_KEY || '';
const googleApiKey = process.env.GOOGLE_API_KEY || '';
const useOllama = process.env.USE_OLLAMA === 'true';
// Use localhost as requested by user
const ollamaApiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const ollamaModel = process.env.OLLAMA_MODEL || 'codellama';
const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o';
const openaiMaxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '4096');
const ollamaMaxTokens = parseInt(process.env.OLLAMA_MAX_TOKENS || '32768');
const temperature = parseFloat(process.env.TEMPERATURE || '0.7');

// Force Ollama to be true for testing
console.log('Setting useOllama to true for testing');
const forceUseOllama = true; // This will override the env variable for testing

// Function to check if Ollama is running
async function isOllamaRunning() {
  if (!useOllama) {
    console.log('Ollama is disabled by configuration');
    return false;
  }

  // Try multiple URLs to handle potential IPv4/IPv6 issues
  const urlsToTry = [
    ollamaApiUrl,  // Try the configured URL first (usually localhost)
    ollamaApiUrl.replace('localhost', '127.0.0.1'), // Try explicit IPv4
    ollamaApiUrl.replace('127.0.0.1', 'localhost')  // Try hostname if IP was configured
  ];
  
  // Remove duplicates
  const uniqueUrls = [...new Set(urlsToTry)];
  
  for (const url of uniqueUrls) {
    try {
      console.log(`Checking if Ollama is running at ${url}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(`${url}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`✅ Successfully connected to Ollama at ${url}`);
        // If this isn't the primary URL, update it for future requests
        if (url !== ollamaApiUrl) {
          console.log(`Updating Ollama API URL from ${ollamaApiUrl} to ${url}`);
          process.env.OLLAMA_API_URL = url;
        }
        return true;
      }
    } catch (error) {
      console.log(`Ollama check error at ${url}: ${error.message}`);
      
      // Check if this is an IPv6 connection issue
      if (error.message.includes('ECONNREFUSED') && error.message.includes('::1')) {
        console.log('Detected IPv6 connection attempt. Will try IPv4 address next.');
      }
    }
  }
  
  console.log('❌ Could not connect to Ollama on any URL');
  return false;
}

// Helper to get available Ollama models
async function getAvailableOllamaModels() {
  try {
    // Use the potentially updated URL from isOllamaRunning
    const currentOllamaUrl = process.env.OLLAMA_API_URL || ollamaApiUrl;
    console.log(`Fetching available Ollama models from ${currentOllamaUrl}...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${currentOllamaUrl}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Ollama API response:', JSON.stringify(data).substring(0, 200) + '...');
      
      // Handle different Ollama API response formats
      if (data.models && Array.isArray(data.models)) {
        console.log(`Found ${data.models.length} Ollama models in 'models' array`);
        return data.models;
      }
      
      // Newer Ollama versions return a 'models' object
      if (data.models && typeof data.models === 'object') {
        console.log(`Found ${Object.keys(data.models).length} Ollama models in 'models' object`);
        return Object.keys(data.models);
      }
      
      // Older Ollama versions return a 'tags' array
      if (data.tags && Array.isArray(data.tags)) {
        console.log(`Found ${data.tags.length} Ollama models in 'tags' array`);
        return data.tags.map(tag => tag.name || tag);
      }
      
      // Some versions might return a flat array
      if (Array.isArray(data)) {
        console.log(`Found ${data.length} Ollama models in root array`);
        return data.map(item => item.name || item);
      }
      
      console.log('Could not parse Ollama API response, using default models');
      return DEFAULT_OLLAMA_MODELS;
    } else {
      console.error(`Ollama API returned status: ${response.status}`);
      return DEFAULT_OLLAMA_MODELS;
    }
  } catch (error) {
    console.error('Error fetching Ollama models:', error.message);
    return DEFAULT_OLLAMA_MODELS;
  }
}

// Helper to get Google API Key
const getGoogleKey = () => {
  const apiKeyPath = join(__dirname, 'google-api-key.txt');
  if (fs.existsSync(apiKeyPath)) {
    return fs.readFileSync(apiKeyPath, 'utf8').trim();
  }
  return process.env.GOOGLE_API_KEY || '';
};

// API endpoint to get system info
app.get('/api/system-info', async (req, res) => {
  const ollamaRunning = await isOllamaRunning();
  const availableOllamaModels = ollamaRunning ? await getAvailableOllamaModels() : [];
  
  // Use forceUseOllama to override the environment variable
  const effectiveUseOllama = forceUseOllama || useOllama;
  
  res.json({
    openaiApiKey: !!getOpenAIKey(),
    googleApiKey: !!getGoogleKey(),
    ollamaRunning,
    availableOllamaModels,
    useOllama: effectiveUseOllama,
    defaultModel: effectiveUseOllama ? ollamaModel : openaiModel,
    temperature
  });
});

// API endpoint to list locally installed Ollama models
app.get('/api/ollama/models', async (req, res) => {
  try {
    console.log('Fetching locally installed Ollama models...');
    
    // Try using the Ollama API first
    try {
      const response = await fetch(`${ollamaApiUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        let models = [];
        
        // Extract models from the response
        if (data.models && Array.isArray(data.models)) {
          models = data.models;
        } else if (data.tags && Array.isArray(data.tags)) {
          models = data.tags.map(tag => tag.name || tag);
        }
        
        console.log('Locally installed Ollama models from API:', models);
        
        if (models.length > 0) {
          return res.json({ models, source: 'api' });
        }
      }
    } catch (apiError) {
      console.error('Error fetching Ollama models from API:', apiError.message);
    }
    
    // If API fails or returns no models, try using the CLI
    try {
      const { exec } = require('child_process');
      
      exec('ollama list', (error, stdout, stderr) => {
        if (error) {
          console.error('Error executing ollama list:', error);
          return res.status(500).json({ error: error.message });
        }
        
        if (stderr) {
          console.error('Stderr from ollama list:', stderr);
        }
        
        // Parse the output to extract model names
        const modelLines = stdout.split('\n').filter(line => line.trim() !== '');
        // Skip header line if it exists
        const startIndex = modelLines[0].includes('NAME') ? 1 : 0;
        
        const models = [];
        for (let i = startIndex; i < modelLines.length; i++) {
          const line = modelLines[i];
          const modelName = line.split(/\s+/)[0]; // First column is the model name
          if (modelName && modelName.trim() !== '') {
            models.push(modelName.trim());
          }
        }
        
        console.log('Locally installed Ollama models from CLI:', models);
        return res.json({ models, source: 'cli' });
      });
    } catch (cliError) {
      console.error('Error using Ollama CLI:', cliError);
      return res.status(500).json({ error: cliError.message });
    }
  } catch (error) {
    console.error('Error listing Ollama models:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper to get available OpenAI models
async function getAvailableOpenAIModels() {
  try {
    const apiKey = getOpenAIKey();
    if (!apiKey) {
      console.log('OpenAI API key not available, using default models');
      return DEFAULT_OPENAI_MODELS;
    }
    
    console.log('Fetching available OpenAI models...');
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        // Filter for chat models only
        const chatModels = data.data
          .filter(model => model.id.includes('gpt'))
          .map(model => model.id)
          .sort();
        
        console.log(`Found ${chatModels.length} OpenAI chat models`);
        return chatModels.length > 0 ? chatModels : DEFAULT_OPENAI_MODELS;
      }
    }
    console.log('Error fetching OpenAI models, using default list');
    return DEFAULT_OPENAI_MODELS;
  } catch (error) {
    console.error('Error fetching OpenAI models:', error.message);
    return DEFAULT_OPENAI_MODELS;
  }
}

// Helper to get available Google Gemini models
async function getAvailableGeminiModels() {
  try {
    const apiKey = getGoogleKey();
    if (!apiKey) {
      console.log('Google API key not available, using default models');
      return DEFAULT_GEMINI_MODELS;
    }
    
    console.log('Using all available Google Gemini models');
    return DEFAULT_GEMINI_MODELS;
    
    // Note: Google doesn't have a simple API to list all available models
    // We could implement this in the future if Google provides such an API
  } catch (error) {
    console.error('Error with Google Gemini models:', error.message);
    return DEFAULT_GEMINI_MODELS;
  }
}

// API endpoint to get available models
app.get('/api/models', async (req, res) => {
  // Fetch models from all providers in parallel
  const [openaiModelsPromise, geminiModelsPromise] = [
    getAvailableOpenAIModels(),
    getAvailableGeminiModels()
  ];
  
  const ollamaRunning = await isOllamaRunning();
  let availableOllamaModels = [];
  const hasGoogleApiKey = !!getGoogleKey();
  
  console.log('API Key status - Google:', hasGoogleApiKey ? 'Available' : 'Not available');
  
  if (ollamaRunning) {
    try {
      console.log('Fetching available Ollama models...');
      availableOllamaModels = await getAvailableOllamaModels();
      console.log('Available Ollama models:', availableOllamaModels);
      
      // If no models were found, try using the Ollama list command directly
      if (availableOllamaModels.length === 0) {
        try {
          const { execSync } = require('child_process');
          console.log('Trying to get models using Ollama CLI...');
          
          try {
            // Use execSync to make this synchronous
            const stdout = execSync('ollama list', { encoding: 'utf8' });
            
            // Parse the output to extract model names
            const modelLines = stdout.split('\n').filter(line => line.trim() !== '');
            // Skip header line if it exists
            const startIndex = modelLines[0].includes('NAME') ? 1 : 0;
            
            const cliModels = [];
            for (let i = startIndex; i < modelLines.length; i++) {
              const line = modelLines[i];
              const modelName = line.split(/\s+/)[0]; // First column is the model name
              if (modelName && modelName.trim() !== '') {
                cliModels.push(modelName.trim());
              }
            }
            
            console.log('Models from Ollama CLI:', cliModels);
            if (cliModels.length > 0) {
              availableOllamaModels = cliModels;
            }
          } catch (execError) {
            console.error('Error executing ollama list:', execError);
            // Try with a different path
            try {
              // Some Windows installations might need the full path
              const stdout = execSync('C:\\Program Files\\Ollama\\ollama.exe list', { encoding: 'utf8' });
              
              // Parse the output to extract model names
              const modelLines = stdout.split('\n').filter(line => line.trim() !== '');
              const startIndex = modelLines[0].includes('NAME') ? 1 : 0;
              
              const cliModels = [];
              for (let i = startIndex; i < modelLines.length; i++) {
                const line = modelLines[i];
                const modelName = line.split(/\s+/)[0];
                if (modelName && modelName.trim() !== '') {
                  cliModels.push(modelName.trim());
                }
              }
              
              console.log('Models from Ollama CLI (full path):', cliModels);
              if (cliModels.length > 0) {
                availableOllamaModels = cliModels;
              }
            } catch (fullPathError) {
              console.error('Error executing ollama with full path:', fullPathError);
            }
          }
        } catch (cliError) {
          console.error('Error using Ollama CLI:', cliError);
        }
      }
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
    }
  }
  
  // Ensure we always have some models to show
  if (!ollamaRunning || availableOllamaModels.length === 0) {
    console.log('Using default Ollama models list');
    availableOllamaModels = DEFAULT_OLLAMA_MODELS;
  }
  
  // Wait for the model lists to resolve
  const [openaiModels, geminiModels] = await Promise.all([openaiModelsPromise, geminiModelsPromise]);
  
  // Define the default model based on environment
  // Use forceUseOllama to override the environment variable
  const effectiveUseOllama = forceUseOllama || useOllama;
  const defaultModel = effectiveUseOllama ? ollamaModel : openaiModel;
  
  console.log(`Returning ${openaiModels.length} OpenAI models, ${geminiModels.length} Gemini models, and ${availableOllamaModels.length} Ollama models`);
  
  res.json({
    openai: openaiModels,
    gemini: hasGoogleApiKey ? geminiModels : [],
    ollama: availableOllamaModels,
    defaultModel,
    useOllama: effectiveUseOllama // Use the effective value
  });
});

// API endpoint to call Google Gemini
app.post('/api/gemini', async (req, res) => {
  const { message, model, imageData } = req.body;
  const apiKey = getGoogleKey();
  
  if (!apiKey) {
    return res.status(400).json({ error: 'Google API key not found' });
  }
  
  const selectedModel = model || 'gemini-pro';
  
  try {
    // Prepare the request body
    const requestBody = {
      contents: [
        {
          parts: [
            { text: message }
          ]
        }
      ],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: openaiMaxTokens,
        topP: 0.95,
        topK: 64
      }
    };
    
    // If image is included, add it to the request
    if (imageData) {
      // Extract base64 data from the data URL
      const base64Data = imageData.split(',')[1];
      requestBody.contents[0].parts.push({
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg' // Assuming JPEG format, adjust if needed
        }
      });
    }
    
    // Determine the correct API URL based on the model
    let apiUrl = `https://generativelanguage.googleapis.com/v1/models/${selectedModel}:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('Google Gemini API error:', data.error);
      return res.status(400).json({ error: data.error.message || 'Unknown error' });
    }
    
    // Extract the response text from the Gemini API response
    let responseText = '';
    if (data.candidates && data.candidates.length > 0 && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts.length > 0) {
      responseText = data.candidates[0].content.parts[0].text || '';
    }
    
    res.json({ 
      response: responseText,
      model: selectedModel,
      usage: data.usage || {}
    });
  } catch (error) {
    console.error('Error calling Google Gemini:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to call OpenAI
app.post('/api/openai', async (req, res) => {
  const { message, model, imageData } = req.body;
  const apiKey = getOpenAIKey();
  
  if (!apiKey) {
    return res.status(400).json({ error: 'OpenAI API key not found' });
  }
  
  // Normalize model name to handle both formats (gpt-4o-mini and o4-mini)
  let selectedModel = model || process.env.CODEX_MODEL || 'gpt-4o-mini';
  
  // Convert short format to full format if needed
  if (selectedModel === 'o4-mini') {
    selectedModel = 'gpt-4o-mini';
  } else if (selectedModel === 'o4') {
    selectedModel = 'gpt-4o';
  }
  
  try {
    const messages = [{ role: 'user', content: message }];
    
    // If image is included, format it correctly for vision models
    if (imageData) {
      // GPT-4o and GPT-4o-mini both support vision capabilities
      if (selectedModel.includes('gpt-4o') || selectedModel.includes('gpt-4-vision')) {
        messages[0].content = [
          { type: 'text', text: message },
          { 
            type: 'image_url', 
            image_url: {
              url: imageData,
              detail: 'high'
            }
          }
        ];
      } else {
        // For non-vision models, we can't send images, so we'll add a note
        console.log(`Model ${selectedModel} does not support images. Sending text only.`);
      }
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        temperature: temperature,
        max_tokens: openaiMaxTokens
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('OpenAI API error:', data.error);
      return res.status(400).json({ error: data.error.message });
    }
    
    res.json({ 
      response: data.choices[0].message.content,
      model: selectedModel,
      usage: data.usage
    });
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to pull Ollama model if not already installed
async function pullOllamaModel(modelName) {
  try {
    console.log(`Checking if Ollama model '${modelName}' needs to be pulled...`);
    
    // First check if the model is already available
    const availableModels = await getAvailableOllamaModels();
    if (availableModels.includes(modelName)) {
      console.log(`Model '${modelName}' is already available.`);
      return { success: true, message: `Model '${modelName}' is already available.` };
    }
    
    console.log(`Pulling Ollama model '${modelName}'...`);
    
    try {
      // Use the Ollama API to pull the model
      const response = await fetch(`${ollamaApiUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: modelName,
          stream: false
        })
      });
      
      if (response.ok) {
        console.log(`Successfully pulled model '${modelName}'.`);
        return { success: true, message: `Successfully pulled model '${modelName}'.` };
      } else {
        const errorData = await response.json();
        console.error(`Error pulling model '${modelName}' via API:`, errorData.error || 'Unknown error');
        // Don't return yet, try the CLI method below
      }
    } catch (apiError) {
      console.error(`Error pulling model '${modelName}' via API:`, apiError.message);
      // Don't return yet, try the CLI method below
    }
    
    // If API method failed, try using the CLI as a fallback
    try {
      const { execSync } = require('child_process');
      console.log(`Trying to pull model '${modelName}' using Ollama CLI...`);
      
      try {
        // Try the standard command first
        execSync(`ollama pull ${modelName}`, { encoding: 'utf8', stdio: 'pipe' });
        console.log(`Successfully pulled model '${modelName}' via CLI.`);
        return { success: true, message: `Successfully pulled model '${modelName}' via CLI.` };
      } catch (cliError) {
        console.error(`Error pulling model with standard CLI:`, cliError.message);
        
        // Try with full path on Windows
        try {
          execSync(`C:\\Program Files\\Ollama\\ollama.exe pull ${modelName}`, { encoding: 'utf8', stdio: 'pipe' });
          console.log(`Successfully pulled model '${modelName}' via CLI with full path.`);
          return { success: true, message: `Successfully pulled model '${modelName}' via CLI with full path.` };
        } catch (fullPathError) {
          console.error(`Error pulling model with full path CLI:`, fullPathError.message);
          return { success: false, message: `Failed to pull model '${modelName}' using both API and CLI methods.` };
        }
      }
    } catch (cliMethodError) {
      console.error(`Error using CLI method:`, cliMethodError.message);
      return { success: false, message: cliMethodError.message };
    }
  } catch (error) {
    console.error(`Error in pullOllamaModel:`, error.message);
    return { success: false, message: error.message };
  }
}

// API endpoint to call Ollama
app.post('/api/ollama', async (req, res) => {
  const { message, model } = req.body;
  const selectedModel = model || ollamaModel;
  
  try {
    // Check if Ollama is running
    const ollamaRunning = await isOllamaRunning();
    if (!ollamaRunning) {
      console.error('Ollama server is not running');
      return res.status(500).json({ 
        error: 'Ollama server is not running. Please start Ollama and try again.',
        details: 'Use the start-ollama.bat script to automatically start Ollama, or start it manually. You can download Ollama from https://ollama.ai if not installed.'
      });
    }
    
    // Check if the model exists
    try {
      const availableModels = await getAvailableOllamaModels();
      if (!availableModels.includes(selectedModel)) {
        console.log(`Model ${selectedModel} not found, attempting to pull it...`);
        // Try to pull the model
        const pullResult = await pullOllamaModel(selectedModel);
        if (!pullResult.success) {
          return res.status(404).json({ 
            error: `Model ${selectedModel} not found and could not be pulled automatically.`,
            details: `Available models: ${availableModels.join(', ')}. You can manually pull a model using 'ollama pull ${selectedModel}'.`
          });
        }
      }
    } catch (modelCheckError) {
      console.error('Error checking model availability:', modelCheckError);
      // Continue anyway, the generate API will give a more specific error if needed
    }
    
    // First try to generate with the selected model
    try {
      const response = await fetch(`${ollamaApiUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          prompt: message,
          stream: false,
          options: {
            temperature: temperature,
            num_predict: ollamaMaxTokens
          }
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        // If the error is about the model not being found, try to pull it
        if (data.error.includes('model not found') || data.error.includes('no models found')) {
          console.log(`Model '${selectedModel}' not found. Attempting to pull it...`);
          
          // Try to pull the model
          const pullResult = await pullOllamaModel(selectedModel);
          
          if (pullResult.success) {
            // If pull was successful, try to generate again
            console.log(`Successfully pulled model '${selectedModel}'. Trying to generate again...`);
            
            const retryResponse = await fetch(`${ollamaApiUrl}/api/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: selectedModel,
                prompt: message,
                stream: false,
                options: {
                  temperature: temperature,
                  num_predict: maxTokens
                }
              })
            });
            
            const retryData = await retryResponse.json();
            
            if (retryData.error) {
              console.error('Ollama API error after pulling model:', retryData.error);
              return res.status(400).json({ error: retryData.error });
            }
            
            return res.json({ 
              response: retryData.response,
              model: selectedModel,
              pulled: true
            });
          } else {
            // If pull failed, return the error
            console.error('Failed to pull model:', pullResult.message);
            return res.status(400).json({ 
              error: `Failed to pull model '${selectedModel}': ${pullResult.message}` 
            });
          }
        } else {
          // If it's a different error, just return it
          console.error('Ollama API error:', data.error);
          return res.status(400).json({ error: data.error });
        }
      }
      
      // If no error, return the response
      return res.json({ 
        response: data.response,
        model: selectedModel
      });
    } catch (generateError) {
      // If there was an error generating, try to pull the model and try again
      console.error('Error generating with Ollama:', generateError.message);
      
      // Try to pull the model
      const pullResult = await pullOllamaModel(selectedModel);
      
      if (pullResult.success) {
        // If pull was successful, try to generate again
        console.log(`Successfully pulled model '${selectedModel}'. Trying to generate again...`);
        
        const retryResponse = await fetch(`${ollamaApiUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: selectedModel,
            prompt: message,
            stream: false,
            options: {
              temperature: temperature,
              num_predict: maxTokens
            }
          })
        });
        
        const retryData = await retryResponse.json();
        
        if (retryData.error) {
          console.error('Ollama API error after pulling model:', retryData.error);
          return res.status(400).json({ error: retryData.error });
        }
        
        return res.json({ 
          response: retryData.response,
          model: selectedModel,
          pulled: true
        });
      } else {
        // If pull failed, return the original error
        return res.status(500).json({ error: generateError.message });
      }
    }
  } catch (error) {
    console.error('Error calling Ollama:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to save a project
app.post('/api/projects', (req, res) => {
  const { name, files } = req.body;
  
  if (!name || !files || !Array.isArray(files)) {
    return res.status(400).json({ error: 'Invalid project data' });
  }
  
  const projectId = uuidv4();
  const projectDir = join(projectsDir, projectId);
  
  try {
    fs.ensureDirSync(projectDir);
    
    // Save project metadata
    fs.writeJsonSync(join(projectDir, 'project.json'), {
      id: projectId,
      name,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    });
    
    // Save files
    files.forEach(file => {
      const filePath = join(projectDir, file.name);
      fs.ensureDirSync(dirname(filePath));
      fs.writeFileSync(filePath, file.content);
    });
    
    // Initialize git repository
    git.cwd(projectDir);
    git.init()
      .then(() => git.add('./*'))
      .then(() => git.commit('Initial commit'))
      .catch(err => console.error('Git initialization error:', err));
    
    res.json({ id: projectId, name });
  } catch (error) {
    console.error('Error saving project:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to list projects
app.get('/api/projects', (req, res) => {
  try {
    const projects = fs.readdirSync(projectsDir)
      .filter(dir => fs.statSync(join(projectsDir, dir)).isDirectory())
      .map(dir => {
        const metadataPath = join(projectsDir, dir, 'project.json');
        if (fs.existsSync(metadataPath)) {
          return fs.readJsonSync(metadataPath);
        }
        return null;
      })
      .filter(Boolean);
    
    res.json(projects);
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get project details
app.get('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const projectDir = join(projectsDir, id);
  
  if (!fs.existsSync(projectDir)) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  try {
    const metadata = fs.readJsonSync(join(projectDir, 'project.json'));
    
    // Get file list recursively
    const getFiles = (dir, baseDir = '') => {
      const files = [];
      fs.readdirSync(dir).forEach(file => {
        const fullPath = join(dir, file);
        const relativePath = join(baseDir, file);
        
        if (fs.statSync(fullPath).isDirectory()) {
          files.push(...getFiles(fullPath, relativePath));
        } else if (file !== 'project.json') {
          files.push({
            name: relativePath,
            path: relativePath,
            size: fs.statSync(fullPath).size
          });
        }
      });
      return files;
    };
    
    const files = getFiles(projectDir);
    
    res.json({
      ...metadata,
      files
    });
  } catch (error) {
    console.error('Error getting project details:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get file content
app.get('/api/projects/:id/files', (req, res) => {
  const { id } = req.params;
  const { path } = req.query;
  
  if (!path) {
    return res.status(400).json({ error: 'File path is required' });
  }
  
  const filePath = join(projectsDir, id, path);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ content });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to save file content
app.post('/api/projects/:id/files', (req, res) => {
  const { id } = req.params;
  const { path, content } = req.body;
  
  if (!path || content === undefined) {
    return res.status(400).json({ error: 'File path and content are required' });
  }
  
  const projectDir = join(projectsDir, id);
  const filePath = join(projectDir, path);
  
  try {
    fs.ensureDirSync(dirname(filePath));
    fs.writeFileSync(filePath, content);
    
    // Update project metadata
    const metadataPath = join(projectDir, 'project.json');
    const metadata = fs.readJsonSync(metadataPath);
    metadata.updated = new Date().toISOString();
    fs.writeJsonSync(metadataPath, metadata);
    
    // Commit changes to git
    git.cwd(projectDir);
    git.add(path)
      .then(() => git.commit(`Update ${path}`))
      .catch(err => console.error('Git commit error:', err));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to upload a file
app.post('/api/projects/:id/upload', (req, res) => {
  const { id } = req.params;
  
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ error: 'No files were uploaded' });
  }
  
  const projectDir = join(projectsDir, id);
  
  if (!fs.existsSync(projectDir)) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  try {
    const uploadedFile = req.files.file;
    const filePath = join(projectDir, uploadedFile.name);
    
    uploadedFile.mv(filePath, err => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(500).json({ error: err.message });
      }
      
      // Update project metadata
      const metadataPath = join(projectDir, 'project.json');
      const metadata = fs.readJsonSync(metadataPath);
      metadata.updated = new Date().toISOString();
      fs.writeJsonSync(metadataPath, metadata);
      
      // Commit changes to git
      git.cwd(projectDir);
      git.add(uploadedFile.name)
        .then(() => git.commit(`Add ${uploadedFile.name}`))
        .catch(err => console.error('Git commit error:', err));
      
      res.json({ 
        success: true,
        file: {
          name: uploadedFile.name,
          size: uploadedFile.size
        }
      });
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to download a project as ZIP
app.get('/api/projects/:id/download', (req, res) => {
  const { id } = req.params;
  const projectDir = join(projectsDir, id);
  
  if (!fs.existsSync(projectDir)) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  try {
    const metadata = fs.readJsonSync(join(projectDir, 'project.json'));
    const zipFileName = `${metadata.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`;
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    
    // Add all files except .git directory and project.json
    archive.glob('**/*', {
      cwd: projectDir,
      ignore: ['.git/**', 'project.json']
    });
    
    archive.finalize();
  } catch (error) {
    console.error('Error downloading project:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get project version history
app.get('/api/projects/:id/history', (req, res) => {
  const { id } = req.params;
  const projectDir = join(projectsDir, id);
  
  if (!fs.existsSync(projectDir)) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  try {
    git.cwd(projectDir);
    git.log(['--pretty=format:%H|%an|%ad|%s', '--date=iso'])
      .then(result => {
        const history = result.all.map(commit => {
          const [hash, author, date, message] = commit.hash.split('|');
          return { hash, author, date, message };
        });
        res.json(history);
      })
      .catch(err => {
        console.error('Git log error:', err);
        res.status(500).json({ error: err.message });
      });
  } catch (error) {
    console.error('Error getting project history:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get file content at a specific version
app.get('/api/projects/:id/version', (req, res) => {
  const { id } = req.params;
  const { hash, path } = req.query;
  
  if (!hash || !path) {
    return res.status(400).json({ error: 'Hash and path are required' });
  }
  
  const projectDir = join(projectsDir, id);
  
  if (!fs.existsSync(projectDir)) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  try {
    git.cwd(projectDir);
    git.show([`${hash}:${path}`])
      .then(content => {
        res.json({ content });
      })
      .catch(err => {
        console.error('Git show error:', err);
        res.status(500).json({ error: err.message });
      });
  } catch (error) {
    console.error('Error getting file version:', error);
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO for terminal integration
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Create a new terminal session
  socket.on('create-terminal', (projectId) => {
    const projectDir = join(projectsDir, projectId);
    
    if (!fs.existsSync(projectDir)) {
      socket.emit('terminal-error', 'Project not found');
      return;
    }
    
    const sessionId = uuidv4();
    let shell;
    
    // Determine which shell to use based on platform
    if (process.platform === 'win32') {
      shell = 'powershell.exe';
    } else {
      shell = 'bash';
    }
    
    const terminal = exec(shell, { cwd: projectDir });
    
    terminalSessions[sessionId] = {
      terminal,
      projectId
    };
    
    terminal.stdout.on('data', (data) => {
      socket.emit('terminal-output', { sessionId, data });
    });
    
    terminal.stderr.on('data', (data) => {
      socket.emit('terminal-output', { sessionId, data });
    });
    
    terminal.on('exit', (code) => {
      socket.emit('terminal-exit', { sessionId, code });
      delete terminalSessions[sessionId];
    });
    
    socket.emit('terminal-created', { sessionId });
  });
  
  // Send command to terminal
  socket.on('terminal-input', ({ sessionId, command }) => {
    const session = terminalSessions[sessionId];
    
    if (!session) {
      socket.emit('terminal-error', 'Terminal session not found');
      return;
    }
    
    session.terminal.stdin.write(command + '\n');
  });
  
  // Close terminal session
  socket.on('close-terminal', (sessionId) => {
    const session = terminalSessions[sessionId];
    
    if (session) {
      session.terminal.kill();
      delete terminalSessions[sessionId];
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Clean up any terminal sessions created by this socket
    Object.keys(terminalSessions).forEach(sessionId => {
      const session = terminalSessions[sessionId];
      session.terminal.kill();
      delete terminalSessions[sessionId];
    });
  });
});

// Start the server
httpServer.listen(port, 'localhost', () => {
  console.log(`Codex Unified Interface running at http://localhost:${port}`);
});
