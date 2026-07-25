import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/conta-azul';
import { requireAuth } from '@/lib/server-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { context, errorResponse } = await requireAuth(req, ['admin', 'finance']);
  if (errorResponse) return errorResponse;

  try {
    const csrfState = `ca_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const authUrl = await getAuthorizationUrl(csrfState);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set('ca_oauth_state', csrfState, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10 // 10 minutes
    });

    return response;
  } catch (error: any) {
    console.error('[Conta Azul] Erro ao gerar URL de autorização:', error);
    return NextResponse.json(
      { error: 'Erro ao iniciar autenticação Conta Azul.' },
      { status: 500 }
    );
  }
}
