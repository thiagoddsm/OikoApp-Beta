import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

const objectiveLabels: Record<string, string> = {
  reembolso: 'Reembolso',
  pagamento: 'Pagamento',
  prestacao_contas: 'Prestação de Contas',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { requesterName, phone, amount, objective, newStatus, rejectionReason } = body;

    if (!phone) {
      return NextResponse.json({ ok: false, error: 'Telefone não informado.' }, { status: 400 });
    }

    // Ler config do WhatsApp com Admin SDK (ignora regras de segurança do Firestore)
    const db = getAdminDb();
    const configSnap = await db.collection('config').doc('notifications').get();

    if (!configSnap.exists) {
      return NextResponse.json({ ok: false, error: 'Configuração do WhatsApp não encontrada.' }, { status: 500 });
    }

    const configData = configSnap.data()!;
    const apiKey = configData?.instanceKey || configData?.whatsappApiKey;
    const serverUrl = (configData?.serverUrl || 'https://us.api-wa.me').replace(/\/$/, '');

    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'Chave da API WhatsApp não configurada.' }, { status: 500 });
    }

    // Formatar número
    const cleaned = phone.replace(/\D/g, '');
    let formattedPhone = cleaned;
    if (cleaned.length === 11) formattedPhone = `55${cleaned}`;
    else if (cleaned.length === 10) formattedPhone = `55${cleaned.substring(0, 2)}9${cleaned.substring(2)}`;
    else if (!cleaned.startsWith('55')) formattedPhone = `55${cleaned}`;

    // Montar mensagem
    const amountStr = Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const objLabel = objectiveLabels[objective] || objective;

    let messageText = '';
    if (newStatus === 'approved') {
      messageText = `Olá ${requesterName}! 🎉\n\nSua solicitação financeira de *${objLabel}* no valor de *R$ ${amountStr}* foi *APROVADA* e está aguardando o pagamento.\n\nEm caso de dúvidas, entre em contato com a tesouraria.`;
    } else if (newStatus === 'rejected') {
      const reasonText = rejectionReason ? `\n\n*Motivo:* ${rejectionReason}` : '';
      messageText = `Olá ${requesterName}.\n\nSua solicitação financeira de *${objLabel}* no valor de *R$ ${amountStr}* infelizmente foi *REJEITADA*.${reasonText}\n\nPor favor, entre em contato com a tesouraria para mais detalhes.`;
    } else if (newStatus === 'paid') {
      messageText = `Olá ${requesterName}! ✅\n\nO pagamento da sua solicitação de *${objLabel}* no valor de *R$ ${amountStr}* foi *REALIZADO* com sucesso!`;
    } else {
      return NextResponse.json({ ok: false, error: 'Status inválido.' }, { status: 400 });
    }

    // Enviar mensagem
    const waUrl = `${serverUrl}/${apiKey}/message/text`;
    const waResponse = await fetch(waUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: formattedPhone, text: messageText }),
    });

    if (!waResponse.ok) {
      const errText = await waResponse.text();
      console.error('WhatsApp API error:', errText);
      return NextResponse.json({ ok: false, error: `Erro no gateway: ${errText}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Finance notify error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
