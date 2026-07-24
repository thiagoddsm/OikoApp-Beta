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
      .limit(20)
      .get();

    const logs = snap.docs.map(d => ({ 
      id: d.id, 
      ...d.data(), 
      receivedAt: d.data().receivedAt?.toDate ? d.data().receivedAt.toDate() : d.data().receivedAt 
    }));
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao carregar logs.' }, { status: 500 });
  }
}
