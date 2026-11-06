'use server';
import { getAdminDb } from '@/lib/firebase-admin';
import { ShapeResult, MinistryProfile } from '@/types/shape';
import { calculateShapeMetrics } from '@/types/shape';
import { SHAPE_DATA } from '@/lib/shape-complete-data';
import { DEFAULT_MINISTRY_PROFILES } from '@/lib/ministry-benchmarks';

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

export async function getMinistryProfiles(): Promise<MinistryProfile[]> {
  try {
    const db = getAdminDb();
    const doc = await db.collection('app_config').doc('shape_settings').get();
    if (doc.exists) {
      const data = doc.data();
      if (Array.isArray(data?.ministryProfiles) && data.ministryProfiles.length > 0) {
        return data.ministryProfiles as MinistryProfile[];
      }
      // Se tiver apenas ministrySuggestions salvas, mescla com as descrições default
      if (Array.isArray(data?.ministrySuggestions) && data.ministrySuggestions.length > 0) {
        return data.ministrySuggestions.map((name: string) => {
          const found = DEFAULT_MINISTRY_PROFILES.find(
            p => p.nome.toLowerCase() === name.toLowerCase() || p.id.toLowerCase() === name.toLowerCase()
          );
          if (found) return found;
          return {
            id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            nome: name,
            descricao: '',
            expectativas: '',
            discRecomendado: [],
            donsRecomendados: [],
          };
        });
      }
    }
  } catch (e) {
    console.error('Erro ao ler ministryProfiles:', e);
  }
  return DEFAULT_MINISTRY_PROFILES;
}

export async function updateMinistryProfiles(profiles: MinistryProfile[]) {
  try {
    const cleanProfiles = profiles.map(p => ({
      ...p,
      id: p.id || p.nome.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      nome: p.nome.trim(),
      descricao: p.descricao?.trim() || '',
      expectativas: p.expectativas?.trim() || '',
      discRecomendado: Array.isArray(p.discRecomendado) ? p.discRecomendado : [],
      quadranteRecomendado: p.quadranteRecomendado || '',
      donsRecomendados: Array.isArray(p.donsRecomendados) ? p.donsRecomendados : [],
      habilidadesRecomendadas: p.habilidadesRecomendadas?.trim() || '',
    }));

    const cleanNames = Array.from(new Set(cleanProfiles.map(p => p.nome).filter(Boolean)));
    const db = getAdminDb();
    await db.collection('app_config').doc('shape_settings').set({
      ministryProfiles: cleanProfiles,
      ministrySuggestions: cleanNames,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return { success: true, profiles: cleanProfiles, suggestions: cleanNames };
  } catch (e: any) {
    console.error('Erro ao salvar ministryProfiles:', e);
    return { success: false, error: e.message || 'Falha ao salvar perfis dos ministérios.' };
  }
}

export async function getMinistrySuggestions(): Promise<string[]> {
  try {
    const db = getAdminDb();
    const doc = await db.collection('app_config').doc('shape_settings').get();
    if (doc.exists) {
      const data = doc.data();
      if (Array.isArray(data?.ministryProfiles) && data.ministryProfiles.length > 0) {
        return (data.ministryProfiles as MinistryProfile[]).map(p => p.nome);
      }
      if (Array.isArray(data?.ministrySuggestions) && data.ministrySuggestions.length > 0) {
        return data.ministrySuggestions;
      }
    }
  } catch (e) {
    console.error('Erro ao ler ministrySuggestions:', e);
  }
  return DEFAULT_MINISTRY_PROFILES.map(p => p.nome);
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
