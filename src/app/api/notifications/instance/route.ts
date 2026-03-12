import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

async function getConfigSafely() {
    try {
        const { firestore } = initializeFirebase();
        const configSnap = await getDoc(doc(firestore, 'config', 'notifications'));
        return configSnap.exists() ? configSnap.data()?.whatsappApiKey : null;
    } catch (e: any) {
        console.warn("Falha ao ler config segura. Possivelmente regras bloqueando no SSR.", e.message);
        throw e;
    }
}

export async function GET() {
  try {
    const waKey = await getConfigSafely();

    if (!waKey) return NextResponse.json({ status: 'unconfigured', message: 'API Key não configurada.' });

    // A documentação da API confirma que o response status é 200 e ele envia um JSON detalhado
    // Precisamos parsear esse JSON para entender se a instância está conectada.
    const response = await fetch(`https://us.api-wa.me/${waKey}/instance`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
    });

    const data = await response.json().catch(() => ({}));
    
    // Tratamento específico baseado na resposta real do Swagger da API-WA.me:
    // "phoneConnected": false significa que não tem whatsapp lido.
    // "socketConnection": 0 pode indicar status desconectado (dependendo da versão da api deles)
    
    let displayStatus = 'offline';
    let qrCode = null;
    
    if (data && data.instance) {
        if (data.instance.phoneConnected === true || data.instance.state === 'open' || data.instance.status === 'connected') {
            displayStatus = 'connected';
        } else if (data.instance.qr) {
            displayStatus = 'pairing';
            qrCode = data.instance.qr;
        }
    } else if (data && data.status === 200 && data.state === 'open') {
         displayStatus = 'connected';
    }

    return NextResponse.json({
        ...data,
        parsedStatus: displayStatus,
        qr: qrCode
    });

  } catch (error: any) {
    console.error("Erro na rota de instance (GET):", error);
    if (error.code === 'permission-denied') {
        return NextResponse.json({ status: 'error', message: 'Firebase bloqueou leitura. Verifique firestore.rules.' }, { status: 403 });
    }
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}

export async function POST() {
    try {
        const waKey = await getConfigSafely();

        if (!waKey) return NextResponse.json({ error: "Chave não configurada." }, { status: 400 });

        const response = await fetch(`https://us.api-wa.me/${waKey}/instance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json().catch(() => ({}));
        
        let displayStatus = 'offline';
        let qrCode = null;
        
        if (data && data.instance) {
            if (data.instance.phoneConnected === true) {
                displayStatus = 'connected';
            } else if (data.instance.qr) {
                displayStatus = 'pairing';
                qrCode = data.instance.qr;
            }
        }
        
        return NextResponse.json({ 
            success: response.ok, 
            ...data,
            parsedStatus: displayStatus,
            qr: qrCode
        });
    } catch (error: any) {
        console.error("Erro na rota de instance (POST):", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
