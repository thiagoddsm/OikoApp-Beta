import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  previousResult?: any;
}

/**
 * Ensures requests with an Idempotency-Key are processed exactly once.
 * Prevents double billing, duplicate enrollments, or duplicate webhook executions.
 */
export class IdempotencyService {
  /**
   * Checks if an idempotency key has already been processed for the tenant.
   * If not present, reserves the key with a 24-hour expiration window.
   */
  static async checkAndLock(
    tenantId: string,
    idempotencyKey: string,
    action: string
  ): Promise<IdempotencyCheckResult> {
    if (!idempotencyKey) {
      return { isDuplicate: false };
    }

    const db = getAdminDb();
    const docRef = db.collection('idempotency_keys').doc(`${tenantId}_${idempotencyKey}`);

    try {
      return await db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(docRef);

        if (docSnap.exists) {
          const data = docSnap.data();
          return {
            isDuplicate: true,
            previousResult: data?.responsePayload
          };
        }

        const now = Timestamp.now();
        const expiresAt = Timestamp.fromMillis(now.toMillis() + 24 * 60 * 60 * 1000);

        transaction.set(docRef, {
          tenantId,
          idempotencyKey,
          action,
          status: 'PROCESSING',
          createdAt: now,
          expiresAt
        });

        return { isDuplicate: false };
      });
    } catch (error) {
      console.error('[IdempotencyService] Erro atômico na transação da chave:', error);
      // Fail closed on error to prevent duplicate billing
      return { isDuplicate: true, previousResult: { error: 'Falha no controle de idempotência. Tente novamente.' } };
    }
  }

  /**
   * Complete processing for an idempotency key by storing its response payload.
   */
  static async saveResult(
    tenantId: string,
    idempotencyKey: string,
    responsePayload: any
  ): Promise<void> {
    if (!idempotencyKey) return;

    const db = getAdminDb();
    const docRef = db.collection('idempotency_keys').doc(`${tenantId}_${idempotencyKey}`);

    try {
      await docRef.update({
        status: 'COMPLETED',
        responsePayload,
        completedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('[IdempotencyService] Error saving result:', error);
    }
  }
}
