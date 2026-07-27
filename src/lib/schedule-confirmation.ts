import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Handles volunteer schedule confirmation via WhatsApp reply.
 * Called from the main webhook when a user sends "SIM", "NÃO",
 * or clicks the interactive buttons "schedule_confirm" / "schedule_decline".
 *
 * Flow:
 * 1. Look up schedule_pending_confirmations/{phone} (O(1), no tenantId needed)
 * 2. Update saved_schedules/{scheduleId}.confirmations.{userId}
 * 3. Delete the pending doc
 * 4. Send confirmation reply to the volunteer
 *
 * Returns true if the message was handled (prevents further bot processing)
 */
export async function handleScheduleConfirmation(
  fromPhone: string,
  normalizedText: string,  // "SIM" | "NÃO" | "NAO" | "SCHEDULE_CONFIRM" | "SCHEDULE_DECLINE"
  waConfig: any,
  buttonId?: string        // payload?.buttonId se vier de clique em botão
): Promise<boolean> {
  const db = getAdminDb();

  // Normalizar o número igual ao que foi salvo na confirmação pendente
  const cleaned = fromPhone.replace(/\D/g, '');
  let formatted = cleaned;
  if (cleaned.length === 11) formatted = `55${cleaned}`;
  else if (!cleaned.startsWith('55')) formatted = `55${cleaned}`;

  // Verificar pelos dois formatos possíveis
  const phonesToTry = [formatted, cleaned];

  let pendingData: any = null;
  let pendingDocId: string | null = null;

  for (const phone of phonesToTry) {
    const pendingDoc = await db.collection('schedule_pending_confirmations').doc(phone).get();
    if (pendingDoc.exists) {
      pendingData = pendingDoc.data();
      pendingDocId = phone;
      break;
    }
  }

  if (!pendingData || !pendingDocId) {
    return false; // Nenhuma confirmação pendente para este número
  }

  // Verificar se a confirmação não expirou
  const expiresAt = pendingData.expiresAt?.toDate?.();
  if (expiresAt && expiresAt < new Date()) {
    console.log(`[ScheduleConfirmation] Confirmação expirada para ${fromPhone}`);
    await db.collection('schedule_pending_confirmations').doc(pendingDocId).delete();
    return false;
  }

  // Determinar resposta: botão tem prioridade, depois texto
  const effectiveId = buttonId || normalizedText.toLowerCase();
  const isConfirmed =
    effectiveId === 'schedule_confirm' ||
    effectiveId === 'sim' ||
    normalizedText === 'SIM';

  const isDeclined =
    effectiveId === 'schedule_decline' ||
    effectiveId === 'não' ||
    effectiveId === 'nao' ||
    normalizedText === 'NÃO' ||
    normalizedText === 'NAO';

  if (!isConfirmed && !isDeclined) {
    return false; // Resposta não reconhecida — não processar
  }

  const status = isConfirmed ? 'confirmed' : 'declined';
  const { scheduleId, volunteerId, areaName, userName } = pendingData;

  try {
    // Atualizar confirmação na escala salva
    await db.collection('saved_schedules').doc(scheduleId).update({
      [`confirmations.${volunteerId}`]: {
        status,
        phone: fromPhone,
        updatedAt: Timestamp.now(),
      },
    });

    // Remover pendência
    await db.collection('schedule_pending_confirmations').doc(pendingDocId).delete();

    console.log(`[ScheduleConfirmation] ${status} registrado: userId=${volunteerId}, schedule=${scheduleId}`);
  } catch (err: any) {
    console.error('[ScheduleConfirmation] Erro ao atualizar Firestore:', err.message);
    return false;
  }

  // Enviar resposta ao voluntário
  const firstName = (userName || 'Voluntário').trim().split(' ')[0];
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const replyMessage = isConfirmed
    ? `✅ Ótimo, ${cap(firstName)}! Sua presença em *${areaName}* está confirmada. Contamos com você! 🙌`
    : `📋 Entendido, ${cap(firstName)}. Seu impedimento foi registrado. A coordenação de *${areaName}* será avisada. Obrigado por avisar! 🙏`;

  try {
    const { getWhatsAppClient } = await import('@/lib/whatsapp');
    const whatsapp = await getWhatsAppClient();
    await whatsapp.sendMessage({
      type: 'text',
      body: {
        to: formatted,
        text: replyMessage,
      },
    });

    // Se recusou, notificar o coordenador da área (buscar no Firestore)
    if (!isConfirmed) {
      try {
        await notifyAreaCoordinator(db, scheduleId, areaName, userName, whatsapp);
      } catch (e: any) {
        console.warn('[ScheduleConfirmation] Falha ao notificar coordenador:', e.message);
      }
    }
  } catch (sendErr: any) {
    console.error('[ScheduleConfirmation] Erro ao enviar resposta:', sendErr.message);
  }

  return true;
}

/**
 * Notifica o líder/coordenador da área quando um voluntário recusa a escala.
 */
async function notifyAreaCoordinator(
  db: FirebaseFirestore.Firestore,
  scheduleId: string,
  areaName: string,
  volunteerName: string,
  whatsapp: any
) {
  // Buscar a escala para obter o areaId
  const schedDoc = await db.collection('saved_schedules').doc(scheduleId).get();
  if (!schedDoc.exists) return;

  const areaId = schedDoc.data()?.areaId;
  if (!areaId) return;

  // Buscar o coordenador da área
  const areaDoc = await db.collection('service_areas').doc(areaId).get();
  if (!areaDoc.exists) return;

  const coordinatorId = areaDoc.data()?.coordinatorId || areaDoc.data()?.leaderId;
  if (!coordinatorId) return;

  const coordDoc = await db.collection('users').doc(coordinatorId).get();
  if (!coordDoc.exists) return;

  const coordPhone = coordDoc.data()?.phone;
  if (!coordPhone) return;

  const cleanedCoord = String(coordPhone).replace(/\D/g, '');
  const formattedCoord = cleanedCoord.startsWith('55') ? cleanedCoord : `55${cleanedCoord}`;

  const firstName = (volunteerName || 'Um voluntário').trim().split(' ')[0];

  await whatsapp.sendMessage({
    type: 'text',
    body: {
      to: formattedCoord,
      text: `⚠️ *Aviso de impedimento*\n\n${firstName} informou que *não poderá comparecer* ao serviço de *${areaName}*.\n\nVerifique a escala e providencie uma substituição se necessário.`,
    },
  });
}
