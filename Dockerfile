FROM node:22-bookworm-slim

# Set memory limit for Node processes
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Install Java 21 and build tools (Debian syntax)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-21-jre-headless \
    wget \
    unzip \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for Java
ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH

# Download and install Hytale Downloader CLI with retries and integrity check
RUN for i in 1 2 3; do \
        wget -q https://downloader.hytale.com/hytale-downloader.zip -O /tmp/hytale-downloader.zip && break || \
        if [ $i -lt 3 ]; then echo "Download failed, retrying in 5s..." && sleep 5; else exit 1; fi; \
    done \
    && unzip -t /tmp/hytale-downloader.zip \
    && unzip /tmp/hytale-downloader.zip -d /tmp/downloader-temp \
    && mv /tmp/downloader-temp/hytale-downloader-linux-amd64 /usr/local/bin/hytale-downloader \
    && chmod +x /usr/local/bin/hytale-downloader \
    && rm -rf /tmp/downloader-temp /tmp/hytale-downloader.zip

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
