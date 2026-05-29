/**
 * timeline.ts
 * Utilitário central da Linha do Tempo do Membro.
 * Todos os módulos (GC, Voluntariado, Ensino, Eventos) importam daqui.
 */

import {
  collection,
  addDoc,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TimelineCategory =
  | 'gc'
  | 'volunteering'
  | 'event'
  | 'ecclesiastical_status'
  | 'teaching'
  | 'decision'
  | 'followup_note'
  | 'origin';

export interface TimelineEventPayload {
  /** Categoria visual do evento */
  category: TimelineCategory;
  /** Nome da entidade relacionada (ex: "EQUIPE AZUL", "GC - FELINTO") */
  entityTitle: string;
  /** Ação realizada (ex: "INICIOU COMO PARTICIPANTE") */
  eventDescription: string;
  /** Badge opcional de status (ex: "MEMBRO", "NÃO MEMBRO", "APROVADO") */
  statusBadge?: string;
  /**
   * Data real do evento. Se não fornecida, usa o momento atual.
   * Permite registrar eventos com data retroativa (ex: migração).
   */
  eventDate?: Date | Timestamp;
  /** Texto de conteúdo livre (para notas manuais de follow-up) */
  content?: string;
  /** ID da entidade relacionada (celulaId, courseId, eventId…) */
  relatedId?: string;
  /** Origem do evento */
  source: 'automatic' | 'manual' | 'migrated';
  /** uid do usuário que gerou o evento (admin/líder) */
  authorId?: string;
}

/** Documento completo salvo no Firestore */
export interface TimelineNote extends TimelineEventPayload {
  id: string;
  /** Para compatibilidade com o FollowUpTimeline existente */
  type: 'user' | 'system';
  createdAt: Timestamp;
}

// ─── Configuração visual por categoria ────────────────────────────────────────

export const CATEGORY_CONFIG: Record<
  TimelineCategory,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  gc: {
    label: 'GC',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
  },
  volunteering: {
    label: 'Voluntariado',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  event: {
    label: 'Eventos',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  ecclesiastical_status: {
    label: 'Situação Eclesiástica',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  teaching: {
    label: 'Ensino',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  decision: {
    label: 'Decisão Tomada',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
  },
  followup_note: {
    label: 'Follow-up',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
  origin: {
    label: 'Origem do Cadastro',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
};

// ─── Mapeamento de integrationStatus → descrição de evento ────────────────────

export const INTEGRATION_STATUS_TO_EVENT: Record<
  string,
  { description: string; badge: string }
> = {
  nao_alcancado: { description: 'VISITANTE', badge: 'NÃO MEMBRO' },
  novo_convertido: { description: 'DECISÃO POR CRISTO', badge: 'NÃO MEMBRO' },
  reconciliado: { description: 'RECONCILIAÇÃO', badge: 'NÃO MEMBRO' },
  transferido: { description: 'TRANSFERIDO DE OUTRA IGREJA', badge: 'PARTICIPANTE' },
  membro: { description: 'ADMISSÃO POR BATISMO / ARROLAMENTO', badge: 'MEMBRO' },
  consolidado: { description: 'CONSOLIDADO NA FÉ', badge: 'MEMBRO' },
  lider_treinamento: { description: 'INICIOU TREINAMENTO DE LIDERANÇA', badge: 'EM FORMAÇÃO' },
  lider_gc: { description: 'NOMEADO LÍDER DE GC', badge: 'LÍDER GC' },
  lider_area: { description: 'NOMEADO LÍDER DE ÁREA', badge: 'LÍDER ÁREA' },
  lider_rede: { description: 'NOMEADO LÍDER DE REDE', badge: 'LÍDER REDE' },
  pastor: { description: 'ORDENADO / NOMEADO PASTOR', badge: 'PASTOR' },
};

// ─── Função principal ──────────────────────────────────────────────────────────

/**
 * Adiciona um evento na linha do tempo de um membro.
 * Salva na subcoleção `users/{userId}/notes` para integração com FollowUpTimeline.
 *
 * @example
 * await addTimelineEvent(userId, firestore, {
 *   category: 'gc',
 *   entityTitle: 'GC - CAPITÃO FELINTO',
 *   eventDescription: 'INICIOU COMO PARTICIPANTE',
 *   source: 'automatic',
 *   authorId: currentUser.uid,
 * });
 */
export async function addTimelineEvent(
  userId: string,
  firestore: Firestore,
  payload: TimelineEventPayload
): Promise<void> {
  const notesRef = collection(firestore, `users/${userId}/notes`);

  const eventDate =
    payload.eventDate instanceof Date
      ? Timestamp.fromDate(payload.eventDate)
      : payload.eventDate ?? Timestamp.now();

  const doc: Omit<TimelineNote, 'id'> = {
    // Campos de compatibilidade com Note existente
    type: payload.source === 'manual' ? 'user' : 'system',
    content: payload.content ?? '',
    authorId: payload.authorId ?? 'system',
    createdAt: Timestamp.now(),

    // Campos novos da timeline
    category: payload.category,
    entityTitle: payload.entityTitle,
    eventDescription: payload.eventDescription,
    statusBadge: payload.statusBadge,
    eventDate,
    relatedId: payload.relatedId,
    source: payload.source,
  };

  await addDoc(notesRef, doc);
}
