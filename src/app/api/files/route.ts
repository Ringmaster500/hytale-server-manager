import { NextResponse } from 'next/server';
import { serverManager } from '@/lib/server/manager';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '';
  
  try {
    const files = await serverManager.listFiles(path);
    return NextResponse.json({ success: true, files });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 403 });
  }
}
