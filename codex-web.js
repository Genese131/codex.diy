// Codex Web Interface
// A simple web-based interface for OpenAI's GPT-4o and GPT-4o-mini models

import express from 'express';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// OpenAI API configuration
let apiKey = process.env.OPENAI_API_KEY;
let model = process.env.CODEX_MODEL || 'gpt-4o';
// Support both old and new parameter names
let maxTokens = parseInt(process.env.CODEX_MAX_COMPLETION_TOKENS || process.env.CODEX_MAX_TOKENS || '8192');
let temperature = parseFloat(process.env.CODEX_TEMPERATURE || '0.7');

// Available models
const RECOMMENDED_MODELS = [
  "gpt-4o", "gpt-4o-mini", 
  "o4", "o4-mini", "o3",
  "gpt-4o-2024-05-13", "gpt-4o-mini-2024-07-18", "gpt-3.5-turbo-0125"
];

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Create public directory and HTML files
async function setupPublicFiles() {
  try {
    await fs.mkdir('public', { recursive: true });
    
    // Create index.html
    const indexHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Codex Web Interface</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #ddd;
            }
            h1 {
                color: #2c3e50;
                margin: 0;
            }
            .model-selector {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            select {
                padding: 8px;
                border-radius: 4px;
                border: 1px solid #ddd;
            }
            .chat-container {
                display: flex;
                height: calc(100vh - 150px);
                gap: 20px;
            }
            .chat-history {
                flex: 1;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                overflow-y: auto;
                padding: 20px;
            }
            .message {
                margin-bottom: 15px;
                padding: 10px 15px;
                border-radius: 8px;
                max-width: 80%;
            }
            .user-message {
                background-color: #e1f5fe;
                margin-left: auto;
                border-bottom-right-radius: 0;
            }
            .assistant-message {
                background-color: #f1f1f1;
                margin-right: auto;
                border-bottom-left-radius: 0;
            }
            .message pre {
                background-color: #f8f8f8;
                padding: 10px;
                border-radius: 4px;
                overflow-x: auto;
                border: 1px solid #ddd;
            }
            .message code {
                font-family: 'Courier New', Courier, monospace;
                background-color: #f8f8f8;
                padding: 2px 4px;
                border-radius: 3px;
                font-size: 0.9em;
            }
            .input-area {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-top: 20px;
            }
            textarea {
                width: 100%;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                resize: vertical;
                min-height: 100px;
                font-family: inherit;
            }
            button {
                padding: 10px 15px;
                background-color: #2c3e50;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.3s;
            }
            button:hover {
                background-color: #1a252f;
            }
            button:disabled {
                background-color: #95a5a6;
                cursor: not-allowed;
            }
            .loading {
                display: none;
                align-items: center;
                gap: 10px;
                color: #7f8c8d;
            }
            .spinner {
                border: 3px solid #f3f3f3;
                border-top: 3px solid #3498db;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .dark-mode {
                background-color: #2c3e50;
                color: #ecf0f1;
            }
            .dark-mode header {
                border-bottom-color: #34495e;
            }
            .dark-mode h1 {
                color: #ecf0f1;
            }
            .dark-mode .chat-history {
                background-color: #34495e;
            }
            .dark-mode .user-message {
                background-color: #3498db;
                color: white;
            }
            .dark-mode .assistant-message {
                background-color: #2c3e50;
                color: white;
            }
            .dark-mode .message pre {
                background-color: #1a252f;
                border-color: #34495e;
                color: #ecf0f1;
            }
            .dark-mode .message code {
                background-color: #1a252f;
                color: #ecf0f1;
            }
            .dark-mode textarea {
                background-color: #34495e;
                color: #ecf0f1;
                border-color: #2c3e50;
            }
            .dark-mode select {
                background-color: #34495e;
                color: #ecf0f1;
                border-color: #2c3e50;
            }
            .theme-toggle {
                background: none;
                border: none;
                color: #333;
                cursor: pointer;
                font-size: 1.5rem;
                padding: 5px;
            }
            .dark-mode .theme-toggle {
                color: #ecf0f1;
            }
        </style>
    </head>
    <body>
        <header>
            <h1>Codex Web Interface</h1>
            <div class="controls">
                <div class="model-selector">
                    <label for="model">Model:</label>
                    <select id="model">
                        ${RECOMMENDED_MODELS.map(m => `<option value="${m}" ${m === model ? 'selected' : ''}>${m}</option>`).join('')}
                    </select>
                    <button class="theme-toggle" id="theme-toggle">🌙</button>
                </div>
            </div>
        </header>
        
        <div class="chat-container">
            <div class="chat-history" id="chat-history"></div>
        </div>
        
        <div class="input-area">
            <textarea id="user-input" placeholder="Type your coding question here..."></textarea>
            <div class="controls">
                <button id="send-button">Send</button>
                <div class="loading" id="loading">
                    <div class="spinner"></div>
                    <span>Processing...</span>
                </div>
            </div>
        </div>

        <script>
            const chatHistory = document.getElementById('chat-history');
            const userInput = document.getElementById('user-input');
            const sendButton = document.getElementById('send-button');
            const modelSelect = document.getElementById('model');
            const loading = document.getElementById('loading');
            const themeToggle = document.getElementById('theme-toggle');
            
            let darkMode = ${process.env.CODEX_DARK_MODE === 'true' ? 'true' : 'false'};
            
            // Initialize dark mode
            if (darkMode) {
                document.body.classList.add('dark-mode');
                themeToggle.textContent = '☀️';
            }
            
            // Toggle dark mode
            themeToggle.addEventListener('click', () => {
                darkMode = !darkMode;
                document.body.classList.toggle('dark-mode');
                themeToggle.textContent = darkMode ? '☀️' : '🌙';
            });
            
            // Handle sending messages
            async function sendMessage() {
                const message = userInput.value.trim();
                if (!message) return;
                
                // Add user message to chat
                addMessage(message, 'user');
                userInput.value = '';
                
                // Show loading indicator
                loading.style.display = 'flex';
                sendButton.disabled = true;
                
                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message,
                            model: modelSelect.value
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.error) {
                        addMessage('Error: ' + data.error, 'assistant');
                    } else {
                        addMessage(data.response, 'assistant');
                    }
                } catch (error) {
                    addMessage('Error: Could not connect to the server.', 'assistant');
                    console.error(error);
                } finally {
                    loading.style.display = 'none';
                    sendButton.disabled = false;
                }
            }
            
            // Add a message to the chat history
            function addMessage(text, sender) {
                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${sender}-message\`;
                
                // Convert markdown-style code blocks to HTML
                const formattedText = text
                    .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>')
                    .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
                    .replace(/\\n/g, '<br>');
                
                messageDiv.innerHTML = formattedText;
                chatHistory.appendChild(messageDiv);
                
                // Scroll to bottom
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }
            
            // Event listeners
            sendButton.addEventListener('click', sendMessage);
            userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            
            // Add welcome message
            addMessage('Welcome to Codex Web Interface! I can help you with coding questions, using the ' + modelSelect.value + ' model. What would you like to know?', 'assistant');
        </script>
    </body>
    </html>
    `;
    
    await fs.writeFile('public/index.html', indexHtml);
    
    console.log('Public files created successfully');
  } catch (error) {
    console.error('Error creating public files:', error);
  }
}

