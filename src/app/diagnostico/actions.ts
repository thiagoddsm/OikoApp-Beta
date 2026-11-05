'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import type { IdentificacaoIgreja } from '@/lib/diagnostico-rede-data';

export async function salvarDiagnostico(
  identificacao: IdentificacaoIgreja,
  respostas: Record<string, number>,
  resultados: any
) {
  try {
    const db = getAdminDb();
    const docRef = await db.collection('diagnosticos_igrejas').add({
      identificacao,
      respostas,
      resultados: {
        scoreGlobal: resultados.scoreGlobal,
        statusIgreja: resultados.statusIgreja,
        modo: resultados.modo,
        dominios: resultados.dominios.map((d: any) => ({
          id: d.id,
          nome: d.nome,
          score: d.score,
        })),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      origem: 'ibmanha.com.br/diagnostico',
    });

    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('[salvarDiagnostico] Erro ao salvar diagnóstico no Firestore:', error);
    return { success: false, error: error.message };
  }
}
