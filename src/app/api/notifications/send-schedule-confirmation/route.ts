import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { requireAuth } from '@/lib/server-auth';

export const runtime = 'nodejs';

/**
 * POST /api/notifications/send-schedule-confirmation
 *
 * Envia mensagem de confirmação de escala via WhatsApp com botões interativos
 * e registra a confirmação pendente no Firestore para processamento posterior.
 */
export async function POST(request: NextRequest) {
  try {
    const { context, errorResponse } = await requireAuth(request, ['admin', 'communication']);
    if (errorResponse) return errorResponse;

    const db = getAdminDb();
    const body = await request.json();

    const { volunteerId, phone, name, scheduleId, items, areaName } = body;

    if (!phone || !scheduleId || !volunteerId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: phone, scheduleId, volunteerId' },
        { status: 400 }
      );
    }

    // Formatar número
    const cleaned = String(phone).replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length === 11) formatted = `55${cleaned}`;
    else if (cleaned.length === 10) formatted = `55${cleaned.substring(0, 2)}9${cleaned.substring(2)}`;
    else if (!cleaned.startsWith('55')) formatted = `55${cleaned}`;

    // Montar texto da mensagem
    const firstName = (name || 'Voluntário').trim().split(' ')[0];
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

    const itemsList = Array.isArray(items) && items.length > 0
      ? items.map((i: string) => `• ${i}`).join('\n')
      : '• Consulte a escala no sistema';

    const messageText = `Olá, ${cap(firstName)}! 🙌\n\nVocê está escalado(a) para o serviço de *${areaName || 'Voluntariado'}*:\n\n${itemsList}\n\nVocê confirma sua presença?`;

    // Enviar via WAME com botões
    const { getWhatsAppClient } = await import('@/lib/whatsapp');
    const whatsapp = await getWhatsAppClient();

    await whatsapp.sendMessage({
      type: 'button',
      body: {
        to: formatted,
        text: messageText,
        title: '📋 Confirmação de Escala',
        footer: 'Igreja Batista da Manhã',
        buttons: [
          { id: 'schedule_confirm', text: '✅ Confirmar' },
          { id: 'schedule_decline', text: '❌ Não posso' },
        ],
      },
    });

    // Salvar confirmação pendente indexada pelo telefone
    // Lookup O(1) no webhook — sem depender de tenantId
    const pendingRef = db.collection('schedule_pending_confirmations').doc(formatted);
    await pendingRef.set({
      scheduleId,
      volunteerId,
      areaName: areaName || '',
      userName: name || '',
      phone: formatted,
      status: 'pending',
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    console.log(`[ScheduleConfirm] Notificação enviada para ${formatted} (schedule: ${scheduleId})`);

    return NextResponse.json({ success: true, phone: formatted });
  } catch (err: any) {
    console.error('[ScheduleConfirm] Erro:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
