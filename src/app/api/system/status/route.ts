import { NextResponse } from 'next/server';
import { checkImageExists } from '@/lib/docker-build';
import { HYTALE_IMAGE_NAME, DATA_DIR } from '@/lib/docker';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const imageExists = await checkImageExists();
    
    // Check if the source files for building are present
    const dockerDir = path.join(process.cwd(), 'docker', 'hytale-server');
    const sourceFilesPresent = fs.existsSync(path.join(dockerDir, 'Dockerfile'));
    
    // Check if DATA_DIR is accessible
    let dataDirAccessible = false;
    try {
      if (fs.existsSync(DATA_DIR)) {
        dataDirAccessible = true;
      }
    } catch (e) {}

    return NextResponse.json({
      system: {
        imageName: HYTALE_IMAGE_NAME,
        imageExists,
        sourceFilesPresent,
        dataDir: DATA_DIR,
        dataDirAccessible,
        platform: process.platform,
        uptime: process.uptime()
      }
    });
  } catch (error: any) {
    console.error('Error fetching system status:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
