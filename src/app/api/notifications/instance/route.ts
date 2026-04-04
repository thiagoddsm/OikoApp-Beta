
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const { firestore } = initializeFirebase();
    
    // 1. Buscar a chave correta do Firestore
    const configRef = doc(firestore, 'config', 'notifications');
    const configSnap = await getDoc(configRef);
    
    if (!configSnap.exists()) {
        return NextResponse.json({ error: "Configuração de notificação não encontrada." }, { status: 404 });
    }
    
    // *** CORREÇÃO: Usando 'whatsappApiKey' em vez de 'apiToken' ***
    const apiKey = configSnap.data()?.whatsappApiKey;

    if (!apiKey) {
        return NextResponse.json({ status: 'offline', message: "Gateway de WhatsApp não configurado. Token da API ausente." }, { status: 400 });
    }

    // 2. Chamar o endpoint /instance da API externa
    const response = await fetch(`https://us.api-wa.me/${apiKey}/instance`, {
        method: 'GET',
        headers: { 'accept': '*/*' },
        cache: 'no-store' // Garante que a informação é sempre fresca
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro ao buscar status da instância:", errorText);
        return NextResponse.json({ status: 'offline', message: "Não foi possível obter o status da instância.", details: errorText }, { status: response.status });
    }

    const data = await response.json();

    // Adiciona um status parseado para facilitar o frontend
    let parsedStatus = 'offline';
    if (data?.instance?.phoneConnected) {
        parsedStatus = 'connected';
    } else if (data?.instance?.socketConnection === 0 && data?.instance?.user === undefined) {
        parsedStatus = 'pairing';
    }

    // 3. Retornar o status da instância para o cliente
    return NextResponse.json({ ...data, parsedStatus });

  } catch (error: any) {
    console.error("API Route Critical Error (instance status):", error);
    return NextResponse.json({ status: 'offline', message: `Erro interno no servidor: ${error.message}` }, { status: 500 });
  }
}

// Adicionando um método POST para iniciar a conexão e gerar o QR Code
export async function POST(request: Request) {
    try {
        const { firestore } = initializeFirebase();
        const configRef = doc(firestore, 'config', 'notifications');
        const configSnap = await getDoc(configRef);
        const apiKey = configSnap.data()?.whatsappApiKey;

        if (!apiKey) {
            return NextResponse.json({ error: "Gateway de WhatsApp não configurado." }, { status: 400 });
        }

        // Este endpoint é para iniciar a conexão
        const response = await fetch(`https://us.api-wa.me/${apiKey}/instance/init`, {
            method: 'POST',
            headers: { 'accept': '*/*' }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: "Não foi possível iniciar a instância.", details: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("API Route Critical Error (instance init):", error);
        return NextResponse.json({ error: `Erro interno no servidor: ${error.message}` }, { status: 500 });
    }
}
