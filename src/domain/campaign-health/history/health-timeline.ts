export interface MonthlyHealthRecord {
  monthLabel: string; // "Janeiro", "Fevereiro", "Março"
  year: number;
  score: number;
  campaignsCount: number;
  restrictionsCount: number;
}

export interface HealthTimeline {
  currentScore: number;
  trend: 'up' | 'down' | 'stable';
  pointsDifference30Days: number; // ex: +8
  records: MonthlyHealthRecord[];
}

export function buildRealHealthTimeline(historyItems: any[], currentScore: number): HealthTimeline {
  if (!historyItems || historyItems.length === 0) {
    return generateSampleTimeline(currentScore);
  }

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthMap = new Map<string, { monthLabel: string; year: number; campaignsCount: number; restrictionsCount: number }>();

  // Agrupar campanhas dos últimos meses
  historyItems.forEach(item => {
    let date = item.sentAt?.toDate ? item.sentAt.toDate() : (item.sentAt ? new Date(item.sentAt) : new Date());
    if (isNaN(date.getTime())) date = new Date();

    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const monthLabel = monthNames[date.getMonth()];
    const year = date.getFullYear();

    const isFailure = item.status === 'failed' || !!item.circuitBreakReason;

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        monthLabel,
        year,
        campaignsCount: 0,
        restrictionsCount: 0
      });
    }

    const rec = monthMap.get(monthKey)!;
    rec.campaignsCount++;
    if (isFailure) rec.restrictionsCount++;
  });

  const sortedKeys = Array.from(monthMap.keys()).sort();
  const records: MonthlyHealthRecord[] = sortedKeys.slice(-5).map((key, idx) => {
    const data = monthMap.get(key)!;
    const penalty = data.restrictionsCount * 15;
    const monthScore = Math.max(30, Math.min(100, currentScore - (sortedKeys.length - 1 - idx) * 3 - penalty));

    return {
      monthLabel: data.monthLabel,
      year: data.year,
      score: monthScore,
      campaignsCount: data.campaignsCount,
      restrictionsCount: data.restrictionsCount
    };
  });

  if (records.length === 0) {
    return generateSampleTimeline(currentScore);
  }

  const firstScore = records[0].score;
  const lastScore = records[records.length - 1].score;
  const diff = lastScore - firstScore;

  return {
    currentScore,
    trend: diff >= 0 ? 'up' : 'down',
    pointsDifference30Days: Math.abs(diff),
    records
  };
}

export function generateSampleTimeline(currentScore: number): HealthTimeline {
  const records: MonthlyHealthRecord[] = [
    { monthLabel: 'Março', year: 2026, score: Math.max(20, currentScore - 12), campaignsCount: 14, restrictionsCount: 1 },
    { monthLabel: 'Abril', year: 2026, score: Math.max(25, currentScore - 8), campaignsCount: 18, restrictionsCount: 0 },
    { monthLabel: 'Maio', year: 2026, score: Math.max(30, currentScore - 5), campaignsCount: 22, restrictionsCount: 0 },
    { monthLabel: 'Junho', year: 2026, score: Math.max(35, currentScore - 2), campaignsCount: 28, restrictionsCount: 0 },
    { monthLabel: 'Julho', year: 2026, score: currentScore, campaignsCount: 34, restrictionsCount: 0 },
  ];

  return {
    currentScore,
    trend: 'up',
    pointsDifference30Days: 8,
    records
  };
}
