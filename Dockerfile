# Use Node.js 18 Alpine as base image (compatible with Google Cloud Run)
FROM node:18-alpine

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
