# Multi-stage Dockerfile for TanStack Start / Nitro application
FROM node:22-slim AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies including linux native bindings
RUN npm install --include=optional

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production runtime stage
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy Nitro server build output and assets
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
