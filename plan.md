# Hytale Server Manager - Development Plan

## 🤖 AI Agent System Context & Capabilities
**Read this before executing any steps:**
* **Environment Status:** You are running in an environment fully authenticated with the GitHub CLI (`gh`).
* **Architecture Shift:** The deployment target is **CasaOS**.
* **Automation Mandate:** Use `gh` to create the GitHub repository. Focus entirely on building the Next.js UI, Node.js API, and the CI/CD pipeline.
* **Tech Stack:** Next.js (Frontend), Node.js (Backend API), Docker/Docker Compose.

---

## Phase 1: Project Initialization & Next/Node Setup
- [ ] Initialize a new monorepo directory structure (`/frontend`, `/backend`, `/docker`).
- [ ] Use GitHub CLI (`gh repo create`) to create a new private repository and push the initial commit.
- [ ] Initialize the Node.js backend (`npm init`) and install necessary packages (Express, `dockerode` for Docker socket interaction, `cors`, `dotenv`).
- [ ] Initialize the Next.js frontend (`npx create-next-app`) with Tailwind CSS.

## Phase 2: Node.js Backend API (The "Brain")
- [ ] Create the server entry point (`index.js`).
- [ ] Connect the backend to the local Docker daemon using the `dockerode` library.
- [ ] Build `GET /servers`: Scans the host's Docker containers to list active Hytale servers.
- [ ] Build `POST /servers/create`: Generates a container configuration for a specific Hytale instance and spins it up.
- [ ] Build `POST /servers/:id/power`: Sends start/stop/restart commands to specific containers.
- [ ] Build `POST /servers/:id/update`: Triggers the container restart sequence to invoke the Hytale Downloader CLI.
- [ ] Build file management endpoints: APIs to upload, read, and delete `.jar` or `.hymod` files in the mapped CasaOS volume directories.

## Phase 3: Next.js Frontend (The "Dashboard")
- [ ] Create a clean, dark-mode layout.
- [ ] Build the **Overview Page**: Fetch and display a list of all managed Hytale servers with their current power status.
- [ ] Build the **Server Controls**: Add functional "Start," "Stop," "Restart," and "Update" buttons hooked to the Node API.
- [ ] Build the **Mod Manager UI**: A drag-and-drop interface for uploading mod files directly to a specific server instance via the API.
- [ ] Build the **Console View** (Optional): Stream container logs (via the API) to a text box in the UI.

## Phase 4: CI/CD Pipeline Setup (GitHub Actions)
- [ ] Create `.github/workflows/build-and-push.yml`.
- [ ] Configure the workflow to build the Node.js API Docker image and Next.js UI Docker image on every push to `main`.
- [ ] Configure the workflow to push these images to the GitHub Container Registry (GHCR).

## Phase 5: The CasaOS Deployment Package
- [ ] Create the master `docker-compose.yml` file in the root directory.
- [ ] Configure the compose file to pull the frontend and backend images from GHCR.
- [ ] Configure the `cloudflared` tunnel container within the compose file to securely expose the Next.js UI.
- [ ] Configure volume mappings to use CasaOS standard paths (e.g., `/DATA/AppData/hytale-manager/instances`).
- [ ] **Final Step:** The developer copies this `docker-compose.yml` text and pastes it into the "Import" function in the CasaOS web UI.