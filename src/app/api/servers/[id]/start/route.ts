import { NextRequest, NextResponse } from 'next/server';
import { serverManager } from '@/lib/server/manager';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const instance = await serverManager.startServer(id);
    return NextResponse.json(instance);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
