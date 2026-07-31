export interface ScoreComponent {
  id: string;
  title: string;
  points: number; // ex: +18, -8, +12, -5
  category: 'positive' | 'negative' | 'neutral';
  description?: string;
}

export type HealthTier = 'excellent' | 'good' | 'warning' | 'high_risk' | 'critical';

export interface AccountHealth {
  score: number; // 0 a 100
  tier: HealthTier;
  label: string; // "Excelente", "Boa", "Atenção", "Alto Risco", "Crítico"
  breakdown: ScoreComponent[];
  history: {
    totalCampaigns: number;
    restrictionsCount: number;
    deliveryRate: number; // ex: 98.4
    replyRate: number;    // ex: 26.0
    blockedContacts: number;
    daysSinceLastRestriction: number;
  };
  lastUpdated: string;
}

export function getHealthTierDetails(score: number): { tier: HealthTier; label: string; color: string } {
  if (score >= 90) return { tier: 'excellent', label: 'Excelente', color: 'emerald' };
  if (score >= 75) return { tier: 'good', label: 'Boa', color: 'green' };
  if (score >= 60) return { tier: 'warning', label: 'Atenção', color: 'yellow' };
  if (score >= 35) return { tier: 'high_risk', label: 'Alto Risco', color: 'orange' };
  return { tier: 'critical', label: 'Crítico', color: 'red' };
}
