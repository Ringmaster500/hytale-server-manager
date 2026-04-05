import { NextResponse } from 'next/server';
import { buildBaseImage } from '@/lib/docker-build';

export async function POST() {
  try {
    // We send back a message that build started, but build itself takes time.
    // In a real environment we might want a background job or server-sent events.
    // However, since we are using 'standalone' Next.js, we can try to wait a bit
    // then return some logs if it finishes quickly.
    
    // For now, let's just trigger it and return success if it doesn't throw.
    // We can also just run it and await it if the timeout is long enough.
    // On many environments, POST timeout is ~30-60s which should be enough for a small image.
    
    await buildBaseImage();
    
    return NextResponse.json({ message: 'Base image built successfully' });
  } catch (error: any) {
    console.error('Error building image via API:', error);
    return NextResponse.json({ 
      error: 'Failed to build image',
      details: error.message 
    }, { status: 500 });
  }
}
