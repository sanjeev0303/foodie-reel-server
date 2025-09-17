# Alternative Dockerfile with network-friendly approach
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Update packages (with retry mechanism)
RUN apk update --no-cache || true && \
    apk upgrade --no-cache || true

# Copy package files first (for better layer caching)
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm with retry
RUN npm install -g pnpm --registry https://registry.npmjs.org/ || \
    npm install -g pnpm --registry https://registry.npm.taobao.org/ || \
    npm install -g pnpm

# Install dependencies with fallback registries
RUN pnpm install --frozen-lockfile --registry https://registry.npmjs.org/ || \
    pnpm install --frozen-lockfile --registry https://registry.npm.taobao.org/ || \
    pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build application
RUN pnpm run build

# Production stage
FROM node:22-alpine AS production

# Install dumb-init with retry
RUN apk update --no-cache || true && \
    apk add --no-cache dumb-init || apk add dumb-init

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm --registry https://registry.npmjs.org/ || \
    npm install -g pnpm

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile --registry https://registry.npmjs.org/ || \
    pnpm install --prod --frozen-lockfile

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

# Copy built application
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist

# Set ownership
RUN chown -R appuser:nodejs /app

# Switch to non-root user
USER appuser

# Environment variables
ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/health', {timeout: 5000}, (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))" || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
