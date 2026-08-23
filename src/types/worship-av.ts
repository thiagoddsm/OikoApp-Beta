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

export function formatDateToBr(dateStr: string): string {
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
 * Formata um plano de culto do Oiko para o payload do Webhook da Central AV (puro, seguro para cliente e servidor).
 */
export function buildAvPayloadFromPlan(plan: any): AvWebhookPayload {
  const formattedDate = formatDateToBr(plan?.date || '');
  const startTime = plan?.startTime || '19:00';
  
  const cleanPlanId = plan?.id || `culto_${(plan?.date || '').replace(/-/g, '_')}`;

  const items: AvWebhookItem[] = (plan?.items || [])
    .filter((item: any) => item?.type !== 'header')
    .map((item: any, index: number) => {
      const isSong = item?.type === 'song';
      const durationSeconds = item?.durationSeconds && item.durationSeconds > 0 
        ? item.durationSeconds 
        : 300;

      const itemPayload: AvWebhookItem = {
        id: item?.id || `item_${index + 1}`,
        title: item?.title || (isSong ? 'Música' : 'Item do Culto'),
        type: isSong ? 'song' : 'item',
        durationSeconds,
      };

      const noteText = item?.notes || item?.departmentNotes?.general || '';
      if (noteText) {
        itemPayload.notes = String(noteText);
      }

      const sceneVal = item?.scene || item?.departmentNotes?.lighting || '';
      if (sceneVal) {
        itemPayload.scene = String(sceneVal).trim();
      }

      if (isSong) {
        if (item?.bpm) {
          itemPayload.bpm = Number(item.bpm);
        }
        if (item?.key) {
          itemPayload.key = String(item.key).trim();
        }
        const artist = item?.artist || item?.arrangement || '';
        if (artist) {
          itemPayload.artist = String(artist).trim();
        }
      }

      return itemPayload;
    });

  return {
    id: String(cleanPlanId),
    planoTitulo: String(plan?.title || 'Ordem de Culto'),
    data: formattedDate,
    startTime,
    items
  };
}
