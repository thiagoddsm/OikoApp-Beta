'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getPublicGCs as getEnrollmentPublicGCs } from '@/app/public/enrollment/actions';
import { SHAPE_DATA } from '@/lib/shape-complete-data';
import { calculateShapeCompletion, calculateShapeMetrics } from '@/types/shape';
import { sanitizeDiscAnswers, DISC_VERSION, type DiscLetter } from '@/lib/disc';

export async function getPublicGCs() {
  return getEnrollmentPublicGCs();
}

function sanitizeFirestoreData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data?.toDate === 'function') return data.toDate().toISOString();
  if (typeof data?._seconds === 'number') return new Date(data._seconds * 1000).toISOString();
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(sanitizeFirestoreData);
  if (typeof data === 'object') {
    const r: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) r[k] = sanitizeFirestoreData(v);
    return r;
  }
  return data;
}

const DEFAULT_MINISTRY_SUGGESTIONS = [
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

/**
 * Obtém as opções de ministérios / áreas de vocação configuradas
 */
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
    return DEFAULT_MINISTRY_SUGGESTIONS;
  } catch (e) {
    console.error('Erro ao buscar sugestões de ministérios:', e);
    return DEFAULT_MINISTRY_SUGGESTIONS;
  }
}

/**
 * Localiza o membro cadastrado no sistema por e-mail (imprescindível possuir userId)
 * e retorna eventual progresso já salvo no Molde de Servo.
 */
