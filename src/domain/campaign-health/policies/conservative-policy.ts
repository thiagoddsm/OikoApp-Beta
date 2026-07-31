import { CampaignPolicy } from './campaign-policy';

export const ConservativePolicy: CampaignPolicy = {
  mode: 'conservative',
  name: 'Modo Conservador',
  description: 'Recomendado para contas em recuperação ou com histórico de restrições. Pausas ampliadas e lotes reduzidos.',
  delayMinSeconds: 30,
  delayMaxSeconds: 65,
  microPauseFrequency: 10,
  microPauseMinSeconds: 45,
  microPauseMaxSeconds: 90,
  deepSleepFrequency: 30,
  deepSleepMinSeconds: 300,
  deepSleepMaxSeconds: 600,
  dailyRecipientCap: 100,
  minRecommendedVersions: 3,
};

export const NormalPolicy: CampaignPolicy = {
  mode: 'normal',
  name: 'Modo Normal',
  description: 'Para contas com reputação Boa ou Excelente. Delays padrão e bom ritmo de entrega.',
  delayMinSeconds: 15,
  delayMaxSeconds: 35,
  microPauseFrequency: 15,
  microPauseMinSeconds: 30,
  microPauseMaxSeconds: 60,
  deepSleepFrequency: 50,
  deepSleepMinSeconds: 180,
  deepSleepMaxSeconds: 300,
  dailyRecipientCap: 300,
  minRecommendedVersions: 1,
};
