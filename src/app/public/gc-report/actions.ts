'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Converte recursivamente Timestamps do Firestore e objetos nÃ£o-planos em dados primitivos/JSON.
 */
function sanitizeFirestoreData<T = any>(data: any): T {
  if (data === null || data === undefined) return data;
  if (typeof data.toDate === 'function') {
    try {
      return data.toDate().toISOString() as any;
    } catch {
      return null as any;
    }
  }
  if (typeof data._seconds === 'number' && typeof data._nanoseconds === 'number') {
    try {
      return new Date(data._seconds * 1000 + Math.round(data._nanoseconds / 1000000)).toISOString() as any;
    } catch {
      return null as any;
    }
  }
  if (data instanceof Date) {
    return data.toISOString() as any;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeFirestoreData) as any;
  }
  if (typeof data === 'object') {
    const plain: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      plain[key] = sanitizeFirestoreData(value);
    }
    return plain as any;
  }
  return data;
}

const DAY_MAP: Record<string, number> = {
  'Domingo': 0, 'Segunda-feira': 1, 'TerÃ§a-feira': 2, 'Quarta-feira': 3,
  'Quinta-feira': 4, 'Sexta-feira': 5, 'SÃ¡bado': 6,
};

function calculateLastMeetingDate(meetingDay?: string): string {
  if (!meetingDay || DAY_MAP[meetingDay] === undefined) {
    return new Date().toISOString().split('T')[0];
  }
  const targetDay = DAY_MAP[meetingDay];
  const today = new Date();
  const daysBack = (today.getDay() - targetDay + 7) % 7;
  const date = new Date(today);
  date.setDate(today.getDate() - daysBack);
  return date.toISOString().split('T')[0];
}

/**
 * Valida o e-mail do lÃ­der ou secretÃ¡rio e retorna a cÃ©lula e seus membros ativos.
 */
export async function verifyLeaderAccess(email: string, cellIdParam?: string) {
  try {
    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Por favor, informe um endereÃ§o de e-mail vÃ¡lido.' };
    }

    const db = getAdminDb();

    // 1. Localizar o usuÃ¡rio pelo e-mail
    const usersSnap = await db.collection('users').where('email', '==', cleanEmail).get();
    if (usersSnap.empty) {
      return { 
        success: false, 
        error: 'E-mail nÃ£o encontrado no cadastro da igreja. Verifique a digitaÃ§Ã£o ou entre em contato com seu supervisor.' 
      };
    }

    const userDoc = usersSnap.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // 2. Localizar cÃ©lulas onde este usuÃ¡rio Ã© lÃ­der, co-lÃ­der ou secretÃ¡rio
    const cellsSnap = await db.collection('cells').get();
    const matchedCells: any[] = [];

    cellsSnap.forEach(doc => {
      const c = doc.data();
      const status = c.status || 'active';
      if (status !== 'active' && status !== 'growing') return;

      const isLeader = c.liderId === userId || c.liderCasalId === userId;
      const isSecretary = c.secretariaId === userId || c.secretarioId === userId;
      const isCoLeader = Array.isArray(c.coLiderIds) && c.coLiderIds.includes(userId);

      if (isLeader || isSecretary || isCoLeader) {
        let role = 'LÃ­der';
        if (isSecretary) role = 'SecretÃ¡rio(a)';
        else if (isCoLeader) role = 'Co-lÃ­der';

        matchedCells.push({
          id: doc.id,
          nome: c.nome || c.name || 'CÃ©lula',
          role,
          meetingDay: c.meetingDay || '',
          meetingTime: c.meetingTime || '',
          supervisorId: c.supervisorId || c.areaId || null,
          liderId: c.liderId || userId
        });
      }
    });

    if (matchedCells.length === 0) {
      return { 
        success: false, 
        error: 'Nenhum GC ativo foi encontrado vinculado ao seu e-mail como LÃ­der, Co-lÃ­der ou SecretÃ¡rio(a).' 
      };
    }

    // Se houver parÃ¢metro cellId e ele pertencer a este lÃ­der, seleciona diretamente
    let targetCell = matchedCells[0];
    if (cellIdParam) {
      const foundParam = matchedCells.find(c => c.id === cellIdParam);
      if (foundParam) targetCell = foundParam;
    }

    // Se houver mÃºltiplas cÃ©lulas e nenhuma foi explicitamente escolhida pelo cellIdParam
    if (matchedCells.length > 1 && (!cellIdParam || !matchedCells.some(c => c.id === cellIdParam))) {
      return JSON.parse(JSON.stringify({
        success: true,
        multipleCells: true,
        cells: matchedCells.map(sanitizeFirestoreData),
        user: {
          id: userId,
          name: userData.name || 'LÃ­der',
          email: cleanEmail
        }
      }));
    }

    // 3. Buscar membros oficiais da cÃ©lula selecionada (users com hierarchy.celulaId == cellId)
    const membersSnap = await db.collection('users')
      .where('hierarchy.celulaId', '==', targetCell.id)
      .get();

    const members: Array<{ id: string; name: string; photoURL?: string; phone?: string }> = [];
    membersSnap.forEach(snap => {
      const data = snap.data();
      members.push({
        id: snap.id,
        name: data.name || 'Membro',
        photoURL: data.photoURL || '',
        phone: data.phone || data.phoneNumber || ''
      });
    });

    // Ordenar alfabeticamente
    members.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    const defaultMeetingDate = calculateLastMeetingDate(targetCell.meetingDay);

    return JSON.parse(JSON.stringify({
      success: true,
      multipleCells: false,
      cell: sanitizeFirestoreData(targetCell),
      members: sanitizeFirestoreData(members),
      user: {
        id: userId,
        name: userData.name || 'LÃ­der',
        email: cleanEmail,
        role: targetCell.role
      },
      defaultMeetingDate
    }));
  } catch (error: any) {
    console.error('[Public GC Report] Error verifying leader access:', error);
    return { success: false, error: 'Ocorreu um erro no servidor ao validar seu e-mail.' };
  }
}

