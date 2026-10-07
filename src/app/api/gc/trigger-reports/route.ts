import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { startGcReportSession } from '@/lib/gc-report-bot';
import { resolveGcReportRecipient } from '@/app/actions/whatsapp-actions';
import { enqueueGcReportsBatch } from '@/lib/gc-dispatch-queue';

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

    // 2. Cleanup de Sessões Expiradas (TTL > 72h / 3 dias)
    const threeDaysAgo = new Date();
    threeDaysAgo.setHours(threeDaysAgo.getHours() - 72);
    const expiredSessions = await db.collection('gc_report_sessions')
      .where('updatedAt', '<', Timestamp.fromDate(threeDaysAgo))
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

    // 3. Se for disparo em massa (todas as células), enfileira na fila assíncrona (safe anti-ban + sem timeout HTTP)
    if (!targetCellId) {
      const batchResult = await enqueueGcReportsBatch({
        scope: 'all',
        force: Boolean(force),
        delaySeconds: 30
      });

      return NextResponse.json({
        success: true,
        triggeredCount: batchResult.totalEnqueued || 0,
        cleanedSessionsCount,
        scheduledTriggered,
        message: batchResult.message,
        jobId: batchResult.jobId
      });
    }

    // 4. Se for célula específica (targetCellId)
    const singleCellDoc = await db.collection('cells').doc(targetCellId).get();
    if (!singleCellDoc.exists || singleCellDoc.data()?.status !== 'active') {
      return NextResponse.json({ error: 'Célula não encontrada ou inativa.' }, { status: 404 });
    }
    const cellData = singleCellDoc.data()!;
    const { recipient, error: recipientError } = await resolveGcReportRecipient(cellData, db);
    if (!recipient) {
      return NextResponse.json({ error: recipientError || 'Sem responsável com telefone válido.' }, { status: 400 });
    }

    if (!force) {
      // Evitar sobrepor sessão que já está aberta e ativa nas últimas 24h
      const sessionDoc = await db.collection('gc_report_sessions').doc(recipient.phone).get();
      if (sessionDoc.exists) {
        const sData = sessionDoc.data();
        const sessionUpdated = sData?.updatedAt?.toDate?.() || sData?.createdAt?.toDate?.() || new Date(0);
        const hoursSince = (Date.now() - sessionUpdated.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) {
          return NextResponse.json({
            success: true,
            triggeredCount: 0,
            message: `Sessão já em andamento para ${recipient.name} (${hoursSince.toFixed(1)}h atrás).`
          });
        }
      }
    }

    const success = await startGcReportSession(targetCellId, recipient.phone, false, {
      userId: recipient.userId,
      name: recipient.name,
      role: recipient.role
    });

    return NextResponse.json({
      success,
      triggeredCount: success ? 1 : 0,
      cleanedSessionsCount,
      scheduledTriggered
    });
  } catch (error: any) {
    console.error('[GC Bot] Erro no trigger de relatórios:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
