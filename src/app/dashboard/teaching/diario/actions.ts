'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export type Lesson = {
  id: string;
  professor_id: string;
  professor_nome?: string;
  aluno_id: string;
  aluno_nome?: string;
  class_id?: string;
  course_id?: string;
  data_agendada: any;
  horario_inicio_agendado: string;
  horario_inicio_real?: any;
  horario_fim_real?: any;
  conteudo_ministrado?: string;
  status: 'agendada' | 'em_andamento' | 'concluida' | 'falta_aluno' | 'falta_professor';
};

export type PendingMakeup = {
  id: string;
  id_aula_original: string;
  professor_id: string;
  professor_nome?: string;
  aluno_id: string;
  aluno_nome?: string;
  class_id?: string;
  course_id?: string;
  motivo: 'falta_aluno' | 'falta_professor';
  status: 'pendente' | 'reagendada' | 'resolvida';
  criadoEm?: any;
  nova_aula_id?: string;
};

// Auxiliary to fetch active users mapping for names
async function getUsersMapping(db: any) {
  const usersSnap = await db.collection('users').get();
  const map = new Map<string, string>();
  usersSnap.docs.forEach((doc: any) => {
    map.set(doc.id, doc.data().name || 'Usuário');
  });
  return map;
}

export async function getLessonsAction(teacherId?: string) {
  try {
    const db = getAdminDb();
    let queryRef: any = db.collection('aulas');
    
    if (teacherId) {
      queryRef = queryRef.where('professor_id', '==', teacherId);
    }
    
    const snap = await queryRef.get();
    const usersMap = await getUsersMapping(db);
    
    const lessons: Lesson[] = snap.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        professor_id: data.professor_id,
        professor_nome: usersMap.get(data.professor_id) || data.professor_nome || 'Professor',
        aluno_id: data.aluno_id,
        aluno_nome: usersMap.get(data.aluno_id) || data.aluno_nome || 'Aluno',
        class_id: data.class_id,
        course_id: data.course_id,
        data_agendada: data.data_agendada ? (data.data_agendada.toDate ? data.data_agendada.toDate().toISOString() : data.data_agendada) : null,
        horario_inicio_agendado: data.horario_inicio_agendado || '00:00',
        horario_inicio_real: data.horario_inicio_real ? (data.horario_inicio_real.toDate ? data.horario_inicio_real.toDate().toISOString() : data.horario_inicio_real) : null,
        horario_fim_real: data.horario_fim_real ? (data.horario_fim_real.toDate ? data.horario_fim_real.toDate().toISOString() : data.horario_fim_real) : null,
        conteudo_ministrado: data.conteudo_ministrado,
        status: data.status || 'agendada'
      };
    });
    
    // Sort by scheduled date
    lessons.sort((a, b) => new Date(a.data_agendada).getTime() - new Date(b.data_agendada).getTime());
    
    return { success: true, data: lessons };
  } catch (error: any) {
    console.error('Error in getLessonsAction:', error);
    return { success: false, error: error.message };
  }
}

