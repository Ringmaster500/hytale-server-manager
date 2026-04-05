import { NextRequest, NextResponse } from 'next/server';
import { serverManager } from '@/lib/server/manager';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { command } = await req.json();
    if (!command) {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 });
    }
    serverManager.sendCommand(id, command);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
