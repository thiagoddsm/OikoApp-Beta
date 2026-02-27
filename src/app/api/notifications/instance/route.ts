import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * API Route to manage WhatsApp Instance with robust status detection for v5.0.0 Pro Plan
 * Handles multiple response structures and ignores deprecation warnings.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const formatQr = (qr: string | null) => {
    if (!qr) return null;
    if (qr.startsWith('data:image')) return qr;
    if (qr.startsWith('http')) return qr;
    return `data:image/png;base64,${qr}`;
};

export async function GET() {
  try {
    const { firestore } = initializeFirebase();
    let waKey = null;
    
    try {
        const configRef = doc(firestore, 'config', 'notifications');
        const configSnap = await getDoc(configRef);
        waKey = configSnap.exists() ? configSnap.data()?.whatsappApiKey : null;
    } catch (e: any) {
        return NextResponse.json({ status: 'error', message: 'Erro ao ler configuração do banco de dados.' });
    }

    if (!waKey) {
      return NextResponse.json({ 
          status: 'unconfigured',
          message: 'API Key não configurada.'
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
                message: data.message || `Erro HTTP ${response.status}`,
                details: data
            });
        }
        
        // Detecção robusta para Plano Pro v5.0.0
        const instanceData = data.instance || data;
        const stateStr = (instanceData.state || instanceData.status || data.state || data.status || '').toString().toLowerCase();
        const isAuthenticated = data.authenticated === true || instanceData.authenticated === true || data.is_authenticated === true || stateStr === 'connected';
        const isOnline = isAuthenticated || ['open', 'connected', 'online', 'authenticated', 'ready'].includes(stateStr);
        
        let displayStatus = 'unknown';
        let displayMessage = data.message || stateStr || '';

        // Limpeza de aviso de depreciação para não poluir a UI
        if (displayMessage.toUpperCase().includes('IMPORTANT: RECEIVE_STATUS_MESSAGE')) {
            displayMessage = isOnline ? 'Conectado e Pronto' : 'Aguardando Conexão';
        }

        const rawQr = data.qr || data.qrcode || instanceData.qr || data.instance?.qr || null;

        if (isOnline) {
            displayStatus = 'connected';
        } else if (rawQr || stateStr.includes('pairing') || stateStr.includes('qr')) {
            displayStatus = 'pairing';
        } else if (['closed', 'logout', 'disconnected', 'offline'].includes(stateStr)) {
            displayStatus = 'offline';
        } else {
            displayStatus = stateStr || 'unknown';
        }

        return NextResponse.json({ 
            status: displayStatus,
            message: displayMessage,
            qr: formatQr(rawQr),
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
        const rawQr = data.qr || data.qrcode || data.instance?.qr || null;

        return NextResponse.json({
            success: response.ok,
            qr: formatQr(rawQr),
            status: data.status || (rawQr ? 'pairing' : 'unknown'),
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

        return NextResponse.json({ success: response.ok });
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        return NextResponse.json({ success: response.ok });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}