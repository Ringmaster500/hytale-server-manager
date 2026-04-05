import { NextRequest, NextResponse } from 'next/server';
import { serverManager } from '@/lib/server/manager';

export async function GET() {
  return NextResponse.json({ isOnboarded: serverManager.isOnboarded() });
}

export async function POST(req: NextRequest) {
  try {
    const config = await req.json();
    if (!config.username || !config.password) {
       return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
    }
    
    // Save the config to disk
    await serverManager.saveConfig(config);
    
    // Trigger initial Hytale CLI pull (In a real scenario, we'd spawn the CLI here)
    // For now, we'll simulate the download or call checkCoreFiles
    await serverManager.checkCoreFiles();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
