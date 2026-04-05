FROM alpine:latest
 
# Install Node, Java 21, and dependencies via APK (uses musl, avoiding glibc segfaults)
RUN apk add --no-cache \
    nodejs \
    npm \
    openjdk21-jre \
    wget \
    unzip \
    curl \
    libc6-compat
 
# Set environment variables for Java (Alpine location)
ENV JAVA_HOME=/usr/lib/jvm/default-jvm
ENV PATH=$JAVA_HOME/bin:$PATH

# Download and install Hytale Downloader CLI (Node image already has wget/unzip)
RUN wget -q https://downloader.hytale.com/hytale-downloader.zip -O /tmp/hytale-downloader.zip \
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