export async function lookupMemberByEmail(email: string) {
  try {
    if (!email || !email.includes('@')) {
      return { found: false, error: 'E-mail inválido' };
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = getAdminDb();

    let snap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();
    if (snap.empty && email.trim() !== cleanEmail) {
      snap = await db.collection('users').where('email', '==', email.trim()).limit(1).get();
    }

    if (snap.empty) {
      return { found: false };
    }

    const userDoc = snap.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Máscaras de privacidade
    const maskName = (name: string) => {
      if (!name) return '';
      return name
        .split(' ')
        .map((part) => {
          if (part.length <= 1) return part;
          return part[0] + '*'.repeat(part.length - 1);
        })
        .join(' ');
    };

    const maskPhone = (phone: any) => {
      if (!phone) return '';
      const digits = String(phone).replace(/\D/g, '');
      if (digits.length < 4) return '****';
      return `(${digits.substring(0, 2)}) *****-${digits.slice(-2)}`;
    };

    // Verifica se já existe progresso salvo para este userId
    let savedProgress: any = null;
    const directDoc = await db.collection('shape_results').doc(userId).get();
    let existingDocData: any = null;
    let existingDocId = userId;

    if (directDoc.exists) {
      existingDocData = sanitizeFirestoreData(directDoc.data());
    } else {
      const existingQuery = await db
        .collection('shape_results')
        .where('userId', '==', userId)
        .limit(1)
        .get();
      if (!existingQuery.empty) {
        const docSnap = existingQuery.docs[0];
        existingDocId = docSnap.id;
        existingDocData = sanitizeFirestoreData(docSnap.data());
      }
    }

    if (existingDocData) {
      const d = existingDocData;
      const completion = calculateShapeCompletion(d);
      savedProgress = {
        id: existingDocId,
        status: d.status || 'in_progress',
        // Fluxo antigo (7 passos): concluído = 7; novo (8 passos): concluído = 8
        currentStep: d.status === 'completed' ? 8 : d.currentStep || 2,
        completionPercentage: d.completionPercentage ?? completion.percentage,
        abilities: d.habilidades || [],
        availability:
          d.disponibilidade ||
          (d.experiencias?.availability
            ? String(d.experiencias.availability).split(', ').filter(Boolean)
            : []),
        experiences: d.experiencias || {},
        heart: d.coracao || {},
        personality: d.perso || {},
        discAnswers: sanitizeDiscAnswers(d.discAnswers),
        hasLegacyPersonality:
          !!d.perso && Object.keys(d.perso).length >= 14 && !d.discPrimary,
        legacyQuadrante: !d.discPrimary ? d.quadrante || '' : '',
        gifts: d.dom || {},
        targetMinistry: d.ministryTarget || '',
      };
    }

    return {
      found: true,
      userId,
      realName: userData.name || '',
      maskedName: maskName(userData.name || ''),
      realPhone: userData.phone || '',
      maskedPhone: maskPhone(userData.phone || ''),
      gcId: userData.cellId || userData.gcId || '',
      gcName: userData.cellName || userData.gcName || '',
      savedProgress,
    };
  } catch (error: any) {
    console.error('Erro ao buscar membro por e-mail no Molde de Servo:', error);
    return { found: false, error: 'Falha ao consultar base de membros.' };
  }
}

export interface SaveShapeStepPayload {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  gcId?: string;
  gcName?: string;
  targetMinistry?: string;
  abilities?: string[];
  availability?: string[];
  heart?: Record<string, string>;
  /** LEGADO (escalas O/E): apenas repassado para preservar registros antigos */
  personality?: Record<string, number>;
  /** DISC: { Q1: ['D', 'I', 'S', 'C'], Q2: ... } */
  discAnswers?: Record<string, DiscLetter[]> | Record<string, string>;
  gifts?: Record<string, number>;
  experiences?: Record<string, string>;
  currentStep: number;
  status: 'in_progress' | 'completed';
}

/**
 * Salva o progresso de uma etapa (ou conclusão final) do Molde de Servo,
 * exigindo vínculo estrito com um userId válido da coleção 'users'.
 */
export async function saveShapeStepProgress(data: SaveShapeStepPayload) {
  try {
    if (!data.userId) {
      return {
        success: false,
        error: 'Vínculo de usuário obrigatório. Identifique seu cadastro antes de continuar.',
      };
    }

    const db = getAdminDb();
    const userRef = db.collection('users').doc(data.userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return {
        success: false,
        error: 'Usuário não encontrado na base do sistema.',
      };
    }

    const u = userDoc.data()!;
    const finalName = u.name || data.name || '';
    const finalPhone = u.phone || data.phone || '';
    const finalEmail = (u.email || data.email || '').toLowerCase().trim();
    const finalGcId = data.gcId || u.cellId || u.gcId || '';
    const finalGcName = data.gcName || u.cellName || u.gcName || '';

    const metrics = calculateShapeMetrics(data.personality || {}, data.gifts || {}, data.discAnswers);
    const disc = metrics.disc;

    const experiencesWithAvail = {
      ...(data.experiences || {}),
      ...(data.availability && data.availability.length > 0
        ? { availability: data.availability.join(', ') }
        : {}),
    };

    const completion = calculateShapeCompletion({
      coracao: data.heart,
      dom: data.gifts,
      perso: data.personality,
      discAnswers: disc.discAnswers,
      habilidades: data.abilities,
      disponibilidade: data.availability,
      experiencias: experiencesWithAvail,
      status: data.status,
    });

    const docRef = db.collection('shape_results').doc(data.userId);
    const existingSnap = await docRef.get();

    const now = Timestamp.now();
    const payload: Record<string, any> = {
      userId: data.userId,
      nome: finalName,
      email: finalEmail,
      telefone: finalPhone,
      gcId: finalGcId,
      gcInfo: finalGcName,
      ministryTarget: data.targetMinistry || '',
      habilidades: data.abilities || [],
      coracao: data.heart || {},
      experiencias: experiencesWithAvail,
      dom: data.gifts || {},
      domScores: metrics.domScores,
      top3: metrics.top3,
      currentStep: data.currentStep,
      status: data.status,
      completionPercentage: completion.percentage,
      updatedAt: now,
    };

    // Só sobrescreve a disponibilidade se ela foi enviada (evita apagar em autosaves parciais)
    if (data.availability !== undefined) {
      payload.disponibilidade = data.availability;
    }

    // DISC (novo pilar P)
    if (disc.discAnsweredCount > 0) {
      payload.discAnswers = disc.discAnswers;
      payload.discScores = disc.discScores;
      payload.discAnsweredCount = disc.discAnsweredCount;
      payload.discVersion = DISC_VERSION;
      payload.discPrimary = disc.discPrimary;
      payload.discSecondary = disc.discSecondary;
      payload.discProfile = disc.discProfile;
      payload.discTie = disc.discTie;
      payload.discStrength = disc.discStrength;
    }

    // Quadrante: derivado do DISC (quando completo) ou mantido do legado (escalas O/E)
    if (metrics.quadrante) {
      payload.quadrante = metrics.quadrante;
    }
    if (disc.discAnsweredCount === 0 && data.personality && Object.keys(data.personality).length > 0) {
      payload.perso = data.personality;
      payload.orgScore = metrics.orgScore;
      payload.motScore = metrics.motScore;
    }

    if (!existingSnap.exists) {
      payload.createdAt = now;
      payload.aiAnalysis = null;
    }

    await docRef.set(payload, { merge: true });

    // Atualiza também o registro do usuário em 'users' para rastreio rápido
    await userRef.set(
      {
        shapeStatus: data.status,
        shapeCurrentStep: data.currentStep,
        shapeCompletionPercentage: completion.percentage,
        ...(metrics.quadrante ? { shapeQuadrante: metrics.quadrante } : {}),
        ...(disc.discPrimary
          ? { shapeDiscPrimary: disc.discPrimary, shapeDiscSecondary: disc.discSecondary }
          : {}),
        shapeTopGifts: metrics.top3.map((g) => g.nome),
        shapeUpdatedAt: now,
      },
      { merge: true }
    );

    return {
      success: true,
      id: data.userId,
      metrics,
      completionPercentage: completion.percentage,
    };
  } catch (e: any) {
    console.error('Erro ao salvar progresso do Molde de Servo:', e);
    return {
      success: false,
      error: e.message || 'Erro ao salvar progresso da avaliação.',
    };
  }
}

/**
 * Chamada para submissão final do Step5Result (Cartão do Servo)
 */
export async function submitShapeAssessment(data: {
  userId?: string | null;
  name: string;
  email: string;
  phone?: string;
  gcId?: string;
  gcName?: string;
  targetMinistry?: string;
  abilities?: string[];
  availability?: string[];
  heart?: Record<string, string>;
  personality?: Record<string, number>;
  discAnswers?: Record<string, DiscLetter[]> | Record<string, string>;
  gifts?: Record<string, number>;
  experiences?: Record<string, string>;
  quadrant?: string;
  topGifts?: Array<{ id: string; name: string; score: number; desc?: string }>;
}) {
  if (!data.userId) {
    return {
      success: false,
      error: 'ID de usuário do sistema é obrigatório para salvar o resultado.',
    };
  }

  return saveShapeStepProgress({
    userId: data.userId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    gcId: data.gcId,
    gcName: data.gcName,
    targetMinistry: data.targetMinistry,
    abilities: data.abilities,
    availability: data.availability,
    heart: data.heart,
    personality: data.personality,
    discAnswers: data.discAnswers,
    gifts: data.gifts,
    experiences: data.experiences,
    currentStep: 8,
    status: 'completed',
  });
}
