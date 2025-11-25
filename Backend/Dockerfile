##############################################################################
# Production-Ready Multi-Stage Dockerfile for WhatsApp SaaS Platform
#
# Optimizations:
# - Multi-stage build reduces final image size by ~70%
# - Node.js 20 Alpine base for minimal footprint and latest LTS features
# - Layer caching optimized for faster rebuilds
# - Prisma binary targets for Alpine Linux
# - Security: non-root user, minimal attack surface
# - Production-ready: health checks, graceful shutdown, proper signal handling
#
# Build: docker build -t whatsapp-saas-backend:latest .
# Run:   docker run -p 3000:3000 whatsapp-saas-backend:latest
##############################################################################

# =============================================================================
# Stage 1: Dependencies
# Purpose: Install all dependencies (production + development)
# This stage is cached unless package*.json changes
# =============================================================================
FROM node:20-alpine AS dependencies

# Install build dependencies for native modules (bcrypt, etc.)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl \
    && ln -sf python3 /usr/bin/python

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (needed for build stage)
# Using npm install instead of npm ci to work around package-lock.json sync issues
RUN npm install --ignore-scripts && \
    npm cache clean --force

# =============================================================================
# Stage 2: Build
# Purpose: Build the NestJS application and generate Prisma client
# =============================================================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package*.json ./

# Copy source code and configuration
COPY . .

# Generate Prisma client with Alpine Linux binary target
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

# Remove dev dependencies to reduce size
RUN npm prune --production && \
    npm cache clean --force

# =============================================================================
# Stage 3: Production Runtime
# Purpose: Minimal production image with only necessary files
# =============================================================================
FROM node:20-alpine AS production

# Install runtime dependencies only
RUN apk add --no-cache \
    dumb-init \
    curl \
    openssl \
    && rm -rf /var/cache/apk/*

# Create non-root user and group for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Copy production node_modules from build stage
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy Prisma generated client and schema
COPY --from=build --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=nodejs:nodejs /app/prisma ./prisma

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist

# Copy necessary files (package.json for version info, etc.)
COPY --chown=nodejs:nodejs package*.json ./

# Create necessary directories with correct permissions
RUN mkdir -p logs data tmp uploads && \
    chown -R nodejs:nodejs logs data tmp uploads

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info \
    TZ=UTC

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3000

# Health check configuration
# The health endpoint is available at /api/v1/health
HEALTHCHECK --interval=30s \
            --timeout=5s \
            --start-period=15s \
            --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Add metadata labels
LABEL maintainer="devops@whatsapp-saas.com" \
      version="1.0.0" \
      description="WhatsApp SaaS Platform Backend - NestJS 10.x + Prisma" \
      org.opencontainers.image.source="https://github.com/your-org/whatsapp-saas-starter"

# Use dumb-init to handle signals properly (PID 1 problem)
# This ensures graceful shutdown when Docker sends SIGTERM
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]

# =============================================================================
# Build Arguments (optional, for build-time customization)
# =============================================================================
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

# Additional metadata labels
LABEL org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}"

##############################################################################
# Build Commands:
#
# Development build:
#   docker build -t whatsapp-saas-backend:dev .
#
# Production build with metadata:
#   docker build \
#     --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
#     --build-arg VCS_REF=$(git rev-parse --short HEAD) \
#     --build-arg VERSION=1.0.0 \
#     -t whatsapp-saas-backend:latest \
#     -t whatsapp-saas-backend:1.0.0 \
#     .
#
# Build with BuildKit for better caching and performance:
#   DOCKER_BUILDKIT=1 docker build --progress=plain -t whatsapp-saas-backend:latest .
#
# Multi-platform build (for deployment to ARM64 servers):
#   docker buildx build --platform linux/amd64,linux/arm64 -t whatsapp-saas-backend:latest .
#
# Scan image for vulnerabilities:
#   docker scan whatsapp-saas-backend:latest
##############################################################################
