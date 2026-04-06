import { NextResponse } from 'next/server';
import { serverManager } from '@/lib/server/manager';

export async function GET() {
  return NextResponse.json(await serverManager.getSystemInfo());
}

export async function DELETE() {
  await serverManager.resetConfig();
  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
   const body = await request.json().catch(() => ({}));
   
   if (body.action === 'check') {
     return NextResponse.json(await serverManager.refreshStatus());
   }

   if (body.action === 'save_cloudflare') {
     const { action, ...config } = body;
     await serverManager.saveCloudflareConfig(config);
     return NextResponse.json({ success: true });
   }

   // Default: Re-trigger download
   serverManager.checkCoreFiles();
   return NextResponse.json({ success: true });
}
