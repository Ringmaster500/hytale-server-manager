FROM node:20.18-bookworm

# Set memory limit for Node
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Using 'bookworm' (Debian 12) tag for Java to match the base image
COPY --from=eclipse-temurin:21-jre-bookworm /opt/java/openjdk /opt/java/openjdk

# Set environment variables for Java
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH=$JAVA_HOME/bin:$PATH

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    procps \
    unzip \
    libjemalloc2 \
    && rm -rf /var/lib/apt/lists/*

# Download and install Hytale Downloader CLI
RUN wget -q https://downloader.hytale.com/hytale-downloader.zip -O /tmp/hytale-downloader.zip \
    && unzip /tmp/hytale-downloader.zip -d /tmp/hytale-downloader-tmp \
    && mv /tmp/hytale-downloader-tmp/hytale-downloader-linux-amd64 /usr/local/bin/hytale-downloader \
    && chmod +x /usr/local/bin/hytale-downloader \
    && rm -rf /tmp/hytale-downloader-tmp /tmp/hytale-downloader.zip

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --no-audit --no-fund

# Copy project files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4982

# Build the Next.js app
RUN npm run build

# Expose the manager port
EXPOSE 4982

# Start the application
CMD ["npm", "start"]
