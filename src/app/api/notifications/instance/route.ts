import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let apiKey = searchParams.get('key');
    let serverUrl = searchParams.get('server');

    // Se não vier por parâmetro, tenta buscar no Firestore (legado/fallback)
    if (!apiKey || !serverUrl) {
        try {
            const db = getAdminDb();
            const configSnap = await db.collection('config').doc('notifications').get();
            
            if (configSnap.exists) {
                const data = configSnap.data();
                apiKey = apiKey || data?.instanceKey || data?.whatsappApiKey;
                serverUrl = serverUrl || data?.serverUrl || 'https://us.api-wa.me';
            }
        } catch (e) {
            console.warn("Firestore read failed in API, relying on params if available.");
        }
    }

    if (!apiKey) {
        return NextResponse.json({ status: 'offline', message: "Instância não configurada. Chave ausente." }, { status: 400 });
    }

    const baseUrl = (serverUrl || 'https://us.api-wa.me').replace(/\/$/, '');
    
    const response = await fetch(`${baseUrl}/${apiKey}/instance`, {
        method: 'GET',
        headers: { 'accept': '*/*' },
        cache: 'no-store'
    });

    if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ status: 'offline', message: "Erro na API externa.", details: errorText }, { status: response.status });
    }

    const result = await response.json();
    let parsedStatus = 'offline';
    if (result?.instance?.phoneConnected) {
        parsedStatus = 'connected';
    } else if (result?.instance?.socketConnection === 0 || !result?.instance?.user) {
        parsedStatus = 'pairing';
    }

    return NextResponse.json({ ...result, parsedStatus });

  } catch (error: any) {
    return NextResponse.json({ status: 'offline', message: `Erro interno: ${error.message}` }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        let { key: apiKey, server: serverUrl } = body;

        // Fallback para Firestore se não vier no body
        if (!apiKey || !serverUrl) {
            try {
                const { firestore } = initializeFirebase();
                const configRef = doc(firestore, 'config', 'notifications');
                const configSnap = await getDoc(configRef);
                if (configSnap.exists()) {
                    const data = configSnap.data();
                    apiKey = apiKey || data?.instanceKey || data?.whatsappApiKey;
                    serverUrl = serverUrl || data?.serverUrl || 'https://us.api-wa.me';
                }
            } catch (e) {}
        }

        if (!apiKey) {
            return NextResponse.json({ error: "Chave da instância não fornecida." }, { status: 400 });
        }

        const baseUrl = (serverUrl || 'https://us.api-wa.me').replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/${apiKey}/instance`, {
            method: 'POST',
            headers: { 'accept': '*/*' }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: "Erro ao iniciar instância.", details: errorText }, { status: response.status });
        }

        const data = await response.json();
        
        // Padroniza a resposta para o frontend
        const parsedStatus = data.phoneConnected ? 'connected' : 'pairing';
        return NextResponse.json({ 
            ...data, 
            qr: data.qrcode || data.qr, 
            parsedStatus 
        });

    } catch (error: any) {
        return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 });
    }
}
