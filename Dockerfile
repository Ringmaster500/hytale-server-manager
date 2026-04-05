FROM node:20-bookworm-slim

# Install Java 21, wget, curl, procps
RUN apt-get update && apt-get install -y \
    openjdk-21-jre-headless \
    wget \
    curl \
    procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies - we need to install prod AND dev since we'll build the Next.js app in-container
RUN npm install

# Copy project files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4982

# Build the Next.js app
RUN npm run build

# Expose the manager port
EXPOSE 4982

# The 'next start' command will use the environment variable PORT
CMD ["npm", "start"]
