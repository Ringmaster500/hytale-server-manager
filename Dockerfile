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
# COPY everything EXCEPT the large Hytale folder to the builder
# This prevents the Next.js/Turbopack "out of range" crash
COPY . .
# We explicitly remove the large folder from the build context if it managed to sneak in
RUN rm -rf docker/hytale-server

# Build the Next.js site
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

# NOW we copy the large Hytale server folder ONLY to the final runner image
# This avoids the build crash but keeps the manager "Self-Contained"
COPY docker/ ./docker/

EXPOSE 4982
ENV PORT=4982
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
