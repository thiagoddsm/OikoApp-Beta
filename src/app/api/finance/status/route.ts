import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/server-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req, ['admin', 'finance']);
    const db = getAdminDb();
    let tenantId = authResult.context?.tenantId;

    if (tenantId) {
      const snap = await db.collection('tenants').doc(tenantId).get();
      if (snap.exists) {
        const data = snap.data()!;
        return NextResponse.json({
          dueDays: data.dueDays ?? 3,
          asaasBaseUrl: data.asaasBaseUrl || 'https://api.asaas.com/v3',
          asaasApiKeyConfigured: Boolean(data.asaasApiKey),
          asaasWebhookTokenConfigured: Boolean(data.asaasWebhookToken)
        });
      }
    }

    // Fallback: consulta system_settings/finance
    const globalSnap = await db.collection('system_settings').doc('finance').get();
    if (globalSnap.exists) {
      const gData = globalSnap.data()!;
      return NextResponse.json({
        dueDays: gData.dueDays ?? 3,
        asaasBaseUrl: gData.asaasBaseUrl || 'https://api.asaas.com/v3',
        asaasApiKeyConfigured: Boolean(gData.asaasApiKey || process.env.ASAAS_API_KEY),
        asaasWebhookTokenConfigured: Boolean(gData.asaasWebhookToken)
      });
    }

    return NextResponse.json({ 
      dueDays: 3,
      asaasApiKeyConfigured: Boolean(process.env.ASAAS_API_KEY),
      asaasWebhookTokenConfigured: false,
      asaasBaseUrl: process.env.ASAAS_BASE_URL || 'https://api.asaas.com/v3'
    });
  } catch (error: any) {
    console.error('[Finance API] Erro ao ler configurações financeiras:', error);
    return NextResponse.json({ 
      dueDays: 3,
      asaasApiKeyConfigured: false,
      asaasWebhookTokenConfigured: false,
      asaasBaseUrl: 'https://api.asaas.com/v3'
    });
  }
}
