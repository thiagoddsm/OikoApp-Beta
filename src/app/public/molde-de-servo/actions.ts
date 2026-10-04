'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getPublicGCs as getEnrollmentPublicGCs } from '@/app/public/enrollment/actions';

export async function getPublicGCs() {
  return getEnrollmentPublicGCs();
}

/**
 * Localiza o membro por e-mail, igual ao fluxo de inscrição em cursos e eventos.
 */
export async function lookupMemberByEmail(email: string) {
  try {
    if (!email || !email.includes('@')) {
      return { found: false, error: 'E-mail inválido' };
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = getAdminDb();
    const snap = await db.collection('users').where('email', '==', cleanEmail).limit(1).get();

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

    return {
      found: true,
      userId,
      realName: userData.name || '',
      maskedName: maskName(userData.name || ''),
      realPhone: userData.phone || '',
      maskedPhone: maskPhone(userData.phone || ''),
      gcId: userData.cellId || userData.gcId || '',
      gcName: userData.cellName || userData.gcName || '',
    };
  } catch (error: any) {
    console.error('Erro ao buscar membro por e-mail no Molde de Servo:', error);
    return { found: false, error: 'Falha ao consultar base de membros.' };
  }
}

/**
 * Salva o resultado do teste Molde de Servo
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
  heart?: Record<string, string>;
  personality?: Record<string, number>;
  gifts?: Record<string, number>;
  quadrant?: string;
  topGifts?: Array<{ id: string; name: string; score: number; desc?: string }>;
}) {
  try {
    const db = getAdminDb();
    let finalName = data.name;
    let finalPhone = data.phone;
    const finalEmail = data.email.toLowerCase().trim();

    if (data.userId) {
      const userDoc = await db.collection('users').doc(data.userId).get();
      if (userDoc.exists) {
        const u = userDoc.data()!;
        finalName = u.name || finalName;
        finalPhone = u.phone || finalPhone;
      }
    }

    const docRef = await db.collection('shape_results').add({
      userId: data.userId || null,
      nome: finalName,
      email: finalEmail,
      telefone: finalPhone || '',
      gcId: data.gcId || '',
      gcInfo: data.gcName || '',
      ministryTarget: data.targetMinistry || '',
      habilidades: data.abilities || [],
      coracao: data.heart || {},
      perso: data.personality || {},
      dom: data.gifts || {},
      quadrante: data.quadrant || 'Pessoas / Informal',
      top3: data.topGifts || [],
      createdAt: Timestamp.now(),
      aiAnalysis: null,
    });

    return { success: true, id: docRef.id };
  } catch (e: any) {
    console.error('Erro ao salvar avaliação do Molde de Servo:', e);
    return { success: false, error: e.message || 'Erro ao salvar avaliação.' };
  }
}
