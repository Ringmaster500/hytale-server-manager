# Hytale Server Manager - Development Plan

## 🤖 AI Agent System Context & Capabilities
**Read this before executing any steps:**
* **Environment Status:** You are running in an environment fully authenticated with the GitHub CLI (`gh`).
* **Architecture Shift:** The deployment target is **Coolify** using a **Unified Next.js Application**.
* **Automation Mandate:** Consolidated frontend and backend into a single Next.js app. The backend logic now lives in `src/app/api`.
* **Tech Stack:** Next.js (Frontend + API), Node.js (Runtime), Dockerode.

---

## Phase 1: Project Consolidation
- [x] Merge `/frontend` and `/backend` into a single root-level Next.js project.
- [x] Add `dockerode` and `@types/dockerode` to the main `package.json`.
- [x] Configure `next.config.ts` for `standalone` output for efficient Docker imaging.

## Phase 2: Unified API Routes (Next.js)
- [x] Migrate backend logic to `src/app/api/servers/`.
- [x] Implement Docker socket connection in `src/lib/docker.ts`.
- [x] Create API routes for server listing, creation, power management, and file operations.
- [x] Ensure `DATA_DIR` and `DOCKER_SOCKET` environment variables are supported.

## Phase 3: Dashboard Refinement
- [x] Update frontend to use relative `/api` paths (same origin).
- [x] Ensure dark-mode UI and Luce-react icons are functioning within the single project.
- [x] Test the Mod Manager's file upload/delete logic within the Next.js API context.

## Phase 4: Coolify One-Click Optimization
- [x] Create a production-ready `Dockerfile` at the repository root.
- [x] Use a multi-stage build process to keep the final image small and secure.
- [x] Expose port 3000 as the single entry point for both UI and API.
- [x] Ensure the `nextjs` system user has appropriate permissions for the internal `.next` directory.

## Phase 5: Deployment
- [x] **Final Step:** In Coolify, create a "New Application" from your GitHub App.
- [x] Select this repository. Coolify will detect the `Dockerfile` and handle the rest.
- [x] **Required Settings:** In the Coolify UI, go to the "Volumes" tab and mount `/var/run/docker.sock` to `/var/run/docker.sock`.
- [x] Add the `DATA_DIR` environment variable to point to your Hytale data storage path.

## Phase 6: Automated Self-Setup (Self-Contained)
- [x] Copy Hytale server binaries and configs from host into `docker/hytale-server/`.
- [x] Create a dedicated `docker/hytale-server/Dockerfile` for the server fleet.
- [ ] Implement auto-detection and image building within the manager API.
- [ ] Add a "System Status" view to the dashboard to monitor the base image health.