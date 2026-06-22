import { Firestore, doc, updateDoc } from 'firebase/firestore';
import { ActivityService } from './ActivityService';
import { ActivityActor, ActivitySource } from '../entities/Activity';

export class JourneyApplicationService {
  constructor(
    private firestore: Firestore,
    private activityService: ActivityService
  ) {}

  /**
   * Única porta de entrada para alterar a fase da jornada de um membro.
   * Valida a transição, atualiza o membro, grava a Activity e dispara Automações.
   */
  async moveMemberToStage(params: {
    tenantId: string;
    memberId: string;
    newStageId: string;
    oldStageId?: string;
    reason: string;
    actor: ActivityActor;
    source: ActivitySource;
  }): Promise<void> {
    const { tenantId, memberId, newStageId, oldStageId, reason, actor, source } = params;

    // TODO: Adicionar validações de transição se necessário (ex: verificar se estágio existe)

    // 1. Atualizar o membro no Firestore
    const memberRef = doc(this.firestore, 'members', memberId);
    await updateDoc(memberRef, {
      journeyStageId: newStageId,
      updatedAt: new Date().toISOString(),
    });

    // 2. Gravar a Atividade (Event Sourcing Light) - Isso disparará automações em background
    await this.activityService.logActivity({
      tenantId,
      memberId,
      type: 'stage_changed',
      source,
      actor,
      context: {
        journeyUpdate: true
      },
      metadata: {
        oldStageId,
        newStageId,
        reason
      }
    });
  }
}
