import { NextResponse } from 'next/server';
import docker, { DATA_DIR } from '@/lib/docker';
import fs from 'fs';
import path from 'path';

// GET list files
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const targetPath = searchParams.get('path') || '';
    
    const container = docker.getContainer(id);
    const containerInfo = await container.inspect();
    const serverName = containerInfo.Name.replace('/hytale-', '');
    
    const dirPath = path.join(DATA_DIR, serverName, targetPath);
    
    if (!fs.existsSync(dirPath)) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
    }
    
    const rawFiles = fs.readdirSync(dirPath);
    const files = rawFiles.map(file => {
      const fullPath = path.join(dirPath, file);
      try {
        const stats = fs.statSync(fullPath);
        return {
          name: file,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          mtime: stats.mtime
        };
      } catch (e) {
        return null; // Skip if no stats available
      }
    }).filter(Boolean);
    
    return NextResponse.json({ files });
  } catch (error: any) {
    console.error('Error reading files:', error);
    return NextResponse.json({ error: 'Failed to read files', details: error.message }, { status: 500 });
  }
}

// POST upload file
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const targetPath = searchParams.get('path') || '';
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const container = docker.getContainer(id);
    const containerInfo = await container.inspect();
    const serverName = containerInfo.Name.replace('/hytale-', '');
    
    const targetDir = path.join(DATA_DIR, serverName, targetPath);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const finalPath = path.join(targetDir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(finalPath, buffer);
    
    return NextResponse.json({ message: 'File uploaded successfully', path: finalPath });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file', details: error.message }, { status: 500 });
  }
}

// DELETE file
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const targetPath = searchParams.get('path');
    
    if (!targetPath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    const container = docker.getContainer(id);
    const containerInfo = await container.inspect();
    const serverName = containerInfo.Name.replace('/hytale-', '');
    
    const fullPath = path.join(DATA_DIR, serverName, targetPath);
    
    if (!fullPath.startsWith(DATA_DIR)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
      return NextResponse.json({ message: 'File/Directory deleted' });
    } else {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file', details: error.message }, { status: 500 });
  }
}
