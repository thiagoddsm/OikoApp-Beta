import { Campaign } from '../entities/campaign';
import { AccountHealth } from '../entities/account-health';
import { Recommendation } from '../entities/recommendation';

export const NoLinksRule = {
  matches(campaign: Campaign, health: AccountHealth, riskScore: number): boolean {
    const recipients = campaign.recipients || [];
    const newChats = recipients.filter(r => r.isNewChat).length;
    const newChatsRatio = recipients.length > 0 ? newChats / recipients.length : 0;
    
    return campaign.hasLinks && newChatsRatio > 0.4;
  },

  generate(campaign: Campaign, health: AccountHealth): Recommendation {
    return {
      id: 'remove_links',
      title: 'Evitar links diretos para contatos novos',
      description: 'Mensagens com links enviadas para pessoas que nunca conversaram com a igreja aumentam o risco de marcação de spam.',
      severity: 'warning',
      canAutoApply: false,
      actionType: 'remove_links'
    };
  }
};
