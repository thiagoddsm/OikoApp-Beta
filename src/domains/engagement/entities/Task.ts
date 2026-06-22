export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';

export interface Task {
  id: string;
  tenantId: string;
  memberId: string; // Alvo da tarefa (ex: o visitante que precisa ser contatado)
  assignedTo: string; // Responsável pela execução (ex: líder do GC)
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: string; // Prazo para realizar o follow-up
  createdAt: string;
  completedAt?: string;
}
