import { NextResponse } from 'next/server';
import { triggerBackgroundQueueWorker, getQueueStatus } from '@/lib/gc-dispatch-queue';

export const runtime = 'nodejs';

export async function GET() {
  const status = await getQueueStatus();
  return NextResponse.json(status);
}

export async function POST() {
  triggerBackgroundQueueWorker();
  const status = await getQueueStatus();
  return NextResponse.json({
    success: true,
    message: 'Worker de fila de disparos de GC acionado em segundo plano.',
    status
  });
}
