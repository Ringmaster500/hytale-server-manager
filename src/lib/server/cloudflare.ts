import axios from 'axios';

/**
 * Manages Cloudflare DNS records for Hytale server instances.
 * This replaces the previous cloudflared tunnel logic as Hytale requires UDP support 
 * and direct DNS management is more reliable for simple port-forwarding setups.
 */

export interface CloudflareDnsConfig {
  apiToken: string;
  zoneId: string;
  publicIp: string;
  domain: string;
}

export async function addDnsRecord(config: CloudflareDnsConfig, subdomain: string) {
  const { apiToken, zoneId, publicIp, domain } = config;
  const fullDomain = `${subdomain}.${domain}`;

  console.log(`[CF-DNS] Creating/Updating record for ${fullDomain} -> ${publicIp}`);

  try {
    // 1. Search for existing record to update instead of duplicate
    const searchRes = await axios.get(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${fullDomain}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const existingRecord = (searchRes.data as any).result?.[0];

    if (existingRecord) {
      // 2. Update existing record
      await axios.put(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${existingRecord.id}`,
        {
          type: 'A',
          name: fullDomain,
          content: publicIp,
          ttl: 60, // Short TTL for dynamic environments
          proxied: false, // Must be false for UDP/Game server traffic
        },
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`[CF-DNS] Updated existing record: ${fullDomain}`);
    } else {
      // 3. Create new record
      await axios.post(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
        {
          type: 'A',
          name: fullDomain,
          content: publicIp,
          ttl: 60,
          proxied: false, 
        },
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`[CF-DNS] Created new record: ${fullDomain}`);
    }

    return fullDomain;
  } catch (error: any) {
    console.error('[CF-DNS] Failed to manage Cloudflare DNS record:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.message || error.message);
  }
}

export async function removeDnsRecord(config: CloudflareDnsConfig, subdomain: string) {
  const { apiToken, zoneId, domain } = config;
  const fullDomain = `${subdomain}.${domain}`;

  try {
    const searchRes = await axios.get(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${fullDomain}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      }
    );

    const existingRecord = (searchRes.data as any).result?.[0];
    if (existingRecord) {
      await axios.delete(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${existingRecord.id}`,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        }
      );
      console.log(`[CF-DNS] Deleted record: ${fullDomain}`);
    }
  } catch (error: any) {
    console.error('[CF-DNS] Failed to delete record:', error.response?.data || error.message);
  }
}

/**
 * Utility to fetch the current public IP of the server.
 */
export async function getPublicIp(): Promise<string> {
  try {
    const res = await axios.get('https://api.ipify.org?format=json');
    return (res.data as any).ip;
  } catch (e) {
    console.error('[CF-DNS] Failed to auto-detect public IP, using fallback if available.');
    throw e;
  }
}
