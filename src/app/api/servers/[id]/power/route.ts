import { NextResponse } from 'next/server';
import docker from '@/lib/docker';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await req.json(); // 'start', 'stop', 'restart'
    
    const container = docker.getContainer(id);
    
    if (action === 'start') {
      await container.start();
    } else if (action === 'stop') {
      await container.stop();
    } else if (action === 'restart') {
      await container.restart();
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    return NextResponse.json({ message: `Container ${action}ed successfully` });
  } catch (error: any) {
    console.error(`Error performing power action:`, error);
    return NextResponse.json({ error: 'Failed to execute power action', details: error.message }, { status: 500 });
  }
}
