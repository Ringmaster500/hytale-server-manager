import { NextResponse } from 'next/server';
import docker from '@/lib/docker';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Server ID is required' }, { status: 400 });
    }

    const container = docker.getContainer(id);
    
    // Check if container exists
    const data = await container.inspect();
    
    // Stop if running
    if (data.State.Running) {
      await container.stop();
    }
    
    // Remove container
    await container.remove({ force: true });
    
    return NextResponse.json({ message: 'Server deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting server:', error);
    return NextResponse.json({ error: 'Failed to delete server', details: error.message }, { status: 500 });
  }
}
