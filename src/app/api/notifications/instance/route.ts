import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * API Route to manage WhatsApp Instance with robust status detection for v5.0.0
 * Handles the new API response structure and ignores deprecation warnings.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
                message: data.message || `Erro HTTP ${response.status}`,
                details: data
            });
        }
        
        // Robust state detection for v5.0.0 Pro Plan
        const instanceData = data.instance || data;
        const stateStr = (instanceData.state || instanceData.status || data.state || data.status || '').toString().toLowerCase();
        const isAuthenticated = data.authenticated === true || instanceData.authenticated === true || data.is_authenticated === true;
        
        // Logical "Connected" state check
        const isOnline = isAuthenticated || ['open', 'connected', 'online', 'authenticated', 'ready'].includes(stateStr);
        
        let displayStatus = 'unknown';
        let displayMessage = data.message || stateStr || '';

        // Se a mensagem for apenas o aviso de depreciação, limpamos para não poluir a UI
        if (displayMessage.toUpperCase().includes('IMPORTANT: RECEIVE_STATUS_MESSAGE')) {
            displayMessage = isOnline ? 'Conectado e Pronto' : 'Aguardando Conexão';
        }

        if (isOnline) {
            displayStatus = 'connected';
        } else if (data.qr || data.qrcode || instanceData.qr || stateStr.includes('pairing') || stateStr.includes('qr')) {
            displayStatus = 'pairing';
        } else if (['closed', 'logout', 'disconnected', 'offline'].includes(stateStr)) {
            displayStatus = 'offline';
        } else {
            displayStatus = stateStr || 'unknown';
        }

        return NextResponse.json({ 
            status: displayStatus,
            message: displayMessage,
            qr: data.qr || data.qrcode || instanceData.qr || null,
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

        // Ativação de Pro Features via PATCH
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
            headers: { 'Content-Type': 'application/json' }
        });

        return NextResponse.json({ success: response.ok });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}