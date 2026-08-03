/**
 * ADR-002 — Oiko Status Conventions
 *
 * Fonte única da verdade para todos os estados do sistema.
 *
 * REGRA: Nenhum módulo inventa um novo string de status.
 * Novos valores devem ser adicionados ao `EntityStatus` aqui e justificados.
 *
 * COMO USAR:
 *   - Importe o subset tipado do seu domínio, nunca o `EntityStatus` inteiro.
 *   - Adicione um novo subset abaixo se criar um módulo novo.
 *
 * @example
 *   import { CourseStatus } from '@/domain/status'
 *   courseStatus: CourseStatus  // TS rejeita "approved" — correto
 */

// ---------------------------------------------------------------------------
// Enum global — vocabulário completo de estados do sistema
// ---------------------------------------------------------------------------

export type EntityStatus =
  | 'draft'      // rascunho — existe mas não está ativo
  | 'pending'    // aguardando aprovação ou ação
  | 'active'     // estado padrão vigente
  | 'completed'  // concluído com sucesso
  | 'approved'   // aprovado por um gestor
  | 'rejected'   // recusado
  | 'archived'   // histórico, fora de uso
  | 'cancelled'  // cancelado antes de concluir

// ---------------------------------------------------------------------------
// Subsets por domínio — cada módulo importa apenas o que faz sentido para ele
// ---------------------------------------------------------------------------

/** Status de um curso ou módulo de ensino */
export type CourseStatus = Extract<EntityStatus, 'active' | 'completed' | 'archived'>

/** Status de uma escala de serviço ou voluntariado */
export type ScheduleStatus = Extract<
  EntityStatus,
  'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'archived'
>

/** Status de integração de um membro na igreja */
export type MemberStatus = Extract<EntityStatus, 'active' | 'pending' | 'archived'>

/** Status de um evento (antes, durante e após) */
export type EventStatus = Extract<EntityStatus, 'draft' | 'active' | 'completed' | 'cancelled' | 'archived'>

/** Status de uma solicitação ou fluxo de aprovação genérico */
export type ApprovalStatus = Extract<EntityStatus, 'pending' | 'approved' | 'rejected' | 'cancelled'>
