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
   const { action } = await request.json().catch(() => ({}));
   
   if (action === 'check') {
     return NextResponse.json(await serverManager.refreshStatus());
   }

   // Default: Re-trigger download
   serverManager.checkCoreFiles();
   return NextResponse.json({ success: true });
}
