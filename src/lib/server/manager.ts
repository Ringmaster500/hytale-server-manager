import { spawn, ChildProcess, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { addDnsRecord, removeDnsRecord, getPublicIp } from './cloudflare';

export interface ServerInstance {
  id: string;
  name: string;
  port: number;
  status: 'online' | 'offline' | 'starting' | 'error';
  logs: string[];
  subdomain?: string;
  cpuUsage?: number;
  ramUsage?: number;
  maxRam: number; // In MiB
}

class ServerManager {
  private instancesMap: Map<string, ServerInstance & { process?: ChildProcess }> = new Map();
  private dataDir: string;
  private coreDir: string;
  private instancesDir: string;
  private configFile: string;
  private config: any = {};
  private globalLogs: string[] = [];
  private isDownloading = false;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.coreDir = path.join(this.dataDir, 'core');
    this.instancesDir = path.join(this.dataDir, 'instances');
    this.configFile = path.join(this.dataDir, 'config.json');
    this.ensureDirs();
    this.loadConfigSync();
    this.loadInstances();
    this.addGlobalLog("[MANAGER] Hytale Server Manager initialized.");
    this.addGlobalLog(`[MANAGER] Working Directory: ${process.cwd()}`);
  }

  private loadConfigSync() {
    if (existsSync(this.configFile)) {
      try {
        const data = readFileSync(this.configFile, 'utf-8');
        this.config = JSON.parse(data);
        if (this.config.cloudflare) {
          // No longer using tunnelManager here
        }
      } catch (e) {
        this.config = {};
      }
    }
  }

  isOnboarded(): boolean {
    return existsSync(this.configFile);
  }

  async saveCloudflareConfig(config: any) {
    this.config.cloudflare = config;
    await this.saveConfig();
  }

  async saveConfig(config?: any) {
    if (config) this.config = { ...this.config, ...config };
    await fs.writeFile(this.configFile, JSON.stringify(this.config, null, 2));
  }

  async resetConfig() {
    const configPath = path.join(this.dataDir, 'config.json');
    if (existsSync(configPath)) await fs.unlink(configPath);
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
      jarStatus = 'corrupt';
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
      if (!existsSync(this.instancesDir)) return;
      const dirs = await fs.readdir(this.instancesDir);
      for (const id of dirs) {
        if (this.instancesMap.has(id)) continue;
        const instanceDir = path.join(this.instancesDir, id);
        const stats = await fs.stat(instanceDir);
        if (stats.isDirectory()) {
          let port = 4242;
          let maxRam = 2048;
          
          try {
            const props = await fs.readFile(path.join(instanceDir, 'server.properties'), 'utf-8');
            const match = props.match(/server\.port=(\d+)/);
            if (match) port = parseInt(match[1]);
            
            // Try to load extra metadata
            const metaPath = path.join(instanceDir, 'manager-config.json');
            if (existsSync(metaPath)) {
                const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
                if (meta.maxRam) maxRam = meta.maxRam;
            }
          } catch (e) {}
 
          this.instancesMap.set(id, {
            id,
            name: id.replace(/-/g, ' '),
            port,
            status: 'offline',
            logs: [],
            maxRam
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

  async checkCoreFiles() {
    if (this.isDownloading) return;

    const currentJar = await this.getJarPath();
    const assetsZip = path.join(this.coreDir, 'Assets.zip');
    
    // Integrity check: Both JAR and Assets.zip must exist for Official Mode
    if (currentJar && existsSync(assetsZip)) return;

    this.isDownloading = true;
    const downloadTarget = path.join(this.coreDir, 'hytaleserver.jar');
    this.addGlobalLog(`[MANAGER] Launching: hytale-downloader -download-path ${downloadTarget}`);
    
    try {
      const downloader = spawn('hytale-downloader', ['-download-path', downloadTarget], {
        cwd: this.coreDir,
      });

      await new Promise<void>((resolve, reject) => {
        downloader.stdout?.on('data', (d) => this.addGlobalLog(`[CLI] ${d.toString()}`));
        downloader.stderr?.on('data', (d) => this.addGlobalLog(`[CLI-ERR] ${d.toString()}`));

        downloader.on('close', async (code) => {
          if (code === 0) {
            this.addGlobalLog("[MANAGER] Download complete.");
            const zipPath = path.join(this.coreDir, 'hytaleserver.jar.zip');
            if (existsSync(zipPath)) {
                this.addGlobalLog("[MANAGER] Extracting binaries...");
                const unzip = spawn('unzip', ['-o', zipPath, '-d', this.coreDir], { cwd: this.coreDir });
                unzip.on('close', async () => {
                    await fs.unlink(zipPath).catch(() => {});
                    resolve();
                });
            } else {
                resolve();
            }
          } else {
            // Log help on failure
            this.addGlobalLog(`[MANAGER] Downloader failed (code ${code}). Pulling --help...`);
            const help = spawnSync('hytale-downloader', ['--help']);
            this.addGlobalLog(help.stdout.toString() + help.stderr.toString());
            reject(new Error(`Exit code ${code}`));
          }
        });
        downloader.on('error', (err) => {
            this.addGlobalLog(`[MANAGER] Spawn Error: ${err.message}`);
            reject(err);
        });
      });
    } catch (e: any) {
      this.addGlobalLog(`[ERROR] ${e.message}`);
    } finally {
      this.isDownloading = false;
    }
  }

  getNextPort() {
    const start = this.config.portRangeStart || 5520;
    const end = this.config.portRangeEnd || 5600;
    const activePorts = Array.from(this.instancesMap.values()).map(i => i.port);
    
    for (let p = start; p <= end; p++) {
      if (!activePorts.includes(p)) return p;
    }
    return start; // Fallback
  }

  async createInstance(name: string, port?: number, maxRam: number = 2048) {
    const finalPort = port || this.getNextPort();
    const id = name.toLowerCase().replace(/\s+/g, '-');
    const instanceDir = path.join(this.instancesDir, id);
    if (existsSync(instanceDir)) throw new Error(`Instance ${id} exists`);

    await fs.mkdir(instanceDir, { recursive: true });
    await fs.mkdir(path.join(instanceDir, 'mods'), { recursive: true });

    const props = `server.port=${finalPort}\nserver.name=${name}\nmax-players=20\n`;
    await fs.writeFile(path.join(instanceDir, 'server.properties'), props);
    
    // Save manager settings
    await fs.writeFile(path.join(instanceDir, 'manager-config.json'), JSON.stringify({ maxRam }, null, 2));

    const instance: ServerInstance = { id, name, port: finalPort, status: 'offline', logs: [], maxRam };
    this.instancesMap.set(id, instance);
    return instance;
  }

  async updateInstanceSettings(id: string, settings: { maxRam?: number, port?: number }) {
    const inst = this.instancesMap.get(id);
    if (!inst) throw new Error("Instance not found");

    if (settings.maxRam) inst.maxRam = settings.maxRam;
    if (settings.port) inst.port = settings.port;

    const instanceDir = path.join(this.instancesDir, id);
    await fs.writeFile(path.join(instanceDir, 'manager-config.json'), JSON.stringify({ maxRam: inst.maxRam }, null, 2));
    
    if (settings.port) {
        // We'd need to update server.properties too, but let's keep it simple for now or do it later
    }
    
    return inst;
  }

  async startServer(id: string) {
    const inst = this.instancesMap.get(id);
    if (!inst) throw new Error(`Instance ${id} not found`);
    if (inst.status === 'online' || inst.status === 'starting') return inst;

    const jarPath = await this.getJarPath();
    const assetsZip = path.join(this.coreDir, 'Assets.zip');
    
    // If we're missing the JAR OR the essential Assets.zip, trigger recovery
    if (!jarPath || !existsSync(assetsZip)) {
        await this.checkCoreFiles();
    }
    
    const finalJar = await this.getJarPath();
    if (!finalJar) throw new Error("Hytale JAR still missing after recovery attempt.");

    const instanceDir = path.join(this.instancesDir, id);

    // Official Asset Linking Logic
    try {
        // Link the Assets.zip file directly (not unzipped)
        const masterAssetsZip = path.join(this.coreDir, 'Assets.zip');
        if (existsSync(masterAssetsZip)) {
            const destZip = path.join(instanceDir, 'Assets.zip');
            if (!existsSync(destZip)) await fs.link(masterAssetsZip, destZip).catch(() => fs.copyFile(masterAssetsZip, destZip));
        }

        // Link external dependencies
        const dependencyDirs = ['Libraries', 'Native', 'Common', 'Server/Licenses'];
        for (const dep of dependencyDirs) {
            const src = path.join(this.coreDir, dep);
            if (existsSync(src)) {
                const dest = path.join(instanceDir, path.basename(dep));
                if (!existsSync(dest)) await fs.symlink(src, dest, 'dir');
            }
        }
    } catch (e: any) {
        this.addLog(id, `[MANAGER] Warning: Asset linking: ${e.message}\n`);
    }

    inst.status = 'starting';
    inst.logs.push(`[MANAGER] Launching Hytale Instance (Official Assets Mode)...\n`);

    // Cloudflare DNS Record Provisioning
    if (this.config.cloudflare?.apiToken && this.config.cloudflare?.zoneId) {
        try {
            const subdomain = id;
            const fullDomain = `${subdomain}.${this.config.cloudflare.domain}`;
            this.addLog(id, `[CF-DNS] Provisioning DNS: ${fullDomain} -> ${this.config.cloudflare.publicIp}...\n`);
            
            // Auto-detect IP if none provided
            if (!this.config.cloudflare.publicIp) {
                try {
                  this.config.cloudflare.publicIp = await getPublicIp();
                  this.addGlobalLog(`[MANAGER] Auto-detected public IP: ${this.config.cloudflare.publicIp}`);
                } catch (e) {
                  this.addLog(id, `[CF-DNS] Warning: Failed to auto-detect IP, using Tailscale if fallback available\n`);
                }
            }

            const url = await addDnsRecord({
              apiToken: this.config.cloudflare.apiToken,
              zoneId: this.config.cloudflare.zoneId,
              publicIp: this.config.cloudflare.publicIp,
              domain: this.config.cloudflare.domain
            }, subdomain);
            
            inst.subdomain = url;
            this.addLog(id, `[CF-DNS] Success: Registered ${url}\n`);
        } catch (e: any) {
            this.addLog(id, `[CF-DNS] Error: Failed to update DNS: ${e.message}\n`);
        }
    }

    const proc = spawn('java', [
        `-Xmx${inst.maxRam}M`, 
        '-jar', finalJar,
        '--assets', 'Assets.zip',
        '--backup',
        '--backup-dir', 'backups',
        '--backup-frequency', '30'
    ], {
      cwd: instanceDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    inst.process = proc;
    proc.stdout?.on('data', (data) => {
      const line = data.toString();
      this.addLog(id, line);
      if (line.includes('started') || line.includes('done')) inst.status = 'online';
    });
    proc.stderr?.on('data', (d) => this.addLog(id, d.toString()));
    proc.on('close', (c) => {
      this.addLog(id, `[MANAGER] Process exited with code ${c}\n`);
      inst.status = 'offline';
      inst.process = undefined;
    });

    return inst;
  }

  stopServer(id: string) {
    const inst = this.instancesMap.get(id);
    if (inst?.process) inst.process.kill('SIGINT');
  }

  async deleteInstance(id: string) {
    const instancePath = path.join(this.instancesDir, id);
    const inst = this.instancesMap.get(id);
    
    if (inst?.process) {
      await this.stopServer(id);
    }

    // DNS Cleanup
    if (this.config.cloudflare?.apiToken && this.config.cloudflare?.zoneId) {
        try {
            await removeDnsRecord({
              apiToken: this.config.cloudflare.apiToken,
              zoneId: this.config.cloudflare.zoneId,
              publicIp: this.config.cloudflare.publicIp,
              domain: this.config.cloudflare.domain
            }, id);
        } catch (e) {
            this.addGlobalLog("[MANAGER] Cloudflare DNS cleanup failed (ignoring)");
        }
    }

    if (existsSync(instancePath)) {
      await fs.rm(instancePath, { recursive: true, force: true });
      this.addGlobalLog(`[MANAGER] Instance deleted: ${id}`);
    }
    this.instancesMap.delete(id);
  }

  private addLog(id: string, message: string) {
    const inst = this.instancesMap.get(id);
    if (inst) {
      inst.logs.push(message);
      if (inst.logs.length > 500) inst.logs.shift();
    }
  }

  getInstances() {
    return Array.from(this.instancesMap.values()).map(({ process, ...rest }) => rest);
  }

  getInstance(id: string) {
    const inst = this.instancesMap.get(id);
    if (!inst) return undefined;
    return { ...inst, process: undefined };
  }

  sendCommand(id: string, command: string) {
    const inst = this.instancesMap.get(id);
    if (inst?.process?.stdin) inst.process.stdin.write(`${command}\n`);
  }
}

const globalAny: any = global;
export const serverManager: ServerManager = globalAny.serverManager || new ServerManager();
if (process.env.NODE_ENV !== 'production') globalAny.serverManager = serverManager;
