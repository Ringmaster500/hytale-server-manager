import { NextRequest, NextResponse } from 'next/server';
import { serverManager } from '@/lib/server/manager';

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();

    if (action === 'reset-core') {
      // Trigger background reset
      serverManager.resetCoreFiles();
      return NextResponse.json({ success: true, message: 'Core reset initiated in background.' });
    }

    if (action === 'verify-core') {
      await serverManager.checkCoreFiles();
      return NextResponse.json({ success: true, message: 'Core verification complete.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
