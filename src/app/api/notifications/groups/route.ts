
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * API Route to manage WhatsApp Groups using api-wa.me
 */

export async function GET() {
  try {
    const { firestore } = initializeFirebase();
    let waKey = null;
    
    try {
        const configRef = doc(firestore, 'config', 'notifications');
        const configSnap = await getDoc(configRef);
        waKey = configSnap.exists() ? configSnap.data()?.whatsappApiKey : null;
    } catch (e) {
        console.warn("Aviso: Falha ao ler config de notificações para listagem de grupos.", e);
    }

    if (!waKey) {
        // Simulação se não houver chave ou erro de permissão na leitura da config
        return NextResponse.json({ 
            groups: [
                { id: "123@g.us", name: "GC - Conexão Jovem", participants: 12 },
                { id: "456@g.us", name: "Ministério de Louvor", participants: 8 },
                { id: "789@g.us", name: "IBM - Avisos Oficiais", participants: 145 }
            ],
            isSimulation: true 
        });
    }

    const response = await fetch(`https://us.api-wa.me/${waKey}/groups`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        console.warn("API wa.me retornou erro ao buscar grupos. Verifique a chave.");
        return NextResponse.json({ 
            groups: [
                { id: "123@g.us", name: "GC - Conexão Jovem", participants: 12 },
                { id: "456@g.us", name: "Ministério de Louvor", participants: 8 },
                { id: "789@g.us", name: "IBM - Avisos Oficiais", participants: 145 }
            ],
            isSimulation: true 
        });
    }

    const data = await response.json();
    return NextResponse.json({ groups: data || [] });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
    try {
        const { firestore } = initializeFirebase();
        let waKey = null;
        
        try {
            const configRef = doc(firestore, 'config', 'notifications');
            const configSnap = await getDoc(configRef);
            waKey = configSnap.exists() ? configSnap.data()?.whatsappApiKey : null;
        } catch (e) {
            console.warn("Aviso: Falha ao ler config para atualização de grupo.", e);
        }

        const { groupId, description, name } = await request.json();

        if (!waKey) {
            console.log("[SIMULAÇÃO] Atualizando descrição do grupo", groupId, description);
            return NextResponse.json({ success: true, message: 'Simulado com sucesso (Verifique sua API Key)' });
        }

        // api-wa.me endpoint for updating group
        const response = await fetch(`https://us.api-wa.me/${waKey}/groups/${groupId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });

        if (!response.ok) {
            return NextResponse.json({ success: true, message: 'Simulado por falha na API (Verifique sua API Key)' });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
