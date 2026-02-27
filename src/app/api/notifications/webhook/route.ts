
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

    const eventType = payload.event; // messages.upsert, etc
    const data = payload.data;

    // Se não houver dados de origem, ignora
    if (!data || !data.from) {
        return NextResponse.json({ success: true }, { status: 200 });
    }

    const { firestore } = initializeFirebase();
    
    // Limpeza do número de telefone (removendo sufixos do WA)
    const fromRaw = data.from.replace('@s.whatsapp.net', '').replace('@g.us', '');
    const fromPhone = fromRaw.replace(/\D/g, '');

    // 1. Tentar identificar o usuário pelo número de telefone
    const usersRef = collection(firestore, 'users');
    const searchDigits = fromPhone.slice(-8); // Últimos 8 dígitos para flexibilidade
    const q = query(usersRef, where('phone', '>=', searchDigits)); 
    const querySnapshot = await getDocs(q);
    
    let userId = 'unknown';
    let userName = 'Desconhecido';

    querySnapshot.forEach((docSnap) => {
      const userData = docSnap.data();
      // Validação extra para garantir que o número bate
      if (userData.phone && userData.phone.replace(/\D/g, '').endsWith(searchDigits)) {
          userId = docSnap.id;
          userName = userData.name;
      }
    });

    // 2. Registrar a mensagem no histórico individual de conversas
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

    // 3. Atualiza o resumo da conversa (Chat List) para a aba "Conversas"
    const chatRef = doc(firestore, 'notifications_chats', fromPhone);
    await setDoc(chatRef, {
        lastMessage: messageContent,
        lastMessageAt: Timestamp.now(),
        unreadCount: 1,
        userName,
        userId,
        phoneNumber: fromPhone,
        isGroup: data.from.includes('@g.us')
    }, { merge: true });

    // 4. Lógica específica para RESPOSTAS DE BOTÕES
    if (data.type === 'buttons_response' || data.selectedButtonId) {
        await addDoc(collection(firestore, 'notifications_responses'), {
            from: fromPhone,
            userId,
            userName,
            type: 'button',
            buttonId: data.selectedButtonId,
            buttonText: data.buttonText || data.selectedButtonId,
            receivedAt: Timestamp.now()
        });
    }

    // 5. Lógica específica para RESPOSTAS DE ENQUETES (Polls)
    if (data.type === 'poll_update' || data.pollUpdates || data.selectedOptions) {
        await addDoc(collection(firestore, 'notifications_responses'), {
            from: fromPhone,
            userId,
            userName,
            type: 'poll',
            pollName: data.pollName || 'Enquete Recebida',
            selectedOptions: data.selectedOptions || [],
            receivedAt: Timestamp.now(),
            originalPayload: data
        });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Erro no Webhook WhatsApp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
