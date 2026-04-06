import { NextRequest, NextResponse } from 'next/server';
import { getServerManager } from '@/lib/server/manager';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { maxRam, port } = await req.json();
    const manager = getServerManager();
    
    const updated = await manager.updateInstanceSettings(id, { 
      maxRam: maxRam ? parseInt(maxRam) : undefined,
      port: port ? parseInt(port) : undefined 
    });
    
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
