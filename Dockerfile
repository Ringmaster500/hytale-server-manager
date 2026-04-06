FROM eclipse-temurin:21-jre-jammy as java_base
FROM node:20-bookworm

# Set memory limit for Node
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy Java 21 from the stage (known working method for this host)
COPY --from=java_base /opt/java/openjdk /opt/java/openjdk

# Set environment variables for Java
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH=$JAVA_HOME/bin:$PATH

# Download and install Hytale Downloader CLI
RUN wget -q https://downloader.hytale.com/hytale-downloader.zip -O /tmp/hytale-downloader.zip \
    && unzip /tmp/hytale-downloader.zip -d /tmp/downloader-temp \
    && mv /tmp/downloader-temp/hytale-downloader-linux-amd64 /usr/local/bin/hytale-downloader \
    && chmod +x /usr/local/bin/hytale-downloader \
    && rm -rf /tmp/downloader-temp /tmp/hytale-downloader.zip

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
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

# Start the application
CMD ["npm", "start"]
