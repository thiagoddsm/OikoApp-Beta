import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/server-auth';

export async function GET(req: NextRequest) {
  const { context, errorResponse } = await requireAuth(req, ['admin', 'superadmin']);
  if (errorResponse) return errorResponse;

  try {
    const db = getAdminDb();
    const snap = await db.collection('gc_bot_debug')
      .where('tenantId', '==', context.tenantId)
      .limit(10)
      .get();

    const data = snap.docs.map(d => d.data());
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar logs de debug.' }, { status: 500 });
  }
}
