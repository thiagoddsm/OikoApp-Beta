
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { WhatsApp } from '@raphaelvserafim/client-api-whatsapp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { channel, audience, message, userIds, targetNumber } = body;

    if (!channel || !message || (!audience && !targetNumber)) {
      return NextResponse.json({ error: 'Parâmetros insuficientes para o envio.' }, { status: 400 });
    }

    const { firestore } = initializeFirebase();
    
    // 1. Buscar Configuração do WhatsApp
    let waKey = null;
    try {
        const configRef = doc(firestore, 'config', 'notifications');
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
            waKey = configSnap.data()?.whatsappApiKey;
        }
    } catch (e: any) {
        console.error("Erro ao ler config de notificações do Firestore:", e);
        // Não travamos o fluxo aqui para permitir logs mais abaixo
    }

    let whatsappClient: any = null;
    if (waKey && channel === 'whatsapp') {
        try {
            whatsappClient = new WhatsApp({
                server: "https://us.api-wa.me",
                key: waKey
            });
        } catch (clientErr: any) {
            return NextResponse.json({ error: `Falha ao inicializar cliente WhatsApp: ${clientErr.message}` }, { status: 500 });
        }
    }

    // 2. Lógica de Destinatários
    const targetUsers: any[] = [];

    // Prioridade 1: Número de teste manual
    if (targetNumber) {
        targetUsers.push({
            id: 'test-user',
            name: 'Líder IBM (Teste)',
            phone: targetNumber.replace(/\D/g, '')
        });
    } 
    // Prioridade 2: Lista específica de membros
    else if (audience === 'specific_members' && userIds && Array.isArray(userIds) && userIds.length > 0) {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('__name__', 'in', userIds));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.phone) {
                targetUsers.push({
                    id: doc.id,
                    name: data.name,
                    phone: data.phone.replace(/\D/g, '')
                });
            }
        });
    } 
    // Prioridade 3: Públicos pré-definidos
    else {
        const usersRef = collection(firestore, 'users');
        let q;
        switch (audience) {
            case 'all_members':
                q = query(usersRef);
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
                    phone: data.phone.replace(/\D/g, '')
                });
            }
        });
    }

    if (targetUsers.length === 0) {
        return NextResponse.json({ error: 'Nenhum destinatário válido encontrado.' }, { status: 404 });
    }

    // 3. ENVIO
    let sentCount = 0;
    let errorCount = 0;
    let lastError = null;

    for (const user of targetUsers) {
        const personalizedMessage = message.replace('{{nome}}', user.name);
        
        if (whatsappClient) {
            try {
                const formattedNumber = user.phone.startsWith('55') ? user.phone : `55${user.phone}`;
                await whatsappClient.sendText(formattedNumber, personalizedMessage);
                sentCount++;
            } catch (err: any) {
                console.error(`Erro real ao enviar para ${user.phone}:`, err);
                errorCount++;
                lastError = err.message || JSON.stringify(err);
            }
        } else {
            console.log(`[SIMULAÇÃO] Enviando para ${user.phone}: ${personalizedMessage}`);
            sentCount++;
        }
    }

    // 4. Registrar no Histórico
    try {
        await addDoc(collection(firestore, 'notifications_history'), {
            channel,
            audience: audience || 'test_number',
            message,
            recipientCount: targetUsers.length,
            successCount: sentCount,
            errorCount: errorCount,
            sentAt: Timestamp.now(),
            status: errorCount === 0 ? 'success' : (sentCount > 0 ? 'partial' : 'error'),
            isSimulation: !waKey,
            lastErrorMessage: lastError
        });
    } catch (e) {
        console.warn("Aviso: Falha ao gravar histórico de notificação.");
    }

    if (waKey && errorCount > 0 && sentCount === 0) {
        return NextResponse.json({ 
            success: false, 
            message: `Falha total no envio. Verifique se a chave da instância é válida. Erro: ${lastError}`,
            sentCount,
            errorCount
        }, { status: 500 });
    }

    const resultMessage = waKey 
        ? (errorCount === 0 ? `Sucesso! ${sentCount} mensagens enviadas.` : `Concluído com avisos: ${sentCount} enviadas, ${errorCount} falhas. Erro: ${lastError}`)
        : `Simulação concluída! ${sentCount} mensagens seriam enviadas. (Configure a API Key para envios reais)`;

    return NextResponse.json({ 
      success: true, 
      message: resultMessage,
      sentCount,
      errorCount
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro crítico na API de notificações:', error);
    return NextResponse.json({ error: `Erro interno no servidor: ${error.message}` }, { status: 500 });
  }
}
