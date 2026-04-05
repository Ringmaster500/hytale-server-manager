FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

# ONLY copy essential Next.js files to the builder
# This avoids the "index out of range" crash from 455MB assets
COPY src/ ./src/
COPY public/ ./public/
COPY package.json ./
COPY next.config.ts ./
COPY tsconfig.json ./
COPY next-env.d.ts ./
COPY postcss.config.mjs ./

# Build the Next.js site
ENV NEXT_TURBO=0
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npx next build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# RUN as root for Docker access
# USER nextjs 

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next

# Automatically leverage output traces to reduce image size
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Include the large Hytale server folder ONLY in the final runner image
# Use the Docker context to get it directly
COPY docker/ ./docker/

EXPOSE 4982
ENV PORT=4982
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