// Function to make API request to OpenAI
async function callOpenAI(message, selectedModel) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel || model,
        messages: [{ role: 'user', content: message }],
        temperature: temperature,
        max_completion_tokens: maxTokens
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error('OpenAI API Error:', data.error);
      return { error: data.error.message };
    }
    
    return { response: data.choices[0].message.content };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return { error: error.message };
  }
}

// API routes
app.post('/api/chat', async (req, res) => {
  const { message, model: selectedModel } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  const result = await callOpenAI(message, selectedModel);
  res.json(result);
});

// Function to load API key from file
async function loadApiKey() {
  const apiKeyFile = join(homedir(), '.openai-api-key');
  try {
    return await fs.readFile(apiKeyFile, 'utf8');
  } catch (error) {
    return null;
  }
}

// Main function
async function main() {
  console.log('Setting up Codex Web Interface...');
  
  // Load API key from file if not in environment
  if (!apiKey) {
    apiKey = await loadApiKey();
    if (!apiKey) {
      console.error('OpenAI API key not found. Please set it in the .env file or as an environment variable.');
      process.exit(1);
    }
  }
  
  // Setup public files
  await setupPublicFiles();
  
  // Start server
  app.listen(port, () => {
    console.log(`Codex Web Interface running at http://localhost:${port}`);
    console.log(`Using model: ${model}`);
    console.log(`Max tokens: ${maxTokens}`);
  });
}

// Start the application
main().catch(error => {
  console.error('Error starting Codex Web Interface:', error);
  process.exit(1);
});
