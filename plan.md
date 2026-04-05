# Hytale Server Manager - "Simple Coolify" Plan

## 🤖 AI Agent System Context & Directives
**CRITICAL RULES FOR THIS PROJECT:**
* **NO DOCKER-IN-DOCKER:** Do not use `dockerode` or attempt to spin up separate Docker containers for the game servers. This app will be hosted in Coolify. All game servers must be run as local Node.js `child_process.spawn` background tasks within the main app's environment.
* **PORT REQUIREMENT:** The Manager Web UI/API must run on port `4982`.
* **SINGLE REPOSITORY:** This is a monolithic Next.js project (App Router recommended) that handles both the frontend UI and the backend process management via Next.js API Routes (or a custom Express server if streaming websockets for the console is easier).
* **FILE SYSTEM:** All downloads, instances, mods, and logs MUST be saved to a persistent relative path (e.g., `./data/`) so it can be mapped to a Coolify persistent volume.

---

## Phase 1: Repository & Custom Environment Setup
- [ ] Initialize a new Next.js project.
- [ ] Create a custom `Dockerfile` in the root. This is critical for Coolify. It must start from a base image that supports Node.js (for the web app) but MUST also install `openjdk` (or the required Java version) and `wget`/`curl` so the container can run Hytale natively.
- [ ] Configure the web server to run on port `4982`.
- [ ] Create a `data/` directory at the project root and add it to `.gitignore`. This will be our mock persistent volume for local development.

## Phase 2: The Core Engine (Child Process Manager)
- [ ] Build a `ServerManager` utility class in Node.js.
- [ ] **Auto-Setup Logic:** Write a function that checks if `data/core/hytaleserver.jar` exists. If not, it automatically downloads the required server files before allowing any instances to be created.
- [ ] **Instance Creation:** Write logic to create new sub-directories (e.g., `data/instances/server-1`), generate default `server.properties` files, and assign unique game ports.
- [ ] **Process Control:** Use `child_process.spawn` to start the `java -jar` processes inside their respective instance folders. Keep references to these processes in memory to allow starting, stopping, and restarting.
- [ ] **Console Routing:** Pipe the `stdout` and `stderr` of these spawned Java processes into text logs or a memory buffer so the Web UI can read the live console.

## Phase 3: The API & Cloudflare Automation
- [ ] Create API routes to handle UI requests (`/api/servers/start`, `/api/servers/stop`, `/api/servers/create`).
- [ ] Create a file management API to read/write/delete files specifically inside `data/instances/[id]/mods/` and `data/instances/[id]/config/`.
- [ ] **Cloudflare Integration:** Build a script that either uses the Cloudflare API (Zero Trust) to automatically create/update DNS records and tunnel routing for new instances, OR programmatically edits the `cloudflared` config file if the CLI is bundled in the container.

## Phase 4: The Web Dashboard (Next.js UI)
- [ ] Build a sleek Homepage listing all created server instances, showing their current status (Online/Offline), CPU/RAM usage (using Node `os` metrics for the child processes), and assigned ports.
- [ ] Build the **Instance Detail Page**:
    - **Console Tab:** A terminal window fetching the live `stdout` logs from the API and an input box to send RCON/stdin commands.
    - **Mods Tab:** A simple UI to upload `.jar`/`.hymod` files to the instance's mod folder and toggle them on/off.
    - **Config Tab:** A text editor to directly modify the instance's `server.properties` and whitelist.

## Phase 5: Coolify Deployment Prep
- [ ] Write a `.env.example` file detailing any Cloudflare API tokens or Coolify-specific variables needed.
- [ ] Add instructions to the `README.md` on how to mount the `/app/data` volume in the Coolify dashboard so instance data is persistent across web-app deployments.
- [ ] *Note on Ports:* Document that while the manager runs on `4982`, the user will need to expose the individual UDP game ports through Coolify's port mapping settings for players to connect.