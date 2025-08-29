# Use Node.js 20 Alpine as base image (required by dependencies, compatible with Cloud Run)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    bash \
    curl

# Copy package files
COPY package*.json ./
COPY bun.lock* ./

# Install dependencies (include dev for build, then prune)
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm install
RUN npm run build:node
RUN npm prune --production

# Copy source code
COPY . .

# Build step already executed above
# RUN npm run build:node

# Expose port (Google Cloud Run uses PORT environment variable)
EXPOSE 80

# Set environment variables
ENV NODE_ENV=production
ENV PORT=80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the application
CMD ["npm", "start"]
