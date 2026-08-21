'use server'

import { getAdminDb } from '@/lib/firebase-admin';

/**
 * Resolves a phone number to WhatsApp JID/LID and updates the user document.
 */
export async function syncUserWAIdentity(userId: string, phoneNumber: string) {
    if (!userId || !phoneNumber) return { success: false, error: "Dados inválidos" };

    try {
        const db = getAdminDb();
        const configSnap = await db.collection('config').doc('notifications').get();
        if (!configSnap.exists) return { success: false, error: "Configuração de notificações ausente" };

        const config = configSnap.data();
        const apiKey = config?.instanceKey || config?.whatsappApiKey;
        const serverUrl = (config?.serverUrl || 'https://us.api-wa.me').replace(/\/$/, '');

        if (!apiKey) return { success: false, error: "API Key não configurada" };

        const phone = phoneNumber.replace(/\D/g, '');
        if (phone.length < 8) return { success: false, error: "Telefone inválido" };

        const queryPhone = phone.startsWith('55') ? phone : `55${phone}`;

        const regRes = await fetch(`${serverUrl}/${apiKey}/actions/registered?number=${queryPhone}`);
        if (!regRes.ok) throw new Error(`Erro na API: ${regRes.statusText}`);
        
        const regData = await regRes.json();
        const waInfo = regData["0"] || regData;

        if (waInfo && waInfo.exists) {
            const waLid = typeof waInfo?.lid === 'string' && /^\d+@lid$/.test(waInfo.lid) ? waInfo.lid : null;
            const waJid = typeof waInfo?.jid === 'string' && /^\d+@s\.whatsapp\.net$/.test(waInfo.jid) ? waInfo.jid : `${queryPhone}@s.whatsapp.net`;

            await db.collection('users').doc(userId).update({
                jid: waJid,
                lid: waLid,
                waSyncedAt: new Date()
            });

            // Também garantir no banco de contatos sincronizados
            await db.collection('notifications_contacts').doc(phone).set({
                phoneNumber: phone,
                jid: waJid,
                lid: waLid,
                systemUserId: userId,
                updatedAt: new Date(),
            }, { merge: true });

            return { success: true, jid: waJid, lid: waLid };
        }

        return { success: false, message: "Número não registrado no WhatsApp" };
    } catch (e: any) {
        console.error(`Sync WA Identity Error (${userId}):`, e.message);
        return { success: false, error: e.message };
    }
}
