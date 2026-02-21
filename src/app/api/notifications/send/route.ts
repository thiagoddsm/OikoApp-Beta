
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { WhatsApp } from '@raphaelvserafim/client-api-whatsapp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { channel, audience, message, userIds } = body;

    if (!channel || !audience || !message) {
      return NextResponse.json({ error: 'Parâmetros ausentes' }, { status: 400 });
    }

    const { firestore } = initializeFirebase();
    
    // 1. Buscar Configuração do WhatsApp
    // Usamos um try/catch específico para a leitura de config para não travar o fluxo se falhar por permissão
    let waKey = null;
    try {
        const configRef = doc(firestore, 'config', 'notifications');
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
            waKey = configSnap.data()?.whatsappApiKey;
        }
    } catch (e) {
        console.warn("Aviso: Falha ao ler config de notificações do Firestore. Usando modo simulação.", e);
    }

    let whatsappClient: any = null;
    if (waKey && channel === 'whatsapp') {
        whatsappClient = new WhatsApp({
            server: "https://us.api-wa.me",
            key: waKey
        });
    }

    // 2. Lógica de Filtragem de Público
    const usersRef = collection(firestore, 'users');
    let q;

    if (audience === 'specific_members' && userIds && Array.isArray(userIds) && userIds.length > 0) {
        // Busca nominal por IDs específicos
        q = query(usersRef, where('__name__', 'in', userIds));
    } else {
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
    }

    const querySnapshot = await getDocs(q);
    const targetUsers: any[] = [];
    
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.phone) {
            targetUsers.push({
                id: doc.id,
                name: data.name,
                phone: data.phone.replace(/\D/g, '') // Apenas números
            });
        }
    });

    if (targetUsers.length === 0) {
        return NextResponse.json({ error: 'Nenhum destinatário com telefone encontrado para este público.' }, { status: 404 });
    }

    // 3. ENVIO REAL OU SIMULAÇÃO
    console.log(`[LOG] Iniciando envio para ${targetUsers.length} contatos via ${channel}`);
    
    let sentCount = 0;
    let errorCount = 0;

    for (const user of targetUsers) {
        const personalizedMessage = message.replace('{{nome}}', user.name);
        
        if (whatsappClient) {
            try {
                // Formatar número para padrão internacional (Brasil 55)
                const formattedNumber = user.phone.startsWith('55') ? user.phone : `55${user.phone}`;
                
                // O método sendText é o padrão para essa API
                await whatsappClient.sendText(formattedNumber, personalizedMessage);
                sentCount++;
            } catch (err) {
                console.error(`Erro ao enviar para ${user.phone}:`, err);
                errorCount++;
            }
        } else {
            // Simulação se não houver chave configurada ou falha na leitura
            console.log(`[SIMULAÇÃO] Enviando para ${user.phone}: ${personalizedMessage}`);
            sentCount++;
        }
    }

    // 4. Registrar no Histórico do Firestore
    try {
        await addDoc(collection(firestore, 'notifications_history'), {
            channel,
            audience,
            message,
            recipientCount: targetUsers.length,
            successCount: sentCount,
            errorCount: errorCount,
            sentAt: Timestamp.now(),
            status: errorCount === 0 ? 'success' : (sentCount > 0 ? 'partial' : 'error'),
            isSimulation: !waKey
        });
    } catch (e) {
        console.warn("Aviso: Falha ao gravar histórico de notificação no Firestore.", e);
    }

    const resultMessage = waKey 
        ? `Sucesso! ${sentCount} mensagens enviadas. ${errorCount > 0 ? `${errorCount} falhas.` : ''}`
        : `Simulação concluída! ${sentCount} mensagens seriam enviadas. (Verifique sua chave de API nas configurações para envios reais)`;

    return NextResponse.json({ 
      success: true, 
      message: resultMessage 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro na API de notificações:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor ao processar o envio.' }, { status: 500 });
  }
}
