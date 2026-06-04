import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection('integrations').doc('contaAzul').get();

    if (!snap.exists) {
      return NextResponse.json({ connected: false });
    }

    const data = snap.data()!;
    return NextResponse.json({
      connected: data.status === 'CONNECTED',
      connectedAt: data.connectedAt?.toDate?.()?.toISOString() ?? null,
      lastSyncAt: data.lastSyncAt?.toDate?.()?.toISOString() ?? null,
      status: data.status ?? null,
    });
  } catch (error: any) {
    console.error('[Conta Azul] Erro ao ler status da integração:', error.message);
    return NextResponse.json(
      { error: `Erro interno: ${error.message}` },
      { status: 500 }
    );
  }
}
