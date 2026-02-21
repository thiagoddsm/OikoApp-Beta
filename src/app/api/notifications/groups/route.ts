
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
                { id: "123@g.us", name: "GC - Conexão Jovem", participantCount: 15 },
                { id: "456@g.us", name: "Ministério de Louvor", participantCount: 8 },
                { id: "789@g.us", name: "IBM - Avisos Oficiais", participantCount: 120 }
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

        // Extração robusta de grupos
        let extractedGroups = [];
        if (Array.isArray(data)) {
            extractedGroups = data;
        } else if (data.groups && Array.isArray(data.groups)) {
            extractedGroups = data.groups;
        } else if (data.data && Array.isArray(data.data)) {
            extractedGroups = data.data;
        }

        const normalizedGroups = extractedGroups.map((g: any) => ({
            id: g.id || g.jid || '',
            name: g.name || g.subject || g.groupName || 'Grupo sem Nome',
            participantCount: g.participants?.length || g.size || g.count || 0
        }));

        return NextResponse.json({ 
            groups: normalizedGroups,
            isSimulation: false
        });
    } catch (fetchErr: any) {
        return NextResponse.json({ error: `Erro na comunicação: ${fetchErr.message}`, groups: [] }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: `Erro interno: ${error.message}`, groups: [] }, { status: 500 });
  }
}

export async function PUT(request: Request) {
    try {
        const { firestore } = initializeFirebase();
        const configRef = doc(firestore, 'config', 'notifications');
        const configSnap = await getDoc(configRef);
        const waKey = configSnap.exists() ? configSnap.data()?.whatsappApiKey : null;

        const { groupId, description, name } = await request.json();

        if (!waKey) {
            return NextResponse.json({ success: true, message: 'Simulado com sucesso' });
        }

        let success = false;
        let lastError = '';

        // Tenta variações de endpoints para descrição
        const endpoints = [
            { url: `https://us.api-wa.me/${waKey}/groups/${groupId}/description`, method: 'POST', body: { description } },
            { url: `https://us.api-wa.me/${waKey}/group/${groupId}/description`, method: 'POST', body: { description } },
            { url: `https://us.api-wa.me/${waKey}/groups/${groupId}`, method: 'PUT', body: { subject: name, description } },
            { url: `https://us.api-wa.me/${waKey}/group/${groupId}`, method: 'PUT', body: { subject: name, description } }
        ];

        for (const endpoint of endpoints) {
            if (success) break;
            try {
                const res = await fetch(endpoint.url, {
                    method: endpoint.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(endpoint.body)
                });
                
                if (res.ok) {
                    success = true;
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    lastError = errorData.message || `Erro ${res.status} no endpoint ${endpoint.url}`;
                }
            } catch (e: any) {
                lastError = e.message;
            }
        }

        if (!success) {
            return NextResponse.json({ success: false, error: lastError }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
