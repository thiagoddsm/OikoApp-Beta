'use server';
import { getAdminDb } from '@/lib/firebase-admin';
import { ShapeResult } from '@/types/shape';
import { calculateShapeMetrics } from '@/types/shape';
import { SHAPE_DATA } from '@/lib/shape-complete-data';

function sanitize(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data?.toDate === 'function') return data.toDate().toISOString();
  if (typeof data?._seconds === 'number') return new Date(data._seconds * 1000).toISOString();
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(sanitize);
  if (typeof data === 'object') {
    const r: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) r[k] = sanitize(v);
    return r;
  }
  return data;
}

export async function getShapeResults(): Promise<ShapeResult[]> {
  try {
    const db = getAdminDb();
    const snap = await db.collection('shape_results').orderBy('createdAt', 'desc').get();
    return snap.docs.map(doc => {
      const d = doc.data();
      let top3 = d.top3;
      let domScores = d.domScores;

      // Resiliência: se o registro tem questões de dons respondidas mas top3 zerado, recalcula no ato
      const gifts = d.dom || {};
      if (Object.keys(gifts).length > 0 && (!top3 || top3.length === 0 || (top3[0]?.score || 0) === 0)) {
        const computed = calculateShapeMetrics(d.perso || {}, gifts);
        if (computed.top3 && computed.top3.length > 0 && computed.top3[0].score > 0) {
          top3 = computed.top3;
          domScores = computed.domScores;
        }
      }

      return {
        id: doc.id,
        ...sanitize(d),
        ...(top3 ? { top3: sanitize(top3) } : {}),
        ...(domScores ? { domScores: sanitize(domScores) } : {}),
      };
    }) as ShapeResult[];
  } catch (e) {
    console.error('getShapeResults error:', e);
    return [];
  }
}

export async function getMinistrySuggestions(): Promise<string[]> {
  try {
    const db = getAdminDb();
    const doc = await db.collection('app_config').doc('shape_settings').get();
    if (doc.exists) {
      const data = doc.data();
      if (Array.isArray(data?.ministrySuggestions) && data.ministrySuggestions.length > 0) {
        return data.ministrySuggestions;
      }
    }
  } catch (e) {
    console.error('Erro ao ler ministrySuggestions:', e);
  }
  return [
    'Louvor & Adoração',
    'Ensino & Discipulado',
    'Crianças (OikoKids)',
    'Acolhimento & Recepção',
    'Mídia, Som & Produção',
    'Ação Social & Misericórdia',
    'Liderança de GC',
    'Intercessão & Oração',
    'Gestão & Apoio',
  ];
}

export async function updateMinistrySuggestions(suggestions: string[]) {
  try {
    const clean = Array.from(new Set(suggestions.map(s => s.trim()).filter(Boolean)));
    const db = getAdminDb();
    await db.collection('app_config').doc('shape_settings').set({
      ministrySuggestions: clean,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return { success: true, suggestions: clean };
  } catch (e: any) {
    console.error('Erro ao salvar ministrySuggestions:', e);
    return { success: false, error: e.message || 'Falha ao salvar sugestões de ministérios.' };
  }
}
