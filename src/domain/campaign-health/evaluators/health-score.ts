import { AccountHealth, ScoreComponent, getHealthTierDetails } from '../entities/account-health';

export interface RawHealthHistory {
  totalCampaigns: number;
  restrictionsCount: number;
  deliveryRate: number;
  replyRate: number;
  blockedContacts: number;
  daysSinceLastRestriction: number;
}

export function evaluateAccountHealth(history: RawHealthHistory): AccountHealth {
  let score = 100;
  const breakdown: ScoreComponent[] = [];

  // 1. Histórico de Restrições (-25 pontos por restrição nos últimos 90 dias)
  if (history.restrictionsCount === 0) {
    breakdown.push({
      id: 'no_restrictions',
      title: 'Sem restrições recentes',
      points: 15,
      category: 'positive',
      description: 'Nenhum bloqueio ou aviso registrado nos últimos meses.'
    });
  } else {
    const penalty = Math.min(60, history.restrictionsCount * 20);
    score -= penalty;
    breakdown.push({
      id: 'past_restrictions',
      title: `${history.restrictionsCount} restrição(ões) anterior(es)`,
      points: -penalty,
      category: 'negative',
      description: 'Histórico de advertências no WhatsApp que aumenta o rigor de envio.'
    });
  }

  // 2. Tempo desde a última restrição
  if (history.daysSinceLastRestriction > 180) {
    score += 10;
    breakdown.push({
      id: 'clean_streak',
      title: 'Período prolongado sem restrições',
      points: 10,
      category: 'positive',
      description: `Mais de ${history.daysSinceLastRestriction} dias de operação contínua e segura.`
    });
  } else if (history.daysSinceLastRestriction < 7 && history.restrictionsCount > 0) {
    score -= 20;
    breakdown.push({
      id: 'recent_restriction',
      title: 'Restrição recente',
      points: -20,
      category: 'negative',
      description: 'Conta sofreu restrição nos últimos 7 dias. Exige modo conservador.'
    });
  }

  // 3. Taxa de Entrega (Delivery Rate)
  if (history.deliveryRate >= 95) {
    breakdown.push({
      id: 'high_delivery',
      title: 'Excelente taxa de entrega',
      points: 8,
      category: 'positive',
      description: `${history.deliveryRate.toFixed(1)}% das mensagens foram entregues.`
    });
    score += 8;
  } else if (history.deliveryRate < 80) {
    const penalty = 12;
    score -= penalty;
    breakdown.push({
      id: 'low_delivery',
      title: 'Baixa taxa de entrega',
      points: -penalty,
      category: 'negative',
      description: 'Muitos telefones desatualizados ou inválidos.'
    });
  }

  // 4. Taxa de Resposta (Reply Rate)
  if (history.replyRate >= 20) {
    score += 12;
    breakdown.push({
      id: 'high_engagement',
      title: 'Alto engajamento do público',
      points: 12,
      category: 'positive',
      description: `${history.replyRate.toFixed(1)}% dos destinatários respondem às mensagens.`
    });
  } else if (history.replyRate < 5 && history.totalCampaigns > 5) {
    score -= 10;
    breakdown.push({
      id: 'low_engagement',
      title: 'Poucas respostas aos disparos',
      points: -10,
      category: 'negative',
      description: 'Mensagens institucionais sem interação dos membros.'
    });
  }

  // Normalizar score final entre 0 e 100
  const finalScore = Math.min(100, Math.max(0, Math.round(score)));
  const details = getHealthTierDetails(finalScore);

  return {
    score: finalScore,
    tier: details.tier,
    label: details.label,
    breakdown,
    history,
    lastUpdated: new Date().toISOString()
  };
}
