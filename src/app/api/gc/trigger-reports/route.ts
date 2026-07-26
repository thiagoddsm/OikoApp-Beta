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

          // 2. Verificar se já existe relatório enviado nos últimos 6 dias para esta célula
          const reportsSnap = await db.collection('reuniao_logs')
            .where('cellId', '==', cellId)
            .where('date', '>=', dateLimitStr)
            .limit(1)
            .get();

          if (!reportsSnap.empty) {
            // Relatório já enviado para esta célula esta semana, pula
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
