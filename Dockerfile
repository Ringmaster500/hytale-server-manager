FROM node:20-bookworm-slim

# Copy Java 21 from official Temurin image
COPY --from=eclipse-temurin:21-jre-jammy /opt/java/openjdk /opt/java/openjdk

# Set environment variables for Java
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH=$JAVA_HOME/bin:$PATH

# Install Java 21, wget, curl, procps, and unzip
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    procps \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Download and install Hytale Downloader CLI
RUN wget -q https://downloader.hytale.com/hytale-downloader.zip -O /tmp/hytale-downloader.zip \
    && unzip /tmp/hytale-downloader.zip -d /tmp/hytale-downloader \
    && mv /tmp/hytale-downloader/hytale-downloader-* /usr/local/bin/hytale-downloader \
    || echo "Warning: Hytale Downloader could not be downloaded automatically. Please upload it manually." \
    && chmod +x /usr/local/bin/hytale-downloader || true \
    && rm -rf /tmp/hytale-downloader*

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
