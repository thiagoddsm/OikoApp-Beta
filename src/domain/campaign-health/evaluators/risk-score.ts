import { Campaign } from '../entities/campaign';
import { AccountHealth } from '../entities/account-health';
import { CampaignRisk, RiskLevel, RiskFactorBreakdown } from '../entities/campaign-risk';
import { calculateSimilarityScore } from './similarity-score';

export function evaluateCampaignRisk(campaign: Campaign, health: AccountHealth): CampaignRisk {
  const recipients = campaign.recipients || [];
  const totalCount = recipients.length;

  // 1. Contatos Novos (35% do peso)
  const newChatsCount = recipients.filter(r => r.isNewChat).length;
  const newChatsRatio = totalCount > 0 ? newChatsCount / totalCount : 0;
  const newChatsScore = Math.round(newChatsRatio * 100);

  // 2. Saúde da Conta (25% do peso - invertido: menor saúde = maior risco)
  const healthInvertedScore = 100 - health.score;

  // 3. Volume de Destinatários (15% do peso)
  // 0 a 20 -> 0; 80 -> 40; 200 -> 70; 500+ -> 100
  let volumeScore = 0;
  if (totalCount > 500) volumeScore = 100;
  else if (totalCount > 200) volumeScore = 80;
  else if (totalCount > 80) volumeScore = 55;
  else if (totalCount > 20) volumeScore = 30;
  else volumeScore = 10;

  // 4. Índice de Similaridade de Texto (10% do peso)
  const versions = campaign.versions || [];
  const versionTexts = versions.map(v => v.text).filter(Boolean);
  const similarityIndex = calculateSimilarityScore(versionTexts.length > 0 ? versionTexts : []);
  const similarityScore = versionTexts.length <= 1 ? 100 : similarityIndex;

  // 5. Histórico de Engajamento (10% do peso)
  const engagementInverted = Math.max(0, 100 - (health.history.replyRate * 3));

  // 6. Presença de Links (5% do peso)
  const linksScore = campaign.hasLinks ? 100 : 0;

  // CÁLCULO PONDERADO FINAL
  const finalRiskScore = Math.round(
    (newChatsScore * 0.35) +
    (healthInvertedScore * 0.25) +
    (volumeScore * 0.15) +
    (similarityScore * 0.10) +
    (engagementInverted * 0.10) +
    (linksScore * 0.05)
  );

  const normalizedScore = Math.min(100, Math.max(0, finalRiskScore));

  let level: RiskLevel = 'LOW';
  let label = 'Baixo';
  let color = 'emerald';

  if (normalizedScore >= 80) {
    level = 'CRITICAL';
    label = 'Crítico';
    color = 'red';
  } else if (normalizedScore >= 60) {
    level = 'HIGH';
    label = 'Alto';
    color = 'orange';
  } else if (normalizedScore >= 35) {
    level = 'MEDIUM';
    label = 'Médio';
    color = 'yellow';
  }

  const factors: RiskFactorBreakdown[] = [
    {
      factor: 'Proporção de Contatos Novos (Contatos Frios)',
      weight: '35%',
      score: newChatsScore,
      impact: `${Math.round(newChatsRatio * 100)}% dos destinatários nunca conversaram com o número.`
    },
    {
      factor: 'Saúde da Conta no Sistema',
      weight: '25%',
      score: healthInvertedScore,
      impact: `Saúde atual da conta: ${health.score}/100 (${health.label}).`
    },
    {
      factor: 'Volume Total de Destinatários',
      weight: '15%',
      score: volumeScore,
      impact: `${totalCount} pessoas selecionadas.`
    },
    {
      factor: 'Índice de Similaridade de Mensagem',
      weight: '10%',
      score: similarityScore,
      impact: `${similarityScore}% de similaridade (${versionTexts.length} versão/ões).`
    },
    {
      factor: 'Taxa de Engajamento Histórica',
      weight: '10%',
      score: Math.round(engagementInverted),
      impact: `${health.history.replyRate}% de respostas médias.`
    },
    {
      factor: 'Presença de URLs / Links',
      weight: '5%',
      score: linksScore,
      impact: campaign.hasLinks ? 'Contém links externos no texto.' : 'Sem links externos.'
    }
  ];

  const requiresExplicitConfirmation = level === 'CRITICAL';

  return {
    score: normalizedScore,
    level,
    label,
    color,
    newChatsRatio,
    similarityIndex,
    factors,
    recommendations: [], // Preenchido pelo recommendation-engine
    canSendWithoutAdjustments: level !== 'CRITICAL',
    requiresExplicitConfirmation
  };
}
