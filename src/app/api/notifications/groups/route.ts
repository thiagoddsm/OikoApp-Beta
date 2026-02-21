
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
    } catch (e: any) {
        console.warn("Aviso: Falha ao ler config de notificações.", e.message);
    }

    if (!waKey) {
        return NextResponse.json({ 
            groups: [
                { id: "123@g.us", name: "GC - Conexão Jovem", participants: 12 },
                { id: "456@g.us", name: "Ministério de Louvor", participants: 8 },
                { id: "789@g.us", name: "IBM - Avisos Oficiais", participants: 145 }
            ],
            isSimulation: true,
            warning: "Mostrando dados simulados (API Key não configurada)."
        });
    }

    try {
        const response = await fetch(`https://us.api-wa.me/${waKey}/groups`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return NextResponse.json({ 
                groups: [],
                error: `API retornou erro ${response.status}: ${JSON.stringify(errData)}`,
                isSimulation: false 
            }, { status: response.status });
        }

        const data = await response.json();
        // A API retorna um array de grupos diretamente
        return NextResponse.json({ groups: data || [] });
    } catch (fetchErr: any) {
        return NextResponse.json({ error: `Erro na comunicação com o gateway: ${fetchErr.message}` }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 });
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
            console.warn("Aviso: Falha ao ler config.");
        }

        const { groupId, description, name } = await request.json();

        if (!waKey) {
            return NextResponse.json({ success: true, message: 'Simulado com sucesso' });
        }

        // Endpoint singular para grupos conforme padrão da API
        const response = await fetch(`https://us.api-wa.me/${waKey}/groups/${groupId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return NextResponse.json({ 
                success: false, 
                error: `Gateway retornou erro ${response.status}: ${JSON.stringify(errData)}` 
            }, { status: response.status });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