export interface SubmitPublicReportPayload {
  cellId: string;
  userEmail: string;
  userId: string;
  userName: string;
  userRole?: string;
  reportDate: string;
  status: 'realizada' | 'postponed' | 'cancelled';
  novaData?: string;
  motivoCancelamento?: string;
  attendance: Array<{
    membroId: string;
    membroNome: string;
    status: 'presente' | 'ausente_justificado' | 'ausente_sem_justificativa';
    termometro: number | null;
    pedidoOracao: string;
    observacaoCuidado: string;
  }>;
  metricas: {
    licao: string;
    visitantes: string;
    visitantesPreRegistrados?: { id: string; name: string; phone?: string }[];
    conversoes: number;
    oferta?: number;
  };
  feedback?: string;
}

/**
 * Salva o relatÃ³rio pÃºblico de GC nas coleÃ§Ãµes oficiais reuniao_logs e presencas_historico.
 */
export async function submitPublicGcReport(payload: SubmitPublicReportPayload) {
  try {
    const { cellId, userEmail, userId, userName, reportDate, status } = payload;
    if (!cellId || !userEmail || !reportDate) {
      return { success: false, error: 'ParÃ¢metros obrigatÃ³rios ausentes para envio do relatÃ³rio.' };
    }

    const db = getAdminDb();
    const cellSnap = await db.collection('cells').doc(cellId).get();
    if (!cellSnap.exists) {
      return { success: false, error: 'CÃ©lula de destino nÃ£o encontrada.' };
    }
    const cellData = cellSnap.data()!;
    const now = Timestamp.now();
    const batch = db.batch();

    const logRef = db.collection('reuniao_logs').doc();

    if (status === 'postponed') {
      // ReuniÃ£o Adiada
      const newDateText = payload.novaData || 'A definir';
      batch.set(logRef, {
        cellId,
        cellNome: cellData.nome || 'CÃ©lula',
        date: reportDate,
        liderId: cellData.liderId || userId,
        supervisorId: cellData.supervisorId || cellData.areaId || null,
        statusReuniao: 'postponed',
        novaData: newDateText,
        respondente: { id: userId, name: userName, email: userEmail, origem: 'web_public' },
        metricas: {
          totalMembrosAtivos: payload.attendance?.length || 0,
          presentes: 0,
          ausentesJustificados: 0,
          ausentesSemJustificativa: 0,
          visitantes: 0,
          conversoes: 0,
          oferta: 0
        },
        feedbackAoSupervisor: `ReuniÃ£o remarcada/adiada para: ${newDateText}`,
        createdAt: now,
        updatedAt: now
      });

      // TambÃ©m em gc_reuniao_logs para compatibilidade
      batch.set(db.collection('gc_reuniao_logs').doc(logRef.id), {
        cellId,
        date: reportDate,
        liderId: cellData.liderId || userId,
        statusReuniao: 'postponed',
        novaData: newDateText,
        createdAt: now
      });
    } else if (status === 'cancelled') {
      // ReuniÃ£o Cancelada
      const reason = payload.motivoCancelamento || 'NÃ£o informado';
      batch.set(logRef, {
        cellId,
        cellNome: cellData.nome || 'CÃ©lula',
        date: reportDate,
        liderId: cellData.liderId || userId,
        supervisorId: cellData.supervisorId || cellData.areaId || null,
        statusReuniao: 'cancelled',
        motivoCancelamento: reason,
        respondente: { id: userId, name: userName, email: userEmail, origem: 'web_public' },
        metricas: {
          totalMembrosAtivos: payload.attendance?.length || 0,
          presentes: 0,
          ausentesJustificados: 0,
          ausentesSemJustificativa: 0,
          visitantes: 0,
          conversoes: 0,
          oferta: 0
        },
        feedbackAoSupervisor: `ReuniÃ£o cancelada. Motivo: ${reason}`,
        createdAt: now,
        updatedAt: now
      });

      // TambÃ©m em gc_reuniao_logs para compatibilidade
      batch.set(db.collection('gc_reuniao_logs').doc(logRef.id), {
        cellId,
        date: reportDate,
        liderId: cellData.liderId || userId,
        statusReuniao: 'cancelled',
        motivoCancelamento: reason,
        createdAt: now
      });
    } else {
      // ReuniÃ£o Realizada (Completa)
      let presentes = 0;
      let ausentesJustificados = 0;
      let ausentesSemJust = 0;

      (payload.attendance || []).forEach(att => {
        if (att.status === 'presente') presentes++;
        else if (att.status === 'ausente_justificado') ausentesJustificados++;
        else ausentesSemJust++;
      });

      const visitantesCount = (payload.metricas.visitantes || '')
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0).length;

      const logData: any = {
        cellId,
        cellNome: cellData.nome || 'CÃ©lula',
        date: reportDate,
        liderId: cellData.liderId || userId,
        supervisorId: cellData.supervisorId || cellData.areaId || null,
        respondente: { id: userId, name: userName, email: userEmail, origem: 'web_public' },
        metricas: {
          totalMembrosAtivos: payload.attendance?.length || 0,
          presentes,
          ausentesJustificados,
          ausentesSemJustificativa: ausentesSemJust,
          visitantes: visitantesCount,
          conversoes: Number(payload.metricas.conversoes || 0),
          oferta: Number(payload.metricas.oferta || 0)
        },
        licaoMinistrada: payload.metricas.licao || '',
        visitantesNomes: payload.metricas.visitantes || '',
          visitantesPreRegistrados: payload.metricas.visitantesPreRegistrados || [],
        feedbackAoSupervisor: payload.feedback || '',
        createdAt: now,
        updatedAt: now
      };

      batch.set(logRef, logData);

      // Registros individuais em presencas_historico
      (payload.attendance || []).forEach(att => {
        const presRef = db.collection('presencas_historico').doc();
        batch.set(presRef, {
          reuniaoLogId: logRef.id,
          cellId,
          membroId: att.membroId,
          membroNome: att.membroNome,
          date: reportDate,
          status: att.status,
          termometro: att.termometro ?? null,
          pedidoOracao: att.pedidoOracao || null,
          observacaoCuidado: att.observacaoCuidado || att.pedidoOracao || null,
          createdAt: now
        });
      });
    }

    // Commit no banco
    await batch.commit();

    
    // 3.5. Atualizar estágio do Kanban (Processos) para Membros e Visitantes
    try {
      // Membros presentes
      const presentMembers = payload.attendance?.filter(a => a.status === 'presente') || [];
      const checkMembros = presentMembers.map(async (member) => {
        if (!member.membroId) return;
        const processosSnap = await db.collection('users').doc(member.membroId).collection('processos')
          .where('processType', '==', 'GC')
          .where('status', '==', 'ACTIVE')
          .get();
        if (!processosSnap.empty) {
          const procDoc = processosSnap.docs[0];
          const procData = procDoc.data();
          let newStage = null;
          if (procData.currentStage === 'AGUARDANDO_CONTATO') {
            newStage = 'EM_VISITA';
          } else if (procData.currentStage === 'EM_VISITA') {
            const histSnap = await db.collection('presencas_historico')
              .where('membroId', '==', member.membroId)
              .where('cellId', '==', cellId)
              .where('status', '==', 'presente')
              .get();
            if (histSnap.size >= 4) {
              newStage = 'INTEGRADO_GC';
            }
          }
          if (newStage) {
            await procDoc.ref.update({ currentStage: newStage, updatedAt: Timestamp.now() });
          }
        }
      });
      await Promise.all(checkMembros);

      // Visitantes pré-registrados presentes
      const presentPreRegistered = payload.metricas.visitantesPreRegistrados?.filter(v => (v as any).presente === true) || [];
      if (presentPreRegistered.length > 0) {
        // Buscar a célula para atualizar o attendedDates dos visitantes
        const cellDocForVisitors = await db.collection('cells').doc(cellId).get();
        const cellVisitors: any[] = cellDocForVisitors.exists ? (cellDocForVisitors.data()?.visitors || []) : [];
        let updatedCellVisitors = [...cellVisitors];

        const checkExpected = presentPreRegistered.map(async (visitor: any) => {
          if (!visitor.id) return;

          // 1. Atualizar attendedDates no array cell.visitors
          updatedCellVisitors = updatedCellVisitors.map((v: any) => {
            if (v.id === visitor.id) {
              const attended = v.attendedDates || [];
              if (!attended.includes(reportDate)) {
                return { ...v, attendedDates: [...attended, reportDate] };
              }
            }
            return v;
          });

          // 2. Verificar promoção para membro
          const visitorInCell = updatedCellVisitors.find((v: any) => v.id === visitor.id);
          if (visitorInCell && (visitorInCell.attendedDates || []).length >= 4) {
            const userSnap = await db.collection('users').doc(visitor.id).get();
            if (userSnap.exists) {
              const userData = userSnap.data()!;
              if (userData.hierarchy?.role === 'visitante' || userData.situacaoCaminhada === 'VISITANTE') {
                await db.collection('users').doc(visitor.id).update({
                  'hierarchy.role': 'membro',
                  'hierarchy.updatedAt': Timestamp.now(),
                  'situacaoCaminhada': 'EM_INTEGRACAO'
                });
                
                // Mover de cell.visitors para cell.members
                const finalCellDoc = await db.collection('cells').doc(cellId).get();
                const currentMembers = finalCellDoc.data()?.members || [];
                const currentVisitors = finalCellDoc.data()?.visitors || [];
                
                await db.collection('cells').doc(cellId).update({
                  members: [...currentMembers, visitor.id],
                  visitors: currentVisitors.filter((v: any) => v.id !== visitor.id)
                });
                // Remove dos visitantes para não ser salvo de volta no passo final
                updatedCellVisitors = updatedCellVisitors.filter((v: any) => v.id !== visitor.id);
              }
            }
          }

          // 3. Atualizar Kanban
          const processosSnap = await db.collection('users').doc(visitor.id).collection('processos')
            .where('processType', '==', 'GC')
            .where('status', '==', 'ACTIVE')
            .get();
          
          if (!processosSnap.empty) {
            const procDoc = processosSnap.docs[0];
            const procData = procDoc.data();
            let newStage = null;
            if (procData.currentStage === 'AGUARDANDO_CONTATO') {
              newStage = 'EM_VISITA';
            } else if (procData.currentStage === 'EM_VISITA') {
              const attendedCount = (visitorInCell?.attendedDates || []).length;
              if (attendedCount >= 4) {
                newStage = 'INTEGRADO_GC';
              }
            }
            if (newStage) {
              await procDoc.ref.update({ currentStage: newStage, updatedAt: Timestamp.now() });
            }
          }
        });
        await Promise.all(checkExpected);

        // Salvar visitors atualizados na célula
        await db.collection('cells').doc(cellId).update({ visitors: updatedCellVisitors });
      }
    } catch (kanbanErr) {
      console.warn('[Public GC Report] Error updating kanban stages:', kanbanErr);
    }

    // 4. Limpar sessões ativas do bot de WhatsApp desta célula para evitar mensagens duplicadas
    try {
      const sessionsSnap = await db.collection('gc_report_sessions').where('cellId', '==', cellId).get();
      if (!sessionsSnap.empty) {
        const sessionBatch = db.batch();
        sessionsSnap.docs.forEach(sDoc => sessionBatch.delete(sDoc.ref));
        await sessionBatch.commit();
      }
    } catch (sessionErr) {
      console.warn('[Public GC Report] Error clearing active WhatsApp session:', sessionErr);
    }

    return { success: true, logId: logRef.id };
  } catch (error: any) {
    console.error('[Public GC Report] Error submitting report:', error);
    return { success: false, error: error.message || 'Erro ao gravar relatório no servidor.' };
  }
}

