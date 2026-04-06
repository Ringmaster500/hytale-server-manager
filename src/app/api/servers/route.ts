import { NextRequest, NextResponse } from 'next/server';
import { serverManager } from '@/lib/server/manager';

export async function GET() {
  try {
    const instances = serverManager.getInstances();
    return NextResponse.json(instances);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { name, port, maxRam } = await req.json();
  if (!name) return Response.json({ error: 'Name is required' }, { status: 400 });

  try {
    const manager = serverManager;
    const server = await manager.createInstance(name, port ? parseInt(port) : undefined, maxRam ? parseInt(maxRam) : undefined);
    return Response.json(server);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
