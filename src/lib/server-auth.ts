import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export type AuthContext = {
  userId: string;
  tenantId: string;
  roles: string[];
  requestId: string;
  isSuperAdmin: boolean;
};

export type RequireAuthResult = 
  | { context: AuthContext; errorResponse: null }
  | { context: null; errorResponse: NextResponse };

/**
 * Server-side authentication guard for Next.js API Route Handlers.
 * Extracts the Firebase ID Token from Authorization header, verifies signature,
 * derives tenantId & roles from verified server claims.
 */
export async function requireAuth(
  req: NextRequest | Request,
  allowedRoles?: string[]
): Promise<RequireAuthResult> {
  const requestId = req.headers.get('x-request-id') || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      context: null,
      errorResponse: NextResponse.json(
        { error: 'Não autenticado. Cabeçalho Authorization ausente ou inválido.', requestId },
        { status: 401 }
      )
    };
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return {
      context: null,
      errorResponse: NextResponse.json(
        { error: 'Token de autenticação não fornecido.', requestId },
        { status: 401 }
      )
    };
  }

  try {
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);

    const userId = decodedToken.uid;
    const tenantId = (decodedToken.tenantId || decodedToken.tenant || 'default') as string;
    const roles = (decodedToken.roles || (decodedToken.role ? [decodedToken.role] : ['user'])) as string[];
    const isSuperAdmin = Boolean(decodedToken.superadmin || roles.includes('superadmin'));

    // Check Role authorization if restricted
    if (allowedRoles && allowedRoles.length > 0 && !isSuperAdmin) {
      const hasRole = allowedRoles.some(r => roles.includes(r));
      if (!hasRole) {
        return {
          context: null,
          errorResponse: NextResponse.json(
            { error: 'Acesso proibido. Permissões insuficientes.', requestId },
            { status: 403 }
          )
        };
      }
    }

    const context: AuthContext = {
      userId,
      tenantId,
      roles,
      requestId,
      isSuperAdmin
    };

    return { context, errorResponse: null };
  } catch (error: any) {
    console.error(`[AuthGuard:${requestId}] Erro de verificação do ID Token:`, error?.message || error);
    return {
      context: null,
      errorResponse: NextResponse.json(
        { error: 'Token inválido ou expirado.', requestId },
        { status: 401 }
      )
    };
  }
}
