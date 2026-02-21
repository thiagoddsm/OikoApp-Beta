
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
        return NextResponse.json({ error: 'Erro ao ler configurações.' }, { status: 500 });
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
          headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        
        if (!response.ok) {
            return NextResponse.json({ 
                status: 'error',
                message: data.message || `Gateway retornou erro ${response.status}`
            });
        }

        // A API costuma retornar algo como { status: 'CONNECTED', ... }
        return NextResponse.json({ 
            status: data.status?.toLowerCase() || 'unknown',
            details: data 
        });
    } catch (fetchErr: any) {
        return NextResponse.json({ status: 'offline', message: fetchErr.message });
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
            return NextResponse.json({ error: 'Erro de permissão.' }, { status: 500 });
        }

        if (!waKey) {
            return NextResponse.json({ error: "Chave não configurada." }, { status: 400 });
        }

        // POST para gerar o QR Code
        const response = await fetch(`https://us.api-wa.me/${waKey}/instance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ 
                error: data.message || "Falha ao gerar instância." 
            }, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
