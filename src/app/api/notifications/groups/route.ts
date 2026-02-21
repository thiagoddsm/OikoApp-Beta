
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
                { id: "123@g.us", name: "GC - Conexão Jovem", participants: [{id: "1"}] },
                { id: "456@g.us", name: "Ministério de Louvor", participants: [{id: "1"}] },
                { id: "789@g.us", name: "IBM - Avisos Oficiais", participants: [{id: "1"}] }
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

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json({ 
                groups: [],
                error: data.message || `API retornou erro ${response.status}`,
                isSimulation: false 
            }, { status: response.status });
        }

        // Extração robusta de grupos (pode vir como array direto ou dentro de uma prop)
        let extractedGroups = [];
        if (Array.isArray(data)) {
            extractedGroups = data;
        } else if (data.groups && Array.isArray(data.groups)) {
            extractedGroups = data.groups;
        } else if (data.data && Array.isArray(data.data)) {
            extractedGroups = data.data;
        } else if (typeof data === 'object') {
            // Tenta encontrar qualquer array dentro do objeto retornado
            const arrays = Object.values(data).filter(v => Array.isArray(v));
            if (arrays.length > 0) extractedGroups = arrays[0] as any[];
        }

        return NextResponse.json({ 
            groups: extractedGroups,
            isSimulation: false
        });
    } catch (fetchErr: any) {
        return NextResponse.json({ error: `Erro na comunicação com o gateway: ${fetchErr.message}`, groups: [] }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: `Erro interno: ${error.message}`, groups: [] }, { status: 500 });
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

        const response = await fetch(`https://us.api-wa.me/${waKey}/groups/${groupId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return NextResponse.json({ 
                success: false, 
                error: errData.message || `Gateway retornou erro ${response.status}` 
            }, { status: response.status });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
