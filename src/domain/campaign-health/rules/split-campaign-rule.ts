import { Campaign } from '../entities/campaign';
import { AccountHealth } from '../entities/account-health';
import { Recommendation } from '../entities/recommendation';

export const SplitCampaignRule = {
  matches(campaign: Campaign, health: AccountHealth, riskScore: number): boolean {
    const count = campaign.recipients?.length || 0;
    return count > 120 || (count > 50 && health.tier === 'critical') || riskScore >= 60;
  },

  generate(campaign: Campaign, health: AccountHealth): Recommendation {
    const count = campaign.recipients?.length || 0;
    const maxPerDay = health.tier === 'critical' ? 80 : health.tier === 'high_risk' ? 120 : 150;
    const days = Math.ceil(count / maxPerDay);

    return {
      id: 'split_campaign',
      title: `Dividir disparo em ${days} lotes diários`,
      description: `Recomendamos limitar a ${maxPerDay} mensagens por dia para proteger a reputação do número.`,
      severity: days > 2 ? 'critical' : 'warning',
      canAutoApply: true,
      actionType: 'split_batches',
      payload: { maxPerDay, days }
    };
  }
};
