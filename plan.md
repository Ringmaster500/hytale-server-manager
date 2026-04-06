# Hytale Server Manager - "Simple Coolify" Plan

## 🤖 AI Agent System Context & Directives
**CRITICAL RULES FOR THIS PROJECT:**
* **NO DOCKER-IN-DOCKER:** Do not use `dockerode` or attempt to spin up separate Docker containers for the game servers. This app will be hosted in Coolify. All game servers must be run as local Node.js `child_process.spawn` background tasks within the main app's environment.
* **PORT REQUIREMENT:** The Manager Web UI/API must run on port `4982`.
* **SINGLE REPOSITORY:** This is a monolithic Next.js project (App Router recommended) that handles both the frontend UI and the backend process management via Next.js API Routes.
* **FILE SYSTEM:** All downloads, instances, mods, and logs MUST be saved to a persistent relative path (e.g., `./data/`) so it can be mapped to a Coolify persistent volume.

---

## Phase 1: Repository & Custom Environment Setup
- [x] Initialize a new Next.js project.
- [x] Create a custom `Dockerfile` in the root using OpenJDK 21 (Temurin) + Node 20.
- [x] Configure the web server to run on port `4982`.
- [x] Create a `data/` directory at the project root and add it to `.gitignore`.

## Phase 2: The Core Engine (Child Process Manager)
- [x] Build a `ServerManager` utility class in Node.js.
- [x] **Auto-Setup Logic:** Function to check/create dummy core files.
- [x] **Instance Creation:** Logic to create instance directories and `server.properties`.
- [x] **Process Control:** `child_process.spawn` implementation for starting/stopping.
- [x] **Console Routing:** Pipe `stdout`/`stderr` into logs with live UI updates.

## Phase 3: The API & Cloudflare Automation
- [x] Create API routes for server lifecycle management (`/api/servers/*`).
- [x] **File Management API:** Create routes to read/write/delete files in `mods/` and `config/`.
- [x] **Cloudflare Integration:** Automated DNS A-record management for UDP support.

## Phase 4: The Web Dashboard (Next.js UI)
- [x] Build a sleek Homepage listing all created server instances with status polling.
- [x] Build the **Instance Detail Page**:
    - [x] **Console Tab:** Terminal window with live logs and command input.
    - [ ] **Mods Tab:** UI to manage instance mods.
    - [ ] **Config Tab:** Editor for `server.properties`.

## Phase 5: Coolify Deployment Prep
- [x] Write a `.env.example` file.
- [x] Add instructions to the `README.md` for volume mounting.
- [x] *Note on Ports:* Document public UDP/TCP port exposure.

## Phase 6: Hytale CLI & Account Onboarding (NEW)
- [ ] **Onboarding Screen:** Create a "First Run" UI to collect Hytale Account credentials or CLI session tokens.
- [ ] **CLI Integration:** Bundle the Hytale Downloader CLI into the Docker image.
- [ ] **Auto-Pull Logic:** Enhance `checkCoreFiles` to use the CLI to pull real binoculars/updates using the provided credentials.
- [ ] **Session Management:** Securely store CLI session data in the `/data/` volume.