import axios from 'axios';

const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const CLOUDFLARE_TUNNEL_ID = process.env.CLOUDFLARE_TUNNEL_ID;

export async function addDnsRecord(name: string, port: number) {
  if (!CLOUDFLARE_API_KEY || !CLOUDFLARE_ZONE_ID || !CLOUDFLARE_TUNNEL_ID) {
    console.warn('Cloudflare credentials missing. Skipping DNS update.');
    return;
  }

  try {
    // 1. Create DNS Record for the tunnel
    // name.example.com CNAME tunnel_id.cfargotunnel.com
    await axios.post(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`,
      {
        type: 'CNAME',
        name,
        content: `${CLOUDFLARE_TUNNEL_ID}.cfargotunnel.com`,
        proxied: true,
      },
      {
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // 2. Update Tunnel Ingress configuration
    // (This part requires interacting with the specific Tunnel config API or cloudflared)
    // For many Zero Trust setups, the tunnel configuration is managed via the dashboard.
    // If the user wants local config file modification, we would do that here.
    console.log(`Cloudflare DNS record created for ${name}.${process.env.DOMAIN || 'example.com'}`);
  } catch (error: any) {
    console.error('Failed to create Cloudflare DNS record:', error.response?.data || error.message);
  }
}
