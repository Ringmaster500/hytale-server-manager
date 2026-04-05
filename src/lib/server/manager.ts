import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';

export interface ServerInstance {
  id: string;
  name: string;
  port: number;
  status: 'online' | 'offline' | 'starting' | 'error';
  logs: string[];
  cpuUsage?: number;
  ramUsage?: number;
}

class ServerManager {
  private instancesMap: Map<string, ServerInstance & { process?: ChildProcess }> = new Map();
  private dataDir: string;
  private coreDir: string;
  private instancesDir: string;
  private globalLogs: string[] = [];

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.coreDir = path.join(this.dataDir, 'core');
    this.instancesDir = path.join(this.dataDir, 'instances');
    this.ensureDirs();
    this.loadInstances();
    this.addGlobalLog("[MANAGER] Hytale Server Manager initialized.");
    this.addGlobalLog(`[MANAGER] Working Directory: ${process.cwd()}`);
  }

  isOnboarded(): boolean {
    return existsSync(path.join(this.dataDir, 'config.json'));
  }

  async saveConfig(config: any) {
    await fs.writeFile(path.join(this.dataDir, 'config.json'), JSON.stringify(config, null, 2));
  }

  async resetConfig() {
    const configPath = path.join(this.dataDir, 'config.json');
    const jarPath = path.join(this.coreDir, 'hytaleserver.jar');
    if (existsSync(configPath)) await fs.unlink(configPath);
    if (existsSync(jarPath)) await fs.unlink(jarPath);
    this.addGlobalLog("[MANAGER] System configuration reset.");
  }

  async getSystemInfo() {
    const jarPath = path.join(this.coreDir, 'hytaleserver.jar');
    let jarStatus: 'missing' | 'ready' | 'corrupt' = 'missing';
    let jarSize = 0;

    if (existsSync(jarPath)) {
      const stats = await fs.stat(jarPath);
      jarSize = stats.size;
      jarStatus = jarSize > 1024 ? 'ready' : 'corrupt';
    }

    return {
      jarExists: jarStatus === 'ready',
      jarStatus,
      jarSize,
      onboarded: this.isOnboarded(),
      instancesCount: this.instancesMap.size,
      mockMode: process.env.MOCK_SERVER === 'true',
      nodeVersion: process.version,
    };
  }

  private async loadInstances() {
    try {
      const dirs = await fs.readdir(this.instancesDir);
      for (const id of dirs) {
        const instanceDir = path.join(this.instancesDir, id);
        const stats = await fs.stat(instanceDir);
        if (stats.isDirectory()) {
          // Mock loading from server.properties if it exists
          let port = 4242;
          try {
            const props = await fs.readFile(path.join(instanceDir, 'server.properties'), 'utf-8');
            const match = props.match(/server\.port=(\d+)/);
            if (match) port = parseInt(match[1]);
          } catch (e) {}

          this.instancesMap.set(id, {
            id,
            name: id.replace(/-/g, ' '),
            port,
            status: 'offline',
            logs: [],
          });
        }
      }
    } catch (e) {
      console.error('Failed to load existing instances:', e);
    }
  }

  private ensureDirs() {
    [this.dataDir, this.coreDir, this.instancesDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  getGlobalLogs() {
    return this.globalLogs;
  }

  private addGlobalLog(message: string) {
    this.globalLogs.push(message);
    if (this.globalLogs.length > 500) this.globalLogs.shift();
    console.log(`[SYS] ${message}`);
  }

  // Phase 2: Auto-Setup Logic
  async checkCoreFiles() {
    const jarPath = path.join(this.coreDir, 'hytaleserver.jar');
    
    // Check if current JAR is valid
    if (existsSync(jarPath)) {
        const stats = await fs.stat(jarPath);
        if (stats.size > 1024) return; // Valid JAR
        
        this.addGlobalLog("[MANAGER] Detected corrupt/mock JAR. Deleting to re-pull...");
        await fs.unlink(jarPath);
    }

    if (process.env.MOCK_SERVER === 'true') {
        this.addGlobalLog("[MANAGER] MOCK_SERVER is enabled. Skipping binaries pull.");
        await fs.writeFile(jarPath, 'MOCK_HYTALE_JAR_CONTENT');
        return;
    }

    this.addGlobalLog("[MANAGER] No server binaries found. Launching Hytale Downloader...");
    
    // Attempt authentication and download
    // Since we're in a container, we'll try to run it and capture the output for user info
    try {
      // NOTE: Hytale CLI uses OAuth2/Device flow. 
      // The CLI will print a URL/code if it's the first time.
      const downloader = spawn('hytale-downloader', ['-download-path', jarPath], {
        cwd: this.coreDir,
        env: { ...process.env }
      });

      return new Promise<void>((resolve, reject) => {
        downloader.stdout?.on('data', (data) => {
          this.addGlobalLog(data.toString());
        });
        downloader.stderr?.on('data', (data) => {
          this.addGlobalLog(`[ERROR] ${data.toString()}`);
        });

        downloader.on('close', (code) => {
          if (code === 0) {
            this.addGlobalLog("[MANAGER] Hytale binaries downloaded successfully.");
            resolve();
          } else {
            this.addGlobalLog(`[MANAGER] Downloader exited with code ${code}.`);
            reject(new Error(`Hytale Downloader failed (code ${code}). Check logs for auth code.`));
          }
        });

        downloader.on('error', (err) => {
          this.addGlobalLog(`[MANAGER] Failed to execute downloader: ${err.message}`);
          reject(err);
        });
      });

    } catch (e: any) {
      this.addGlobalLog(`[MANAGER] Download failed: ${e.message}`);
      throw e;
    }
  }

  // Phase 2: Instance Creation
  async createInstance(name: string, port: number) {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    const instanceDir = path.join(this.instancesDir, id);

    if (existsSync(instanceDir) || this.instancesMap.has(id)) {
      throw new Error(`Instance ${id} already exists`);
    }

    await fs.mkdir(path.join(instanceDir, 'mods'), { recursive: true });
    await fs.mkdir(path.join(instanceDir, 'config'), { recursive: true });

    // Generate default server.properties
    const props = `server.port=${port}\nserver.name=${name}\nmax-players=20\nversion=1.0.0\n`;
    await fs.writeFile(path.join(instanceDir, 'server.properties'), props);

    const instance: ServerInstance = {
      id,
      name,
      port,
      status: 'offline',
      logs: [],
    };

    this.instancesMap.set(id, instance);
    return instance;
  }

  // Phase 2: Process Control
  async startServer(id: string) {
    const inst = this.instancesMap.get(id);
    if (!inst) throw new Error(`Instance ${id} not found`);
    if (inst.status === 'online' || inst.status === 'starting') return inst;

    // Check if CORE files exist
    await this.checkCoreFiles();

    const instanceDir = path.join(this.instancesDir, id);
    const jarPath = path.join(this.coreDir, 'hytaleserver.jar');

    inst.status = 'starting';
    inst.logs.push(`[MANAGER] Starting Hytale Server instance: ${id}...\n`);

    try {
      // Phase 2: Process Control
      if (process.env.MOCK_SERVER === 'true') {
        // Simulated process for testing UI without real JARs
        this.addLog(id, `[MOCK] Booting virtual Hytale engine...\n`);
        this.addLog(id, `[MOCK] Loading world data...\n`);
        
        setTimeout(() => {
          if (inst.status === 'starting') {
            inst.status = 'online';
            this.addLog(id, `[MOCK] Server started on port ${inst.port}!\n`);
          }
        }, 2000);
        
        return inst;
      }

      // Real Java process spawn
      // Using -Xmx1G. In a real scenario, this would be configurable.
      const proc = spawn('java', ['-Xmx1024M', '-jar', jarPath], {
        cwd: instanceDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      inst.process = proc;

      // Console Routing
      proc.stdout?.on('data', (data) => {
        const line = data.toString();
        this.addLog(id, line);
        // Basic detection of "Started"
        if (line.toLowerCase().includes('started') || line.toLowerCase().includes('done')) {
          inst.status = 'online';
        }
      });

      proc.stderr?.on('data', (data) => {
        const line = `[ERROR] ${data.toString()}`;
        this.addLog(id, line);
      });

      proc.on('close', (code) => {
        const line = `[MANAGER] Server stopped with code ${code}\n`;
        this.addLog(id, line);
        inst.status = 'offline';
        inst.process = undefined;
      });

      proc.on('error', (err) => {
        const line = `[CRITICAL] Process error: ${err.message}\n`;
        this.addLog(id, line);
        inst.status = 'error';
        inst.process = undefined;
      });

    } catch (e: any) {
      this.addLog(id, `[CRITICAL] Failed to spawn process: ${e.message}\n`);
      inst.status = 'error';
    }

    return inst;
  }

  stopServer(id: string) {
    const inst = this.instancesMap.get(id);
    if (!inst || !inst.process) return;
    inst.logs.push(`[MANAGER] Stopping server...\n`);
    inst.process.kill('SIGINT');
  }

  async deleteInstance(id: string) {
    const inst = this.instancesMap.get(id);
    if (!inst) throw new Error(`Instance ${id} not found`);
    if (inst.status !== 'offline') throw new Error(`Cannot delete a running server. Stop it first.`);
    
    const instanceDir = path.join(this.instancesDir, id);
    await fs.rm(instanceDir, { recursive: true, force: true });
    this.instancesMap.delete(id);
    this.addGlobalLog(`[MANAGER] Instance deleted: ${id}`);
  }

  private addLog(id: string, message: string) {
    const inst = this.instancesMap.get(id);
    if (!inst) return;
    inst.logs.push(message);
    if (inst.logs.length > 500) inst.logs.shift(); // Max 500 lines
  }

  getInstances() {
    return Array.from(this.instancesMap.values()).map(({ process, ...rest }) => rest);
  }

  getInstance(id: string) {
    const inst = this.instancesMap.get(id);
    if (!inst) return undefined;
    const { process, ...rest } = inst;
    return rest;
  }

  sendCommand(id: string, command: string) {
    const inst = this.instancesMap.get(id);
    if (!inst || !inst.process || !inst.process.stdin) return;
    inst.process.stdin.write(`${command}\n`);
    this.addLog(id, `> ${command}\n`);
  }
}

// Global singleton to handle HMR in Next.js
const globalAny: any = global;
export const serverManager: ServerManager = globalAny.serverManager || new ServerManager();
if (process.env.NODE_ENV !== 'production') globalAny.serverManager = serverManager;
