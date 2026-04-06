import fs from 'fs/promises';
import { existsSync } from 'fs';
import yaml from 'js-yaml';

export interface CloudflareConfig {
  domain: string;
  configPath?: string; // Optional custom path
}

export class TunnelManager {
  private config?: CloudflareConfig;
  private readonly defaultPath = '/app/data/tunnel/config.yml';

  constructor(config?: CloudflareConfig) {
    this.config = config;
  }

  async setConfig(config: CloudflareConfig) {
    this.config = config;
  }

  private getPath() {
    return this.config?.configPath || this.defaultPath;
  }

  /**
   * Directly updates the local cloudflared config.yml file.
   */
  async createSubdomain(subdomain: string, targetPort: number) {
    if (!this.config) throw new Error("Cloudflare not configured");

    const fullDomain = `${subdomain}.${this.config.domain}`;
    const path = this.getPath();

    if (!existsSync(path)) {
        throw new Error(`Cloudflared config not found at ${path}. Please ensure it is mounted as a volume.`);
    }

    try {
      const fileContent = await fs.readFile(path, 'utf8');
      const data = yaml.load(fileContent) as any;

      if (!data.ingress) data.ingress = [];

      // Remove existing rule for this hostname if it exists
      data.ingress = data.ingress.filter((i: any) => i.hostname !== fullDomain);

      // Add new rule at the beginning (before the catch-all)
      data.ingress.unshift({
        hostname: fullDomain,
        service: `udp://localhost:${targetPort}`
      });

      // Ensure the catch-all (404) is always at the end
      const catchAllIndex = data.ingress.findIndex((i: any) => !i.hostname);
      if (catchAllIndex !== -1) {
          const catchAll = data.ingress.splice(catchAllIndex, 1)[0];
          data.ingress.push(catchAll);
      } else {
          data.ingress.push({ service: 'http_status:404' });
      }

      await fs.writeFile(path, yaml.dump(data, { indent: 2 }));
      console.log(`[TUNNEL] Local Ingress Updated: ${fullDomain} -> ${targetPort}`);
      return fullDomain;
    } catch (e: any) {
      console.error("[TUNNEL] Failed to update local config file:", e.message);
      throw e;
    }
  }

  async removeSubdomain(subdomain: string) {
    if (!this.config) return;

    const fullDomain = `${subdomain}.${this.config.domain}`;
    const path = this.getPath();

    if (!existsSync(path)) return;

    try {
      const fileContent = await fs.readFile(path, 'utf8');
      const data = yaml.load(fileContent) as any;

      if (!data.ingress) return;

      // Filter out the subdomain
      data.ingress = data.ingress.filter((i: any) => i.hostname !== fullDomain);

      await fs.writeFile(path, yaml.dump(data, { indent: 2 }));
      console.log(`[TUNNEL] Local Ingress Removed: ${fullDomain}`);
    } catch (e: any) {
      console.error("[TUNNEL] Failed to remove local ingress rule:", e.message);
    }
  }

  async getTunnelStatus() {
    if (!this.config) return { enabled: false };
    return {
      enabled: true,
      domain: this.config.domain,
      localMode: true,
      path: this.getPath(),
      active: existsSync(this.getPath())
    };
  }
}

export const tunnelManager = new TunnelManager();
