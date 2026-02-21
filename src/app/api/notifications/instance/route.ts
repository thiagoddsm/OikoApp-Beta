
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * API Route to manage WhatsApp Instance (Status and Connection) from api-wa.me
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
          headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json().catch(() => ({}));
        
        if (!response.ok) {
            return NextResponse.json({ 
                status: 'error',
                message: data.message || `O gateway retornou erro ${response.status}`,
                details: data
            });
        }

        // Detecção ultra-resiliente de status
        let rawStatus = 'unknown';
        
        // Ordem de prioridade para encontrar o status real
        if (data.instance?.state) rawStatus = data.instance.state;
        else if (data.state) rawStatus = data.state;
        else if (data.instance?.status) rawStatus = data.instance.status;
        else if (data.status && typeof data.status === 'string' && isNaN(Number(data.status))) rawStatus = data.status;
        else if (data.authenticated === true || data.instance?.authenticated === true) rawStatus = 'connected';
        else if (data.status === 200 || data.status === 201) {
            rawStatus = data.instance?.state || data.instance?.status || 'connected'; 
        }

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
        let waKey = null;
        
        try {
            const configRef = doc(firestore, 'config', 'notifications');
            const configSnap = await getDoc(configRef);
            waKey = configSnap.exists() ? configSnap.data()?.whatsappApiKey : null;
        } catch (e) {
            return NextResponse.json({ error: "Erro de permissão no Firebase." }, { status: 500 });
        }

        if (!waKey) {
            return NextResponse.json({ error: "Chave de API não configurada." }, { status: 400 });
        }

        const response = await fetch(`https://us.api-wa.me/${waKey}/instance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json({ 
                error: data.message || data.error || `Erro ${response.status} ao gerar instância.` 
            }, { status: response.status });
        }

        const statusValue = data.instance?.state || data.instance?.status || data.status || 'pairing';
        return NextResponse.json({
            success: true,
            qr: data.qr || data.qrcode || data.instance?.qr || null,
            status: String(statusValue).toLowerCase(),
            details: data
        });
    } catch (error: any) {
        return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { firestore } = initializeFirebase();
        const configRef = doc(firestore, 'config', 'notifications');
        const configSnap = await getDoc(configRef);
        const waKey = configSnap.exists() ? configSnap.data()?.whatsappApiKey : null;

        if (!waKey) return NextResponse.json({ error: "Chave não configurada." }, { status: 400 });

        const body = await request.json();
        const { webhookUrl } = body;

        const response = await fetch(`https://us.api-wa.me/${waKey}/instance`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ webhook: webhookUrl })
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            return NextResponse.json({ error: data.message || "Falha ao atualizar webhook." }, { status: response.status });
        }

        return NextResponse.json({ success: true });
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

        // CRITICAL: The error shown in the screenshot specifies that receiveStatusMessage and receivePresence are REQUIRED.
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
            body: JSON.stringify({}) 
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            return NextResponse.json({ 
                error: data.message || "Falha ao configurar instância.",
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
        let waKey = null;
        
        try {
            const configRef = doc(firestore, 'config', 'notifications');
            const configSnap = await getDoc(configRef);
            waKey = configSnap.exists() ? configSnap.data()?.whatsappApiKey : null;
        } catch (e) {
            return NextResponse.json({ error: 'Erro de permissão.' }, { status: 500 });
        }

        if (!waKey) {
            return NextResponse.json({ error: "Chave não configurada." }, { status: 400 });
        }

        const response = await fetch(`https://us.api-wa.me/${waKey}/instance`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            return NextResponse.json({ 
                error: data.message || "Falha ao desconectar instância no gateway." 
            }, { status: response.status });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
