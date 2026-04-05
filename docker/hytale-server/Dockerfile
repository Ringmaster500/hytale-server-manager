FROM eclipse-temurin:17-jre

# Install basic dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# The Hytale downloader and server files will be part of the build context
COPY . .

# Ensure scripts are executable if they exist
RUN if [ -f "./hytale-downloader" ]; then chmod +x ./hytale-downloader; fi
RUN if [ -f "./start.sh" ]; then chmod +x ./start.sh; fi

EXPOSE 25565

# Start the server
# Often Hytale servers are started via a launcher or directly via Java
# Assuming start.sh is the entry point if it exists, otherwise the downloader
CMD ["sh", "-c", "if [ -f './start.sh' ]; then ./start.sh; else ./hytale-downloader; fi"]
