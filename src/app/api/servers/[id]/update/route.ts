import { NextResponse } from 'next/server';
import docker from '@/lib/docker';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const container = docker.getContainer(id);
    const containerInfo = await container.inspect();
    
    if (containerInfo.State.Running) {
      await container.stop();
    }

    const exec = await container.exec({
      Cmd: ['./hytale-downloader', '-download-path', 'update.zip'],
      AttachStdout: true,
      AttachStderr: true
    });

    await exec.start({});
    await container.start();
    
    return NextResponse.json({ message: 'Update sequence started' });
  } catch (error: any) {
    console.error('Error triggering update:', error);
    return NextResponse.json({ error: 'Failed to trigger update', details: error.message }, { status: 500 });
  }
}
