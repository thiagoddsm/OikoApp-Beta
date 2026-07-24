import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export interface AuditLogEntry {
  tenantId: string;
  userId: string;
  userRole?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  requestId?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

/**
 * Server-Side Append-Only Audit Logging Service.
 * Writes directly to the `audit_logs` collection via Firebase Admin SDK.
 * Redacts sensitive fields (CPF, passwords, tokens, credit card data).
 */
export class ServerAuditService {
  private static SENSITIVE_KEYS = new Set([
    'password', 'token', 'apiKey', 'secret', 'cpf', 'creditCard', 'cvv', 
    'asaasApiKey', 'webhookToken', 'privateKey', 'authorization'
  ]);

  /**
   * Sanitizes metadata objects by redacting sensitive values.
   */
  private static redactSensitiveData(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactSensitiveData(item));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.SENSITIVE_KEYS.has(key) || key.toLowerCase().includes('secret') || key.toLowerCase().includes('token')) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.redactSensitiveData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Records an immutable audit log entry in Firestore.
   */
  static async record(entry: AuditLogEntry): Promise<void> {
    try {
      const db = getAdminDb();
      const sanitizedMetadata = entry.metadata ? this.redactSensitiveData(entry.metadata) : {};

      const docRef = db.collection('audit_logs').doc();
      await docRef.set({
        id: docRef.id,
        tenantId: entry.tenantId || 'global',
        userId: entry.userId || 'system',
        userRole: entry.userRole || 'system',
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId || null,
        requestId: entry.requestId || null,
        ipAddress: entry.ipAddress || null,
        metadata: sanitizedMetadata,
        timestamp: Timestamp.now()
      });
    } catch (error) {
      // Audit logging must not break main execution flow, but should log error cleanly
      console.error('[ServerAuditService] Failed to write audit log:', error);
    }
  }
}
