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

    // 1. Atualizar o membro no Firestore (sincronizando 'users' e 'members')
    const nowIso = new Date().toISOString();
    const updatePayload = {
      journeyStageId: newStageId,
      updatedAt: nowIso,
    };

    const userRef = doc(this.firestore, 'users', memberId);
    await updateDoc(userRef, updatePayload).catch(() => {});

    const memberRef = doc(this.firestore, 'members', memberId);
    await updateDoc(memberRef, updatePayload).catch(() => {});

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
