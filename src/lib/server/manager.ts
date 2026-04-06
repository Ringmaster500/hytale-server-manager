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
  private isDownloading = false;

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
    if (existsSync(configPath)) await fs.unlink(configPath);
    // Be careful with deleting everything - user might have huge assets
    this.addGlobalLog("[MANAGER] Configuration reset.");
  }

  private async getJarPath(): Promise<string | null> {
    const options = [
      path.join(this.coreDir, 'hytaleserver.jar'),
      path.join(this.coreDir, 'HytaleServer.jar'),
      path.join(this.coreDir, 'Server', 'HytaleServer.jar'),
      path.join(this.coreDir, 'Server', 'hytaleserver.jar'),
    ];

    for (const p of options) {
      if (existsSync(p)) {
        const stats = await fs.stat(p);
        if (stats.size > 1024) return p;
      }
    }
    return null;
  }

  async getSystemInfo() {
    const currentJar = await this.getJarPath();
    const assetsZip = path.join(this.coreDir, 'Assets.zip');
    const zipPath = path.join(this.coreDir, 'hytaleserver.jar.zip');
    let jarStatus: 'missing' | 'ready' | 'corrupt' | 'downloading' = 'missing';
    let jarSize = 0;

    if (this.isDownloading) {
      jarStatus = 'downloading';
    } else if (currentJar) {
      const stats = await fs.stat(currentJar);
      jarSize = stats.size;
      jarStatus = 'ready';
    } else if (existsSync(zipPath) || existsSync(assetsZip)) {
      jarStatus = 'corrupt'; // Needs unzip or re-pull
    }

    return {
      jarExists: !!currentJar,
      jarPath: currentJar,
      jarStatus,
      jarSize,
      isDownloading: this.isDownloading,
      onboarded: this.isOnboarded(),
      instancesCount: this.instancesMap.size,
      nodeVersion: process.version,
      coreFiles: await this.listFiles('core').catch(() => []),
    };
  }

  async listFiles(subPath: string = '') {
    const targetDir = path.join(this.dataDir, subPath);
    if (!targetDir.startsWith(this.dataDir)) throw new Error("Access denied");
    
    try {
      if (!existsSync(targetDir)) return [];
      const entries = await fs.readdir(targetDir, { withFileTypes: true });
      return entries.map(e => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        size: 0,
      }));
    } catch (e) {
      return [];
    }
  }

  async refreshStatus() {
    await this.loadInstances();
    return this.getSystemInfo();
  }

  private async loadInstances() {
    try {
      const dirs = await fs.readdir(this.instancesDir);
      for (const id of dirs) {
        const instanceDir = path.join(this.instancesDir, id);
        const stats = await fs.stat(instanceDir);
        if (stats.isDirectory()) {
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
  async ensureAssets() {
    const assetsZip = path.join(this.coreDir, 'Assets.zip');
    const commonDir = path.join(this.coreDir, 'Common');
    
    if (existsSync(commonDir) && existsSync(assetsZip)) {
        await fs.unlink(assetsZip).catch(() => {});
        this.addGlobalLog("[MANAGER] Assets already present. Cleaned up zip.");
        return;
    }

    if (!existsSync(assetsZip)) return;

    this.addGlobalLog("[MANAGER] Found Assets.zip. Extracting massive asset pack (this may take a minute)...");
    const unzipAssets = spawn('unzip', ['-o', assetsZip, '-d', this.coreDir], { cwd: this.coreDir });
    
    await new Promise<void>((resolve) => {
        unzipAssets.on('close', async () => {
            this.addGlobalLog("[MANAGER] Assets extracted successfully.");
            await fs.unlink(assetsZip).catch(() => {});
            resolve();
        });
    });
  }

  async checkCoreFiles() {
    await this.ensureAssets();
    if (this.isDownloading) return;

    const currentJar = await this.getJarPath();
    if (currentJar) return;

    if (process.env.MOCK_SERVER === 'true') {
        this.addGlobalLog("[MANAGER] MOCK_SERVER is enabled. Skipping binaries pull.");
        await fs.writeFile(path.join(this.coreDir, 'hytaleserver.jar'), 'MOCK_HYTALE_JAR_CONTENT');
        return;
    }

    this.isDownloading = true;
    this.addGlobalLog("[MANAGER] Core binaries missing/invalid. Triggering Hytale Downloader...");
    
    try {
      const downloadTarget = path.join(this.coreDir, 'hytaleserver.jar');
      const downloader = spawn('hytale-downloader', ['-download-path', downloadTarget], {
        cwd: this.coreDir,
        env: { ...process.env }
      });

      await new Promise<void>((resolve, reject) => {
        downloader.stdout?.on('data', (data) => this.addGlobalLog(data.toString()));
        downloader.stderr?.on('data', (data) => this.addGlobalLog(`[CLI] ${data.toString()}`));

        downloader.on('close', async (code) => {
          if (code === 0) {
            this.addGlobalLog("[MANAGER] Download complete. Checking for zip extraction...");
            const zipPath = path.join(this.coreDir, 'hytaleserver.jar.zip');
            if (existsSync(zipPath)) {
                this.addGlobalLog("[MANAGER] Extracting binaries...");
                const unzip = spawn('unzip', ['-o', zipPath, '-d', this.coreDir], { cwd: this.coreDir });
                unzip.on('close', async (uCode) => {
                    if (uCode === 0) {
                        this.addGlobalLog("[MANAGER] Extraction successful.");
                        await fs.unlink(zipPath).catch(() => {});
                        resolve();
                    } else {
                        reject(new Error(`Unzip failed with code ${uCode}`));
                    }
                });
            } else {
                resolve();
            }
          } else {
            reject(new Error(`Downloader exited with code ${code}`));
          }
        });

        downloader.on('error', reject);
      });

    } catch (e: any) {
      this.addGlobalLog(`[MANAGER] Process Error: ${e.message}`);
      throw e;
    } finally {
      this.isDownloading = false;
    }
  }

  async createInstance(name: string, port: number) {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    const instanceDir = path.join(this.instancesDir, id);

    if (existsSync(instanceDir) || this.instancesMap.has(id)) {
      throw new Error(`Instance ${id} already exists`);
    }

    await fs.mkdir(path.join(instanceDir, 'mods'), { recursive: true });
    await fs.mkdir(path.join(instanceDir, 'config'), { recursive: true });

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

  async startServer(id: string) {
    const inst = this.instancesMap.get(id);
    if (!inst) throw new Error(`Instance ${id} not found`);
    if (inst.status === 'online' || inst.status === 'starting') return inst;

    await this.ensureAssets();

    const currentJar = await this.getJarPath();
    if (!currentJar) {
      await this.checkCoreFiles();
    }
    
    const doubleCheckJar = await this.getJarPath();
    if (!doubleCheckJar) throw new Error("Hytale Server JAR not found even after setup attempt.");

    const instanceDir = path.join(this.instancesDir, id);
    const coreServerDir = path.dirname(doubleCheckJar);

    // Deep symlink Logic
    try {
        const potentialFolders = ['Content', 'Packs', 'Lib', 'Native', 'HytaleAssets', 'mods', 'data', 'scripts', 'configs', 'Libraries', 'Common'];
        const parentDir = path.dirname(coreServerDir);
        const searchDirs = [coreServerDir, parentDir, this.coreDir];
        const foldersToLink: Set<string> = new Set(potentialFolders);

        for (const dir of searchDirs) {
            if (existsSync(dir)) {
                const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
                entries.filter(e => e.isDirectory()).forEach(e => {
                    if (!['instances', 'Server', 'test', 'data'].includes(e.name)) {
                        foldersToLink.add(e.name);
                    }
                });
            }
        }

        const findManifest = async (dir: string, depth = 0): Promise<string | null> => {
            if (depth > 2) return null;
            const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name === 'HytaleAssets' || entry.name === 'Content' || entry.name === 'Packs' || entry.name === 'mods') return fullPath;
                    const found = await findManifest(fullPath, depth + 1);
                    if (found) return found;
                }
            }
            return null;
        };

        for (const folder of Array.from(foldersToLink)) {
            let src = path.join(coreServerDir, folder);
            if (!existsSync(src)) src = path.join(parentDir, folder);
            if (!existsSync(src)) src = path.join(this.coreDir, folder);
            
            if (folder === 'HytaleAssets' && !existsSync(src)) {
                src = await findManifest(this.coreDir) || src;
            }

            if (existsSync(src)) {
                const dest = path.join(instanceDir, folder);
                if (!existsSync(dest)) {
                    await fs.symlink(src, dest, 'dir');
                    this.addLog(id, `[MANAGER] Linked ${folder}\n`);
                }
            }
        }
    } catch (e: any) {
        this.addLog(id, `[MANAGER] Warning: Asset linking: ${e.message}\n`);
    }

    inst.status = 'starting';
    inst.logs.push(`[MANAGER] Starting Hytale Server instance: ${id}...\n`);

    try {
      const proc = spawn('java', ['-Xmx1024M', '-jar', doubleCheckJar], {
        cwd: instanceDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      inst.process = proc;

      proc.stdout?.on('data', (data) => {
        const line = data.toString();
        this.addLog(id, line);
        if (line.toLowerCase().includes('started') || line.toLowerCase().includes('done')) {
          inst.status = 'online';
        }
      });

      proc.stderr?.on('data', (data) => {
        this.addLog(id, `[ERROR] ${data.toString()}`);
      });

      proc.on('close', (code) => {
        this.addLog(id, `[MANAGER] Server stopped with code ${code}\n`);
        inst.status = 'offline';
        inst.process = undefined;
      });

      proc.on('error', (err) => {
        this.addLog(id, `[CRITICAL] Process error: ${err.message}\n`);
        inst.status = 'error';
        inst.process = undefined;
      });

    } catch (e: any) {
      this.addLog(id, `[CRITICAL] Failed to spawn: ${e.message}\n`);
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
    if (inst.status !== 'offline') throw new Error(`Stop server first.`);
    
    const instanceDir = path.join(this.instancesDir, id);
    await fs.rm(instanceDir, { recursive: true, force: true });
    this.instancesMap.delete(id);
    this.addGlobalLog(`[MANAGER] Instance deleted: ${id}`);
  }

  private addLog(id: string, message: string) {
    const inst = this.instancesMap.get(id);
    if (!inst) return;
    inst.logs.push(message);
    if (inst.logs.length > 500) inst.logs.shift();
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

const globalAny: any = global;
export const serverManager: ServerManager = globalAny.serverManager || new ServerManager();
if (process.env.NODE_ENV !== 'production') globalAny.serverManager = serverManager;
