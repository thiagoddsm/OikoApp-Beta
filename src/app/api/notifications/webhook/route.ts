
import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs'; // Garante execução em ambiente Node.js completo

// START: Firebase Admin Initialization
if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({ credential: cert(serviceAccount) });
    } else {
        // Fallback for Vercel / Firebase Hosting Application Default Credentials
        initializeApp();
    }
  } catch (e) {
    console.error('Firebase Admin initialization error', e);
  }
}
const db = getFirestore();
// END: Firebase Admin Initialization

/**
 * Robust Webhook for api-wa.me following data.msgContent pattern
 */
export async function POST(request: Request) {
  try {
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
            buttonId: msgContent.buttonsResponseMessage.selectedButtonId,
            buttonText: msgContent.buttonsResponseMessage.selectedDisplayText || 'Botão clicado'
        };
    } 
    // B. List Response (listResponseMessage)
    else if (msgContent.listResponseMessage) {
        responseType = 'button';
        payload = {
            buttonId: msgContent.listResponseMessage.singleSelectReply?.selectedRowId,
            buttonText: msgContent.listResponseMessage.title || 'Item selecionado'
        };
    }
    // C. Poll Update (pollUpdateMessage)
    else if (msgContent.pollUpdateMessage || data.pollUpdates) {
        const poll = msgContent.pollUpdateMessage || data.pollUpdates || {};
        responseType = 'poll';
        payload = {
            pollName: poll.name || data.pollName || 'Enquete',
            selectedOptions: Array.isArray(poll.selectedOptions) ? poll.selectedOptions : [poll.selectedOptions]
        };
    }
    // D. Common Text
    else if (msgContent.conversation || msgContent.extendedTextMessage?.text || data.text) {
        const messageText = msgContent.conversation || msgContent.extendedTextMessage?.text || data.text || '[Mídia]';
        
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
            isGroup: fromRaw.includes('@g.us')
        }, { merge: true });
    }

    // 3. Save Interactions
    if (responseType && payload) {
        await db.collection('notifications_responses').add({
            from: fromPhone,
            type: responseType,
            ...payload,
            receivedAt: Timestamp.now()
        });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
