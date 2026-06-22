import { getAdminDb } from '@/lib/firebase-admin';

export type ActionCode = 
  | 'manage_finance'
  | 'view_finance'
  | 'manage_members'
  | 'view_members'
  | 'manage_cells'
  | 'manage_courses'
  | 'manage_settings';

export class AuthorizationService {
  /**
   * Verifica se o usuário possui permissão para executar a ação no Tenant especificado.
   * Usado principalmente no backend (Server Actions / API Routes).
   */
  static async can(userId: string, tenantId: string, action: ActionCode): Promise<boolean> {
    if (!userId || !tenantId) return false;

    try {
      const db = getAdminDb();
      // Buscamos o membership do usuário no tenant
      const membershipRef = db.collection(`tenants/${tenantId}/members`).doc(userId);
      const membershipSnap = await membershipRef.get();

      if (!membershipSnap.exists) {
        // Fallback: Vamos verificar se ele é um root user ou owner salvo no próprio user object
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();
        if (userSnap.exists) {
          const userData = userSnap.data();
          if (userData?.role === 'admin' || userData?.tenantId === tenantId) {
             // Aceita legacy admins
             return true;
          }
        }
        return false;
      }

      const role = membershipSnap.data()?.role; // 'owner', 'admin', 'pastor', 'leader', 'member'

      switch (action) {
        case 'manage_finance':
        case 'manage_settings':
          return ['owner', 'admin'].includes(role);
          
        case 'view_finance':
          return ['owner', 'admin', 'pastor'].includes(role);

        case 'manage_members':
        case 'manage_cells':
        case 'manage_courses':
          return ['owner', 'admin', 'pastor', 'leader'].includes(role);

        case 'view_members':
          return true; // Todos os membros autenticados no tenant podem ver (ou ajuste conforme regra)

        default:
          return false;
      }
    } catch (error) {
      console.error('[AuthorizationService] Erro ao validar permissão:', error);
      return false;
    }
  }

  // Helpers sintáticos:
  static async canManageFinance(userId: string, tenantId: string) { return this.can(userId, tenantId, 'manage_finance'); }
  static async canManageSettings(userId: string, tenantId: string) { return this.can(userId, tenantId, 'manage_settings'); }
  static async canManageMembers(userId: string, tenantId: string) { return this.can(userId, tenantId, 'manage_members'); }
}
