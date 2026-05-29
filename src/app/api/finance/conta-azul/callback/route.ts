import { NextResponse, NextRequest } from 'next/server';
import { exchangeCodeForToken } from '@/lib/conta-azul';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

function getBaseUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  
  if (forwardedHost && !forwardedHost.includes('0.0.0.0')) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  
  const host = request.headers.get('host');
  if (host && !host.includes('0.0.0.0')) {
    const proto = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    return `${proto}://${host}`;
  }

  return 'https://ibmanha.com.br';
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const baseUrl = getBaseUrl(request);

  if (error || !code) {
    console.error('[Conta Azul] OAuth callback recebeu erro:', error);
    return NextResponse.redirect(new URL('/dashboard?contaAzulError=true', baseUrl));
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

    return NextResponse.redirect(new URL('/dashboard?contaAzulConnected=true', baseUrl));
  } catch (err: any) {
    console.error('[Conta Azul] Erro ao processar callback OAuth:', err.message);
    return NextResponse.redirect(new URL('/dashboard?contaAzulError=true', baseUrl));
  }
}