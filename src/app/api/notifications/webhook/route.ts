
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
    console.log('Webhook WhatsApp recebido:', payload);

    const eventType = payload.event;
    const data = payload.data;

    if (!data || !data.from) {
        return NextResponse.json({ success: true }, { status: 200 });
    }

    const { firestore } = initializeFirebase();
    const fromRaw = data.from.replace('@s.whatsapp.net', '').replace('@g.us', '');
    const fromPhone = fromRaw.replace(/\D/g, '');

    // 1. Tentar identificar o usuário pelo número de telefone
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('phone', '>=', fromPhone.slice(-8))); 
    const querySnapshot = await getDocs(q);
    
    let userId = 'unknown';
    let userName = 'Desconhecido';

    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      userId = doc.id;
      userName = userData.name;
    });

    // 2. Registrar a mensagem no histórico geral de conversas
    const messageType = data.type || 'text';
    const messageContent = data.body || data.text || data.selectedButtonId || data.buttonText || '[Mídia/Outro]';

    // Salva a mensagem individual
    await addDoc(collection(firestore, 'notifications_messages'), {
      from: fromPhone,
      fromMe: false,
      userId,
      userName,
      content: messageContent,
      type: messageType,
      receivedAt: Timestamp.now(),
      originalPayload: data
    });

    // 3. Atualiza o resumo da conversa (Chat List)
    const chatRef = doc(firestore, 'notifications_chats', fromPhone);
    await setDoc(chatRef, {
        lastMessage: messageContent,
        lastMessageAt: Timestamp.now(),
        unreadCount: 1, // Poderíamos incrementar, mas para MVP 1 basta
        userName,
        userId,
        phoneNumber: fromPhone,
        isGroup: data.from.includes('@g.us')
    }, { merge: true });

    // 4. Lógica específica para botões (se for o caso)
    if (data.type === 'buttons_response' || data.selectedButtonId) {
        await addDoc(collection(firestore, 'notifications_responses'), {
            from: fromPhone,
            userId,
            userName,
            buttonId: data.selectedButtonId,
            buttonText: data.buttonText || data.selectedButtonId,
            receivedAt: Timestamp.now()
        });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Erro no Webhook WhatsApp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
