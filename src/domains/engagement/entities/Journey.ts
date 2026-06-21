export interface Stage {
  id: string;
  name: string;
  order: number;
  description?: string;
  color?: string;
}

export interface Journey {
  id: string;
  tenantId: string;
  name: string; // Ex: "Trilha do Novo Membro", "Trilha de Liderança"
  description?: string;
  stages: Stage[];
  createdAt: string;
  updatedAt: string;
}

// Representa em qual ponto da jornada um membro está
export interface MemberJourney {
  id: string;
  tenantId: string;
  memberId: string;
  journeyId: string;
  currentStageId: string;
  startedAt: string;
  updatedAt: string;
}
