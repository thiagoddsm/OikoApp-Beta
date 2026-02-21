
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * API Route to restart the WhatsApp instance.
 * Useful for clearing permission errors or connection glitches.
 */

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

        const response = await fetch(`https://us.api-wa.me/${waKey}/instance/restart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            return NextResponse.json({ 
                error: data.message || data.error || `Erro ${response.status} ao reiniciar instância.` 
            }, { status: response.status });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 });
    }
}
