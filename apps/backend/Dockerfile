# Build context: repo root (docker-compose sets context to ./apps/backend)
# For monorepo workspace support, build from repo root and set context accordingly.
# If building standalone: docker build -t backend .
FROM node:20-alpine AS base
WORKDIR /app

# Copy workspace manifests
COPY package.json package.json

# Copy shared package
COPY src ./src

EXPOSE 3001

# Production
FROM base AS production
ENV NODE_ENV=production
RUN npm install --omit=dev
CMD ["node", "src/server.js"]

# Development
FROM base AS development
ENV NODE_ENV=development
RUN npm install
CMD ["node", "--watch", "src/server.js"]
