export type PolicyMode = 'normal' | 'conservative' | 'custom';

export interface CampaignPolicy {
  mode: PolicyMode;
  name: string;
  description: string;
  delayMinSeconds: number;
  delayMaxSeconds: number;
  microPauseFrequency: number; // ex: a cada 10 msgs
  microPauseMinSeconds: number;
  microPauseMaxSeconds: number;
  deepSleepFrequency: number;  // ex: a cada 30 msgs
  deepSleepMinSeconds: number;
  deepSleepMaxSeconds: number;
  dailyRecipientCap: number;   // ex: 100 msgs/dia
  minRecommendedVersions: number;
}
