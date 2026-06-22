import { getAdminDb } from '@/lib/firebase-admin';

export type AuditEvent = {
  tenantId?: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  previousData?: any;
  newData?: any;
  ipAddress?: string;
  metadata?: any;
};

export class AuditService {
  /**
   * Registra uma ação no log de auditoria global
   */
  static async log(event: AuditEvent): Promise<void> {
    try {
      const db = getAdminDb();
      const auditRef = db.collection('audit_logs').doc();
      
      const payload = {
        ...event,
        timestamp: new Date(),
      };

      // Fogo-e-esquece (Fire-and-forget) para não bloquear a request principal,
      // mas se houver erro tentamos logar no console.
      await auditRef.set(payload);
    } catch (error) {
      console.error('[AuditService] Falha ao registrar log de auditoria:', error, event);
    }
  }
}
