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
      totalCampaigns: rawHistory?.totalCampaigns ?? 0,
      restrictionsCount: rawHistory?.restrictionsCount ?? 0,
      deliveryRate: rawHistory?.deliveryRate ?? 100,
      replyRate: rawHistory?.replyRate ?? 0,
      blockedContacts: rawHistory?.blockedContacts ?? 0,
      daysSinceLastRestriction: rawHistory?.daysSinceLastRestriction ?? 365,
    };

    return evaluateAccountHealth(history);
  }

  /**
   * Calcula a Saúde da Conta REAL a partir das coleções do Firestore
   */
  static computeHealthFromFirestore(historyData: any[], responsesData: any[]): AccountHealth {
    if (!historyData || historyData.length === 0) {
      return this.getAccountHealth({
        totalCampaigns: 0,
        restrictionsCount: 0,
        deliveryRate: 100,
        replyRate: 0,
        blockedContacts: 0,
        daysSinceLastRestriction: 365,
      });
    }

    const totalCampaigns = historyData.length;
    let totalSent = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    let restrictionsCount = 0;
    let lastRestrictionTime = 0;

    historyData.forEach(item => {
      const recipientCount = Number(item.recipientCount || item.totalRecipients || 0);
      const successCount = Number(item.successCount || 0);
      const errorCount = Number(item.errorCount || 0);

      totalSent += recipientCount;
      totalSuccess += successCount;
      totalErrors += errorCount;

      const isFailed = item.status === 'failed' || !!item.circuitBreakReason;
      if (isFailed) {
        restrictionsCount++;
        let sentTime = item.sentAt?.toDate ? item.sentAt.toDate().getTime() : (item.sentAt ? new Date(item.sentAt).getTime() : 0);
        if (sentTime > lastRestrictionTime) lastRestrictionTime = sentTime;
      }
    });

    const deliveryRate = totalSent > 0 ? (totalSuccess / totalSent) * 100 : 100;

    // Calcular Reply Rate real
    const uniqueResponders = new Set((responsesData || []).map(r => r.from)).size;
    const replyRate = totalSent > 0 ? Math.min(100, (uniqueResponders / Math.max(1, totalSent)) * 100) : 0;

    const daysSinceLastRestriction = lastRestrictionTime > 0 
      ? Math.max(0, Math.floor((Date.now() - lastRestrictionTime) / (1000 * 60 * 60 * 24)))
      : 365;

    return this.getAccountHealth({
      totalCampaigns,
      restrictionsCount,
      deliveryRate: Math.round(deliveryRate * 10) / 10,
      replyRate: Math.round(replyRate * 10) / 10,
      blockedContacts: totalErrors,
      daysSinceLastRestriction,
    });
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
