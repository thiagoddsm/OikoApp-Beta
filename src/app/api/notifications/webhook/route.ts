
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';

/**
 * Webhook Route to receive events from api-wa.me
 * This endpoint processes button clicks and other interactions.
 */

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('Webhook WhatsApp recebido:', payload);

    // O formato do payload de resposta de botão costuma ser algo como:
    // { event: 'message', data: { type: 'buttons_response', selectedButtonId: '...', ... } }
    
    const eventType = payload.event;
    const data = payload.data;

    if (eventType === 'message' && (data.type === 'buttons_response' || data.selectedButtonId)) {
      const { firestore } = initializeFirebase();
      
      const from = data.from.replace('@s.whatsapp.net', '').replace(/\D/g, '');
      const buttonId = data.selectedButtonId;
      const buttonText = data.buttonText || buttonId;

      // 1. Tentar identificar o usuário pelo número de telefone
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('phone', '>=', from.slice(-8))); // Busca parcial por segurança
      const querySnapshot = await getDocs(q);
      
      let userId = 'unknown';
      let userName = 'Desconhecido';

      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        // Verificação mais precisa se necessário
        userId = doc.id;
        userName = userData.name;
      });

      // 2. Registrar a resposta no banco de dados
      await addDoc(collection(firestore, 'notifications_responses'), {
        from,
        userId,
        userName,
        buttonId,
        buttonText,
        receivedAt: Timestamp.now(),
        originalPayload: data
      });

      // 3. Lógica Automática (Ex: Se for confirmação de escala, poderíamos atualizar a escala aqui)
      console.log(`Resposta registrada: Usuário ${userName} clicou em ${buttonText}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Erro no Webhook WhatsApp:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
