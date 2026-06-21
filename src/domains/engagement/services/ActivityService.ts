import { Firestore } from 'firebase/firestore';
import { ActivityRepository } from '../repositories/ActivityRepository';
import { Activity, ActivitySource, ActivityActor, ActivityContext } from '../entities/Activity';
import { AutomationService } from './AutomationService';

export class ActivityService {
  private repository: ActivityRepository;

  constructor(
    firestore: Firestore,
    private automationService: AutomationService
  ) {
    this.repository = new ActivityRepository(firestore);
  }

  /**
   * Registra uma atividade no formato Event Sourcing Light.
   * Essa é a única fonte oficial dos acontecimentos do sistema.
   */
  async logActivity(params: {
    tenantId: string;
    memberId: string;
    type: string;
    source: ActivitySource;
    actor: ActivityActor;
    context?: ActivityContext;
    metadata?: Record<string, any>;
  }): Promise<Activity> {
    const activity = await this.repository.create({
      ...params,
      createdAt: new Date().toISOString()
    });

    // Despacha para a fila de automação (Atualmente síncrono para MVP, futuramente via Queue 'automation_jobs')
    // TODO (Sprint 8.4): Enviar para fila em vez de executar direto.
    await this.automationService.evaluateTriggers(activity).catch(err => {
      console.error('Failed to evaluate automation triggers:', err);
    });

    return activity;
  }

  async getMemberTimeline(tenantId: string, memberId: string): Promise<Activity[]> {
    return this.repository.findByMember(tenantId, memberId);
  }
}
