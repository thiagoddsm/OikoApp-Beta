
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';

/**
 * API Route to send WhatsApp messages using direct fetch to api-wa.me
 */

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
        return NextResponse.json({ 
            error: `Erro de permissão ao ler banco de dados: ${e.message}. Verifique se a chave foi salva corretamente.` 
        }, { status: 500 });
    }

    if (!waKey && channel === 'whatsapp') {
        return NextResponse.json({ 
            error: "API Key do WhatsApp não encontrada. Vá na aba Configurações e salve sua chave primeiro." 
        }, { status: 400 });
    }

    // 2. Lógica de Destinatários
    const targetUsers: any[] = [];

    if (targetNumber) {
        targetUsers.push({
            id: 'test-user',
            name: 'Líder IBM (Teste)',
            phone: targetNumber.replace(/\D/g, '')
        });
    } else if (audience === 'specific_members' && userIds && Array.isArray(userIds) && userIds.length > 0) {
        const usersRef = collection(firestore, 'users');
        const chunks = [];
        for (let i = 0; i < userIds.length; i += 30) {
            chunks.push(userIds.slice(i, i + 30));
        }
        
        for (const chunk of chunks) {
            const q = query(usersRef, where('__name__', 'in', chunk));
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
    } else {
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
        return NextResponse.json({ error: 'Nenhum destinatário válido encontrado com telefone cadastrado.' }, { status: 404 });
    }

    // 3. ENVIO REAL (via fetch ao gateway)
    let sentCount = 0;
    let errorCount = 0;
    let lastError = null;

    for (const user of targetUsers) {
        const personalizedMessage = message.replace('{{nome}}', user.name);
        
        if (waKey && channel === 'whatsapp') {
            try {
                let formattedNumber = user.phone;
                if (formattedNumber.length <= 11) { 
                    formattedNumber = `55${formattedNumber}`;
                }
                
                const response = await fetch(`https://us.api-wa.me/${waKey}/messages/text`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: formattedNumber,
                        text: personalizedMessage
                    })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.message || `Erro ${response.status} no gateway`);
                }

                sentCount++;
            } catch (err: any) {
                console.error(`Erro ao enviar para ${user.phone}:`, err);
                errorCount++;
                lastError = err.message;
            }
        } else {
            // Modo simulação se não houver chave (mas o frontend já deve barrar)
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

    if (errorCount > 0 && sentCount === 0) {
        return NextResponse.json({ 
            success: false, 
            message: `Falha no envio: ${lastError}. Verifique se sua instância está conectada no painel da api-wa.me.`,
            sentCount,
            errorCount
        }, { status: 500 });
    }

    const resultMessage = waKey 
        ? (errorCount === 0 ? `Sucesso! ${sentCount} mensagens enviadas.` : `Concluído com avisos: ${sentCount} enviadas, ${errorCount} falhas. Erro: ${lastError}`)
        : `Simulação concluída! ${sentCount} mensagens seriam enviadas.`;

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
