import { NextResponse } from 'next/server';
import { getWhatsAppClient } from '@/lib/whatsapp';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, text, serverUrl, instanceKey } = body;

    if (!to || !text) {
      return NextResponse.json({ error: 'Parâmetros "to" e "text" são obrigatórios.' }, { status: 400 });
    }

    const whatsapp = await getWhatsAppClient({ server: serverUrl, key: instanceKey });
    const response = await whatsapp.sendMessage({
      type: 'text',
      body: { to, text }
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Erro no proxy de envio do WhatsApp:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
