import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection('system_settings').doc('finance').get();

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
      asaasApiKeyConfigured: !!data.asaasApiKey,
      // Retorna uma versão mascarada se configurada para exibir na UI
      asaasApiKeyMasked: data.asaasApiKey ? `${data.asaasApiKey.substring(0, 12)}...` : '',
      asaasWebhookTokenConfigured: !!data.asaasWebhookToken,
      asaasWebhookToken: data.asaasWebhookToken || 'ibm_webhook_secret_2025'
    });
  } catch (error: any) {
    console.error('[Finance API] Erro ao ler configurações financeiras:', error.message);
    return NextResponse.json(
      { error: `Erro interno: ${error.message}` },
      { status: 500 }
    );
  }
}
