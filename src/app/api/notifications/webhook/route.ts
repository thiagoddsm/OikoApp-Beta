import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs'; // Garante execução em ambiente Node.js completo

/**
 * Robust Webhook for api-wa.me following data.msgContent pattern
 */
export async function POST(request: Request) {
  try {
    const db = getAdminDb();
    const raw = await request.json();
    const data = raw.data || raw;
    const msgContent = data.msgContent || data.message || {};
    
    // 1. Sender Identification
    const fromRaw = data.key?.remoteJid || data.from || data.participant || data.author;
    if (!fromRaw) return NextResponse.json({ success: true });

    const fromPhone = fromRaw.split('@')[0].replace(/\D/g, '');

    // 2. Identify Message Type and Payload
    let userId = 'unknown';
    let userName = 'Desconhecido';
    let responseType: 'button' | 'poll' | 'text' | null = null;
    let payload: any = null;

    // A. Button Response (buttonsResponseMessage)
    if (msgContent.buttonsResponseMessage) {
        responseType = 'button';
        payload = {
            buttonId: msgContent.buttonsResponseMessage.selectedButtonId || 'unknown_id',
            buttonText: msgContent.buttonsResponseMessage.selectedDisplayText || 'Botão clicado'
        };
    } 
    // B. List Response (listResponseMessage)
    else if (msgContent.listResponseMessage) {
        responseType = 'button';
        payload = {
            buttonId: msgContent.listResponseMessage.singleSelectReply?.selectedRowId || 'unknown_id',
            buttonText: msgContent.listResponseMessage.title || 'Item selecionado'
        };
    }
    // C. Poll Update (pollUpdateMessage)
    else if (msgContent.pollUpdateMessage || data.pollUpdates) {
        const poll = msgContent.pollUpdateMessage || data.pollUpdates || {};
        
        // Evolution API usually sends the vote inside 'vote.selectedOptions' or just 'selectedOptions'
        let options = poll.vote?.selectedOptions || poll.selectedOptions || [];
        if (!Array.isArray(options)) {
            options = [options];
        }
        
        // Sanitize options to avoid undefined in array
        options = options.filter((o: any) => o !== undefined && o !== null);
        if (options.length === 0) options = ['Voto registrado'];

        responseType = 'poll';
        payload = {
            pollName: poll.name || data.pollName || poll.pollCreationMessageKey?.id || 'Enquete',
            selectedOptions: options
        };
    }
    // D. Common Text
    else if (msgContent.conversation || msgContent.extendedTextMessage?.text || data.text) {
        const messageText = msgContent.conversation || msgContent.extendedTextMessage?.text || data.text || '[Mídia]';
        const senderPushName = data.pushName || data.senderName || data.verifiedName || null;
        
        await db.collection('notifications_messages').add({
          from: fromPhone,
          fromMe: data.fromMe || false,
          content: messageText,
          type: 'text',
          receivedAt: Timestamp.now()
        });

        await db.collection('notifications_chats').doc(fromPhone).set({
            lastMessage: messageText,
            lastMessageAt: Timestamp.now(),
            unreadCount: data.fromMe ? 0 : 1,
            phoneNumber: fromPhone,
            userName: senderPushName, // Salva o nome vindo do WhatsApp como fallback
            isGroup: fromRaw.includes('@g.us')
        }, { merge: true });
    }

    // 3. Save Interactions
    if (responseType && payload) {
        // Remove undefined fields strictly to prevent Firestore crash
        const sanitizedPayload = JSON.parse(JSON.stringify(payload));
        
        await db.collection('notifications_responses').add({
            from: fromPhone,
            type: responseType,
            ...sanitizedPayload,
            receivedAt: Timestamp.now()
        });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    // Return 200 even on error so API-WA doesn't disable the webhook
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}
