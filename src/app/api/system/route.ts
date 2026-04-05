import { NextResponse } from 'next/server';
import { serverManager } from '@/lib/server/manager';

export async function GET() {
  return NextResponse.json(serverManager.getSystemInfo());
}

export async function DELETE() {
  await serverManager.resetConfig();
  return NextResponse.json({ success: true });
}

export async function POST() {
   // Re-trigger download
   serverManager.checkCoreFiles();
   return NextResponse.json({ success: true });
}
