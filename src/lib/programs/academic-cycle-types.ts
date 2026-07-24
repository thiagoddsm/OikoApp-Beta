export interface AcademicCycle {
  id: string;
  tenantId?: string;
  programId: string;
  name: string; // Ex: "Ciclo 2026/1", "Ciclo 2026/2", "Ciclo Julho/2026"
  description?: string;
  startDate: string;
  endDate: string;
  status: 'planejamento' | 'ativo' | 'encerrado' | 'arquivado';
  createdAt: string;
}
