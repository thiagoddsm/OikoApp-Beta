import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { encrypt } from '@/lib/encryption';
import { AuthorizationService } from '@/services/AuthorizationService';
import { AuditService } from '@/services/AuditService';

export async function POST(req: NextRequest) {
  try {
    const { tenantId, userId, apiKey, webhookToken, asaasEnv } = await req.json();

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'Faltam parâmetros obrigatórios' }, { status: 400 });
    }

    // 1. Autorização: Verifica se o usuário pode gerenciar finanças deste tenant
    const canManage = await AuthorizationService.canManageFinance(userId, tenantId);
    if (!canManage) {
      return NextResponse.json({ error: 'Acesso não autorizado para gerenciar finanças deste Tenant' }, { status: 403 });
    }

    const db = getAdminDb();
    const updateData: any = {
      asaasEnv: asaasEnv || 'sandbox',
      updatedAt: new Date()
    };

    // 2. Criptografia BYOK
    if (apiKey && !apiKey.includes('***')) {
      updateData.asaasApiKey = encrypt(apiKey);
    }
    
    if (webhookToken && !webhookToken.includes('***')) {
      updateData.asaasWebhookToken = encrypt(webhookToken);
    }

    // 3. Salvar no Firestore
    await db.collection('tenants').doc(tenantId).update(updateData);

    // Auditoria
    await AuditService.log({ 
      tenantId, 
      userId, 
      action: 'UPDATE_ASAAS_CONFIG',
      resourceType: 'tenant',
      resourceId: tenantId,
      metadata: { asaasEnv }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[AsaasConfig API]', error);
    return NextResponse.json({ error: error.message || 'Erro interno ao salvar configurações' }, { status: 500 });
  }
}