export async function startLessonAction(lessonId: string) {
  try {
    const db = getAdminDb();
    const docRef = db.collection('aulas').doc(lessonId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new Error('Aula não encontrada.');
    }
    
    const data = doc.data();
    if (!data) {
      throw new Error('Dados da aula vazios.');
    }
    if (data.status && data.status !== 'agendada') {
      throw new Error('Esta aula não pode ser iniciada.');
    }
    
    await docRef.update({
      horario_inicio_real: FieldValue.serverTimestamp(),
      status: 'em_andamento'
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error in startLessonAction:', error);
    return { success: false, error: error.message };
  }
}

export async function finishLessonAction(lessonId: string, conteudoMinistrado: string) {
  try {
    const db = getAdminDb();
    const docRef = db.collection('aulas').doc(lessonId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new Error('Aula não encontrada.');
    }
    
    const data = doc.data();
    if (!data) {
      throw new Error('Dados da aula vazios.');
    }
    if (data.status !== 'em_andamento') {
      throw new Error('Esta aula não está em andamento.');
    }
    
    if (!conteudoMinistrado || conteudoMinistrado.trim().length < 15) {
      throw new Error('O conteúdo ministrado deve conter pelo menos 15 caracteres.');
    }
    
    await docRef.update({
      horario_fim_real: FieldValue.serverTimestamp(),
      conteudo_ministrado: conteudoMinistrado.trim(),
      status: 'concluida'
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error in finishLessonAction:', error);
    return { success: false, error: error.message };
  }
}

export async function reportAbsenceAction(lessonId: string, motivo: 'falta_aluno' | 'falta_professor') {
  try {
    const db = getAdminDb();
    const docRef = db.collection('aulas').doc(lessonId);
    const lessonDoc = await docRef.get();
    
    if (!lessonDoc.exists) {
      throw new Error('Aula não encontrada.');
    }
    
    const data = lessonDoc.data();
    if (!data) {
      throw new Error('Dados da aula vazios.');
    }
    if (data.status !== 'agendada') {
      throw new Error('Só é possível registrar falta para aulas agendadas.');
    }
    
    // 1. Update lesson status
    await docRef.update({
      status: motivo
    });
    
    // 2. Automatically generate pending makeup
    const makeupRef = db.collection('reposicoes_pendentes').doc();
    await makeupRef.set({
      id_aula_original: lessonId,
      professor_id: data.professor_id,
      professor_nome: data.professor_nome || '',
      aluno_id: data.aluno_id,
      aluno_nome: data.aluno_nome || '',
      class_id: data.class_id || '',
      course_id: data.course_id || '',
      motivo: motivo,
      status: 'pendente',
      criadoEm: FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error in reportAbsenceAction:', error);
    return { success: false, error: error.message };
  }
}

export async function getPendingMakeupsAction() {
  try {
    const db = getAdminDb();
    const snap = await db.collection('reposicoes_pendentes').get();
    const usersMap = await getUsersMapping(db);
    
    const makeups: PendingMakeup[] = snap.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        id_aula_original: data.id_aula_original,
        professor_id: data.professor_id,
        professor_nome: usersMap.get(data.professor_id) || data.professor_nome || 'Professor',
        aluno_id: data.aluno_id,
        aluno_nome: usersMap.get(data.aluno_id) || data.aluno_nome || 'Aluno',
        class_id: data.class_id,
        course_id: data.course_id,
        motivo: data.motivo,
        status: data.status || 'pendente',
        criadoEm: data.criadoEm ? (data.criadoEm.toDate ? data.criadoEm.toDate().toISOString() : data.criadoEm) : null,
        nova_aula_id: data.nova_aula_id
      };
    });
    
    return { success: true, data: makeups };
  } catch (error: any) {
    console.error('Error in getPendingMakeupsAction:', error);
    return { success: false, error: error.message };
  }
}

export async function rescheduleMakeupAction(makeupId: string, dataAgendada: string, horarioInicioAgendado: string) {
  try {
    const db = getAdminDb();
    const makeupRef = db.collection('reposicoes_pendentes').doc(makeupId);
    const makeupDoc = await makeupRef.get();
    
    if (!makeupDoc.exists) {
      throw new Error('Registro de reposição não encontrado.');
    }
    
    const mData = makeupDoc.data();
    if (!mData) {
      throw new Error('Dados da reposição vazios.');
    }
    if (mData.status !== 'pendente') {
      throw new Error('Esta reposição já foi reagendada ou resolvida.');
    }
    
    // 1. Create new rescheduled lesson in 'aulas'
    const newLessonRef = db.collection('aulas').doc();
    const dateObj = new Date(`${dataAgendada}T12:00:00`);
    
    await newLessonRef.set({
      professor_id: mData.professor_id,
      professor_nome: mData.professor_nome || '',
      aluno_id: mData.aluno_id,
      aluno_nome: mData.aluno_nome || '',
      class_id: mData.class_id || '',
      course_id: mData.course_id || '',
      data_agendada: Timestamp.fromDate(dateObj),
      horario_inicio_agendado: horarioInicioAgendado,
      status: 'agendada',
      criadoEm: FieldValue.serverTimestamp()
    });
    
    // 2. Mark makeup as resolved/reagendada
    await makeupRef.update({
      status: 'reagendada',
      nova_aula_id: newLessonRef.id
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error in rescheduleMakeupAction:', error);
    return { success: false, error: error.message };
  }
}
