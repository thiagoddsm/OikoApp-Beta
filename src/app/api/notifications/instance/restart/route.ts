
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
        let serverUrl = 'https://api.ibmanha.com.br';
        let instanceName = 'IBM';
        
        try {
            const configRef = doc(firestore, 'config', 'notifications');
            const configSnap = await getDoc(configRef);
            if (configSnap.exists()) {
                const data = configSnap.data();
                waKey = data?.instanceKey || data?.whatsappApiKey;
                serverUrl = data?.serverUrl || serverUrl;
                instanceName = data?.instanceName || instanceName;
            }
        } catch (e) {
            return NextResponse.json({ error: "Erro de permissão no Firebase." }, { status: 500 });
        }

        if (!waKey) {
            return NextResponse.json({ error: "Chave de API não configurada." }, { status: 400 });
        }

        const baseUrl = serverUrl.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/instance/restart/${instanceName}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'apikey': waKey 
            }
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
