import { Campaign } from '../entities/campaign';
import { AccountHealth } from '../entities/account-health';
import { Recommendation } from '../entities/recommendation';
import { calculateSimilarityScore } from '../evaluators/similarity-score';

export const CreateVariationsRule = {
  matches(campaign: Campaign, health: AccountHealth, riskScore: number): boolean {
    const versions = campaign.versions || [];
    const count = campaign.recipients?.length || 0;
    const similarity = calculateSimilarityScore(versions.map(v => v.text));
    
    return versions.length < 3 || similarity > 80 || (count > 200 && versions.length < 5);
  },

  generate(campaign: Campaign, health: AccountHealth): Recommendation {
    const count = campaign.recipients?.length || 0;
    const recommendedVersions = count > 200 ? 5 : 3;

    return {
      id: 'create_variations',
      title: `Criar ${recommendedVersions} versões alternativas da mensagem`,
      description: 'Variações de texto com saudações e frases alternadas evitam que o filtro detecte padrão repetitivo.',
      severity: count > 100 ? 'critical' : 'warning',
      canAutoApply: true,
      actionType: 'generate_versions',
      payload: { recommendedVersions }
    };
  }
};
