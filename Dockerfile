# Use Node.js 20 Alpine as base image (required by dependencies, compatible with Cloud Run)
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Install system dependencies for build
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    bash \
    curl

# Copy package files
COPY package*.json ./
COPY bun.lock* ./

# Install dependencies (include dev for build)
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build:node

# Production image
FROM node:20-alpine AS runtime
WORKDIR /app

# Install curl for health check
RUN apk add --no-cache curl

# Copy package files and install only production dependencies
COPY --from=build /app/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy built application and assets  
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/public ./dist/public

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
