import { Recommendation } from './recommendation';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskFactorBreakdown {
  factor: string;
  weight: string; // "35%", "25%"
  score: number;  // 0 a 100
  impact: string; // "+15 (Alto volume de contatos novos)"
}

export interface CampaignRisk {
  score: number; // 0 a 100
  level: RiskLevel;
  label: string; // "Baixo", "Médio", "Alto", "Crítico"
  color: string; // "emerald", "yellow", "orange", "red"
  newChatsRatio: number; // ex: 0.85 (85%)
  similarityIndex: number; // ex: 90 (90% similares)
  factors: RiskFactorBreakdown[];
  recommendations: Recommendation[];
  canSendWithoutAdjustments: boolean;
  requiresExplicitConfirmation: boolean;
}
