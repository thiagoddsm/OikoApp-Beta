
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, setDoc, doc } from 'firebase/firestore';

/**
 * Webhook Route to receive events from api-wa.me
 * Processes button clicks, survey responses, and incoming text messages.
 */

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = payload.data || payload;

    // Se não houver dados de origem, ignora
    const fromRaw = data.from || data.key?.remoteJid || data.participant;
    if (!fromRaw) {
        return NextResponse.json({ success: true });
    }

    const { firestore } = initializeFirebase();
    
    // Limpeza do número de telefone
    const fromPhone = fromRaw.replace(/\D/g, '');

    // Tenta identificar o usuário
    let userId = 'unknown';
    let userName = 'Desconhecido';
    
    const usersRef = collection(firestore, 'users');
    const searchDigits = fromPhone.slice(-8);
    const q = query(usersRef, where('phone', '>=', searchDigits)); 
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((docSnap) => {
      const userData = docSnap.data();
      if (userData.phone && userData.phone.replace(/\D/g, '').endsWith(searchDigits)) {
          userId = docSnap.id;
          userName = userData.name;
      }
    });

    const messageType = data.type || 'text';
    const messageContent = data.body || data.text || data.selectedButtonId || data.buttonText || data.message?.conversation || '[Mídia/Outro]';

    // 1. Salva a mensagem individual
    await addDoc(collection(firestore, 'notifications_messages'), {
      from: fromPhone,
      fromMe: false,
      userId,
      userName,
      content: messageContent,
      type: messageType,
      receivedAt: Timestamp.now()
    });

    // 2. Atualiza o resumo da conversa
    await setDoc(doc(firestore, 'notifications_chats', fromPhone), {
        lastMessage: messageContent,
        lastMessageAt: Timestamp.now(),
        unreadCount: 1,
        userName,
        userId,
        phoneNumber: fromPhone,
        isGroup: fromRaw.includes('@g.us')
    }, { merge: true });

    // 3. Captura Respostas de Botão
    const isButtonResponse = messageType === 'buttons_response' || data.selectedButtonId || data.message?.buttonsResponseMessage;
    if (isButtonResponse) {
        const buttonId = data.selectedButtonId || data.message?.buttonsResponseMessage?.selectedButtonId;
        const buttonText = data.buttonText || data.message?.buttonsResponseMessage?.selectedDisplayText || buttonId;

        await addDoc(collection(firestore, 'notifications_responses'), {
            from: fromPhone,
            userId,
            userName,
            type: 'button',
            buttonId: buttonId || 'unknown',
            buttonText: buttonText || 'Botão clicado',
            receivedAt: Timestamp.now()
        });
    }

    // 4. Captura Respostas de Enquetes
    const isPollUpdate = messageType === 'poll_update' || data.pollUpdates || data.message?.pollUpdateMessage;
    if (isPollUpdate) {
        const pollName = data.pollName || 'Enquete';
        const selectedOptions = data.selectedOptions || [];

        await addDoc(collection(firestore, 'notifications_responses'), {
            from: fromPhone,
            userId,
            userName,
            type: 'poll',
            pollName,
            selectedOptions,
            receivedAt: Timestamp.now()
        });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro no Webhook WhatsApp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
