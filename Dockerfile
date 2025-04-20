FROM node:22-alpine

# Set working directory explicitly
WORKDIR /app

# Avoid path-related issues by setting environment variables
ENV NODE_PATH=/app/node_modules
ENV PATH=$PATH:/app/node_modules/.bin

# Copy package files
COPY package*.json ./
COPY codex-cli/package*.json ./codex-cli/

# Install dependencies
RUN cd codex-cli && npm install
RUN npm install

# Copy source code
COPY . .

# Build the CLI
RUN cd codex-cli && npm run build

# Create a symbolic link to make codex globally available
RUN ln -s /app/codex-cli/dist/cli.js /usr/local/bin/codex

# Install dotenv-cli for .env file support
RUN npm install -g dotenv-cli

# Set environment variables
ENV NODE_ENV=production
ENV CODEX_SANDBOX=docker

# Copy env file if it exists (using a safer approach)
COPY .env* /app/ || true

# Default command with dotenv support
ENTRYPOINT ["dotenv", "--", "codex"]
CMD ["--help"]
