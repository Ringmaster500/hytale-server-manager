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

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.coreDir = path.join(this.dataDir, 'core');
    this.instancesDir = path.join(this.dataDir, 'instances');
    this.ensureDirs();
  }

  private ensureDirs() {
    [this.dataDir, this.coreDir, this.instancesDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Phase 2: Auto-Setup Logic
  async checkCoreFiles() {
    const jarPath = path.join(this.coreDir, 'hytaleserver.jar');
    if (!existsSync(jarPath)) {
      console.log('Hytale server JAR not found, setting up placeholder...');
      // Placeholder JAR for testing until official links are available
      await fs.writeFile(jarPath, 'MOCK_HYTALE_JAR_CONTENT');
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
      // Spawn Java process
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

      // Mock 'online' state for demonstration if java isn't actually executing (e.g., mock jar)
      if (process.env.MOCK_SERVER === 'true' || !existsSync(jarPath)) {
        setTimeout(() => {
           if (inst.status === 'starting') inst.status = 'online';
        }, 1000);
      } else {
        // Normal detection would check logs for "Server Started"
        setTimeout(() => {
          if (inst.status === 'starting') inst.status = 'online';
        }, 5000);
      }

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
