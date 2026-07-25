import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/server-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { context, errorResponse } = await requireAuth(req, ['admin', 'finance']);
  if (errorResponse) return errorResponse;

  try {
    const db = getAdminDb();
    const snap = await db.collection('tenants').doc(context.tenantId).get();

    if (!snap.exists) {
      return NextResponse.json({ 
        dueDays: 3,
        asaasApiKeyConfigured: false,
        asaasWebhookTokenConfigured: false,
        asaasBaseUrl: 'https://api.asaas.com/v3'
      });
    }

    const data = snap.data()!;
    return NextResponse.json({
      dueDays: data.dueDays ?? 3,
      asaasBaseUrl: data.asaasBaseUrl || 'https://api.asaas.com/v3',
      asaasApiKeyConfigured: Boolean(data.asaasApiKey),
      asaasWebhookTokenConfigured: Boolean(data.asaasWebhookToken)
    });
  } catch (error: any) {
    console.error('[Finance API] Erro ao ler configurações financeiras:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar status financeiro' },
      { status: 500 }
    );
  }
}
