import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let apiKey = searchParams.get('key');
    let serverUrl = searchParams.get('server');
    let instanceName = searchParams.get('instance');

    // Se não vier por parâmetro, tenta buscar no Firestore (legado/fallback)
    if (!apiKey || !serverUrl) {
        try {
            const db = getAdminDb();
            const configSnap = await db.collection('config').doc('notifications').get();
            
            if (configSnap.exists) {
                const data = configSnap.data();
                apiKey = apiKey || data?.instanceKey || data?.whatsappApiKey;
                serverUrl = serverUrl || data?.serverUrl || 'https://api.ibmanha.com.br';
                instanceName = instanceName || data?.instanceName || 'IBM';
            }
        } catch (e) {
            console.warn("Firestore read failed in API, relying on params if available.");
        }
    }

    if (!apiKey) {
        return NextResponse.json({ status: 'offline', message: "Instância não configurada. Chave ausente." }, { status: 400 });
    }

    const baseUrl = (serverUrl || 'https://api.ibmanha.com.br').replace(/\/$/, '');
    const isWame = baseUrl.includes('api-wa.me');
    
    let response;
    if (isWame) {
        response = await fetch(`${baseUrl}/${apiKey}/instance`, {
            method: 'GET',
            cache: 'no-store'
        });
    } else {
        response = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers: { 'accept': '*/*', 'apikey': apiKey },
            cache: 'no-store'
        });
    }

    if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ status: 'offline', message: "Erro na API externa.", details: errorText }, { status: response.status });
    }

    const result = await response.json();
    let parsedStatus = 'offline';
    if (isWame) {
        if (result?.instance?.phoneConnected || result?.phoneConnected) {
            parsedStatus = 'connected';
        } else if (result?.instance?.socketConnection === 0 || !result?.instance?.user || result?.qr || result?.qrcode) {
            parsedStatus = 'pairing';
        }
    } else {
        const state = result?.instance?.state || result?.state || result?.instance?.status || result?.status;
        if (state === 'open' || state === 'connected') {
            parsedStatus = 'connected';
        } else {
            parsedStatus = 'pairing';
        }
    }

    return NextResponse.json({ ...result, parsedStatus });

  } catch (error: any) {
    return NextResponse.json({ status: 'offline', message: `Erro interno: ${error.message}` }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let apiKey = searchParams.get('key');
        let serverUrl = searchParams.get('server');
        let instanceName = searchParams.get('instance');

        if (!apiKey || !serverUrl) {
            try {
                const db = getAdminDb();
                const configSnap = await db.collection('config').doc('notifications').get();
                if (configSnap.exists) {
                    const data = configSnap.data();
                    apiKey = apiKey || data?.instanceKey || data?.whatsappApiKey;
                    serverUrl = serverUrl || data?.serverUrl || 'https://api.ibmanha.com.br';
                    instanceName = instanceName || data?.instanceName || 'IBM';
                }
            } catch (e) {}
        }

        if (!apiKey) {
            return NextResponse.json({ error: 'Chave da instância não fornecida.' }, { status: 400 });
        }

        const baseUrl = (serverUrl || 'https://api.ibmanha.com.br').replace(/\/$/, '');
        const isWame = baseUrl.includes('api-wa.me');

        let response;
        if (isWame) {
            response = await fetch(`${baseUrl}/${apiKey}/instance`, {
                method: 'DELETE',
            });
        } else {
            response = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
                method: 'DELETE',
                headers: { 'accept': '*/*', 'apikey': apiKey },
            });
        }

        const text = await response.text();
        let result: any = {};
        try { result = JSON.parse(text); } catch { result = { raw: text }; }

        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        let { key: apiKey, server: serverUrl, instance: instanceName } = body;

        // Fallback para Firestore se não vier no body
        if (!apiKey || !serverUrl) {
            try {
                const db = getAdminDb();
                const configSnap = await db.collection('config').doc('notifications').get();
                if (configSnap.exists) {
                    const data = configSnap.data();
                    apiKey = apiKey || data?.instanceKey || data?.whatsappApiKey;
                    serverUrl = serverUrl || data?.serverUrl || 'https://api.ibmanha.com.br';
                    instanceName = instanceName || data?.instanceName || 'IBM';
                }
            } catch (e) {}
        }

        if (!apiKey) {
            return NextResponse.json({ error: "Chave da instância não fornecida." }, { status: 400 });
        }

        const baseUrl = (serverUrl || 'https://api.ibmanha.com.br').replace(/\/$/, '');
        const isWame = baseUrl.includes('api-wa.me');
        
        let response;
        if (isWame) {
            response = await fetch(`${baseUrl}/${apiKey}/instance`, {
                method: 'POST'
            });
        } else {
            response = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
                method: 'GET',
                headers: { 'accept': '*/*', 'apikey': apiKey }
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: "Erro ao iniciar instância.", details: errorText }, { status: response.status });
        }

        const data = await response.json();
        
        // Padroniza a resposta para o frontend
        let parsedStatus = 'pairing';
        if (isWame) {
            parsedStatus = (data.phoneConnected || data.instance?.phoneConnected) ? 'connected' : 'pairing';
        } else {
            const state = data?.instance?.state || data?.state || data?.instance?.status || data?.status;
            parsedStatus = (state === 'open' || state === 'connected') ? 'connected' : 'pairing';
        }
        
        return NextResponse.json({ 
            ...data, 
            qr: data.qrcode || data.base64 || data.qr || data.instance?.qr, 
            parsedStatus 
        });

    } catch (error: any) {
        return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 });
    }
}
