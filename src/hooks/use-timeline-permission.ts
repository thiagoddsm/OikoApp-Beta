'use client';

/**
 * use-timeline-permission.ts
 * Hook que resolve se o usuário atual pode VER e/ou adicionar eventos manuais
 * na linha do tempo de um membro específico, com base na hierarquia da igreja.
 *
 * Cadeia hierárquica:
 *   Membro → Líder de GC → Líder de Área → Líder de Rede → Pastor/Admin
 */

import { useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { useVolunteering } from '@/contexts/volunteering-context';

export type TimelinePermissionReason =
  | 'self'
  | 'gc_leader'
  | 'area_leader'
  | 'rede_leader'
  | 'admin'
  | 'none';

export interface TimelinePermission {
  /** Pode ver a linha do tempo completa */
  canView: boolean;
  /** Pode adicionar eventos manuais de follow-up */
  canAddManualEvent: boolean;
  /** Motivo pelo qual tem ou não a permissão */
  reason: TimelinePermissionReason;
  /** Carregando ainda */
  isLoading: boolean;
}

const ADMIN_ROLES = new Set(['admin', 'pastor_senior', 'pastor']);

export function useTimelinePermission(memberId: string): TimelinePermission {
  const { user: currentUser } = useFirebase();
  const { users, isLoading } = useVolunteering();

  const permission = useMemo((): TimelinePermission => {
    const loading: TimelinePermission = {
      canView: false,
      canAddManualEvent: false,
      reason: 'none',
      isLoading: true,
    };

    if (isLoading || !currentUser || !users.length) return loading;

    const currentUid = currentUser.uid;

    // 1. É o próprio membro
    if (currentUid === memberId) {
      return { canView: true, canAddManualEvent: false, reason: 'self', isLoading: false };
    }

    // Encontrar o membro alvo
    const member = users.find((u) => u.id === memberId);
    if (!member) {
      return { canView: false, canAddManualEvent: false, reason: 'none', isLoading: false };
    }

    // Encontrar o usuário atual no sistema para checar seu papel
    const currentUserData = users.find((u) => u.id === currentUid);
    const currentRole = currentUserData?.hierarchy?.role ?? '';

    // 2. É admin / pastor sênior / pastor
    if (ADMIN_ROLES.has(currentRole)) {
      return { canView: true, canAddManualEvent: true, reason: 'admin', isLoading: false };
    }

    // 3. É o Líder de GC direto do membro
    //    member.hierarchy.supervisorId === currentUid
    if (member.hierarchy?.supervisorId === currentUid) {
      return { canView: true, canAddManualEvent: true, reason: 'gc_leader', isLoading: false };
    }

    // 4. É o Líder de Área
    //    Encontrar o líder de GC do membro e verificar se o supervisor DELE é o currentUid
    const gcLeader = users.find((u) => u.id === member.hierarchy?.supervisorId);
    if (gcLeader && gcLeader.hierarchy?.supervisorId === currentUid) {
      return { canView: true, canAddManualEvent: true, reason: 'area_leader', isLoading: false };
    }

    // 5. É o Líder de Rede
    //    Encontrar o líder de área e verificar se o supervisor DELE é o currentUid
    const areaLeader = users.find((u) => u.id === gcLeader?.hierarchy?.supervisorId);
    if (areaLeader && areaLeader.hierarchy?.supervisorId === currentUid) {
      return { canView: true, canAddManualEvent: true, reason: 'rede_leader', isLoading: false };
    }

    // 6. Sem permissão
    return { canView: false, canAddManualEvent: false, reason: 'none', isLoading: false };
  }, [currentUser, memberId, users, isLoading]);

  return permission;
}
