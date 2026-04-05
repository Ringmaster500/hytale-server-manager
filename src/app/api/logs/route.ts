import { NextResponse } from 'next/server';
import { serverManager } from '@/lib/server/manager';

export async function GET() {
  return NextResponse.json({ logs: serverManager.getGlobalLogs() });
}
