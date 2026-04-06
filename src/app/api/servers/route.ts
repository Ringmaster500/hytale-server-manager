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

export async function POST(req: NextRequest) {
  try {
    const { name, port } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const instance = await serverManager.createInstance(name, port);
    return NextResponse.json(instance);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
