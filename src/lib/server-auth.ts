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

    let tenantId = (decodedToken.tenantId || decodedToken.tenant) as string | undefined;
    let roles: string[] = (decodedToken.roles || (decodedToken.role ? [decodedToken.role] : [])) as string[];
    let isSuperAdmin = Boolean(decodedToken.superadmin || roles.includes('superadmin'));

    // Server-side Fallback: Resolve tenant & roles from Firestore user document if missing from claims
    if (!tenantId || roles.length === 0) {
      try {
        const { getAdminDb } = await import('@/lib/firebase-admin');
        const userSnap = await getAdminDb().collection('users').doc(userId).get();
        if (userSnap.exists) {
          const userData = userSnap.data();
          tenantId = tenantId || userData?.tenantId;
          const userRole = userData?.hierarchy?.role || userData?.role;
          if (userRole && !roles.includes(userRole)) {
            roles.push(userRole);
          }
          if (userData?.isSuperAdmin) isSuperAdmin = true;
        }
      } catch (dbErr) {
        console.warn(`[AuthGuard:${requestId}] Falha ao buscar perfil do usuário no Firestore:`, dbErr);
      }
    }

    if (!tenantId) {
      tenantId = await resolveTenantFromHost(req);
    }

    if (roles.length === 0) {
      roles = ['user'];
    }

    // Check Role authorization if restricted
    if (allowedRoles && allowedRoles.length > 0 && !isSuperAdmin) {
      const hasRole = allowedRoles.some(r => roles.includes(r) || roles.includes('admin') || roles.includes('pastor_senior'));
      if (!hasRole) {
        return {
          context: null,
          errorResponse: NextResponse.json(
            { error: 'Acesso proibido. Permissões insuficientes para esta operação.', requestId },
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

/**
 * Resolve o ID do Tenant a partir do Host / Domínio da requisição HTTP (Multi-tenant por Host)
 */
export async function resolveTenantFromHost(req: NextRequest | Request): Promise<string> {
  try {
    const host = req.headers.get('host') || req.headers.get('x-forwarded-host') || '';
    const cleanHost = host.split(':')[0]?.toLowerCase().trim();

    if (cleanHost && cleanHost !== 'localhost' && cleanHost !== '127.0.0.1') {
      const { getAdminDb } = await import('@/lib/firebase-admin');
      const db = getAdminDb();

      // 1. Busca por customDomain exato (ex: ibmanha.com.br)
      const snap = await db.collection('tenants')
        .where('customDomain', '==', cleanHost)
        .limit(1)
        .get();

      if (!snap.empty) {
        return snap.docs[0].id;
      }

      // 2. Busca por subdomínio (ex: ibmanha.oiko.app -> subdomain 'ibmanha')
      const sub = cleanHost.split('.')[0];
      if (sub) {
        const subSnap = await db.collection('tenants')
          .where('subdomain', '==', sub)
          .limit(1)
          .get();
        if (!subSnap.empty) {
          return subSnap.docs[0].id;
        }
      }
    }
  } catch (e) {
    console.warn('[TenantResolver] Erro ao resolver tenant via host:', e);
  }

  return 'w3m93SHQeBRhiDnt7208'; // Default Fallback Tenant ID da Igreja Principal (IBM)
}

/**
 * Autenticação opcional para APIs públicas (como inscrições públicas de cursos/eventos).
 * Se o visitante não estiver logado, resolve o tenant pelo Host/Domínio sem bloquear.
 */
export async function optionalAuth(req: NextRequest | Request): Promise<{ context: AuthContext; tenantId: string }> {
  const requestId = req.headers.get('x-request-id') || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const authHeader = req.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1]?.trim();
    if (token) {
      try {
        const adminAuth = getAdminAuth();
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userId = decodedToken.uid;
        let tenantId = (decodedToken.tenantId || decodedToken.tenant) as string | undefined;

        if (!tenantId) {
          const { getAdminDb } = await import('@/lib/firebase-admin');
          const userSnap = await getAdminDb().collection('users').doc(userId).get();
          if (userSnap.exists) {
            tenantId = userSnap.data()?.tenantId;
          }
        }

        const resolvedTenant = tenantId || (await resolveTenantFromHost(req));

        return {
          context: {
            userId,
            tenantId: resolvedTenant,
            roles: (decodedToken.roles || (decodedToken.role ? [decodedToken.role] : ['user'])) as string[],
            requestId,
            isSuperAdmin: Boolean(decodedToken.superadmin)
          },
          tenantId: resolvedTenant
        };
      } catch (e) {
        // Token inválido, prossegue como visitante público
      }
    }
  }

  const resolvedTenant = await resolveTenantFromHost(req);
  return {
    context: {
      userId: `guest_${Date.now()}`,
      tenantId: resolvedTenant,
      roles: ['guest'],
      requestId,
      isSuperAdmin: false
    },
    tenantId: resolvedTenant
  };
}
