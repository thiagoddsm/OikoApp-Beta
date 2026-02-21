
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { channel, audience, message } = body;

    if (!channel || !audience || !message) {
      return NextResponse.json({ error: 'Parâmetros ausentes' }, { status: 400 });
    }

    const { firestore } = initializeFirebase();
    const usersRef = collection(firestore, 'users');
    let targetUsers: any[] = [];

    // 1. Lógica de Filtragem de Público
    let q;
    switch (audience) {
        case 'all_members':
            q = query(usersRef); // Pega todos para teste, ou filtra por role 'member'
            break;
        case 'all_leaders':
            q = query(usersRef, where('hierarchy.role', 'in', ['admin', 'pastor_senior', 'pastor', 'lider_rede', 'lider_area', 'lider_gc']));
            break;
        case 'network_leaders':
            q = query(usersRef, where('hierarchy.role', '==', 'lider_rede'));
            break;
        case 'area_leaders':
            q = query(usersRef, where('hierarchy.role', '==', 'lider_area'));
            break;
        case 'cell_leaders':
            q = query(usersRef, where('hierarchy.role', '==', 'lider_gc'));
            break;
        default:
            q = query(usersRef);
    }

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.phone) {
            targetUsers.push({
                id: doc.id,
                name: data.name,
                phone: data.phone
            });
        }
    });

    if (targetUsers.length === 0) {
        return NextResponse.json({ error: 'Nenhum destinatário com telefone encontrado para este público.' }, { status: 404 });
    }

    // 2. SIMULAÇÃO DE ENVIO
    // Aqui seria a integração real com o Gateway (api-wa.me, Evolution, etc.)
    console.log(`[LOG] Iniciando envio para ${targetUsers.length} contatos via ${channel}`);
    
    // Simular processamento individual
    targetUsers.forEach(user => {
        const personalizedMessage = message.replace('{{nome}}', user.name);
        // console.log(`[SIMULAÇÃO] Enviando para ${user.phone}: ${personalizedMessage}`);
    });

    // 3. Registrar no Histórico do Firestore
    await addDoc(collection(firestore, 'notifications_history'), {
        channel,
        audience,
        message,
        recipientCount: targetUsers.length,
        sentAt: Timestamp.now(),
        status: 'success'
    });

    return NextResponse.json({ 
      success: true, 
      message: `Sucesso! Mensagem enviada para ${targetUsers.length} pessoas via ${channel}.` 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro na API de notificações:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
