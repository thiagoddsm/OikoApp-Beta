import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * Handles volunteer schedule confirmation via WhatsApp reply.
 * Called from the main webhook when a user sends "SIM" or "NÃO".
 *
 * Flow:
 * 1. Find user by phone number
 * 2. Find their most recent pending schedule notification
 * 3. Update the confirmation status in saved_schedules
 * 4. Send a confirmation reply to the volunteer
 *
 * Returns true if the message was handled (prevents further bot processing)
 */
export async function handleScheduleConfirmation(
  fromPhone: string,
  normalizedText: string, // "SIM" | "NÃO" | "NAO"
  waConfig: any
): Promise<boolean> {
  const db = getAdminDb();
  const isConfirmed = normalizedText === 'SIM';

  try {
    // ── Step 1: Find user by phone ──────────────────────────────────────────
    const cleanPhone = fromPhone.replace(/\D/g, '');
    const phonesToTry = [
      cleanPhone,
      cleanPhone.startsWith('55') ? cleanPhone.slice(2) : `55${cleanPhone}`,
    ];

    let userId: string | null = null;
    let userName = 'Voluntário';

    for (const phone of phonesToTry) {
      const snap = await db.collection('users')
        .where('phone', '>=', phone)
        .where('phone', '<=', phone + '\uf8ff')
        .limit(3)
        .get();

      if (!snap.empty) {
        // Try exact match first
        const exactMatch = snap.docs.find(d => {
          const p = String(d.data().phone || '').replace(/\D/g, '');
          return p === cleanPhone || p === phone;
        });
        const doc = exactMatch || snap.docs[0];
        userId = doc.id;
        userName = doc.data().name || 'Voluntário';
        break;
      }
    }

    if (!userId) {
      console.log(`[ScheduleConfirmation] Usuário não encontrado para telefone: ${fromPhone}`);
      return false; // Let the bot handle it
    }

    // ── Step 2: Find pending schedule ───────────────────────────────────────
    // Look for schedules from the last 60 days that include this member
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffMonth = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}`;

    const schedulesSnap = await db.collection('saved_schedules')
      .where('tenantId', '==', await getTenantIdForUser(db, userId))
      .orderBy('month', 'desc')
      .limit(10)
      .get();

    // Find the most recent schedule that contains this member and has a pending notification
    let targetScheduleId: string | null = null;
    let areaName = 'sua área';

    for (const schedDoc of schedulesSnap.docs) {
      const schedData = schedDoc.data();
      // Check if member is in this schedule
      const hasMember = schedData.schedule?.some((item: any) =>
        Array.isArray(item.memberIds) && item.memberIds.includes(userId)
      );

      if (hasMember) {
        // Check if there's a pending confirmation or if notificationSentAt exists within last 7 days
        const confirmations = schedData.confirmations || {};
        const memberConf = confirmations[userId!];
        const notifSentAt = schedData.notificationSentAt?.toDate?.();
        const withinWindow = notifSentAt && (Date.now() - notifSentAt.getTime()) < 7 * 24 * 60 * 60 * 1000;

        if (!memberConf || memberConf.status === 'pending' || withinWindow) {
          targetScheduleId = schedDoc.id;
          // Get area name
          const areaSnap = await db.collection('service_areas').doc(schedData.areaId).get();
          if (areaSnap.exists) areaName = areaSnap.data()?.name || areaName;
          break;
        }
      }
    }

    if (!targetScheduleId) {
      console.log(`[ScheduleConfirmation] Nenhuma escala pendente encontrada para userId=${userId}`);
      return false; // Not handled — let bot continue
    }

    // ── Step 3: Update confirmation in Firestore ─────────────────────────────
    await db.collection('saved_schedules').doc(targetScheduleId).update({
      [`confirmations.${userId}`]: {
        status: isConfirmed ? 'confirmed' : 'declined',
        phone: fromPhone,
        updatedAt: Timestamp.now(),
      },
    });

    console.log(`[ScheduleConfirmation] Confirmação registrada: userId=${userId}, status=${isConfirmed ? 'confirmed' : 'declined'}, schedule=${targetScheduleId}`);

    // ── Step 4: Send confirmation reply ──────────────────────────────────────
    const firstName = userName.trim().split(' ')[0];
    const firstName2 = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

    const replyMessage = isConfirmed
      ? `✅ Ótimo, ${firstName2}! Sua confirmação foi registrada. Contamos com você no ${areaName}! 🙌`
      : `📋 Entendido, ${firstName2}. Seu impedimento foi registrado. Vou avisar a coordenação de ${areaName}. Se tiver alguma dúvida, entre em contato com seu líder.`;

    try {
      const apiKey = waConfig?.instanceKey || waConfig?.whatsappApiKey;
      const serverUrl = waConfig?.serverUrl || 'https://us.api-wa.me';

      if (apiKey) {
        const { getWhatsAppClient } = await import('@/lib/whatsapp');
        const whatsapp = await getWhatsAppClient({ server: serverUrl, key: apiKey });
        await whatsapp.sendMessage({
          type: 'text',
          body: {
            to: `${fromPhone.replace(/\D/g, '')}@s.whatsapp.net`,
            text: replyMessage,
          },
        });
      }
    } catch (sendErr: any) {
      console.error('[ScheduleConfirmation] Erro ao enviar resposta:', sendErr.message);
    }

    return true; // Message was handled
  } catch (err: any) {
    console.error('[ScheduleConfirmation] Erro geral:', err.message);
    return false;
  }
}

async function getTenantIdForUser(db: FirebaseFirestore.Firestore, userId: string): Promise<string> {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    return userDoc.data()?.tenantId || '';
  } catch {
    return '';
  }
}
