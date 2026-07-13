# Dockerfile - CloudDeploy API
# Multi-stage build for a small, production-ready Node.js image

# ---- Base build stage ----
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /usr/src/app

# Run as a non-root user for better container security
RUN addgroup -S clouddeploy && adduser -S clouddeploy -G clouddeploy

COPY --from=base /usr/src/app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

USER clouddeploy

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "app.js"]
