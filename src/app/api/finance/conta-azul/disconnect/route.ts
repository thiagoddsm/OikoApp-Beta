import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const db = getAdminDb();
    await db.collection('integrations').doc('contaAzul').delete();

    return NextResponse.json({ disconnected: true });
  } catch (error: any) {
    console.error('[Conta Azul] Erro ao desconectar integração:', error.message);
    return NextResponse.json(
      { error: `Erro ao desconectar: ${error.message}` },
      { status: 500 }
    );
  }
}
