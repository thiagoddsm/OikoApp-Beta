
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * API Route to manage WhatsApp Instance (Status and Connection) from api-wa.me
 * Fixed for v5.0.0 with mandatory query params and dynamic fetching.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { firestore } = initializeFirebase();
    let waKey = null;
    
    try {
        const configRef = doc(firestore, 'config', 'notifications');
        const configSnap = await getDoc(configRef);
        waKey = configSnap.exists() ? configSnap.data()?.whatsappApiKey : null;
    } catch (e: any) {
        return NextResponse.json({ error: 'Erro de permissão no banco de dados.' }, { status: 500 });
    }

    if (!waKey) {
        return NextResponse.json({ 
            status: 'unconfigured',
            message: 'API Key não configurada no sistema.'
        });
    }

    try {
        const response = await fetch(`https://us.api-wa.me/${waKey}/instance`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        });

        const data = await response.json().catch(() => ({}));
        
        if (!response.ok) {
            return NextResponse.json({ 
                status: 'error',
                message: data.message || `O gateway retornou erro ${response.status}`,
                details: data 
            });
        }

        // Detecção resiliente de status v5.0.0
        let rawStatus = 'unknown';
        if (data.instance?.state) rawStatus = data.instance.state;
        else if (data.state) rawStatus = data.state;
        else if (data.instance?.status) rawStatus = data.instance.status;
        else if (data.authenticated === true || data.instance?.authenticated === true) rawStatus = 'connected';

        const normalizedStatus = String(rawStatus).toLowerCase();
        const isConnected = ['open', 'connected', 'conectado', 'authenticated', 'auth'].some(s => normalizedStatus.includes(s));
        const finalStatus = isConnected ? 'connected' : normalizedStatus;

        return NextResponse.json({ 
            status: finalStatus,
            message: data.message || '',
            qr: data.qr || data.qrcode || data.instance?.qr || null,
            details: data 
        });
    } catch (fetchErr: any) {
        return NextResponse.json({ status: 'offline', message: `Falha na comunicação: ${fetchErr.message}` });
    }

  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}

export async function POST() {
    try {
        const { firestore } = initializeFirebase();
        const configRef = doc(firestore, 'config', 'notifications');
        const configSnap = await getDoc(configRef);
        const waKey = configSnap.exists() ? configSnap.data()?.whatsappApiKey : null;

        if (!waKey) return NextResponse.json({ error: "Chave não configurada." }, { status: 400 });

        const response = await fetch(`https://us.api-wa.me/${waKey}/instance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const data = await response.json().catch(() => ({}));
        return NextResponse.json({
            success: response.ok,
            qr: data.qr || data.qrcode || data.instance?.qr || null,
            status: data.status || 'pairing',
            details: data
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH() {
    try {
        const { firestore } = initializeFirebase();
        const configRef = doc(firestore, 'config', 'notifications');
        const configSnap = await getDoc(configRef);
        const waKey = configSnap.exists() ? configSnap.data()?.whatsappApiKey : null;

        if (!waKey) return NextResponse.json({ error: "Chave não configurada." }, { status: 400 });

        // v5.0.0 Obrigatório: receiveStatusMessage e receivePresence
        // Parâmetros de URL conforme exigido pelo gateway para habilitar botões/enquetes
        const urlParams = new URLSearchParams({
            markMessageRead: 'true',
            saveMedia: 'true',
            receiveStatusMessage: 'true',
            receivePresence: 'true'
        });

        const url = `https://us.api-wa.me/${waKey}/instance?${urlParams.toString()}`;
        
        const response = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}) // Corpo vazio exigido por alguns servidores
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            return NextResponse.json({ 
                error: data.message || "Falha ao ativar recursos.",
                details: data 
            }, { status: response.status });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const { firestore } = initializeFirebase();
        const configRef = doc(firestore, 'config', 'notifications');
        const configSnap = await getDoc(configRef);
        const waKey = configSnap.exists() ? configSnap.data()?.whatsappApiKey : null;

        if (!waKey) return NextResponse.json({ error: "Chave não configurada." }, { status: 400 });

        const response = await fetch(`https://us.api-wa.me/${waKey}/instance`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        return NextResponse.json({ success: response.ok });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
