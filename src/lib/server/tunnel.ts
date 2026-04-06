import axios from 'axios';

export interface CloudflareConfig {
  accountId: string;
  tunnelId: string;
  apiToken: string;
  domain: string;
}

export class TunnelManager {
  private config?: CloudflareConfig;

  constructor(config?: CloudflareConfig) {
    this.config = config;
  }

  async setConfig(config: CloudflareConfig) {
    this.config = config;
  }

  /**
   * Automatically adds a CNAME record and an Ingress Rule for a new Hytale instance.
   * This uses the Cloudflare API so we don't have to touch local config files.
   */
  async createSubdomain(subdomain: string, targetPort: number) {
    if (!this.config) throw new Error("Cloudflare not configured");

    const { accountId, tunnelId, apiToken, domain } = this.config;
    const fullDomain = `${subdomain}.${domain}`;

    try {
      // Step 1: Create the CNAME record in DNS
      await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/tunnels/${tunnelId}/configurations`,
        {
          config: {
            ingress: [
              {
                hostname: fullDomain,
                service: `udp://localhost:${targetPort}`,
              },
              { service: "http_status:404" } // Catch-all
            ]
          }
        },
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`[TUNNEL] Mapped ${fullDomain} to port ${targetPort}`);
      return fullDomain;
    } catch (e: any) {
      console.error("[TUNNEL] Failed to update ingress rules:", e.response?.data || e.message);
      throw e;
    }
  }

  async removeSubdomain(subdomain: string) {
    if (!this.config) return;

    const { accountId, tunnelId, apiToken, domain } = this.config;
    const fullDomain = `${subdomain}.${domain}`;

    try {
      const res = await axios.get(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/tunnels/${tunnelId}/configurations`,
        { headers: { Authorization: `Bearer ${apiToken}` } }
      ) as any;

      const currentIngress = res.data?.result?.config?.ingress || [];
      const newIngress = currentIngress.filter((i: any) => i.hostname !== fullDomain);

      await axios.put(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/tunnels/${tunnelId}/configurations`,
        { config: { ingress: newIngress } },
        { headers: { Authorization: `Bearer ${apiToken}` } }
      );

      console.log(`[TUNNEL] Removed ${fullDomain}`);
    } catch (e: any) {
      console.error("[TUNNEL] Failed to remove ingress rule:", e.message);
    }
  }

  async getTunnelStatus() {
    if (!this.config) return { enabled: false };
    return {
      enabled: true,
      domain: this.config.domain,
      tunnelId: this.config.tunnelId,
    };
  }
}

export const tunnelManager = new TunnelManager();
