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
import { canViewPerson, isAdminOrPastor } from '@/lib/access-control';

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

    const member = users.find((u) => u.id === memberId);
    const currentUserData = users.find((u) => u.id === currentUid);

    // Converte os dados do usuário atual e do membro alvo para a interface de controle de acesso
    const currentUserProfile = currentUserData ? {
      id: currentUserData.id,
      role: currentUserData.hierarchy?.role,
      cellId: (currentUserData as any).cellId,
      areaId: (currentUserData as any).areaId,
    } : { id: currentUid };

    const targetUserProfile = member ? {
      id: member.id,
      role: member.hierarchy?.role,
      cellId: (member as any).cellId,
      areaId: (member as any).areaId,
    } : { id: memberId };

    // 2. Admin / Pastor
    if (isAdminOrPastor(currentUserProfile)) {
      return { canView: true, canAddManualEvent: true, reason: 'admin', isLoading: false };
    }

    // 3. Validação pela Engine de Controle de Acesso
    const hasViewAccess = canViewPerson(currentUserProfile, targetUserProfile);
    if (hasViewAccess) {
      const isGC = currentUserData?.hierarchy?.role === 'gc_leader' || currentUserData?.hierarchy?.role === 'gc_training_leader';
      const isArea = currentUserData?.hierarchy?.role === 'area_leader';
      return {
        canView: true,
        canAddManualEvent: true,
        reason: isGC ? 'gc_leader' : isArea ? 'area_leader' : 'admin',
        isLoading: false,
      };
    }

    // 4. Sem permissão
    return { canView: false, canAddManualEvent: false, reason: 'none', isLoading: false };
  }, [currentUser, memberId, users, isLoading]);

  return permission;
}
