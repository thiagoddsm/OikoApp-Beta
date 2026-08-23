'use server';

import { getAdminDb } from '@/lib/firebase-admin';

import { 
  DEFAULT_AV_WEBHOOK_URL, 
  formatDateToBr,
  buildAvPayloadFromPlan,
  type AvWebhookItem, 
  type AvWebhookPayload 
} from '@/types/worship-av';

export { buildAvPayloadFromPlan };

/**
 * Dispara o Webhook da Central AV com a Ordem de Culto / Liturgia.
 * Aceita tanto o payload puro (AvWebhookPayload) quanto o plano completo do Firestore.
 */
export async function transmitWorshipPlanToAv(payloadOrPlan: any, customWebhookUrl?: string) {
  try {
    const config = await getAvWebhookConfig();
    const targetUrl = (customWebhookUrl || config.webhookUrl || DEFAULT_AV_WEBHOOK_URL).trim();

    // Se já vier como AvWebhookPayload puro (sem Timestamps)
    const payload: AvWebhookPayload = (payloadOrPlan && payloadOrPlan.planoTitulo && Array.isArray(payloadOrPlan.items))
      ? payloadOrPlan
      : buildAvPayloadFromPlan(payloadOrPlan);

    console.log(`[Central AV Webhook] Enviando payload para: ${targetUrl}`);
    console.log(`[Central AV Webhook] Culto: "${payload.planoTitulo}" | Total Itens: ${payload.items.length}`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Oiko-SaaS/1.0'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let responseData: any = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      throw new Error(responseData?.error || responseData?.mensagem || `Erro HTTP ${response.status}: ${responseText.slice(0, 100)}`);
    }

    return {
      success: true,
      message: responseData?.mensagem || `Ordem de Culto transmitida com sucesso para a Central AV!`,
      totalItems: payload.items.length,
      data: responseData
    };
  } catch (error: any) {
    console.error('[Central AV Webhook Error]:', error);
    return {
      success: false,
      error: error?.message || 'Falha ao conectar com a Central de Integração AV. Verifique a URL do Webhook.'
    };
  }
}

/**
 * Testa o endpoint do Webhook da Central AV com um ping de verificação.
 */
export async function testAvWebhookConnection(customUrl?: string) {
  try {
    const config = await getAvWebhookConfig();
    const targetUrl = (customUrl || config.webhookUrl || DEFAULT_AV_WEBHOOK_URL).trim();

    const testPayload: AvWebhookPayload = {
      id: 'teste_conexao_oiko',
      planoTitulo: 'Teste de Comunicação Oiko SaaS ➔ Central AV',
      data: formatDateToBr(new Date().toISOString().split('T')[0]),
      startTime: new Date().toTimeString().slice(0, 5),
      items: [
        {
          id: 'teste_item_1',
          title: 'Teste de Ping do Sistema',
          type: 'item',
          durationSeconds: 60,
          notes: 'Validação de comunicação Webhook',
          scene: 'S1'
        },
        {
          id: 'teste_song_2',
          title: 'Música de Teste (BPM Sync)',
          type: 'song',
          bpm: 120,
          key: 'G',
          durationSeconds: 180,
          artist: 'Oiko AV Bot',
          scene: 'G1'
        }
      ]
    };

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Oiko-SaaS/1.0'
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    let responseData: any = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      throw new Error(responseData?.error || responseData?.mensagem || `Erro HTTP ${response.status}`);
    }

    return {
      success: true,
      message: responseData?.mensagem || 'Comunicação com a Central AV estabelecida com sucesso!',
      response: responseData
    };
  } catch (error: any) {
    console.error('[Central AV Test Error]:', error);
    return {
      success: false,
      error: error?.message || 'Falha ao comunicar com o Webhook da Central AV.'
    };
  }
}
