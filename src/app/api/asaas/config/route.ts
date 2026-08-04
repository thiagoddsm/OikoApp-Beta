import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { encrypt } from '@/lib/encryption';
import { AuthorizationService } from '@/services/AuthorizationService';
import { AuditService } from '@/services/AuditService';
import { requireAuth } from '@/lib/server-auth';

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    const { apiKey, webhookToken, asaasEnv } = await req.json();

    const db = getAdminDb();
    const updateData: any = {
      asaasEnv: asaasEnv || 'sandbox',
      updatedAt: new Date()
    };

    if (apiKey && !apiKey.includes('***') && !apiKey.includes('•')) {
      updateData.asaasApiKey = encrypt(apiKey);
    }
    
    if (webhookToken && !webhookToken.includes('***')) {
      updateData.asaasWebhookToken = encrypt(webhookToken);
    }

    // 1. Salvar no Tenant se houver tenantId
    const tenantId = authResult.context?.tenantId;
    if (tenantId) {
      try {
        await db.collection('tenants').doc(tenantId).set(updateData, { merge: true });
      } catch (tErr) {
        console.warn('[AsaasConfig API] Erro ao atualizar tenant:', tErr);
      }
    }

    // 2. Salvar redundância em system_settings/finance (fallback universal)
    try {
      const globalData: any = {
        asaasBaseUrl: asaasEnv === 'sandbox' ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3',
        updatedAt: new Date()
      };
      if (apiKey && !apiKey.includes('***') && !apiKey.includes('•')) {
        globalData.asaasApiKey = encrypt(apiKey);
      }
      if (webhookToken && !webhookToken.includes('***')) {
        globalData.asaasWebhookToken = encrypt(webhookToken);
      }
      await db.collection('system_settings').doc('finance').set(globalData, { merge: true });
    } catch (gErr) {
      console.warn('[AsaasConfig API] Erro ao atualizar system_settings:', gErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[AsaasConfig API]', error);
    return NextResponse.json({ error: 'Erro interno ao salvar configurações' }, { status: 500 });
  }
}
