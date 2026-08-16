'use server';

import { getAdminDb } from '@/lib/firebase-admin';

export const DEFAULT_AV_WEBHOOK_URL = 'https://integrador-church--studio-4506386725-ea297.us-east4.hosted.app/api/oiko/webhook';

export type AvWebhookItem = {
  id: string;
  title: string;
  type: 'song' | 'item';
  durationSeconds: number;
  notes?: string;
  bpm?: number;
  key?: string;
  artist?: string;
  scene?: string;
};

export type AvWebhookPayload = {
  id: string;
  planoTitulo: string;
  data: string; // Formato DD/MM/YYYY
  startTime: string; // Formato HH:mm
  items: AvWebhookItem[];
};

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
 * Helper para formatar data YYYY-MM-DD para DD/MM/YYYY
 */
function formatDateToBr(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

/**
 * Formata um plano de culto do Oiko para o payload do Webhook da Central AV.
 */
export async function buildAvPayloadFromPlan(plan: any): Promise<AvWebhookPayload> {
  const formattedDate = formatDateToBr(plan.date || '');
  const startTime = plan.startTime || '19:00';
  
  // Limpar id para garantir formato limpo
  const cleanPlanId = plan.id || `culto_${(plan.date || '').replace(/-/g, '_')}`;

  const items: AvWebhookItem[] = (plan.items || [])
    .filter((item: any) => item.type !== 'header')
    .map((item: any, index: number) => {
      const isSong = item.type === 'song';
      const durationSeconds = item.durationSeconds && item.durationSeconds > 0 
        ? item.durationSeconds 
        : 300;

      const itemPayload: AvWebhookItem = {
        id: item.id || `item_${index + 1}`,
        title: item.title || (isSong ? 'Música' : 'Item do Culto'),
        type: isSong ? 'song' : 'item',
        durationSeconds,
      };

      // Notas / observações
      const noteText = item.notes || item.departmentNotes?.general || '';
      if (noteText) {
        itemPayload.notes = noteText;
      }

      // Cena Lumikit / DMX (ex: S1, G1, A1, F12, M2)
      const sceneVal = item.scene || item.departmentNotes?.lighting || '';
      if (sceneVal) {
        itemPayload.scene = sceneVal.trim();
      }

      // Campos exclusivos de música
      if (isSong) {
        if (item.bpm) {
          itemPayload.bpm = Number(item.bpm);
        }
        if (item.key) {
          itemPayload.key = String(item.key).trim();
        }
        const artist = item.artist || item.arrangement || '';
        if (artist) {
          itemPayload.artist = artist.trim();
        }
      }

      return itemPayload;
    });

  return {
    id: cleanPlanId,
    planoTitulo: plan.title || 'Ordem de Culto',
    data: formattedDate,
    startTime,
    items
  };
}

/**
 * Dispara o Webhook da Central AV com a Ordem de Culto / Liturgia.
 */
export async function transmitWorshipPlanToAv(plan: any, customWebhookUrl?: string) {
  try {
    const config = await getAvWebhookConfig();
    const targetUrl = (customWebhookUrl || config.webhookUrl || DEFAULT_AV_WEBHOOK_URL).trim();

    const payload = await buildAvPayloadFromPlan(plan);

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
