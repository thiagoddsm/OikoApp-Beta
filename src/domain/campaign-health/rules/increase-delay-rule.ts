import { Campaign } from '../entities/campaign';
import { AccountHealth } from '../entities/account-health';
import { Recommendation } from '../entities/recommendation';

export const IncreaseDelayRule = {
  matches(campaign: Campaign, health: AccountHealth, riskScore: number): boolean {
    const delayMin = campaign.requestedDelayMinSeconds || 15;
    return delayMin < 25 && (riskScore >= 50 || health.tier === 'critical' || health.tier === 'high_risk');
  },

  generate(campaign: Campaign, health: AccountHealth): Recommendation {
    const minSec = health.tier === 'critical' ? 35 : 25;
    const maxSec = health.tier === 'critical' ? 65 : 45;

    return {
      id: 'increase_delay',
      title: `Aumentar intervalo entre envios (${minSec}s - ${maxSec}s)`,
      description: 'Pausas mais espaçadas simulam digitação humana real e previnem sinalizações automatizadas.',
      severity: 'info',
      canAutoApply: true,
      actionType: 'increase_delays',
      payload: { minSec, maxSec }
    };
  }
};
