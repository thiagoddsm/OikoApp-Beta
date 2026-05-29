import { NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/conta-azul';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const authUrl = getAuthorizationUrl();
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('[Conta Azul] Erro ao gerar URL de autorização:', error.message);
    return NextResponse.json(
      { error: `Erro ao iniciar autenticação: ${error.message}` },
      { status: 500 }
    );
  }
}
