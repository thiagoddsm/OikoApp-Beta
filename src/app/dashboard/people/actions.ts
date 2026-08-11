'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Move um cadastro de pessoa para a Lixeira (Soft Delete).
 */
export async function softDeletePerson(personId: string, operatorUserId?: string) {
  try {
    if (!personId) {
      return { success: false, error: 'ID do cadastro não informado.' };
    }

    const db = getAdminDb();
    const personRef = db.collection('users').doc(personId);
    const personSnap = await personRef.get();

    if (!personSnap.exists) {
      return { success: false, error: 'Cadastro não encontrado.' };
    }

    // Bloquear auto-exclusão por segurança
    if (operatorUserId && operatorUserId === personId) {
      return { success: false, error: 'Você não pode excluir o seu próprio cadastro.' };
    }

    await personRef.update({
      isDeleted: true,
      deletedAt: Timestamp.now(),
      deletedBy: operatorUserId || 'system',
      updatedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[softDeletePerson] Erro ao mover cadastro para a lixeira:', error);
    return { success: false, error: error.message || 'Falha ao mover cadastro para a lixeira.' };
  }
}

/**
 * Restaura um cadastro da Lixeira de volta para o sistema.
 */
export async function restorePerson(personId: string) {
  try {
    if (!personId) {
      return { success: false, error: 'ID do cadastro não informado.' };
    }

    const db = getAdminDb();
    const personRef = db.collection('users').doc(personId);
    const personSnap = await personRef.get();

    if (!personSnap.exists) {
      return { success: false, error: 'Cadastro não encontrado.' };
    }

    await personRef.update({
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      updatedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('[restorePerson] Erro ao restaurar cadastro:', error);
    return { success: false, error: error.message || 'Falha ao restaurar cadastro.' };
  }
}

/**
 * Remove um cadastro definitivamente do sistema (Apenas se necessário na Lixeira).
 */
export async function permanentDeletePerson(personId: string) {
  try {
    if (!personId) {
      return { success: false, error: 'ID do cadastro não informado.' };
    }

    const db = getAdminDb();
    await db.collection('users').doc(personId).delete();

    return { success: true };
  } catch (error: any) {
    console.error('[permanentDeletePerson] Erro ao excluir permanentemente:', error);
    return { success: false, error: error.message || 'Falha ao excluir o cadastro definitivamente.' };
  }
}
