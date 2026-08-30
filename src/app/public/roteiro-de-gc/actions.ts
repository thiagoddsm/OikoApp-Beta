'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { DEFAULT_GC_ROTEIRO_HTML, DEFAULT_GC_ROTEIRO_TITLE } from '@/lib/constants/default-gc-roteiro';

export interface PublicGcRoteiroData {
  title: string;
  date: string;
  htmlContent: string;
}

/**
 * Busca o roteiro de GC ativo no Firestore usando o Firebase Admin SDK (sem exigir login do visitante).
 */
export async function getActiveGcRoteiro(): Promise<PublicGcRoteiroData> {
  try {
    const db = getAdminDb();
    const docSnap = await db.collection('gc_roteiros').doc('active').get();
    if (docSnap.exists) {
      const data = docSnap.data();
      return {
        title: data?.title || DEFAULT_GC_ROTEIRO_TITLE,
        date: data?.date || '',
        htmlContent: data?.htmlContent || DEFAULT_GC_ROTEIRO_HTML,
      };
    }
  } catch (error) {
    console.error('[Public Roteiro] Erro ao buscar roteiro ativo via Admin SDK:', error);
  }

  // Fallback seguro com template padrão
  return {
    title: DEFAULT_GC_ROTEIRO_TITLE,
    date: '',
    htmlContent: DEFAULT_GC_ROTEIRO_HTML,
  };
}
