'use server';

import { getAdminDb } from '@/lib/firebase-admin';

export interface DiagnosticoItem {
  id: string;
  identificacao: {
    igreja_nome: string;
    pastor_nome: string;
    email?: string;
    telefone: string;
    funcao_igreja: string;
    cidade: string;
    uf: string;
    porte_igreja: string;
  };
  respostas: Record<string, number>;
  resultados: {
    scoreGlobal: number;
    statusIgreja: {
      nome: string;
      descricao: string;
      cor: string;
      bg: string;
      border: string;
    };
    modo: string;
    dominios: Array<{
      id: string;
      nome: string;
      score: number;
    }>;
  };
  createdAt: string;
}

export async function listarDiagnosticos(): Promise<{ success: boolean; data: DiagnosticoItem[]; error?: string }> {
  try {
    const db = getAdminDb();
    const snap = await db.collection('diagnosticos_igrejas').orderBy('createdAt', 'desc').get();
    
    const data: DiagnosticoItem[] = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        identificacao: d.identificacao || {},
        respostas: d.respostas || {},
        resultados: d.resultados || {},
        createdAt: d.createdAt || '',
      };
    });

    return { success: true, data };
  } catch (error: any) {
    console.error('[listarDiagnosticos] Erro:', error);
    return { success: false, data: [], error: error.message };
  }
}
