# Hytale Server Manager (Simple Coolify)

A powerful, native-process Hytale server manager designed to run inside a single container on Coolify.

## 🚀 Deployment on Coolify

This app is optimized for a minimalist, single-container deployment. No separate Docker-in-Docker is used.

### 1. Persistent Storage (CRITICAL)
For your server instances and JAR files to persist across deployments, you **MUST** map a persistent volume in Coolify:
- **Source:** `hytale-data`
- **Destination:** `/app/data`

### 2. Environment Variables
Copy `.env.example` to your Coolify environment:
- `PORT`: 4982 (This is already set in the Dockerfile)
- `MOCK_SERVER`: Set to `true` if you want to test the UI without real Java processes.

### 3. Ports
The Manager Web UI runs on port `4982`.
For game instances, you will need to add the specific UDP/TCP ports to your Coolify "Domains & Ports" settings to allow players to connect.

## 🛠 Features
- **Native Process Management:** Spawns `java -jar` as background child processes.
- **Live Console:** Real-time stdout/stderr routing to the web dashboard.
- **Automatic Setup:** Automatically downloads core server files if missing.
- **Glassmorphic UI:** A sleek, premium dashboard using Vanilla CSS.

## 💻 Local Development

```bash
npm install
npm run dev
```
Open [http://localhost:4982](http://localhost:4982) to see the dashboard.
