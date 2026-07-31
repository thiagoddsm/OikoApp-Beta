import { Campaign } from '../entities/campaign';
import { AccountHealth } from '../entities/account-health';
import { CampaignRisk } from '../entities/campaign-risk';
import { evaluateAccountHealth, RawHealthHistory } from '../evaluators/health-score';
import { evaluateCampaignRisk } from '../evaluators/risk-score';
import { generateRecommendations } from '../engines/recommendation-engine';
import { planCampaignBatches, CampaignSchedulePlan } from '../planners/campaign-planner';
import { SpintaxVariationProvider, TextVariation } from '../providers/variation-provider';
import { ConservativePolicy, NormalPolicy } from '../policies/conservative-policy';
import { CampaignPolicy } from '../policies/campaign-policy';

export interface CampaignHealthAnalysis {
  health: AccountHealth;
  risk: CampaignRisk;
  plan: CampaignSchedulePlan;
  recommendedPolicy: CampaignPolicy;
}

export class CampaignHealthService {
  /**
   * Avalia a Saúde da Conta com base nos dados operacionais do Firestore
   */
  static getAccountHealth(rawHistory?: Partial<RawHealthHistory>): AccountHealth {
    const history: RawHealthHistory = {
      totalCampaigns: rawHistory?.totalCampaigns ?? 42,
      restrictionsCount: rawHistory?.restrictionsCount ?? 1,
      deliveryRate: rawHistory?.deliveryRate ?? 96.5,
      replyRate: rawHistory?.replyRate ?? 24.2,
      blockedContacts: rawHistory?.blockedContacts ?? 2,
      daysSinceLastRestriction: rawHistory?.daysSinceLastRestriction ?? 14,
    };

    return evaluateAccountHealth(history);
  }

  /**
   * Analisa uma Campanha completa (Risco, Saúde, Recomendações e Planejamento)
   */
  static analyzeCampaign(campaign: Campaign, accountHealth?: AccountHealth): CampaignHealthAnalysis {
    const health = accountHealth || this.getAccountHealth();
    
    // Calcular Risco Multifatorial
    const risk = evaluateCampaignRisk(campaign, health);
    
    // Gerar Recomendações Estruturadas via Engine de Regras
    risk.recommendations = generateRecommendations(campaign, health, risk.score);

    // Planejar Cronograma e Lotes
    const plan = planCampaignBatches(campaign, health);

    // Definir Política Recomendada
    const recommendedPolicy = health.tier === 'critical' || health.tier === 'high_risk' || risk.level === 'CRITICAL'
      ? ConservativePolicy
      : NormalPolicy;

    return {
      health,
      risk,
      plan,
      recommendedPolicy
    };
  }

  /**
   * Gerar Variações Aprováveis de Mensagem
   */
  static async generateMessageVariations(originalText: string, count: number = 3): Promise<TextVariation[]> {
    return SpintaxVariationProvider.generateVariations(originalText, count);
  }
}
