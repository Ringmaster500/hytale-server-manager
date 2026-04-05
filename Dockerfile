# Build Stage (Using Debian-based Slim for stability during compilation)
FROM node:20-slim AS builder

# Install build essentials
RUN apt-get update && apt-get install -y \
    libc6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# ONLY copy essential Next.js files to the builder
COPY src/ ./src/
COPY public/ ./public/
COPY package.json ./
COPY next.config.ts ./
COPY tsconfig.json ./
COPY next-env.d.ts ./
COPY postcss.config.mjs ./

# Build the Next.js site
# Increase memory and disable Turbopack explicitly
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx next build

# Production Stage (Using Alpine for small footprint)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# RUN as root for Docker access
# USER nextjs 

COPY --from=builder /app/public ./public
RUN mkdir .next

# Automatically leverage output traces to reduce image size
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Include the large Hytale server folder
COPY docker/ ./docker/

EXPOSE 4982
ENV PORT=4982
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
