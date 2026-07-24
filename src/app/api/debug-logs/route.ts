import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/server-auth';

export async function GET(req: NextRequest) {
  const { context, errorResponse } = await requireAuth(req, ['admin', 'superadmin']);
  if (errorResponse) return errorResponse;

  try {
    const db = getAdminDb();
    const snapshot = await db.collection('gc_bot_debug')
      .where('tenantId', '==', context.tenantId)
      .limit(10)
      .get();

    const logs: any[] = [];
    snapshot.forEach(doc => {
      logs.push(doc.data());
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao carregar logs de debug.' }, { status: 500 });
  }
}
