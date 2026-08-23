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
 * Sincroniza a ordem de culto no singleton público para o painel técnico.
 */
export async function syncLiveWorshipOrder(data: {
  items: any[];
  cultInfo: any;
  liveState: any;
}) {
  try {
    const db = getAdminDb();
    const docRef = db.doc('artifacts/gestao-de-culto/public/data/worship-order/singleton');
    await docRef.set(data, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error('Error syncing live worship order:', error);
    return { success: false, error: error?.message || String(error) };
  }
}

/**
 * Busca a URL configurada para a Central de Integração AV.
 */
export async function getAvWebhookConfig(): Promise<{ webhookUrl: string; enabled: boolean }> {
  try {
    const db = getAdminDb();
    const docSnap = await db.collection('config').doc('integrations_av').get();
    if (docSnap.exists) {
      const data = docSnap.data();
      return {
        webhookUrl: data?.webhookUrl || DEFAULT_AV_WEBHOOK_URL,
        enabled: data?.enabled !== false
      };
    }
  } catch (err) {
    console.warn('Erro ao ler config/integrations_av, usando padrão:', err);
  }
  return {
    webhookUrl: DEFAULT_AV_WEBHOOK_URL,
    enabled: true
  };
}

/**
 * Salva a URL customizada da Central de Integração AV no Firestore.
 */
export async function saveAvWebhookConfig(webhookUrl: string, enabled = true) {
  try {
    const db = getAdminDb();
    await db.collection('config').doc('integrations_av').set({
      webhookUrl: webhookUrl.trim() || DEFAULT_AV_WEBHOOK_URL,
      enabled,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao salvar config AV:', error);
    return { success: false, error: error?.message || 'Erro ao salvar configuração.' };
  }
}

/**
 * Transmite a Ordem de Culto para a Central AV local via dois canais:
 * 1. PRIMÁRIO: Escreve no Firestore (worship-order/singleton) — o Integrador local
 *    escuta este doc via onSnapshot e recebe instantaneamente.
 * 2. SECUNDÁRIO: Chama o endpoint HTTP do Integrador local (se configurado).
 */
export async function transmitWorshipPlanToAv(payloadOrPlan: any, customWebhookUrl?: string) {
  // Normaliza o payload (sem Timestamps do Firestore)
  const payload: AvWebhookPayload = (payloadOrPlan && payloadOrPlan.planoTitulo && Array.isArray(payloadOrPlan.items))
    ? payloadOrPlan
    : buildAvPayloadFromPlan(payloadOrPlan);

  console.log(`[Central AV] Transmitindo: "${payload.planoTitulo}" | ${payload.items.length} itens`);

  // ── CANAL 1: Firestore (ponte direta para o Integrador local via onSnapshot) ──
  let firestoreOk = false;
  try {
    const db = getAdminDb();
    const docRef = db.doc('artifacts/gestao-de-culto/public/data/worship-order/singleton');

    // Limpa undefined/null recursivamente (Firestore rejeita undefined)
    const cleanForFirestore = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(cleanForFirestore);
      if (obj && typeof obj === 'object') {
        const out: Record<string, any> = {};
        for (const k of Object.keys(obj)) {
          if (obj[k] !== undefined && obj[k] !== null) out[k] = cleanForFirestore(obj[k]);
        }
        return out;
      }
      return obj;
    };

    const firestorePayload = cleanForFirestore({
      id: payload.id,
      planoTitulo: payload.planoTitulo,
      cultoId: payload.id,
      data: payload.data,
      startTime: payload.startTime,
      indexAtual: 0,
      itemAtual: payload.items[0] || null,
      items: payload.items,
      cultInfo: {
        title: payload.planoTitulo,
        date: payload.data,
        startTime: payload.startTime,
      },
      liveState: { currentItemIndex: 0 },
      updatedAt: new Date().toISOString(),
      sentByOiko: true,
    });

    await docRef.set(firestorePayload, { merge: false });
    firestoreOk = true;
    console.log(`[Central AV] ✅ Escrito no Firestore worship-order/singleton`);
  } catch (err: any) {
    console.warn('[Central AV] ⚠️ Falha ao escrever no Firestore:', err.message);
  }

  // ── CANAL 2: HTTP Webhook (fallback/complementar) ──
  let webhookOk = false;
  let webhookMsg = '';
  try {
    const config = await getAvWebhookConfig();
    const targetUrl = (customWebhookUrl || config.webhookUrl || DEFAULT_AV_WEBHOOK_URL).trim();

    // Só tenta o webhook HTTP se a URL for diferente da URL hosted (que não alcança o local)
    // A URL hosted.app retorna sucesso mas não envia para o Integrador local —
    // por isso priorizamos o Firestore acima.
    console.log(`[Central AV] Tentando webhook HTTP: ${targetUrl}`);
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Oiko-SaaS/1.0' },
      body: JSON.stringify(payload),
      // Timeout curto — se o integrador local não estiver acessível, não trava
      signal: AbortSignal.timeout(5000),
    });

    const responseText = await response.text();
    let responseData: any = {};
    try { responseData = JSON.parse(responseText); } catch { responseData = { raw: responseText }; }

    if (response.ok) {
      webhookOk = true;
      webhookMsg = responseData?.mensagem || 'Webhook OK';
      console.log(`[Central AV] ✅ Webhook HTTP respondeu: ${webhookMsg}`);
    } else {
      console.warn(`[Central AV] ⚠️ Webhook HTTP respondeu com erro ${response.status}`);
    }
  } catch (err: any) {
    console.warn('[Central AV] ⚠️ Webhook HTTP inacessível:', err.message);
  }

  if (!firestoreOk && !webhookOk) {
    return {
      success: false,
      error: 'Não foi possível alcançar a Central AV por nenhum canal (Firestore ou HTTP). Verifique a conexão.'
    };
  }

  return {
    success: true,
    message: firestoreOk
      ? `Culto "${payload.planoTitulo}" enviado para o Integrador via Firestore${webhookOk ? ' + Webhook HTTP' : ''}!`
      : `Culto "${payload.planoTitulo}" enviado via Webhook HTTP!`,
    totalItems: payload.items.length,
    channels: { firestore: firestoreOk, webhook: webhookOk },
  };
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
