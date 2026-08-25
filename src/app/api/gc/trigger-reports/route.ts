import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { startGcReportSession } from '@/lib/gc-report-bot';

export const runtime = 'nodejs';

function formatWhatsAppNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) return `55${cleaned}`;
  if (cleaned.length === 10) return `55${cleaned.substring(0, 2)}9${cleaned.substring(2)}`;
  if (!cleaned.startsWith('55') && cleaned.length > 0) return `55${cleaned}`;
  return cleaned;
}

/**
 * POST /api/gc/trigger-reports
 * Dispara o envio de relatórios de GC via WhatsApp para todos os líderes ativos que ainda não responderam esta semana.
 * Cabeçalho requerido: Authorization: Bearer <TOKEN>
 */
export async function POST(request: Request) {
  try {
    // 1. Validar Token de Segurança
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    const expectedToken = process.env.GC_REPORT_TRIGGER_TOKEN;

    if (!expectedToken) {
      console.error('[GC Bot] GC_REPORT_TRIGGER_TOKEN não configurada no ambiente.');
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    if (token !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminDb();
    const now = Timestamp.now();

    // Parse body for optional parameters
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      // Body is optional
    }
    const targetCellId = body.cellId;
    const force = body.force;

    // 2. Cleanup de Sessões Expiradas (TTL > 24h)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    const expiredSessions = await db.collection('gc_report_sessions')
      .where('updatedAt', '<', Timestamp.fromDate(oneDayAgo))
      .get();

    let cleanedSessionsCount = 0;
    if (!expiredSessions.empty) {
      const cleanupBatch = db.batch();
      expiredSessions.docs.forEach(doc => {
        cleanupBatch.delete(doc.ref);
      });
      await cleanupBatch.commit();
      cleanedSessionsCount = expiredSessions.size;
      console.log(`[GC Bot] Cleaned up ${cleanedSessionsCount} expired sessions.`);
    }

    // 2b. Processar agendamentos pendentes de células com reunião adiada
    const todayStr = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const pendingSchedules = await db.collection('gc_report_schedules')
      .where('status', '==', 'pending')
      .get();

    let scheduledTriggered = 0;
    for (const schedDoc of pendingSchedules.docs) {
      const sched = schedDoc.data();
      // Tentar parsear a data informada pelo líder (ex: '30/07', '30/07/2026')
      const rawDate = sched.novaData || '';
      const dateMatch = rawDate.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
      if (!dateMatch) continue;

      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1;
      const yearRaw = dateMatch[3];
      const year = yearRaw ? parseInt(yearRaw.length === 2 ? '20' + yearRaw : yearRaw) : new Date().getFullYear();
      const meetingDate = new Date(year, month, day);

      // Disparar no dia seguinte à reunião adiada
      const followUpDate = new Date(meetingDate);
      followUpDate.setDate(followUpDate.getDate() + 1);
      const followUpStr = followUpDate.toISOString().split('T')[0];

      if (todayStr >= followUpStr) {
        // Chegou o dia — disparar bot
        try {
          const success = await startGcReportSession(sched.cellId, sched.liderPhone);
          if (success) {
            scheduledTriggered++;
            await schedDoc.ref.update({ status: 'triggered', triggeredAt: now });
            console.log(`[GC Bot] Agendamento disparado para célula ${sched.cellId} (reunião adiada para ${rawDate}).`);
          }
        } catch (e: any) {
          console.error(`[GC Bot] Erro ao disparar agendamento ${schedDoc.id}:`, e.message);
        }
      }
    }

    // 3. Buscar células ativas
    let cellsQuery: any = db.collection('cells').where('status', '==', 'active');
    
    if (targetCellId) {
      const singleCellDoc = await db.collection('cells').doc(targetCellId).get();
      if (!singleCellDoc.exists || singleCellDoc.data()?.status !== 'active') {
        return NextResponse.json({ error: 'Célula não encontrada ou inativa.' }, { status: 404 });
      }
      cellsQuery = { empty: false, docs: [singleCellDoc] };
    } else {
      cellsQuery = await cellsQuery.get();
    }

    const cellsSnap = cellsQuery;

    if (cellsSnap.empty) {
      return NextResponse.json({ success: true, triggeredCount: 0, cleanedSessionsCount, message: 'Nenhuma célula ativa encontrada.' });
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
    const dateLimitStr = oneWeekAgo.toISOString().split('T')[0];

    let triggeredCount = 0;
    const errors: string[] = [];

    for (const cellDoc of cellsSnap.docs) {
      const cellId = cellDoc.id;
      const cellData = cellDoc.data();
      const liderId = cellData.liderId;

      if (!liderId) {
        continue;
      }

      try {
        if (!force) {
          // 1. Validar se hoje é o dia da reunião ou o horário +3h já foi atingido
          const weekDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
          const todayIndex = new Date().getDay();
          const todayName = weekDays[todayIndex];

          const meetingDay = cellData.meetingDay || cellData.diaSemana || '';
          const meetingTime = cellData.meetingTime || cellData.horario || '19:30';

          if (meetingDay && !meetingDay.toLowerCase().includes(todayName.toLowerCase().substring(0, 3))) {
            // Não é o dia de reunião desta célula
            continue;
          }

          // Checar se já se passaram 3 horas do início da célula
          const [hStr, mStr] = meetingTime.split(':');
          const meetingHour = parseInt(hStr || '19', 10);
          const meetingMinute = parseInt(mStr || '30', 10);
          
          const nowHour = new Date().getHours();
          const nowMinute = new Date().getMinutes();
          
          const meetingMinutesTotal = meetingHour * 60 + meetingMinute;
          const nowMinutesTotal = nowHour * 60 + nowMinute;

          // Exige que tenham se passado pelo menos 180 minutos (3 horas) do horário de início
          if (nowMinutesTotal < meetingMinutesTotal + 180) {
            console.log(`[GC Bot] Célula ${cellId} agendada para ${meetingTime}. Aguardando janela de 3 horas pós-célula.`);
            continue;
          }

          // 2. Verificar se já existe relatório/cancelamento/adiamento enviado nos últimos 6 dias para esta célula
          const reportsSnap = await db.collection('reuniao_logs')
            .where('cellId', '==', cellId)
            .where('date', '>=', dateLimitStr)
            .limit(1)
            .get();

          if (!reportsSnap.empty) {
            // Relatório, cancelamento ou reagendamento já registrado para esta célula esta semana, pula
            continue;
          }
        }

        // Buscar líder para obter o telefone
        const liderDoc = await db.collection('users').doc(liderId).get();
        if (!liderDoc.exists) {
          continue;
        }

        const liderData = liderDoc.data()!;
        const rawPhone = liderData.phone || liderData.phoneNumber;
        if (!rawPhone) {
          continue;
        }

        const formattedPhone = formatWhatsAppNumber(String(rawPhone));
        if (formattedPhone.length < 8) {
          continue;
        }

        // Inicia a sessão utilizando transação interna (para garantir exclusividade)
        const success = await startGcReportSession(cellId, formattedPhone);
        if (success) {
          triggeredCount++;
        }
      } catch (cellError: any) {
        console.error(`[GC Bot] Erro ao disparar relatório para célula ${cellId}:`, cellError);
        errors.push(`Cell ${cellId}: ${cellError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      triggeredCount,
      cleanedSessionsCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('[GC Bot] Erro no trigger de relatórios:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
