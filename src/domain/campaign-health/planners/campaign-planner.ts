import { Campaign } from '../entities/campaign';
import { AccountHealth } from '../entities/account-health';

export interface DailyBatch {
  dayIndex: number;
  dateLabel: string; // "Hoje (Sexta-feira)", "Amanhã (Sábado)", "Segunda-feira"
  formattedDate: string; // "31/07", "01/08"
  recipientCount: number;
  recipients: any[];
}

export interface CampaignSchedulePlan {
  totalRecipients: number;
  maxPerDay: number;
  totalDays: number;
  estimatedCompletionLabel: string; // "Segunda-feira às 16:20"
  batches: DailyBatch[];
  avgDelaySeconds: number;
}

export function planCampaignBatches(campaign: Campaign, health: AccountHealth): CampaignSchedulePlan {
  const recipients = campaign.recipients || [];
  const totalRecipients = recipients.length;

  const maxPerDay = health.tier === 'critical' ? 80 
    : health.tier === 'high_risk' ? 120 
    : health.tier === 'warning' ? 180 
    : 300;

  const totalDays = Math.max(1, Math.ceil(totalRecipients / maxPerDay));
  const avgDelaySeconds = health.tier === 'critical' ? 45 : 30;

  const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const now = new Date();
  const batches: DailyBatch[] = [];

  for (let d = 0; d < totalDays; d++) {
    const batchDate = new Date(now);
    batchDate.setDate(now.getDate() + d);

    const dayName = dayNames[batchDate.getDay()];
    let dateLabel = `${dayName} (${String(batchDate.getDate()).padStart(2, '0')}/${String(batchDate.getMonth() + 1).padStart(2, '0')})`;
    
    if (d === 0) dateLabel = `Hoje (${dayName})`;
    else if (d === 1) dateLabel = `Amanhã (${dayName})`;

    const startIndex = d * maxPerDay;
    const batchRecipients = recipients.slice(startIndex, startIndex + maxPerDay);

    batches.push({
      dayIndex: d + 1,
      dateLabel,
      formattedDate: `${String(batchDate.getDate()).padStart(2, '0')}/${String(batchDate.getMonth() + 1).padStart(2, '0')}`,
      recipientCount: batchRecipients.length,
      recipients: batchRecipients
    });
  }

  // Previsão de Término
  const lastBatch = batches[batches.length - 1];
  const lastBatchDurationMinutes = Math.round((lastBatch.recipientCount * avgDelaySeconds) / 60);
  const completionDate = new Date(now);
  completionDate.setDate(now.getDate() + (totalDays - 1));
  completionDate.setMinutes(completionDate.getMinutes() + lastBatchDurationMinutes);

  const compDayName = dayNames[completionDate.getDay()];
  const compHours = String(completionDate.getHours()).padStart(2, '0');
  const compMins = String(completionDate.getMinutes()).padStart(2, '0');
  const estimatedCompletionLabel = `${compDayName} às ${compHours}:${compMins}`;

  return {
    totalRecipients,
    maxPerDay,
    totalDays,
    estimatedCompletionLabel,
    batches,
    avgDelaySeconds
  };
}
