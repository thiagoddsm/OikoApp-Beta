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
