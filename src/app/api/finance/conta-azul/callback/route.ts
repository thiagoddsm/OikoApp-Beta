import { NextResponse, NextRequest } from 'next/server';
import { exchangeCodeForToken } from '@/lib/conta-azul';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    console.error('[Conta Azul] OAuth callback recebeu erro:', error);
    return NextResponse.redirect(new URL('/dashboard?contaAzulError=true', request.url));
  }

  try {
    const token = await exchangeCodeForToken(code);

    const db = getAdminDb();
    await db.collection('integrations').doc('contaAzul').set({
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: Timestamp.fromMillis(token.expiresAt),
      connectedAt: Timestamp.now(),
      status: 'CONNECTED',
    });

    return NextResponse.redirect(new URL('/dashboard?contaAzulConnected=true', request.url));
  } catch (err: any) {
    console.error('[Conta Azul] Erro ao processar callback OAuth:', err.message);
    return NextResponse.redirect(new URL('/dashboard?contaAzulError=true', request.url));
  }
}