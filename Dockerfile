# Multi-stage build for production optimization
# Using Node.js 22 Alpine for better performance and security
FROM node:22-alpine AS builder

# Update packages for security
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm globally
RUN npm install -g pnpm

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build the application
RUN pnpm run build

# Production stage
FROM node:22-alpine AS production

# Update packages and install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Remove package manager cache to reduce image size
RUN rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm globally
RUN npm install -g pnpm

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile && pnpm store prune

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

# Set proper file permissions and ownership
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist

# Create necessary directories with proper ownership
RUN mkdir -p /tmp && chmod 1777 /tmp && \
    chown -R appuser:nodejs /app

# Remove unnecessary packages and clear caches for security
RUN apk del --purge && rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

# Switch to non-root user
USER appuser

# Set secure environment variables
ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_AUDIT=false \
    DISABLE_OPENCOLLECTIVE=true

# Add security labels
LABEL security.non-root=true \
      security.updated-packages=true \
      maintainer="zomato-reels-team"

# Expose port (Render uses PORT environment variable, default 5000)
EXPOSE 5000

# Health check with proper timeout and URL construction
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/health', {timeout: 5000}, (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
