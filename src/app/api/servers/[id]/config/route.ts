import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const configPath = path.join(process.cwd(), 'data', 'instances', id, 'server.properties');
    
    if (!existsSync(configPath)) {
       return NextResponse.json({ config: '' });
    }
    
    const config = await fs.readFile(configPath, 'utf-8');
    return NextResponse.json({ config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { config } = await req.json();
    const configPath = path.join(process.cwd(), 'data', 'instances', id, 'server.properties');
    
    await fs.writeFile(configPath, config);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
