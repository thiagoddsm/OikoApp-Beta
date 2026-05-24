import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

/**
 * Debug endpoint to inspect the actual data in Firestore collections.
 * Shows the last few entries from notifications_responses, notifications_sent_messages, and notifications_logs.
 */
export async function GET() {
    try {
        const db = getAdminDb();

        // 1. Last 5 responses
        const responsesSnap = await db.collection('notifications_responses')
            .orderBy('receivedAt', 'desc')
            .limit(5)
            .get();
        const responses = responsesSnap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            receivedAt: d.data().receivedAt?.toDate?.() || null,
        }));

        // 2. Last 5 sent messages
        const sentSnap = await db.collection('notifications_sent_messages')
            .orderBy('sentAt', 'desc')
            .limit(5)
            .get();
        const sentMessages = sentSnap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            sentAt: d.data().sentAt?.toDate?.() || null,
        }));

        // 3. Last 5 logs
        const logsSnap = await db.collection('notifications_logs')
            .orderBy('receivedAt', 'desc')
            .limit(5)
            .get();
        const logs = logsSnap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                from: data.from,
                phone: data.phone,
                type: data.type,
                stanzaId: data.stanzaId,
                payload: data.payload,
                receivedAt: data.receivedAt?.toDate?.() || null,
                // Show key parts of raw to understand structure
                rawKeys: data.raw ? Object.keys(data.raw) : [],
                rawKeyId: data.raw?.key?.id,
                rawContextStanzaId: data.raw?.msgContent?.contextInfo?.stanzaId || data.raw?.contextInfo?.stanzaId,
                rawPollCreationKeyId: data.raw?.msgContent?.pollUpdateMessage?.pollCreationMessageKey?.id,
                rawPhoneNumber: data.raw?.phoneNumber,
                rawJid: data.raw?.jid,
                rawRemoteJid: data.raw?.remoteJid,
            };
        });

        // 4. Last 3 broadcasts
        const historySnap = await db.collection('notifications_history')
            .orderBy('sentAt', 'desc')
            .limit(3)
            .get();
        const history = historySnap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            sentAt: d.data().sentAt?.toDate?.() || null,
        }));

        return NextResponse.json({
            responses,
            sentMessages,
            logs,
            history,
            analysis: {
                responseBroadcastIds: responses.map(r => ({ from: (r as any).from, broadcastId: (r as any).broadcastId, type: (r as any).type, stanzaId: (r as any).stanzaId })),
                sentMessageRecipients: sentMessages.map(s => ({ messageId: (s as any).messageId, recipient: (s as any).recipient, broadcastId: (s as any).broadcastId })),
            }
        }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
