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

export function generateSampleTimeline(currentScore: number): HealthTimeline {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho'];
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
